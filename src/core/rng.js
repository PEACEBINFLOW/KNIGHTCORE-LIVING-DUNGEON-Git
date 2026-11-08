// src/core/rng.js
//
// Deterministic 32-bit PRNG (mulberry32).
// Every random choice in the simulation flows through this file.
// Same seed + same call sequence ⇒ same output, always.
// No Math.random() is allowed anywhere in src/core/.

/**
 * Mulberry32 PRNG.
 * @param {number} seed - 32-bit integer seed
 * @returns {() => number} function returning floats in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded RNG object with helpers. All helpers advance the same stream.
 * @param {number} seed
 */
export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Integer in [min, max] inclusive. */
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** Float in [min, max). */
    float(min, max) {
      return next() * (max - min) + min;
    },
    /** Uniformly random element of a non-empty array. */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
  };
}
