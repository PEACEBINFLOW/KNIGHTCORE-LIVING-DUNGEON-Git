// src/core/stats.js
//
// Knight stat block, derived combat values, body traits, aura traits, and
// letter grades. All derived values are floored per the spec.

export const RANK_COLORS = {
  SS: '#ff8800',
  S: '#ff3322',
  A: '#cc4488',
  B: '#c8a030',
  C: '#60aacc',
  D: '#70aa60',
  E: '#666',
  F: '#444',
};

/**
 * Letter grade for a numeric stat value.
 * @param {number} v
 * @returns {'SS'|'S'|'A'|'B'|'C'|'D'|'E'|'F'}
 */
export function gradeOf(v) {
  if (v >= 95) return 'SS';
  if (v >= 80) return 'S';
  if (v >= 65) return 'A';
  if (v >= 50) return 'B';
  if (v >= 35) return 'C';
  if (v >= 20) return 'D';
  if (v >= 10) return 'E';
  return 'F';
}

/**
 * Base stat block rolled at knight creation.
 */
export class KnightStats {
  /** @param {import('./rng.js').createRng extends (...args: any[]) => infer R ? R : any} rng */
  constructor(rng) {
    this.STR = 15 + rng.int(0, 19);
    this.AGI = 15 + rng.int(0, 19);
    this.VIT = 15 + rng.int(0, 19);
    this.AUR = 12 + rng.int(0, 19);
    this.INT = 12 + rng.int(0, 17);
  }

  /** Apply the fixed level-up increments. */
  levelUp() {
    this.STR += 2;
    this.AGI += 1;
    this.VIT += 2;
    this.AUR += 1;
    this.INT += 1;
  }
}

/**
 * Derived combat stats. All values floored.
 * @param {{ STR: number, AGI: number, VIT: number, AUR: number, INT: number }} s
 */
export function computeDerived(s) {
  const { STR, AGI, VIT, AUR, INT } = s;
  return {
    ATK: Math.floor(STR * 1.5 + AGI * 0.4),
    DEF: Math.floor(VIT * 1.4 + STR * 0.3),
    SPD: Math.floor(AGI * 1.3),
    DODGE: Math.floor(AGI * 0.7 + INT * 0.3),
    PARRY: Math.floor(AGI * 0.4 + STR * 0.5 + INT * 0.2),
    BLOCK: Math.floor(STR * 0.8 + VIT * 0.6),
    STAMINA: Math.floor(VIT * 2 + STR * 0.5),
    maxHP: Math.floor(VIT * 12 + STR * 4),
    maxAura: Math.floor(AUR * 10 + INT * 5),
    AURA_REGEN: Math.floor(AUR * 0.6 + VIT * 0.2),
  };
}

/**
 * Body traits. ENDURANCE is null unless VIT > 40 and STR > 30.
 * @param {{ STR: number, AGI: number, VIT: number, AUR: number, INT: number }} s
 */
export function computeBodyTraits(s) {
  const { STR, AGI, VIT, AUR, INT } = s;
  return {
    VISION: Math.floor(INT * 0.8 + AUR * 0.4),
    LUNG: Math.floor(VIT * 0.7 + STR * 0.3),
    GRIP: Math.floor(STR * 1.2),
    BALANCE: Math.floor(AGI * 0.6 + VIT * 0.4),
    REFLEX: Math.floor(AGI * 0.8 + INT * 0.5),
    ENDURANCE:
      VIT > 40 && STR > 30 ? Math.floor(VIT * 1.2 + STR * 0.5) : null,
  };
}

/**
 * Aura traits. AURA_VISION and AURA_PRESSURE are conditional.
 * @param {{ STR: number, AGI: number, VIT: number, AUR: number, INT: number }} s
 */
export function computeAuraTraits(s) {
  const { AGI, VIT, AUR, INT } = s;
  return {
    AURA_VISION:
      AUR > 45 && INT > 40 ? Math.floor(AUR * 0.8 + INT * 0.7) : null,
    AURA_PRESSURE: AUR > 50 ? Math.floor(AUR * 1.3) : null,
    AURA_INSTINCT: Math.floor(AGI * 0.6 + AUR * 0.7),
    FLOW: Math.floor(AUR * 0.8 + VIT * 0.4),
  };
}
