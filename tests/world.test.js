import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from '../src/core/world.js';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

const DATA = {
  rooms: load('rooms'),
  paths: load('paths'),
  monsters: load('monsters'),
  names: load('names'),
  balance: load('balance'),
};

function makeWorld(seed) {
  return new World({ seed, data: DATA });
}

function tickN(world, n) {
  for (let i = 0; i < n; i++) world.tick(16.67);
}

test('determinism: same seed → identical snapshot after 5000 ticks', () => {
  const a = makeWorld(1234);
  const b = makeWorld(1234);
  tickN(a, 5000);
  tickN(b, 5000);

  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('invariants hold over 20000 ticks for 5 seeds', () => {
  const seeds = [1, 42, 1234, 7777, 55555];

  for (const seed of seeds) {
    const world = makeWorld(seed);

    for (let t = 0; t < 20000; t++) {
      world.tick(16.67);
    }

    const snap = world.snapshot();

    // No NaN in any number field.
    const nanCheck = (v, label) => {
      if (typeof v === 'number') assert.ok(Number.isFinite(v), `NaN/Inf at ${label}: ${v}`);
      else if (Array.isArray(v)) v.forEach((x, i) => nanCheck(x, `${label}[${i}]`));
      else if (v && typeof v === 'object') {
        for (const k of Object.keys(v)) nanCheck(v[k], `${label}.${k}`);
      }
    };
    nanCheck(snap, `seed=${seed}`);

    // Knight HP in [0, maxHP].
    for (const k of snap.knights) {
      assert.ok(k.hp >= 0, `hp >= 0 (${k.id})`);
      assert.ok(k.hp <= k.maxHP, `hp <= maxHP (${k.id}: ${k.hp}/${k.maxHP})`);
    }

    // Monster HP in [0, maxHP].
    for (const m of snap.monsters) {
      assert.ok(m.hp >= 0);
      assert.ok(m.hp <= m.maxHP);
    }

    // Positions inside the map bounds.
    for (const k of snap.knights) {
      assert.ok(k.x >= 0 && k.x <= 860, `knight x ${k.id}: ${k.x}`);
      assert.ok(k.y >= 0 && k.y <= 580, `knight y ${k.id}: ${k.y}`);
    }
    for (const m of snap.monsters) {
      assert.ok(m.x >= 0 && m.x <= 860);
      assert.ok(m.y >= 0 && m.y <= 580);
    }

    // Monster count never exceeds 40.
    assert.ok(snap.monsters.length <= 40, `monster cap (${snap.monsters.length})`);

    // Knight count is always 8.
    assert.equal(snap.knights.length, 8);
  }
});

test('ecosystem balance: 60000 ticks → level > 1 and at least one kill', () => {
  const world = makeWorld(2024);
  tickN(world, 60000);

  const snap = world.snapshot();

  const totalKills = snap.knights.reduce((a, k) => a + k.kills, 0);
  assert.ok(totalKills > 0, `expected at least one kill, got ${totalKills}`);
  assert.ok(snap.avgKnightLevel > 1, `expected avg level > 1, got ${snap.avgKnightLevel}`);
});
