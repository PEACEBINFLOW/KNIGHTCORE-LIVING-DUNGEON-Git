# generators (extension point — not implemented)

Procedural dungeon layout generators. **Empty folder on purpose.**

Each generator produces a `{ rooms, paths }` pair that can be dropped into
`data/rooms.json` + `data/paths.json` **without any code change**. The World
already treats these as the sole source of layout.

## Planned generators

- **Angle field** — pick N angles, place rooms along rays at fixed radii,
  connect adjacent rooms on each ray and adjacent rays at the same radius.
- **Polygon layout** — regular polygons as chambers, trapezoid corridors
  between them, guarantee connectivity via a spanning tree + extra edges.
- **Seeded graph generator** — build any connected graph with N nodes,
  place them on a grid or radial layout, export as the standard JSON.

## Hard constraint

The output schema is exactly `data/rooms.json` and `data/paths.json`:

- `rooms.json`: array of `{ id, tier, name, rank, x, y, w, h, cx, cy, flags }`.
- `paths.json`: array of `[fromId, toId]` undirected pairs.

Generators must be seeded (use `src/core/rng.js`) so the same seed produces
the same dungeon. `tests/graph.test.js` already validates that every room is
reachable from `camp` — future generator tests will reuse that invariant.
