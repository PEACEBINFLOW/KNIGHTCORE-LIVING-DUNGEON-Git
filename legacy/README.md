# Legacy prototypes

The current repo is a clean-up of three single-file HTML prototypes:

- **v2** — the original KNIGHTCORE prototype: inline SVG, global state,
  `Math.random()` for every roll, knights walked in straight lines (through
  walls), no BFS pathfinding.
- **v3** — added the Dungeon Core, weighted spawn ranks, and the side panel.
  Still single-file, still global state.
- **AngleCore** — a canvas experiment where every event became a rotating
  polygon on a polar grid. Prototyped only; not integrated.

Their **behaviour** is the source of truth for `data/balance.json`,
`data/monsters.json`, and the constants in `src/core/`. Their **structure** is
not — this repo replaces global state with modules, `Math.random()` with a
seeded RNG, and straight-line movement with BFS pathfinding over the room
graph.

The prototypes are not shipped in this repo. If you want to reproduce them for
comparison, they are single HTML files with `<script>` blocks that set globals
directly.
