// src/main.js
//
// Wires the World, renderer, and UI together, and runs a fixed-timestep loop.
// The speed control multiplies the *number of ticks*, never the timestep.

import { World } from './core/world.js';
import { createMap } from './render/svgMap.js';
import { createPanel } from './ui/panel.js';
import { createChronicle } from './ui/chronicle.js';
import { createStatusWindow } from './ui/statusWindow.js';
import { createControls } from './ui/controls.js';

const STEP_MS = 16.67;
const MAX_STEPS_PER_FRAME = 60;

/**
 * Load all JSON data. Prefers an inlined data block (single-file build),
 * falls back to fetching from ../data/ (dev server).
 */
async function loadData() {
  if (typeof window !== 'undefined' && window.__KNIGHTCORE_DATA__) {
    return window.__KNIGHTCORE_DATA__;
  }
  const base = new URL('../data/', window.location.href).href;
  const [rooms, paths, monsters, names, balance] = await Promise.all([
    fetch(`${base}rooms.json`).then(r => r.json()),
    fetch(`${base}paths.json`).then(r => r.json()),
    fetch(`${base}monsters.json`).then(r => r.json()),
    fetch(`${base}names.json`).then(r => r.json()),
    fetch(`${base}balance.json`).then(r => r.json()),
  ]);
  return { rooms, paths, monsters, names, balance };
}

function readSeedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('seed');
  if (s == null) return 1234;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 1234;
}

function writeSeedToUrl(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState({}, '', url);
}

async function main() {
  const data = await loadData();
  const initialSeed = readSeedFromUrl();

  const mapContainer = document.getElementById('map-container');
  const coreBadgeRow = document.getElementById('core-badge-row');
  const coreMeters = document.getElementById('core-meters');
  const knightList = document.getElementById('knight-list');
  const monsterList = document.getElementById('monster-list');
  const knightCount = document.getElementById('knight-count');
  const monsterCount = document.getElementById('monster-count');
  const chronicleEl = document.getElementById('chronicle');
  const controlsEl = document.getElementById('controls');
  const statusEl = document.getElementById('status-window');

  const map = createMap(mapContainer, { rooms: data.rooms, paths: data.paths });
  const panel = createPanel({
    coreBadgeRow,
    coreMeters,
    knightList,
    monsterList,
    knightCount,
    monsterCount,
  });
  const chronicle = createChronicle(chronicleEl, data.balance.chronicle.maxEntries);
  const statusWindow = createStatusWindow(statusEl);

  let world = null;
  let unsubLog = null;
  let paused = false;
  let speed = 1;

  function selectKnight(id) {
    map.selectKnight(id);
    panel.selectKnight(id);
    const k = world.snapshot().knights.find(x => x.id === id);
    if (k) statusWindow.open(k);
  }

  function rebuildWorld(seed) {
    if (unsubLog) {
      unsubLog();
      unsubLog = null;
    }
    world = new World({ seed, data });
    chronicle.clear();
    unsubLog = world.events.on('log', (evt) => chronicle.add(evt));
    writeSeedToUrl(seed);
    render(world.snapshot());
  }

  const controls = createControls(controlsEl, {
    onPause: () => { paused = true; },
    onResume: () => { paused = false; },
    onSpeed: (s) => { speed = s; },
    onRestart: (s) => { rebuildWorld(s); },
  });
  controls.setSeed(initialSeed);

  map.onKnightClick(selectKnight);
  panel.onKnightSelect(selectKnight);

  function render(snapshot) {
    map.update(snapshot);
    panel.update(snapshot);
    const currentId = statusWindow.getCurrentId();
    if (currentId) {
      const k = snapshot.knights.find(x => x.id === currentId);
      if (k) statusWindow.update(k);
      else statusWindow.close();
    }
  }

  rebuildWorld(initialSeed);

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const dt = Math.min(now - last, 250);
    last = now;

    if (!paused) {
      accumulator += dt * speed;
    }

    let steps = 0;
    while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      world.tick(STEP_MS);
      accumulator -= STEP_MS;
      steps += 1;
    }

    render(world.snapshot());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main().catch(err => {
  console.error(err);
  const el = document.getElementById('app');
  if (el) {
    el.innerHTML = `<pre style="color:#ff3322;padding:20px;white-space:pre-wrap;">Failed to start KNIGHTCORE:\n${err && err.stack ? err.stack : String(err)}</pre>`;
  }
});
