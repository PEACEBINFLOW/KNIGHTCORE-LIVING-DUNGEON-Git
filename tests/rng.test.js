import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';

test('same seed produces the same sequence', () => {
  const a = createRng(1234);
  const b = createRng(1234);
  for (let i = 0; i < 200; i++) assert.equal(a.next(), b.next());
});

test('different seeds produce different sequences', () => {
  const a = createRng(1234);
  const b = createRng(5678);
  let same = 0;
  for (let i = 0; i < 200; i++) if (a.next() === b.next()) same++;
  assert.ok(same < 20, `expected most values to differ, ${same} matched`);
});

test('int is inclusive and integer', () => {
  const rng = createRng(42);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const v = rng.int(3, 7);
    assert.ok(Number.isInteger(v));
    assert.ok(v >= 3 && v <= 7);
    seen.add(v);
  }
  for (const v of [3, 4, 5, 6, 7]) assert.ok(seen.has(v));
});

test('float is in [min, max)', () => {
  const rng = createRng(42);
  for (let i = 0; i < 2000; i++) {
    const v = rng.float(-1, 1);
    assert.ok(v >= -1 && v < 1);
  }
});

test('chance respects probability', () => {
  const rng = createRng(99);
  let hits = 0;
  for (let i = 0; i < 10000; i++) if (rng.chance(0.3)) hits++;
  assert.ok(hits > 2500 && hits < 3500, `got ${hits}`);
});

test('pick returns an element', () => {
  const rng = createRng(7);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i++) assert.ok(arr.includes(rng.pick(arr)));
});
