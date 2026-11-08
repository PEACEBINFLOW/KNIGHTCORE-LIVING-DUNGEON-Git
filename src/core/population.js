// src/core/population.js
//
// Spawn controller. Decides WHAT to spawn (weighted rank) and WHERE (zone),
// and hands the final decision to DungeonCore.getSpawnRank() for elite promotion.

import { Monster } from './monster.js';

/**
 * Dungeon rank (also used for knight rank) from a level and the configured thresholds.
 * @param {number} level
 * @param {{ D: number, C: number, B: number, A: number }} thresholds
 * @returns {'D'|'C'|'B'|'A'|'S'}
 */
export function dungeonRankOf(level, thresholds) {
  if (level < thresholds.D) return 'D';
  if (level < thresholds.C) return 'C';
  if (level < thresholds.B) return 'B';
  if (level < thresholds.A) return 'A';
  return 'S';
}

export class PopulationController {
  /**
   * @param {object} balance - full balance object
   * @param {{ float: Function, pick: Function }} rng
   * @param {Map<string, object>} roomsById
   */
  constructor(balance, rng, roomsById) {
    this.balance = balance;
    this.pop = balance.population;
    this.rng = rng;
    this.roomsById = roomsById;
  }

  /**
   * Target monster count for the given average knight level.
   * @param {number} avgLevel
   * @returns {number}
   */
  targetMonsterCount(avgLevel) {
    const p = this.pop;
    return Math.min(p.maxMonsters, Math.floor(p.baseCount + avgLevel * p.perAvgLevel));
  }

  /**
   * Weighted base-rank selection for the current average knight level.
   * @param {number} avgLevel
   * @returns {string}
   */
  pickBaseRank(avgLevel) {
    const rank = dungeonRankOf(avgLevel, this.balance.rankThresholds);
    const weights = this.pop.weights[rank];
    const roll = this.rng.float(0, 1);

    let acc = 0;
    let fallback = 'D';
    for (const [r, w] of Object.entries(weights)) {
      if (acc === 0) fallback = r;
      acc += w;
      if (roll < acc) return r;
    }
    return fallback;
  }

  /**
   * Pick a room for a monster rank.
   * @param {string} rank
   * @returns {object | undefined}
   */
  pickRoom(rank) {
    const zone = this.pop.zoneByRank[rank];
    if (!zone || zone.length === 0) return undefined;
    const roomId = this.rng.pick(zone);
    return this.roomsById.get(roomId);
  }

  /**
   * Stat multiplier for a monster spawned at the given average knight level.
   * @param {number} avgLevel
   * @returns {number}
   */
  scaleFor(avgLevel) {
    const s = this.balance.monsterScaling;
    return 1 + Math.max(0, avgLevel - s.fromAvgLevel) * s.perAvgLevel;
  }

  /**
   * Attempt to spawn one monster. Returns the new Monster, or null if the
   * population is already at (or above) its target.
   * @param {import('./world.js').World} world
   * @returns {Monster | null}
   */
  trySpawn(world) {
    const avgLevel = world.avgKnightLevel();
    const target = this.targetMonsterCount(avgLevel);
    if (world.monsters.length >= target) return null;

    const baseRank = this.pickBaseRank(avgLevel);
    const finalRank = world.core.getSpawnRank(baseRank);
    const room = this.pickRoom(finalRank);
    if (!room) return null;

    const templates = world.data.monsters[finalRank];
    if (!templates || templates.length === 0) return null;
    const template = this.rng.pick(templates);

    const scale = this.scaleFor(avgLevel);
    const x = room.cx + this.rng.float(-room.w / 3, room.w / 3);
    const y = room.cy + this.rng.float(-room.h / 3, room.h / 3);

    return new Monster({
      id: `monster_${world.monsterIdCounter++}`,
      template,
      rank: finalRank,
      room,
      x,
      y,
      scale,
      rng: this.rng,
    });
  }
}
