# Phase 1: Foundation and engine

**Goal:** a clean, optimised base everything else sits on: project layout, rendering approach,
shared state, and the Among-Us-style look.

## Implemented

- **React host + Phaser game.** React only mounts a canvas ([GameCanvas.tsx](../../../frontend/src/game/GameCanvas.tsx));
  all gameplay is in Phaser scenes. `StrictMode` is off because the game is created imperatively.
  Canvas scales to fit the window ([createGame.ts](../../../frontend/src/game/createGame.ts), 1280x720).
- **No art assets.** Every sprite is generated once at boot ([textures.ts](../../../frontend/src/game/entities/textures.ts)):
  11 crew colours (body, backpack, visor with glint, shade, thick outline), legs, a ghost, a soft light brush, particles.
  This keeps the bundle tiny and makes recolouring free.
- **Among-Us-style character** ([Crewmate.ts](../../../frontend/src/game/entities/Crewmate.ts)):
  alternating leg swing, body bob and squash while walking, breathing while idle, mirrored backpack,
  and the vent-pop spawn animation used when allies appear.
- **Tile world** ([World.ts](../../../frontend/src/game/systems/World.ts)): 32x18 grid of 40px tiles,
  axis-separated collision (slides along walls), closable gates, BFS path finding (used by walking allies),
  and a distance-to-goal field (drives the "route home" progress bar).
- **Static map baked once** ([WorldRenderer.ts](../../../frontend/src/game/systems/WorldRenderer.ts)): floors, hedges,
  buildings and decor are drawn a single time into one texture, so each frame is one image draw.
- **Darkness / light mask** ([LightSystem.ts](../../../frontend/src/game/systems/LightSystem.ts)): a full-screen
  render texture filled each frame with soft circles erased out of it. Soft edges, one draw per light.
- **Global `GameState`** ([GameState.ts](../../../frontend/src/game/state/GameState.ts)): the bible's carry-over
  flags (`checkedIn`, `reportedLight`, `tookShortcut`, `helpedKavya`, `fellForScam`, `batteryCarry`, `wrongCalls`,
  `networkScore`) kept **per Priya**, plus round order, scores, ledger and badge inputs.
- **Data-driven design.** Balance numbers ([constants.ts](../../../frontend/src/game/config/constants.ts)),
  helpline bank ([helplines.ts](../../../frontend/src/game/data/helplines.ts)), abilities and level definitions are plain data.
- **Sound** ([sfx.ts](../../../frontend/src/game/utils/sfx.ts)): small WebAudio synth (no audio files), `M` toggles mute.
- **Menu and boot** ([BootScene.ts](../../../frontend/src/game/scenes/BootScene.ts), [MenuScene.ts](../../../frontend/src/game/scenes/MenuScene.ts)):
  starfield, drifting tumbling crewmates, 1-player (AI Barrier) and 2-player buttons.

## Performance notes

- No per-frame allocation in hot paths other than small arrays; static art is baked.
- Light mask cost is one erase per light (about 10-25 per frame).
- Production bundle is about 1.5 MB (417 KB gzip), almost all Phaser.

## How to check

`npm run dev`, open the menu: stars scroll, crewmates drift. Start a game: characters walk with the leg cycle.

## Left in this phase

- Bundle is a single chunk. Code-splitting Phaser would silence Vite's size warning.
- Audio is synth effects only (no music, no volume slider).
- No gamepad or touch controls.
