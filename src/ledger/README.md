# ledger (extension point — not implemented)

Append-only record of every world event. **Empty folder on purpose.**

## Planned shape

Each entry:

```js
{ tick, type, actorId, roomId, value }
```

`type` is one of `'combat' | 'kill' | 'spawn' | 'level' | 'core'` — the same
set already emitted by `src/core/events.js`.

## Constraint

The ledger is a **subscriber**, not a core change:

```js
world.events.on('log', (evt) => ledger.append(evt));
```

The core already emits payloads with the required fields. Adding the ledger
must not require any change under `src/core/`.

## What it enables

- Replay of any run from `(seed, ledger)` without re-simulating.
- Analytics: kill rates, level curves, core state transitions over time.
- ML harnesses: the whole history of the world in a stable schema.
