# Roadmap

Four extension points are stubbed. Each is an empty folder with only a
README — no code, by design. They are documented here so their intended shape
is clear before implementation begins.

## 1. `src/render/anglecore/` — alternate canvas renderer

An alternative view where every event becomes a **geometric node** on a polar
canvas grid. Nodes rotate, pulse, and fade; short-lived edges join related
nodes.

| Node type | Sides | Source event                        |
|-----------|------:|-------------------------------------|
| KNIGHT    | 6     | knight creation                     |
| MONSTER   | 5     | `spawn`                             |
| ATTACK    | 3     | `combat` (knight strikes)           |
| AURA      | 8     | periodic (aura ticks)               |
| DODGE     | 4     | future combat event                 |
| KILL      | 7     | `kill`                              |
| SPAWN     | 6     | `spawn`                             |
| LEVEL     | 4     | `level`                             |

**Constraint:** the AngleCore renderer must subscribe to `world.events` only.
It must not call `world.snapshot()` and must not mutate world state. This keeps
the renderer strictly a function of the event stream.

## 2. `src/generators/` — procedural dungeon layout

Generators that produce a `{ rooms, paths }` pair usable directly in
`data/rooms.json` + `data/paths.json`:

- **Angle field** — rays from the core at `N` evenly-spaced angles, rooms at
  fixed radii, corridors along the rays.
- **Polygon layout** — regular-polygon chambers with trapezoid corridors.
- **Seeded graph generator** — any connected graph, mapped to rooms.

**Constraint:** the world must accept any valid `rooms.json` + `paths.json`
pair without code changes. Today `World` already does this — `rooms.json`
supplies all room metadata and `paths.json` supplies all edges. Generators
produce the same JSON shape.

## 3. `src/ledger/` — append-only event history

A subscriber to `world.events.on('log', …)` that persists every event as:

```js
{ tick, type, actorId, roomId, value }
```

Exactly the shape already emitted by the core (see `src/core/events.js`).
Downstream systems (analytics, replay, machine-learning harnesses) can read
the ledger without touching the simulation.

**Constraint:** the ledger must not require any change to `src/core/`. The
event bus already emits the required fields. If new event types are added
later, they must follow the same shape.

## 4. `src/save/` — snapshot save/load

Save the full `world.snapshot()` (plus a version tag) to JSON; restore by
constructing a `World` from the saved snapshot + the original seed + the
original data.

A future `World.fromSnapshot(snapshot, data)` static constructor will be the
entry point. No such constructor exists yet — the save system will add it (it
is a pure addition; no existing code changes).

## Non-goals for v0.1

- No user input beyond the control strip (pause / speed / seed / restart).
- No inventory, no equipment, no party commands.
- No multiplayer, no persistence across page loads.
- No new features beyond the current simulation.
