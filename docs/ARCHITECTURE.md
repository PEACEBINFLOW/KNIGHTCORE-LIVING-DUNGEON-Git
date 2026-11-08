# Architecture

Three hard rules drive every file in this repo:

1. **The simulation core never touches the DOM.** `src/core/` runs in Node and
   the browser with identical results.
2. **Determinism.** All randomness flows through one seeded PRNG. No
   `Math.random()` in `src/core/`.
3. **Rendering is a pure function of a snapshot.** The renderer reads
   `world.snapshot()` and draws it. It never mutates world state.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  src/index.html      page shell, static structure           │
│  src/render/theme.css  palette + layout                     │
├─────────────────────────────────────────────────────────────┤
│  src/main.js         fixed-timestep loop, wires everything  │
├─────────────────────────┬───────────────────────────────────┤
│  src/render/ (SVG)      │  src/ui/ (side panel, chronicle,  │
│  sprites, svgMap        │  status window, controls)         │
│                         │                                   │
│  both consume a plain   │  both consume the same            │
│  snapshot object        │  snapshot object                  │
├─────────────────────────┴───────────────────────────────────┤
│  src/core/world.js   World.tick(dtMs) · World.snapshot()    │
│  src/core/knight.js, monster.js, dungeonCore.js, population.js│
│  src/core/stats.js, graph.js, events.js, rng.js             │
│                                                             │
│  zero DOM. zero globals. determinism enforced here.         │
├─────────────────────────────────────────────────────────────┤
│  data/*.json         rooms, paths, monsters, names, balance │
└─────────────────────────────────────────────────────────────┘
```

## Determinism

- `src/core/rng.js` exposes `createRng(seed)` → `{ next, int, float, pick, chance }`.
  The underlying generator is mulberry32.
- Every random choice in `src/core/` goes through this RNG. `src/core/` has no
  other source of randomness.
- `World.tick(dtMs)` advances exactly one fixed step regardless of `dtMs`. The
  caller (`src/main.js`) accumulates wall-clock time and calls `tick()` a whole
  number of times per frame. Speed control multiplies the *number of ticks*,
  never the timestep.
- Consequence: `new World({seed, data})` ticked N times is byte-for-byte
  reproducible. `tests/world.test.js` asserts a deep-equal snapshot after 5,000
  ticks across two independently-constructed worlds.

## The snapshot contract

`world.snapshot()` returns a plain JSON-safe object:

```js
{
  tick: number,
  seed: number,
  rooms: Room[],                // from data
  paths: [string, string][],    // from data
  knights: KnightSnapshot[],
  monsters: MonsterSnapshot[],
  core: { energy, corruption, hunger, pressure,
          bossesDefeated, dominantRank, state },
  avgKnightLevel: number,
}
```

Every renderer and UI component is written against this shape. Nothing else.
This is also what future extensions (ledger, save/load, anglecore renderer)
consume.

## The event bus

`src/core/events.js` is a tiny synchronous `EventBus`. Every notable world
event emits on `'log'` with this shape:

```js
{
  tick: number,
  type: 'combat' | 'kill' | 'spawn' | 'level' | 'core',
  message: string,
  actorId?: string,   // knight id or monster id
  roomId?: string,
  value?: number | string,
}
```

`src/ui/chronicle.js` subscribes to `'log'` and appends formatted lines.
The future `src/ledger/` extension will subscribe to the same bus and record
every event verbatim — so no core change is needed later to add the ledger.

## Extension points

Four folders are stubbed (README only, no code) as future insertion points:

- `src/render/anglecore/` — alternate canvas renderer, event-driven only.
- `src/generators/` — seeded procedural `rooms.json` + `paths.json` generators.
- `src/ledger/` — append-only history built on the existing `'log'` events.
- `src/save/` — save/load a full world snapshot to resume a run.

See `docs/ROADMAP.md` for the intended shape of each.
