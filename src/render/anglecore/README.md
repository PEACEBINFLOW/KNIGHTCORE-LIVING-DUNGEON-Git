# anglecore (extension point — not implemented)

Alternate canvas renderer where every world event becomes a geometric node on
a polar grid. **Empty folder on purpose.** Planned for a later version.

## Node types

| Type    | Sides | Rotation      | Pulse    | Fade       |
|---------|------:|---------------|----------|------------|
| KNIGHT  | 6     | slow, persistent | on damage | on death |
| MONSTER | 5     | medium        | on damage | on death  |
| ATTACK  | 3     | fast          | strong   | 400 ms    |
| AURA    | 8     | slow          | gentle   | 800 ms    |
| DODGE   | 4     | fast          | —        | 300 ms    |
| KILL    | 7     | fast          | strong   | 1200 ms   |
| SPAWN   | 6     | slow          | gentle   | 900 ms    |
| LEVEL   | 4     | fast          | strong   | 2000 ms   |

## Hard constraint

The AngleCore renderer **only** subscribes to `world.events.on('log', …)`.

- It must not call `world.snapshot()`.
- It must not mutate world state.
- Every visual element is a function of the event stream alone.

This makes it a genuine second view of the same simulation, and a natural
debugging companion to the SVG renderer.

## What it will need

- A `requestAnimationFrame` loop with a per-node lifetime clock.
- A polar layout: rings by tier (LOW → HIGH), sectors by room.
- Event → node spawning with deterministic lifetimes so the same seed produces
  the same visual, frame-for-frame.
