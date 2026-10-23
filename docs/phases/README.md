# Circle of Allies: build phases

Implementation of *Circle of Allies: Full Game Script and Story Bible.md* as a 2D Phaser 3 game
(`frontend/`), with Among-Us-style characters and animation, all drawn procedurally (no art files).

| Phase | Folder | Status |
| --- | --- | --- |
| 1. Foundation and engine | [phase-1-foundation](phase-1-foundation/README.md) | Done |
| 2. Runner core loop (Level 1 playable) | [phase-2-runner-core](phase-2-runner-core/README.md) | Done |
| 3. Barrier, role swap and scoring | [phase-3-barrier-and-roles](phase-3-barrier-and-roles/README.md) | Done |
| 4. Level 2 "Market Night" | [phase-4-level-2-market](phase-4-level-2-market/README.md) | Done |
| 5. Level 3, story carry-over, endings, results | [phase-5-level-3-and-endings](phase-5-level-3-and-endings/README.md) | Done |
| 6. Polish, verification and backlog | [phase-6-polish-and-backlog](phase-6-polish-and-backlog/README.md) | Partly done, see "left" |

Each README lists **what is implemented** (with file links), **how to check it**, and **what is left**.
The consolidated list of everything still open is in phase 6.

## Run it

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build
npm run lint
```

Dev-only shortcuts (ignored in production builds): `http://localhost:5173/#dev=2` starts Level 2 solo
straight away, and `#dev=3&ff=4` starts Level 3 and runs the simulation 4x faster per frame.
`window.__game` exposes the Phaser game for debugging.

## Controls

| Role | Keys |
| --- | --- |
| Runner (Priya) | `WASD` move, `Space` use / hold to report / hold to check a sign, `F` phone torch, `E` Share Location, `Q` call an extra ally (30 awareness) |
| Barrier (Player 2) | Arrow keys move the ghost, `1`-`8` or a click on the bottom bar uses an ability, the mouse also moves the ghost |
| Solo mode | Runner can also use the arrow keys. The Barrier is an AI. |

## Source layout (`frontend/src/game`)

```
createGame.ts, GameCanvas.tsx      Phaser config + React host
config/constants.ts                screen size, colours, balance numbers (bible section 11)
types.ts                           shared types (abilities, map data, script events)
state/GameState.ts                 global state + per-Priya story flags (bible section 3)
data/
  helplines.ts                     helpline cards, scam texts, trust and ride options
  abilities.ts                     the eight Barrier abilities
  levels/                          level1-3.ts (maps + scripts), Grid.ts builder, index.ts
entities/
  textures.ts, palette.ts          procedural crewmate, ghost, light brush textures
  Crewmate.ts                      Among-Us bean with walk / idle / vent-pop animation
  Ally.ts                          ally data type + NPC colours
systems/
  World.ts                         tiles, collision, gates, BFS path finding, progress field
  WorldRenderer.ts                 bakes the static map into one texture
  LightSystem.ts                   darkness render-texture with erased light circles
  BarrierSystem.ts                 energy, cooldowns, caps, locks
  BarrierAI.ts                     solo-mode Barrier
ui/                                Hud.ts (top bar, ability bar, toasts, intel), widgets.ts
scenes/                            Boot, Menu, Prologue, Brief, Level, Prompt, RoundEnd, Ending, Results
utils/                             sfx.ts (WebAudio synth), shuffle.ts
```
