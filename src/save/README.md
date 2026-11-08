# save (extension point — not implemented)

Save and restore a running world. **Empty folder on purpose.**

## Planned API

```js
// save.js
export function saveWorld(world) → JSON string

// load.js
export function loadWorld(json, data) → World
```

`saveWorld` serialises `world.snapshot()` plus a `version` tag and the seed.

`loadWorld` constructs a `World` from a save + the original `data/*.json`, then
fast-forwards to the saved tick (or restores the state directly via a future
`World.fromSnapshot` static constructor — either approach works, whichever is
simpler).

## Constraint

Save files are the **snapshot contract only** (see `docs/ARCHITECTURE.md`) plus
a version tag. No private fields, no functions, no Maps. That way the format
survives internal refactors of `src/core/`.
