import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KnightStats,
  computeDerived,
  computeBodyTraits,
  computeAuraTraits,
  gradeOf,
} from '../src/core/stats.js';
import { createRng } from '../src/core/rng.js';

function statsWith(v) {
  const s = new KnightStats(createRng(0));
  s.STR = v.STR;
  s.AGI = v.AGI;
  s.VIT = v.VIT;
  s.AUR = v.AUR;
  s.INT = v.INT;
  return s;
}

test('derived stats match formulas for STR=AGI=VIT=AUR=INT=20', () => {
  const d = computeDerived({ STR: 20, AGI: 20, VIT: 20, AUR: 20, INT: 20 });
  assert.equal(d.ATK, 38);   // 20*1.5 + 20*0.4 = 30 + 8
  assert.equal(d.DEF, 34);   // 20*1.4 + 20*0.3 = 28 + 6
  assert.equal(d.SPD, 26);   // 20*1.3
  assert.equal(d.DODGE, 20); // 20*0.7 + 20*0.3 = 14 + 6
  assert.equal(d.PARRY, 22); // 20*0.4 + 20*0.5 + 20*0.2 = 8 + 10 + 4
  assert.equal(d.BLOCK, 28); // 20*0.8 + 20*0.6 = 16 + 12
  assert.equal(d.STAMINA, 50); // 20*2 + 20*0.5 = 40 + 10
  assert.equal(d.maxHP, 320);  // 20*12 + 20*4 = 240 + 80
  assert.equal(d.maxAura, 300); // 20*10 + 20*5 = 200 + 100
  assert.equal(d.AURA_REGEN, 16); // 20*0.6 + 20*0.2 = 12 + 4
});

test('body traits — low stats → conditional traits are null', () => {
  const b = computeBodyTraits({ STR: 20, AGI: 20, VIT: 20, AUR: 20, INT: 20 });
  assert.equal(b.VISION, 24);
  assert.equal(b.LUNG, 20);
  assert.equal(b.GRIP, 24);
  assert.equal(b.BALANCE, 20);
  assert.equal(b.REFLEX, 26);
  assert.equal(b.ENDURANCE, null);
});

test('body traits — high stats → ENDURANCE present', () => {
  const b = computeBodyTraits({ STR: 50, AGI: 20, VIT: 50, AUR: 60, INT: 50 });
  assert.equal(b.ENDURANCE, 85); // 50*1.2 + 50*0.5 = 60 + 25
});

test('aura traits — high stats → conditional traits present', () => {
  const a = computeAuraTraits({ STR: 20, AGI: 20, VIT: 20, AUR: 60, INT: 50 });
  assert.equal(a.AURA_VISION, 83);   // 60*0.8 + 50*0.7
  assert.equal(a.AURA_PRESSURE, 78); // 60*1.3
  assert.equal(a.AURA_INSTINCT, 54); // 20*0.6 + 60*0.7 = 12 + 42
  assert.equal(a.FLOW, 56);          // 60*0.8 + 20*0.4 = 48 + 8
});

test('aura traits — low stats → conditionals null', () => {
  const a = computeAuraTraits({ STR: 20, AGI: 20, VIT: 20, AUR: 20, INT: 20 });
  assert.equal(a.AURA_VISION, null);
  assert.equal(a.AURA_PRESSURE, null);
  assert.equal(a.AURA_INSTINCT, 26);
  assert.equal(a.FLOW, 24);
});

test('grade boundaries', () => {
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
  assert.equal(gradeOf(1000), 'SS');
});

test('level-up adds the exact increments', () => {
  const s = statsWith({ STR: 20, AGI: 20, VIT: 20, AUR: 20, INT: 20 });
  s.levelUp();
  assert.equal(s.STR, 22);
  assert.equal(s.AGI, 21);
  assert.equal(s.VIT, 22);
  assert.equal(s.AUR, 21);
  assert.equal(s.INT, 21);
});
