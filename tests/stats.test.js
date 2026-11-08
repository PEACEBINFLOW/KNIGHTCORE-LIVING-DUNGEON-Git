import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gradeOf,
  rankOfLevel,
  KnightStats,
  computeDerived,
  computeBodyTraits,
} from '../src/core/stats.js';

function mockRng() {
  return { int: () => 0 };
}

test('gradeOf boundaries', () => {
  assert.equal(gradeOf(9), 'F');
  assert.equal(gradeOf(10), 'E');
  assert.equal(gradeOf(19), 'E');
  assert.equal(gradeOf(20), 'D');
  assert.equal(gradeOf(35), 'C');
  assert.equal(gradeOf(50), 'B');
  assert.equal(gradeOf(65), 'A');
  assert.equal(gradeOf(80), 'S');
  assert.equal(gradeOf(94), 'S');
  assert.equal(gradeOf(95), 'SS');
});

test('rankOfLevel thresholds', () => {
  const t = { D: 6, C: 13, B: 21, A: 36 };
  assert.equal(rankOfLevel(1, t), 'D');
  assert.equal(rankOfLevel(5, t), 'D');
  assert.equal(rankOfLevel(6, t), 'C');
  assert.equal(rankOfLevel(12, t), 'C');
  assert.equal(rankOfLevel(13, t), 'B');
  assert.equal(rankOfLevel(20, t), 'B');
  assert.equal(rankOfLevel(21, t), 'A');
  assert.equal(rankOfLevel(35, t), 'A');
  assert.equal(rankOfLevel(36, t), 'S');
});

test('computeDerived formula', () => {
  const d = computeDerived({ STR: 20, AGI: 10, VIT: 10, AUR: 10, INT: 10 });
  assert.equal(d.ATK, 34); // 20*1.5 + 10*0.4 = 30 + 4
});

test('KnightStats.levelUp increments', () => {
  const s = new KnightStats(mockRng());
  const before = { STR: s.STR, AGI: s.AGI, VIT: s.VIT, AUR: s.AUR, INT: s.INT };
  s.levelUp();
  assert.equal(s.STR, before.STR + 2);
  assert.equal(s.AGI, before.AGI + 1);
  assert.equal(s.VIT, before.VIT + 2);
  assert.equal(s.AUR, before.AUR + 1);
  assert.equal(s.INT, before.INT + 1);
});

test('computeBodyTraits ENDURANCE condition', () => {
  const b = computeBodyTraits({ STR: 20, AGI: 20, VIT: 40, AUR: 20, INT: 20 });
  assert.equal(b.ENDURANCE, null); // VIT is exactly 40, condition is > 40
});
