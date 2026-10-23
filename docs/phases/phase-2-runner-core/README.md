# Phase 2: Runner core loop (Level 1 playable)

**Goal:** Priya can walk the Level 1 lane, manage resources, call helplines and be helped by allies.

## Implemented

All in [LevelScene.ts](../../../frontend/src/game/scenes/LevelScene.ts) unless noted.

- **Movement** with WASD, collision, trail used by followers.
- **Level 1 map** ([level1.ts](../../../frontend/src/game/data/levels/level1.ts)): a four-lane serpentine from the bus stop to
  home. Three dark **alley shortcuts** (pink outlines) cut across the dividers = the "two-path choice". Taking one increments
  `tookShortcut`. The long lit road passes **Salim Tea** (Safe Zone + charge point).
- **Battery** 100%, drains 0.1%/s, torch (`F`) drains +0.2%/s and widens the light. At 0% the phone is dead:
  no calls, no Share Location, minimum light (not an instant loss).
- **Light radius** = theme base + 34 per ally + torch - shrink after a wrong call. Allies, lamps, Safe Zones and the home porch
  light all erase the darkness.
- **Streetlights** with states `on`, `off`, `broken` (flickering), `fixed`, `out`. **Report a Fault**: hold `Space` for 2 s
  next to a broken lamp, it stays on for the round, +15 awareness, sets `reportedLight` (Level 1).
- **Isolation meter**: +2/s alone in the dark, +0.5/s with one supporting ally, 0 with two or more (crowd people count at 2:1 in Level 2+),
  decays in light and Safe Zones. Full meter = Barrier wins.
- **Safe Zones**: auto-charge +20% over 5 s, isolation drains, Drain and Fake Message cannot hit her.
- **Allies / network**: `Space` to ask Mr. Salim or the neighbour aunty (20 s, then they walk back). Followers widen the light,
  count against isolation and **lock the Barrier's strongest ability for 10 s** when they join. Walking allies path to her with BFS.
  Max 3 at a time. `Q` spends 30 awareness points on a helper (vent pop).
- **Share Location** (`E`, 2 uses, -5% battery): a patrol walks to her and the Isolate effect is cleared.
- **Check-In Contact**: if `checkedIn` and she is late (55% of the timer gone), Meera walks towards her.
- **Helpline cards** ([PromptScene.ts](../../../frontend/src/game/scenes/PromptScene.ts)): phone-style overlay with a 5 s timer bar,
  shuffled options, hint line (Level 1), correct/wrong feedback with the right number and a one-line reason.
  Correct: +10% battery, 20 s Helper Ally, +10 awareness. Wrong or timeout: -15% battery, light shrinks, Barrier +15 energy,
  number added to the end-of-game "missed" list. Three wrong calls = help "did not reach her in time".
  Cards fire when route progress **or** time is reached, 7 s apart, so shortcuts cannot skip them.
- **HUD** ([Hud.ts](../../../frontend/src/game/ui/Hud.ts)): battery, allies, awareness, timer, route-progress bar (like Among Us' task bar),
  energy and isolation meters, toasts, red emergency pulse above 75% isolation, heartbeat sound.
- **Prologue** ([PrologueScene.ts](../../../frontend/src/game/scenes/PrologueScene.ts)): black screen, heartbeat, Meera's text, CHOICE 0.

## How to check

Play Level 1 (`#dev=1` skips the menu). Walk into Salim's stall to charge, hold `Space` under a flickering lamp, wait for the
call at about 14 s.

## Left in this phase

- Awareness points can only be spent on an extra ally. "Unlock shortcuts" is not implemented.
- Light radius does not shrink dynamically when she is alone on a dark route (it is fixed by theme, allies and torch).
- Random **Community Events** (watch patrol, lights repaired, festival crowd, rain) are not implemented.
- The "ally walks to her" source for Share Location is a generic patrol, not the nearest real ally.
