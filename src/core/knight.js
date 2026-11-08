// src/core/knight.js
//
// Knight entity + behaviour. Behaviour functions take the World as their first
// argument so they can read the graph, monsters, RNG and event bus without
// importing World (no circular dependency).

import { KnightStats, computeDerived } from './stats.js';
import { bfsPath } from './graph.js';

const RANK_ORDER = ['D', 'C', 'B', 'A', 'S'];

/**
 * XP required to go from `level` to `level + 1`.
 * @param {number} level
 * @param {{ base: number, growth: number }} curve
 * @returns {number}
 */
export function xpForLevel(level, curve) {
  return Math.floor(curve.base * Math.pow(curve.growth, level - 1));
}

/**
 * A knight. Data holder + a few pure-ish methods.
 */
export class Knight {
  constructor({ id, name, rune, stats, x, y, balance }) {
    this.id = id;
    this.name = name;
    this.rune = rune;
    this.stats = stats;

    this.level = balance.startLevel;
    this.xp = balance.startXp;
    this.xpNext = xpForLevel(this.level, balance.xpCurve);
    this.gold = balance.startGold;
    this.kills = balance.startKills;

    const d = computeDerived(this.stats);
    this.maxHP = d.maxHP;
    this.hp = d.maxHP;
    this.maxAura = d.maxAura;
    this.aura = d.maxAura;
    this.auraRegen = d.AURA_REGEN;

    this.x = x;
    this.y = y;
    this.roomId = 'camp';
    this.targetRoomId = null;
    this.route = null;       // e.g. ['camp', 'z1', 'z4']
    this.routeIndex = 0;     // index of next waypoint to walk toward

    this.combatTarget = null; // monster id
    this.combatTimer = 0;
  }

  /** Recompute derived caps after a level-up. Clamps HP/Aura down if needed. */
  refreshDerived() {
    const d = computeDerived(this.stats);
    this.maxHP = d.maxHP;
    this.maxAura = d.maxAura;
    this.auraRegen = d.AURA_REGEN;
    if (this.hp > this.maxHP) this.hp = this.maxHP;
    if (this.aura > this.maxAura) this.aura = this.maxAura;
  }

  /**
   * Gain XP. May level up multiple times. Returns levels gained.
   * @param {number} amount
   * @param {{ base: number, growth: number }} curve
   * @returns {number}
   */
  gainXP(amount, curve) {
    this.xp += amount;
    let gained = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      this.stats.levelUp();
      this.xpNext = xpForLevel(this.level, curve);
      this.refreshDerived();
      gained += 1;
    }
    return gained;
  }
}

// ---------------------------------------------------------------------------
// Behaviour — every function below takes the World as its first argument.
// ---------------------------------------------------------------------------

/**
 * Main knight update. Priority order:
 *   1. Combat
 *   2. Low-HP retreat
 *   3. Camp rest
 *   4. Travel
 * @param {import('./world.js').World} world
 * @param {Knight} k
 */
export function updateKnight(world, k) {
  // Aura regen each tick.
  k.aura = Math.min(k.maxAura, k.aura + k.auraRegen * world.data.balance.knight.auraRegenScale);

  // 1. Fighting.
  if (k.combatTarget) {
    const target = world.monsters.find(m => m.id === k.combatTarget);
    if (!target || target.hp <= 0) {
      k.combatTarget = null;
    } else {
      k.combatTimer -= 1;
      if (k.combatTimer <= 0) resolveStrike(world, k, target);
      return;
    }
  }

  // 2. Retreat when HP is low.
  const kb = world.data.balance.knight;
  if (k.hp / k.maxHP < kb.retreatHpFraction) {
    const camp = world.roomsById.get('camp');
    if (k.roomId === 'camp' && Math.hypot(k.x - camp.cx, k.y - camp.cy) <= kb.arriveRadius) {
      k.hp = Math.min(k.maxHP, k.hp + kb.retreatHeal);
    } else {
      if (k.targetRoomId !== 'camp') assignRoute(world, k, 'camp');
      moveAlongRoute(world, k, kb.retreatSpeed);
    }
    return;
  }

  // 3. Rest at camp.
  const camp = world.roomsById.get('camp');
  const distCamp = Math.hypot(k.x - camp.cx, k.y - camp.cy);
  if (distCamp <= kb.campRestRadius && k.hp < k.maxHP) {
    k.hp = Math.min(k.maxHP, k.hp + kb.campRestHeal);
    return;
  }

  // 4. Travel.
  if (k.targetRoomId) {
    moveAlongRoute(world, k, knightSpeed(world, k));
  } else {
    reassignTarget(world, k);
  }
}

/**
 * Resolve one combat tick for `k` against `target`. Called when combatTimer hits 0.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 * @param {object} target - Monster
 */
