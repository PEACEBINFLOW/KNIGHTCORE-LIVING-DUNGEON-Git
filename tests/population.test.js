import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PopulationController, dungeonRankOf } from '../src/core/population.js';
import { createRng } from '../src/core/rng.js';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

const balance = load('balance');
const rooms = load('rooms');
const roomsById = new Map(rooms.map(r => [r.id, r]));

function makePop(seed = 1) {
  return new PopulationController(balance, createRng(seed), roomsById);
}

test('targetMonsterCount formula', () => {
  const pop = makePop();
  assert.equal(pop.targetMonsterCount(1), 3);
  assert.equal(pop.targetMonsterCount(10), 11); // 3 + floor(8.5)
  assert.equal(pop.targetMonsterCount(20), 20); // 3 + 17
});

test('targetMonsterCount never exceeds 40', () => {
  const pop = makePop();
  assert.equal(pop.targetMonsterCount(1000), 40);
  assert.equal(pop.targetMonsterCount(100), 40);
  assert.equal(pop.targetMonsterCount(43.6), 40);
});

test('pickBaseRank respects weights (D-only at level 1)', () => {
  const pop = makePop(1234);
  for (let i = 0; i < 500; i++) {
    assert.equal(pop.pickBaseRank(1), 'D');
  }
});

test('pickBaseRank stays inside C/D at level 10', () => {
  const pop = makePop(77);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(pop.pickBaseRank(10));
  for (const r of seen) assert.ok(r === 'C' || r === 'D', `saw rank ${r}`);
});

test('pickBaseRank stays inside A/B/C at level 30', () => {
  const pop = makePop(42);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) seen.add(pop.pickBaseRank(30));
  for (const r of seen) assert.ok(['A', 'B', 'C'].includes(r), `saw rank ${r}`);
});

test('dungeonRankOf thresholds', () => {
  assert.equal(dungeonRankOf(0, balance.rankThresholds), 'D');
  assert.equal(dungeonRankOf(5, balance.rankThresholds), 'D');
  assert.equal(dungeonRankOf(6, balance.rankThresholds), 'C');
  assert.equal(dungeonRankOf(12, balance.rankThresholds), 'C');
  assert.equal(dungeonRankOf(13, balance.rankThresholds), 'B');
  assert.equal(dungeonRankOf(20, balance.rankThresholds), 'B');
  assert.equal(dungeonRankOf(21, balance.rankThresholds), 'A');
  assert.equal(dungeonRankOf(35, balance.rankThresholds), 'A');
  assert.equal(dungeonRankOf(36, balance.rankThresholds), 'S');
  assert.equal(dungeonRankOf(100, balance.rankThresholds), 'S');
});

test('pickRoom always returns a room from the correct zone', () => {
  const pop = makePop(9);
  for (const rank of ['D', 'C', 'B', 'A', 'S']) {
    const zone = balance.population.zoneByRank[rank];
    for (let i = 0; i < 50; i++) {
      const room = pop.pickRoom(rank);
      assert.ok(room);
      assert.ok(zone.includes(room.id), `${room.id} not in zone ${rank}`);
    }
  }
});
