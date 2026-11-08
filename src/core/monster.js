// src/core/monster.js
//
// Monster entity. Populated from data/monsters.json at spawn time.
// Wandering and ambush behaviour live in world.js.

/**
 * A single monster.
 */
export class Monster {
  /**
   * @param {object} opts
   * @param {string} opts.id
   * @param {{ name: string, emoji: string, hp: number, atk: number, xp: number, gold: number }} opts.template
   * @param {string} opts.rank
   * @param {{ id: string, x: number, y: number, w: number, h: number }} opts.room
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.scale
   * @param {{ float: (min: number, max: number) => number }} opts.rng
   */
  constructor({ id, template, rank, room, x, y, scale, rng }) {
    this.id = id;
    this.name = template.name;
    this.emoji = template.emoji;
    this.rank = rank;
    this.roomId = room.id;

    this.maxHP = Math.max(1, Math.floor(template.hp * scale));
    this.hp = this.maxHP;
    this.atk = Math.max(1, Math.floor(template.atk * scale));
    this.xp = Math.max(1, Math.floor(template.xp * scale));
    this.gold = Math.max(0, Math.floor(template.gold * scale));

    this.x = x;
    this.y = y;
    this.vx = rng.float(-0.4, 0.4);
    this.vy = rng.float(-0.4, 0.4);
  }
}
