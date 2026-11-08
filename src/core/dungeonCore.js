// src/core/dungeonCore.js
//
// The Dungeon Core — the dungeon's "AI brain". Reads the whole world state
// every tick and reacts (elite promotion, corruption on boss kills).

const RANK_ORDER = ['D', 'C', 'B', 'A', 'S'];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Dungeon Core state and decision helpers.
 */
export class DungeonCore {
  /**
   * @param {object} balance - balance.dungeonCore from data/balance.json
   * @param {{ chance: (p: number) => boolean }} rng
   */
  constructor(balance, rng) {
    this.balance = balance;
    this.rng = rng;

    this.energy = balance.energy;
    this.corruption = balance.corruption;
    this.hunger = balance.hunger;
    this.pressure = balance.pressure;
    this.bossesDefeated = balance.bossesDefeated;
    this.dominantRank = balance.dominantRank;

    /** @type {import('./events.js').EventBus | null} */
    this.events = null;
    this.currentTick = 0;
  }

  /**
   * Recompute the four live meters from the current world state.
   * @param {Array<object>} monsters
   * @param {Array<object>} knights
   * @param {number} avgLevel
   * @param {number} targetMonsters
   */
  update(monsters, knights, avgLevel, targetMonsters) {
    const b = this.balance;
    const mCount = monsters.length;
    const kCount = Math.max(1, knights.length);
    const fighting = knights.filter(k => k.combatTarget).length;

    this.energy = clamp(
      this.energy + b.energyRegen - mCount * b.energyDrainPerMonster,
      0,
      100
    );
    this.hunger = clamp(
      100 - (mCount / Math.max(1, targetMonsters)) * 100,
      0,
      100
    );
    this.corruption = clamp(
      b.corruptionBase + this.bossesDefeated * b.corruptionPerBoss + avgLevel * b.corruptionPerAvgLevel,
      0,
      100
    );
    this.pressure = clamp((fighting / kCount) * 100, 0, 100);
  }

  /**
   * True when corruption is high AND the seeded 30% roll succeeds.
   * @returns {boolean}
   */
  shouldSpawnElite() {
    return (
      this.corruption > this.balance.eliteCorruptionThreshold &&
      this.rng.chance(this.balance.eliteChance)
    );
  }

  /**
   * Feed a kill back into the Core. A/S-rank kills count as boss kills.
   * @param {string} rank
   */
  recordKill(rank) {
    if (!this.balance.bossRanks.includes(rank)) return;

    this.bossesDefeated += 1;
    this.energy = clamp(this.energy - this.balance.bossKillEnergyCost, 0, 100);
    this.corruption = clamp(this.corruption + this.balance.bossKillCorruptionGain, 0, 100);

    if (this.events) {
      this.events.emit('log', {
        tick: this.currentTick,
        type: 'core',
        message: `⚙ Dungeon Core responds — corruption rising (${Math.round(this.corruption)})`,
        value: this.corruption,
      });
    }
  }

  /**
   * Given a base rank, return the final spawn rank (may be promoted by 1).
   * Never exceeds 'S'.
   * @param {string} baseRank
   * @returns {string}
   */
  getSpawnRank(baseRank) {
    if (!this.shouldSpawnElite()) return baseRank;
    const i = RANK_ORDER.indexOf(baseRank);
    if (i < 0) return baseRank;
    return RANK_ORDER[Math.min(i + 1, RANK_ORDER.length - 1)];
  }

  /**
   * State label shown on the map. Priority: HUNGRY > CORRUPTED > PRESSURED > DEPLETED > STABLE.
   * @returns {string}
   */
  stateLabel() {
    const t = this.balance.stateThresholds;
    if (this.hunger > t.hunger) return 'HUNGRY';
    if (this.corruption > t.corruption) return 'CORRUPTED';
    if (this.pressure > t.pressure) return 'PRESSURED';
    if (this.energy < t.energyLow) return 'DEPLETED';
    return 'STABLE';
  }
}
