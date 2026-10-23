# Phase 6: Polish, verification and backlog

**Goal:** juice, safety of content, and a single honest list of what is still open.

## Implemented

- **Among-Us-inspired feel**: bean crewmates with walk cycle, vent-pop ally spawns with particles, a floating ghost for the Barrier,
  a route-progress bar like the task bar, a red emergency pulse and heartbeat when isolation is high, crew-reveal role screens,
  slide-in Victory/Defeat banners, starfield menus with tumbling crewmates.
- **Feedback**: synth sounds for calls, correct/wrong, abilities, pops, win/lose, camera shake on a wrong call, flash on round end.
- **Content guardrails from the bible** are built in: threats stay abstract (no harassment shown), the Runner is never blamed
  (lessons are about lights, people and places), Trust Check says it is about settings, every loss screen ends with a lesson card.
- **Automated smoke test used during development**: a scripted browser played all three levels in solo and two-player mode and
  reached the Ending / Results screens with no console errors, and every map was checked for reachability with a BFS script.
  The harness lived outside the repo.
- `npm run lint` and `npm run build` pass.

## Verify before release (content)

- **Helpline numbers** (112, 181, 1091, 1098, 108, 101, 1930, cybercrime.gov.in) are the ones in the bible. The bible says to verify
  them against official government sources before showing them publicly. This has **not** been done.

## Backlog: everything not implemented

| Area | Item |
| --- | --- |
| Rules | Awareness points unlocking shortcuts (only "call an extra ally" exists) |
| Rules | Random Community Events (watch patrol, lights repaired, festival crowd, power cut, rain) |
| Rules | Dynamic light shrink when alone on a dark route |
| Rules | Barrier "Intel" as real hidden information (needs split screens or two devices) |
| Rules | A Safe Zone that truly hides Priya from the Barrier's view |
| Levels | A dead-end spur for the Level 2 decoy signs, and "ask an ally to verify" |
| Levels | Level 3 "40 seconds longer" hospital road: current difference is about 35 s |
| Story | Bystander round as a playable side scene |
| Story | Typed Meera / operator voice lines and a spoken-style operator on the helpline screen |
| UX | Shareable result card as an image, mobile and gamepad controls, pause menu, volume slider, settings |
| Audio | Music and ambience (rain, crowd, tunnel echo) |
| Quality | Human playtesting for the 50-60% Runner win rate, then tune `constants.ts`, `isolationScale` per level, AI pace |
| Quality | Unit tests for `World`, `BarrierSystem` and ending selection. Code-split Phaser to shrink the main chunk |
| Scope (cut first in bible) | Online play, skins |
