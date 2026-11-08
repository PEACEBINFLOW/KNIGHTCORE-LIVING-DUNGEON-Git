// tools/headless.js
//
// CLI: run N ticks with a seed and print a summary.
//   npm run headless
//   npm run headless -- --seed 42 --ticks 120000
//
// Same seed + same ticks ⇒ identical output as the browser.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { World, TICK_MS } from '../src/core/world.js';
import { computeDerived } from '../src/core/stats.js';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';

function parseArgs(argv) {
  const args = { seed: 1234, ticks: 60000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed' && argv[i + 1] != null) { args.seed = Number(argv[++i]); }
    else if (a === '--ticks' && argv[i + 1] != null) { args.ticks = Number(argv[++i]); }
    else if (a === '-h' || a === '--help') {
      console.log('Usage: headless.js [--seed N] [--ticks N]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.seed)) args.seed = 1234;
  if (!Number.isFinite(args.ticks) || args.ticks < 0) args.ticks = 60000;
  return args;
}

function loadData() {
  const read = (name) => JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8'));
  return {
    rooms: read('rooms.json'),
    paths: read('paths.json'),
    monsters: read('monsters.json'),
    names: read('names.json'),
    balance: read('balance.json'),
  };
}

function bar(value, max, width = 20) {
  const pct = Math.max(0, Math.min(1, value / max));
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = loadData();

  const t0 = Date.now();
  const world = new World({ seed: args.seed, data });
  for (let i = 0; i < args.ticks; i++) world.tick(TICK_MS);
  const elapsed = Date.now() - t0;

  const snap = world.snapshot();
  const simSeconds = (snap.tick * TICK_MS) / 1000;
  const totalKills = snap.knights.reduce((a, k) => a + k.kills, 0);
  const totalGold = snap.knights.reduce((a, k) => a + k.gold, 0);

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  KNIGHTCORE · LIVING DUNGEON — headless summary');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  seed ............. ${args.seed}`);
  console.log(`  ticks ............ ${snap.tick} (${simSeconds.toFixed(1)} s sim time)`);
  console.log(`  wall time ........ ${elapsed} ms (${((snap.tick / (elapsed || 1)) * 1000).toFixed(0)} ticks/s)`);
  console.log('');
  console.log(`  Dungeon rank ..... ${snap.core.dominantRank}  ·  ${snap.core.state}`);
  console.log(`  Avg knight level . ${snap.avgKnightLevel.toFixed(2)}`);
  console.log('');
  console.log('  DUNGEON CORE');
  console.log(`    energy ......... ${bar(snap.core.energy, 100)}  ${snap.core.energy.toFixed(1)}`);
  console.log(`    corruption ..... ${bar(snap.core.corruption, 100)}  ${snap.core.corruption.toFixed(1)}`);
  console.log(`    hunger ......... ${bar(snap.core.hunger, 100)}  ${snap.core.hunger.toFixed(1)}`);
  console.log(`    pressure ....... ${bar(snap.core.pressure, 100)}  ${snap.core.pressure.toFixed(1)}`);
  console.log(`    bosses slain ... ${snap.core.bossesDefeated}`);
  console.log('');
  console.log(`  Monsters alive ... ${snap.monsters.length}`);
  console.log(`  Total kills ...... ${totalKills}`);
  console.log(`  Total gold ....... ${totalGold}`);
  console.log('');
  console.log('  KNIGHTS');
  for (const k of snap.knights) {
    const d = computeDerived(k.stats);
    const hpPct = Math.round((k.hp / k.maxHP) * 100);
    console.log(
      `    ${k.rune} ${k.name.padEnd(7)} L${String(k.level).padStart(2)} ${k.rank}` +
      `  HP ${String(hpPct).padStart(3)}%  ATK ${String(d.ATK).padStart(3)}` +
      `  kills ${String(k.kills).padStart(4)}  gold ${String(k.gold).padStart(5)}`
    );
  }
  console.log('══════════════════════════════════════════════════════════');
  console.log('');
}

main();
