# Balance

Every tunable lives in `data/balance.json`. This document explains the formulas
and the *assumptions* that were needed to fill gaps in the spec.

## Knight ranks (also used for the Dungeon Rank)

| Level | Rank |
|-------|------|
| < 6   | D    |
| < 13  | C    |
| < 21  | B    |
| < 36  | A    |
| ≥ 36  | S    |

`rankOfLevel(level, thresholds)` in `src/core/stats.js`. `dungeonRankOf` in
`src/core/population.js` uses the same thresholds for the dungeon's rank.

## XP curve (assumption)

The spec fixes `xpNext = 80` at level 1 and does not specify the growth rate.
`balance.json` defines:

```json
"xpCurve": { "base": 80, "growth": 1.25 }
```

`xpNext(level) = floor(80 * 1.25^(level - 1))`

Level 1 → 80, level 2 → 100, level 3 → 125, level 5 → 195, level 10 → 596,
level 20 → 5551, level 30 → 51700. This produces an S-rank knight (level 36)
in roughly the 60,000-tick range when the population controller is running,
which `tests/world.test.js` asserts is at least level 2.

If you want a different curve, change `data/balance.json` only — no code change.

## Monster scaling (assumption)

The spec says monster stats "scale slightly with the dungeon's average knight
level". `balance.json` defines:

```json
"monsterScaling": { "fromAvgLevel": 1, "perAvgLevel": 0.08 }
```

`scale = 1 + max(0, avgLevel - 1) * 0.08`

Every stat (`hp`, `atk`, `xp`, `gold`) is multiplied by `scale` and floored at
spawn time. Examples:

| avgLevel | scale | Plague Rat HP (30 base) |
|---------:|------:|------------------------:|
| 1        | 1.00  | 30                      |
| 5        | 1.32  | 39                      |
| 10       | 1.72  | 51                      |
| 20       | 2.52  | 75                      |
| 36       | 3.80  | 114                     |

Stats are **baked at spawn**. A monster spawned at level 5 keeps its level-5
stats forever, even after knights level up. This is deliberate: it prevents
mid-combat stat drift and keeps the population controller the sole driver of
difficulty over time.

## Combat loop

```
damage        = max(5, ATK + level * 2)
interval      = max(14, 28 - floor(SPD * 0.15))   // ticks between knight attacks
monster damage= monster.atk                        // no DEF reduction (kept simple per spec)
ambush radius = 22 units
retreat at    = HP < 28% of max, walk to CAMP at speed 2, heal 15 on arrival
camp rest     = HP < max AND within 45 units of CAMP → heal 0.6/tick
```

All of these live under `balance.knight` and `balance.combat`.

## Population controller

Runs every 3.5 s of simulation time (≈210 ticks):

```
target = min(40, 3 + floor(avgLevel * 0.85))
if monsters.length < target → spawn one
```

Spawn rank distribution (`balance.population.weights`), keyed by the dungeon's
rank from `avgLevel`:

| Dungeon rank | Allowed monster ranks (weights)         |
|--------------|------------------------------------------|
| D            | D (1.00)                                 |
| C            | C (0.65) · D (0.35)                      |
| B            | B (0.45) · C (0.30) · D (0.25)           |
| A            | A (0.35) · B (0.30) · C (0.35)           |
| S            | S (0.25) · A (0.30) · B (0.45)           |

After picking a base rank, `DungeonCore.getSpawnRank()` may promote it by one
step (never past S) when `corruption > 60` and a 30% roll succeeds.

Zone assignment (`balance.population.zoneByRank`) — a monster only spawns in a
room from its rank's zone:

```
D: z1, z2, z3           C: z2, z3, z4, z5        B: z4, z5, z6, z7
A: z6, z7, z8           S: z7, z8, z9
```

## Dungeon Core meters

Updated every tick:

```
energy     = clamp(energy + 0.2 - monsters*0.05, 0, 100)
hunger     = clamp(100 - (monsters / target) * 100, 0, 100)
corruption = clamp(10 + bossesDefeated*8 + avgLevel*1.2, 0, 100)
pressure   = clamp((knightsFighting / knights) * 100, 0, 100)
```

Killing an **A** or **S** monster counts as a boss kill:
`bossesDefeated++ · energy -= 20 · corruption += 5`.

State label priority (highest wins):

1. `HUNGRY` if hunger > 70
2. `CORRUPTED` if corruption > 70
3. `PRESSURED` if pressure > 70
4. `DEPLETED` if energy < 30
5. `STABLE` otherwise

Displayed on the map and in the side panel as `{rank}-RANK · {state}`.

## Where to tune

| Goal | File | Field(s) |
|------|------|----------|
| Knights level up faster | `data/balance.json` | `xpCurve.growth` ↓ |
| Dungeon spawns more monsters | `data/balance.json` | `population.perAvgLevel` ↑ |
| Monsters get tougher faster | `data/balance.json` | `monsterScaling.perAvgLevel` ↑ |
| Knights retreat more often | `data/balance.json` | `knight.retreatHpFraction` ↑ |
| Elites spawn earlier | `data/balance.json` | `dungeonCore.eliteCorruptionThreshold` ↓ |
| Longer chronicle | `data/balance.json` | `chronicle.maxEntries` ↑ |
