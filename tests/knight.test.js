import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from '../src/core/world.js';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

function makeWorld(seed = 1234) {
  const data = {
    rooms: load('rooms'),
    paths: load('paths'),
    monsters: load('monsters'),
    names: load('names'),
    balance: load('balance'),
  };
  return new World({ seed, data });
}

function tickN(world, n) {
  for (let i = 0; i < n; i++) world.tick(16.67);
}

test('knight retreats below 28% HP', () => {
  const world = makeWorld();
  const k = world.knights[0];

  // Place the knight in z1 (far from camp) with low HP and no combat.
  const z1 = world.roomsById.get('z1');
  k.hp = k.maxHP * 0.2;
  k.roomId = 'z1';
  k.x = z1.cx;
  k.y = z1.cy;
  k.combatTarget = null;
  k.targetRoomId = null;
  k.route = null;

  // Remove all monsters so nothing interrupts the test.
  world.monsters.length = 0;

  const camp = world.roomsById.get('camp');
  const before = Math.hypot(k.x - camp.cx, k.y - camp.cy);

  tickN(world, 60);

  const after = Math.hypot(k.x - camp.cx, k.y - camp.cy);
  assert.ok(after < before, `expected to move toward camp: ${before} → ${after}`);
});

test('knight heals while at camp below max HP', () => {
  const world = makeWorld();
  const k = world.knights[0];
  const camp = world.roomsById.get('camp');

  k.roomId = 'camp';
  k.x = camp.cx;
  k.y = camp.cy;
  k.hp = Math.floor(k.maxHP * 0.5);
  k.combatTarget = null;
  k.targetRoomId = null;
  k.route = null;
  world.monsters.length = 0;

  const before = k.hp;
  tickN(world, 30);
  assert.ok(k.hp > before, `expected healing: ${before} → ${k.hp}`);
  assert.ok(k.hp <= k.maxHP);
});

test('knight levels up when XP passes xpNext', () => {
  const world = makeWorld();
  const k = world.knights[0];
  const beforeLevel = k.level;
  const beforeXpNext = k.xpNext;

  const gained = k.gainXP(beforeXpNext, world.data.balance.xpCurve);

  assert.ok(gained >= 1);
  assert.equal(k.level, beforeLevel + gained);
  assert.ok(k.xpNext > 0);
  assert.ok(k.maxHP > 0);
});

test('knight respawns at camp after death', () => {
  const world = makeWorld();
  const k = world.knights[0];

  // Park the knight in z1 and give it a lethal encounter.
  const z1 = world.roomsById.get('z1');
  k.roomId = 'z1';
  k.x = z1.cx;
  k.y = z1.cy;
  k.hp = 1;
  k.combatTarget = null;

  // Drop a lethal "monster" right on top of the knight.
  world.monsters.length = 0;
  world.monsters.push({
    id: 'test_monster',
    name: 'Test Monster',
    emoji: '💀',
    rank: 'D',
    hp: 9999,
    maxHP: 9999,
    atk: 99999,
    xp: 0,
    gold: 0,
    roomId: 'z1',
    x: z1.cx,
    y: z1.cy,
    vx: 0,
    vy: 0,
  });
  k.combatTarget = 'test_monster';
  k.combatTimer = 1;

  // A handful of ticks is enough — the strike + counter happens on the first.
  tickN(world, 5);

  assert.equal(k.roomId, 'camp');
  assert.ok(k.hp > 0);
  assert.ok(k.hp <= k.maxHP);
});
