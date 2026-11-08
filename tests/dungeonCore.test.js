import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DungeonCore } from '../src/core/dungeonCore.js';
import { createRng } from '../src/core/rng.js';

const balance = JSON.parse(
  readFileSync(new URL('../data/balance.json', import.meta.url), 'utf8')
).dungeonCore;

function makeCore(rngOverrides = {}) {
  const rng = { chance: () => false, ...rngOverrides };
  return new DungeonCore(balance, rng);
}

test('hunger is 100 with zero monsters', () => {
  const core = makeCore();
  core.update([], [], 1, 10);
  assert.equal(core.hunger, 100);
});

test('corruption rises after an A or S kill', () => {
  const core = makeCore();
  const before = core.corruption;
  core.recordKill('A');
  assert.ok(core.corruption > before);

  const before2 = core.corruption;
  core.recordKill('S');
  assert.ok(core.corruption > before2);
});

test('recordKill ignores non-boss ranks', () => {
  const core = makeCore();
  const before = core.corruption;
  const bosses = core.bossesDefeated;
  core.recordKill('D');
  core.recordKill('C');
  core.recordKill('B');
  assert.equal(core.corruption, before);
  assert.equal(core.bossesDefeated, bosses);
});

test('elite promotion never goes above S', () => {
  const core = makeCore({ chance: () => true });
  core.corruption = 70;
  assert.equal(core.getSpawnRank('S'), 'S');
  assert.equal(core.getSpawnRank('A'), 'S');
  assert.equal(core.getSpawnRank('D'), 'C');
});

test('no elite promotion when corruption is low', () => {
  const core = makeCore({ chance: () => true });
  core.corruption = 10;
  assert.equal(core.getSpawnRank('D'), 'D');
  assert.equal(core.getSpawnRank('S'), 'S');
});

test('state label priority: HUNGRY beats everything', () => {
  const core = makeCore();
  core.hunger = 80;
  core.corruption = 80;
  core.pressure = 80;
  core.energy = 10;
  assert.equal(core.stateLabel(), 'HUNGRY');
});

test('state label priority: CORRUPTED beats PRESSURED/DEPLETED', () => {
  const core = makeCore();
  core.hunger = 0;
  core.corruption = 80;
  core.pressure = 80;
  core.energy = 10;
  assert.equal(core.stateLabel(), 'CORRUPTED');
});

test('state label priority: PRESSURED beats DEPLETED', () => {
  const core = makeCore();
  core.hunger = 0;
  core.corruption = 0;
  core.pressure = 80;
  core.energy = 10;
  assert.equal(core.stateLabel(), 'PRESSURED');
});

test('state label priority: DEPLETED beats STABLE', () => {
  const core = makeCore();
  core.hunger = 0;
  core.corruption = 0;
  core.pressure = 0;
  core.energy = 10;
  assert.equal(core.stateLabel(), 'DEPLETED');
});

test('state label is STABLE when nothing is high', () => {
  const core = makeCore();
  core.hunger = 10;
  core.corruption = 10;
  core.pressure = 10;
  core.energy = 80;
  assert.equal(core.stateLabel(), 'STABLE');
});