export function resolveStrike(world, k, target) {
  const cb = world.data.balance.combat;
  const dmg = Math.max(
    cb.minStrike,
    computeDerived(k.stats).ATK + k.level * cb.strikeLevelScale
  );
  target.hp = Math.max(0, target.hp - dmg);

  world.events.emit('log', {
    tick: world.tickCount,
    type: 'combat',
    message: `⚔ ${k.name} strikes ${target.name} for ${dmg}`,
    actorId: k.id,
    roomId: target.roomId,
    value: dmg,
  });

  if (target.hp <= 0) {
    // Kill.
    k.gold += target.gold;
    k.kills += 1;
    const xpGained = k.gainXP(target.xp, world.data.balance.xpCurve);
    world.core.recordKill(target.rank);

    world.events.emit('log', {
      tick: world.tickCount,
      type: 'kill',
      message: `💀 ${k.name} slays ${target.name} (+${target.xp}xp +${target.gold}g)`,
      actorId: k.id,
      roomId: target.roomId,
      value: target.rank,
    });
    if (xpGained > 0) {
      world.events.emit('log', {
        tick: world.tickCount,
        type: 'level',
        message: `⭐ ${k.name} reaches level ${k.level}!`,
        actorId: k.id,
        value: k.level,
      });
    }
    k.combatTarget = null;
    return;
  }

  // Monster survives — it hits back.
  k.hp = Math.max(0, k.hp - target.atk);
  if (k.hp <= 0) {
    respawnKnight(world, k);
    return;
  }
  k.combatTimer = combatInterval(world, k);
}

/**
 * Ticks between knight attacks.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 * @returns {number}
 */
export function combatInterval(world, k) {
  const cb = world.data.balance.combat;
  const spd = computeDerived(k.stats).SPD;
  return Math.max(cb.minInterval, cb.intervalBase - Math.floor(spd * cb.intervalSpdScale));
}

/**
 * Reset the knight at CAMP.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 */
export function respawnKnight(world, k) {
  const camp = world.roomsById.get('camp');
  const jitter = world.data.balance.knight.spawnJitter;

  k.hp = k.maxHP;
  k.aura = k.maxAura;
  k.roomId = 'camp';
  k.x = camp.cx + world.rng.float(-jitter, jitter);
  k.y = camp.cy + world.rng.float(-jitter, jitter);
  k.combatTarget = null;
  k.combatTimer = 0;
  k.targetRoomId = null;
  k.route = null;
  k.routeIndex = 0;

  world.events.emit('log', {
    tick: world.tickCount,
    type: 'combat',
    message: `☠ ${k.name} falls — respawns at CAMP`,
    actorId: k.id,
    value: 0,
  });
}

/**
 * Current walk speed in units/tick.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 * @returns {number}
 */
export function knightSpeed(world, k) {
  const kb = world.data.balance.knight;
  return kb.speedBase + computeDerived(k.stats).SPD * kb.speedPerSpd;
}

/**
 * Compute and assign a BFS route from the knight's current room to `targetId`.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 * @param {string} targetId
 */
export function assignRoute(world, k, targetId) {
  if (targetId === k.roomId) {
    k.targetRoomId = targetId;
    k.route = [k.roomId];
    k.routeIndex = 0;
    return;
  }
  const path = bfsPath(world.adj, k.roomId, targetId);
  if (!path) {
    k.targetRoomId = null;
    k.route = null;
    k.routeIndex = 0;
    return;
  }
  k.targetRoomId = targetId;
  k.route = path;
  k.routeIndex = 1;
}

/**
 * Advance the knight one step along its route.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 * @param {number} speed
 */
export function moveAlongRoute(world, k, speed) {
  if (!k.route || k.routeIndex >= k.route.length) return;

  const nextId = k.route[k.routeIndex];
  const nextRoom = world.roomsById.get(nextId);
  if (!nextRoom) {
    k.route = null;
    k.targetRoomId = null;
    k.routeIndex = 0;
    return;
  }

  const dx = nextRoom.cx - k.x;
  const dy = nextRoom.cy - k.y;
  const dist = Math.hypot(dx, dy);
  const arrive = world.data.balance.knight.arriveRadius;

  if (dist <= arrive) {
    k.x = nextRoom.cx;
    k.y = nextRoom.cy;
    k.roomId = nextId;
    k.routeIndex += 1;
    if (k.routeIndex >= k.route.length) {
      k.targetRoomId = null;
      k.route = null;
      k.routeIndex = 0;
    }
  } else {
    const step = Math.min(speed, dist);
    k.x += (dx / dist) * step;
    k.y += (dy / dist) * step;
  }
}

/**
 * Pick a fresh destination for the knight based on its rank.
 * @param {import('./world.js').World} world
 * @param {Knight} k
 */
export function reassignTarget(world, k) {
  const rank = RANK_ORDER[rankIndexForLevel(k.level, world.data.balance.rankThresholds)];
  const zone = world.data.balance.population.zoneByRank[rank];
  if (!zone || zone.length === 0) return;

  const options = zone.filter(id => id !== k.roomId);
  if (options.length === 0) return;

  assignRoute(world, k, world.rng.pick(options));
}

function rankIndexForLevel(level, thresholds) {
  if (level < thresholds.D) return 0;
  if (level < thresholds.C) return 1;
  if (level < thresholds.B) return 2;
  if (level < thresholds.A) return 3;
  return 4;
}
