# Phase 3: Barrier, role swap and scoring

**Goal:** the second player. Abilities with energy, an AI for solo play, role reveal screens, round results and score carry-over.

## Implemented

- **Barrier rules** ([BarrierSystem.ts](../../../frontend/src/game/systems/BarrierSystem.ts)): energy 100 with +3/s regen,
  per-ability cost and cooldown, **cap of 3 uses per ability per round** (Flicker Bluff once), locks from allies, scams and Ride Check.
- **Abilities** ([abilities.ts](../../../frontend/src/game/data/abilities.ts), effects in `useAbility` in
  [LevelScene.ts](../../../frontend/src/game/scenes/LevelScene.ts)):
  - **Lights Out**: switches a lamp off for 12 s. Blocked within 150 px of an ally. Fixed lamps are immune.
  - **Close the Way**: closes a gate/lane for 8 s (a solid striped barricade). Cannot close on top of Priya.
  - **Decoy Sign**: flips a real sign, or plants a new fake sign on any path.
  - **Crowd Flow**: crowd people walk away from the cursor for 10 s.
  - **Fake Message**: opens a scam prompt (Levels 1-2) or a fake "Meera" call (Level 3). Not usable while she is in a Safe Zone.
  - **Drain**: -5% battery. Not usable in a Safe Zone.
  - **Flicker Bluff**: free, once. A fake barricade for 4 s that is not solid.
  - **Isolate** (Level 3): cuts every ally link for 8 s. Counters: Share Location, Code Phrase.
- **Controls**: arrow keys move the Barrier's ghost cursor (an Among-Us-style ghost, floating and bobbing), `1`-`8` fire abilities,
  the mouse also moves it, the bottom ability bar is clickable and shows cost, uses left and a cooldown wipe.
- **Intel feed** (top right): a running log of Priya's visible choices (battery drops, shortcuts, calls, allies).
- **Solo AI** ([BarrierAI.ts](../../../frontend/src/game/systems/BarrierAI.ts)): every 2-5 s (faster per level) it scores
  the abilities it can afford against Priya's position, moves its ghost to the target, then fires.
- **Role reveal** ([BriefScene.ts](../../../frontend/src/game/scenes/BriefScene.ts)): before each round, a crew-reveal style screen:
  Runner card with an animated Priya, Barrier card with the persona text from the bible and the ability list, controls, "Press SPACE".
- **Role swap and carry-over** ([GameState.ts](../../../frontend/src/game/state/GameState.ts)): in 2-player mode every level is two
  rounds, P1 runs then P2 runs, each with their **own** Priya story state. Scores accumulate across levels.
- **Round results** ([RoundEndScene.ts](../../../frontend/src/game/scenes/RoundEndScene.ts)): Victory/Defeat banner, reason, runner
  and Barrier scores, the lesson card, and a preview of how choices change the next level.
- **Scoring**: Runner = time left + resources + correct calls + allies + faults + win bonus. Barrier = seconds isolated + seconds delayed
  (waiting at closed gates) + her wrong calls + gaps exploited.

## How to check

Two-player mode: P2 moves the ghost with the arrow keys and presses `1`/`2`/`3` while P1 walks. Solo mode: watch the AI act.

## Left in this phase

- Both players share one screen, so there is **no hidden information**: the Barrier's "intel" is a feed, not a real fog.
  Inside a Safe Zone the Barrier is still able to see Priya (abilities are blocked instead).
- Win-rate balance (target 50-60% Runner) has not been playtested with humans. Tunables are in `constants.ts`,
  each level's `isolationScale`, `energyStart` and the AI pace array in `BarrierAI.ts`.
- No online play (listed as "cut first" in the bible).
