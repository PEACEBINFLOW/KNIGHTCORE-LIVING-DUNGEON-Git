import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGraph, bfsPath } from '../src/core/graph.js';

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));

const rooms = load('rooms');
const paths = load('paths');
const adj = buildGraph(rooms, paths);

test('BFS finds a valid path from z1 to boss', () => {
  const path = bfsPath(adj, 'z1', 'boss');
  assert.ok(path, 'expected a path from z1 to boss');
  assert.equal(path[0], 'z1');
  assert.equal(path[path.length - 1], 'boss');
  for (let i = 1; i < path.length; i++) {
    assert.ok(adj.get(path[i - 1]).includes(path[i]), `edge ${path[i - 1]}→${path[i]}`);
  }
});

test('every room is reachable from camp', () => {
  for (const r of rooms) {
    if (r.id === 'camp') continue;
    const path = bfsPath(adj, 'camp', r.id);
    assert.ok(path, `unreachable: ${r.id}`);
    assert.equal(path[0], 'camp');
    assert.equal(path[path.length - 1], r.id);
  }
});

test('bfsPath returns null for unknown endpoints', () => {
  assert.equal(bfsPath(adj, 'z1', 'no_such_room'), null);
  assert.equal(bfsPath(adj, 'no_such_room', 'z1'), null);
});

test('bfsPath returns [from] when from === to', () => {
  assert.deepEqual(bfsPath(adj, 'z1', 'z1'), ['z1']);
});
