# Phase 4: Level 2 "Market Night"

**Goal:** the verification and trust level.

## Implemented ([level2.ts](../../../frontend/src/game/data/levels/level2.ts))

- **Festival market map**: four stall-lined lanes, warm tiles, striped awnings, string-light lamps, two Safe Zones
  (Phone Repair, Chai), two back-alley shortcuts, a taxi at the station end. 105 s, 14 wandering crowd people.
- **Crowd**: crewmates wander and bump around. They count as support against the Isolation meter (two people = one ally).
  **Crowd Flow** makes them flee from the Barrier's cursor.
- **Decoy signs**: four signs. Arrows point along the true route (computed from the path-distance field), fake ones point away.
  Hold `Space` next to one to **check the map** (1.4 s, -2% battery): fake signs are corrected, real ones get a green mark.
  The Barrier's Decoy Sign flips a real sign or plants a new one.
- **Trust Check** (auto-triggers near the snack stall where three people stand): approach A woman with children,
  B shop owner with badge, or C someone alone in a dark alley. A/B correct (+10 awareness, -20 isolation, a stall owner walks with you),
  C wastes 4 s and gives the Barrier +10 energy. The prompt text says the lesson is about **settings, not people**.
- **Spot the Scam**: a 4 s phone prompt (Reply / Ignore / Report), three message texts incl. the OTP one. Ignore/Report: points and
  Fake Message locked 10 s. Reply: `fellForScam = true`, -20% battery and a trust alert. The Barrier can trigger more with Fake Message.
- **Kavya**: press `Space` to help (6 s, cannot be cancelled). Sets `helpedKavya`, she joins as an ally for the level.
- **Ride Check** (auto-triggers at the cab): pick 2 of 4. Verify the plate and share the trip with Meera are correct; "hop in first" and
  "skip the app match" are wrong. Correct: Barrier permanently loses Decoy and Fake Message. Wrong: Barrier +30 energy and free decoys.
- **Code Phrase unlock**: before Level 2 the runner picks a phrase with Meera (used in Level 3).
- **Helpline cards**: cyber fraud 1930, lost child 1098, suspicious cab (112 + share trip). No hint line.
- **Carry-over in**: Level 1 loss + `checkedIn` brings Meera at the start; low battery or two shortcuts lowers the start battery.

## How to check

`#dev=2`. Walk right along the bottom lane to the snack stall for Trust Check, find Kavya on the third lane, reach the cab near the station.

## Left in this phase

- The bible lists "Sit behind the driver" and "Check the app match" as Ride Check actions. Both are good habits, so they were
  **not** marked wrong. The prompt text mentions them as good habits instead. Adjust if the intended answer key differs.
- Signs always show an arrow only. There is no separate "dead end" spur in the map: a fake arrow just points the wrong way.
- "Ask an ally to verify a sign" is not a separate action (map check only).
- Crowd people do not react to Priya or to the Barrier beyond the Crowd Flow scatter.
