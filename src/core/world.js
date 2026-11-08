// src/core/world.js
//
// The World owns all simulation state. Everything here is deterministic:
// same seed + same tick sequence ⇒ identical world.
//
// Does NOT touch the DOM. Runs in Node and the browser identically.
// Rendering is separate: call world.snapshot() and draw that.

import { EventBus } from './events.js';
import { createRng } from './rng.js';
import { buildGraph } from './graph.js';
import { KnightStats, rankOfLevel } from './stats.js';
import { Knight, updateKnight, combatInterval } from './knight.js';
import { DungeonCore } from './dungeonCore.js';
import { PopulationController } from './population.js';

/** Nominal fixed timestep. main.js accumulates real time and calls tick(16.67). */
export const TICK_MS = 1000 / 60;

/** Population controller runs every ~3.5 s of simulation time. */
export const SPAWN_INTERVAL_TICKS = Math.round(3500 / TICK_MS);

export class World {
  /**
   * @param {{ seed: number, data: object }} opts
   */
  constructor({ seed, data }) {
    this.seed = seed;
    this.data = data;
    this.rng = createRng(seed);
    this.events = new EventBus();

    this.rooms = data.rooms;
    this.roomsById = new Map(this.rooms.map(r => [r.id, r]));
    this.adj = buildGraph(this.rooms, data.paths);

    this.mapWidth = data.balance.map.width;
    this.mapHeight = data.balance.map.height;

    this.tickCount = 0;
    this.populationTicks = 0;
    this.monsters = [];
    this.monsterIdCounter = 0;

    this.core = new DungeonCore(data.balance.dungeonCore, this.rng);
    this.core.events = this.events;

    this.population = new PopulationController(
      data.balance,
      this.rng,
      this.roomsById
    );

    this.knights = [];
    this._spawnKnights();
    this._initialSpawn();
  }

  _spawnKnights() {
    const b = this.data.balance;
    const roster = this.data.names.knights.slice(0, b.startKnights);
    const camp = this.roomsById.get('camp');
    const jitter = b.knight.spawnJitter;

    for (let i = 0; i < roster.length; i++) {
      const stats = new KnightStats(this.rng);
      const x = camp.cx + this.rng.float(-jitter, jitter);
      const y = camp.cy + this.rng.float(-jitter, jitter);

      const k = new Knight({
        id: `knight_${i}`,
        name: roster[i].name,
        rune: roster[i].rune,
        stats,
        x,
        y,
        balance: { ...b.knight, xpCurve: b.xpCurve },
      });
      this.knights.push(k);
    }
  }

  _initialSpawn() {
    const target = this.population.targetMonsterCount(1);
    for (let i = 0; i < target; i++) this.spawnMonster();
  }

  /** Try to spawn one monster via the population controller. */
  spawnMonster() {
    const m = this.population.trySpawn(this);
    if (!m) return;

    this.monsters.push(m);
    const room = this.roomsById.get(m.roomId);
    this.events.emit('log', {
      tick: this.tickCount,
      type: 'spawn',
      message: `👾 ${m.name} [${m.rank}] spawned in ${room ? room.name : m.roomId}`,
      actorId: m.id,
      roomId: m.roomId,
      value: m.rank,
    });
  }

  /** @returns {number} */
  avgKnightLevel() {
    if (this.knights.length === 0) return 1;
    let sum = 0;
    for (const k of this.knights) sum += k.level;
    return sum / this.knights.length;
  }

  /**
   * Advance the world by one fixed step.
   * The parameter exists for API compatibility; one call = one fixed step
   * regardless of dtMs (main.js is responsible for accumulating wall time).
   * @param {number} [dtMs]
   */
  tick(dtMs) {
    this.tickCount += 1;
    this.core.currentTick = this.tickCount;
    this._step();
  }

  _step() {
    const avgLevel = this.avgKnightLevel();
    const target = this.population.targetMonsterCount(avgLevel);

    this.core.update(this.monsters, this.knights, avgLevel, target);

    for (const k of this.knights) updateKnight(this, k);

    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      this._updateMonster(m);
    }

    this.populationTicks += 1;
    if (this.populationTicks >= SPAWN_INTERVAL_TICKS) {
      this.populationTicks = 0;
      this.spawnMonster();
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      if (this.monsters[i].hp <= 0) this.monsters.splice(i, 1);
    }
  }

  _updateMonster(m) {
    const room = this.roomsById.get(m.roomId);
    if (!room) return;

    m.x += m.vx;
    m.y += m.vy;
    const pad = 8;
    if (m.x < room.x + pad) { m.x = room.x + pad; m.vx = Math.abs(m.vx); }
    if (m.x > room.x + room.w - pad) { m.x = room.x + room.w - pad; m.vx = -Math.abs(m.vx); }
    if (m.y < room.y + pad) { m.y = room.y + pad; m.vy = Math.abs(m.vy); }
    if (m.y > room.y + room.h - pad) { m.y = room.y + room.h - pad; m.vy = -Math.abs(m.vy); }
    if (this.rng.chance(0.01)) {
      m.vx = this.rng.float(-0.4, 0.4);
      m.vy = this.rng.float(-0.4, 0.4);
    }

    const cb = this.data.balance.combat;
    const kb = this.data.balance.knight;
    for (const k of this.knights) {
      if (k.combatTarget) continue;
      if (k.hp / k.maxHP <= kb.retreatHpFraction) continue;
      if (Math.hypot(k.x - m.x, k.y - m.y) <= cb.ambushRadius) {
        k.combatTarget = m.id;
        k.combatTimer = combatInterval(this, k);
        this.events.emit('log', {
          tick: this.tickCount,
          type: 'combat',
          message: `⚔ ${m.name} ambushes ${k.name}!`,
          actorId: k.id,
          roomId: k.roomId,
          value: m.rank,
        });
        break;
      }
    }
  }

  /**
   * Plain JSON-safe snapshot. No functions, no Maps, no undefined.
   * @returns {object}
   */
  snapshot() {
    const thresholds = this.data.balance.rankThresholds;
    return {
      tick: this.tickCount,
      seed: this.seed,
      rooms: this.rooms,
      paths: this.data.paths,
      knights: this.knights.map(k => ({
        id: k.id,
        name: k.name,
        rune: k.rune,
        level: k.level,
        rank: rankOfLevel(k.level, thresholds),
        xp: k.xp,
        xpNext: k.xpNext,
        gold: k.gold,
        kills: k.kills,
        hp: k.hp,
        maxHP: k.maxHP,
        aura: k.aura,
        maxAura: k.maxAura,
        roomId: k.roomId,
        x: k.x,
        y: k.y,
        stats: {
          STR: k.stats.STR,
          AGI: k.stats.AGI,
          VIT: k.stats.VIT,
          AUR: k.stats.AUR,
          INT: k.stats.INT,
        },
        combatTarget: k.combatTarget,
        combatTimer: k.combatTimer,
      })),
      monsters: this.monsters.map(m => ({
        id: m.id,
        name: m.name,
        emoji: m.emoji,
        rank: m.rank,
        hp: m.hp,
        maxHP: m.maxHP,
        atk: m.atk,
        xp: m.xp,
        gold: m.gold,
        roomId: m.roomId,
        x: m.x,
        y: m.y,
      })),
      core: {
        energy: this.core.energy,
        corruption: this.core.corruption,
        hunger: this.core.hunger,
        pressure: this.core.pressure,
        bossesDefeated: this.core.bossesDefeated,
        dominantRank: this.core.dominantRank,
        state: this.core.stateLabel(),
      },
      avgKnightLevel: this.avgKnightLevel(),
    };
  }
}
