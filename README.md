# ⚔ KNIGHTCORE · LIVING DUNGEON

**A fully autonomous RPG ecosystem that runs itself. Nobody plays it. You watch it.**

A band of eight knights walks a graph of dungeon rooms, fights monsters, levels up, retreats to
camp to heal, and respawns when they die. Above them sits the **Dungeon Core** — the dungeon's
brain — which reads the state of the whole world and reacts: it spawns monsters when it is hungry,
breeds elites when it is corrupted, and grows stronger every time the knights cut down a boss. The
knights' levels raise the dungeon's rank (D → C → B → A → S), the dungeon answers with deeper, deadlier
zones, and the ecosystem balances itself somewhere in the middle. Everything is deterministic: the
same seed and the same number of ticks always produce the identical world.

![screenshot](docs/screenshot.png)

---

## How it works

### Knights
Eight knights are generated at the start from `data/names.json`. Each rolls base stats
(`STR / AGI / VIT / AUR / INT`), which derive the full stat block: `ATK`, `DEF`, `SPD`, `DODGE`,
`PARRY`, `BLOCK`, `STAMINA`, `maxHP`, `maxAura`, plus body traits and aura traits. Every stat is
letter-graded (`F → SS`). Behaviour is checked in strict priority order each tick:

1. **Fighting** — strike on the combat timer, take a counter-hit, die and respawn at camp if HP runs out.
2. **Low HP retreat** — below 28% HP, walk to CAMP at speed 2 and heal on arrival.
3. **Resting** — inside 45 units of CAMP and not at full HP, heal `0.6` per tick.
4. **Travelling** — pick a room matching the knight's rank, walk the **path graph** (BFS shortest
   path, never through walls), and "enter" the room when within 8 units.

Aura regenerates every tick. XP and gold come from kills. Level-up adds fixed stat increments and
moves the knight up the rank ladder (`<6 D, <13 C, <21 B, <36 A, else S`).

### Monsters
Monsters are spawned from `data/monsters.json` (five ranks × five species each) into rank-appropriate
zones, scaled slightly by the dungeon's average knight level. They wander inside their room and
ambush any knight that comes within 22 units while that knight is not already fighting and is above
the retreat threshold.

### The Dungeon Core feedback loop
The Core holds six values — `energy`, `corruption`, `hunger`, `pressure`, `bossesDefeated`,
`dominantRank` — and updates them every tick:

```
energy     = clamp(energy + 0.2 - monsters * 0.05, 0, 100)
hunger     = clamp(100 - (monsters / target) * 100, 0, 100)
corruption = clamp(10 + bossesDefeated * 8 + avgLevel * 1.2, 0, 100)
pressure   = clamp((knightsFighting / knights) * 100, 0, 100)
```

A **population controller** runs every 3.5 s of simulation time. If the live monster count is below
`min(40, 3 + floor(avgLevel * 0.85))`, it spawns one monster using weighted rank selection; the Core
may then promote that spawn one rank (elites) when corruption is high. Killing an A- or S-rank
monster feeds the Core: `bossesDefeated++`, energy drops, corruption rises. More corruption means
more elites; more elites means more dead knights; more dead knights means fewer kills — the loop
finds its own equilibrium.

---

## Quick start

```bash
npm install      # only dev dependency is esbuild (used by the single-file build)
npm test         # node:test suite, Node 20
npm run dev      # serves ./src with a tiny built-in HTTP server → http://localhost:8080
npm run headless # run N ticks with a seed in the terminal, print a summary
npm run build    # bundle everything into ONE offline file at dist/knightcore.html
```

`npm run headless -- --seed 1234 --ticks 60000` prints a full ecosystem summary without a browser.

---

## Offline single-file build (itch.io)

`npm run build` inlines the JS and CSS into a single self-contained HTML file:

```
dist/knightcore.html   ← the offline build
dist/index.html        ← identical copy, used by GitHub Pages
```

Drop `knightcore.html` straight into an itch.io HTML5 upload, a USB stick, or an email attachment.
It has zero network dependencies (fonts fall back to `serif`/`monospace` when offline).

---

## Folder map

```
knightcore-living-dungeon/
├─ data/                  rooms, paths, monsters, names, balance — all tunables live here
├─ src/
│  ├─ core/               deterministic simulation. NO DOM. Runs identically in Node & browser
│  ├─ render/             SVG map + sprites + theme.css (read-only views of the world)
│  ├─ ui/                 panel, chronicle, status window, controls
│  ├─ main.js             wires World + renderer + UI, fixed-timestep loop
│  └─ index.html          the page shell
├─ tests/                 node:test suites for rng, stats, graph, core, population, knight, world
├─ tools/                 headless CLI, single-file bundler, dev server
├─ docs/                  ARCHITECTURE.md, BALANCE.md, ROADMAP.md
├─ legacy/                notes on the original single-file prototypes
└─ .github/workflows/     ci.yml (tests) + pages.yml (deploy ./dist)
```

---

## Determinism

All randomness flows through **one** seedable RNG (`mulberry32`) in `src/core/rng.js`. There is no
`Math.random()` anywhere in `src/core/`. The world is advanced by `world.tick(dtMs)` with a fixed
timestep, and the speed control multiplies the *number of ticks*, never the timestep — so a run at
4× is the same run as 1×, just faster.

Consequences:

- Same seed + same tick count ⇒ deep-equal `world.snapshot()`. This is asserted in `tests/world.test.js`.
- Runs are shareable: `?seed=1234` in the URL reproduces a run exactly.
- The headless CLI and the browser produce identical results for the same seed.

---

## Roadmap

- **AngleCore renderer** — an alternate canvas renderer where every event becomes a geometric node
  (KNIGHT 6 sides, MONSTER 5, ATTACK 3, AURA 8, DODGE 4, KILL 7, SPAWN 6, LEVEL 4) on a polar grid.
- **Procedural generators** — seeded dungeon layouts (angle-field rays, polygon rooms with trapezoid
  corridors) that drop into `data/rooms.json` + `data/paths.json` with no code changes.
- **Event ledger** — append-only `{tick, type, actorId, roomId, value}` history of every world event.
- **Save / load** — resume a run from a serialised world snapshot.

Extension points are stubbed as documented, code-free folders: `src/render/anglecore/`,
`src/generators/`, `src/ledger/`, `src/save/`. See `docs/ROADMAP.md`.

---

## License

MIT © 2026 Peace Thabiwa (PEACEBINFLOW) — SAGEWORKS AI
