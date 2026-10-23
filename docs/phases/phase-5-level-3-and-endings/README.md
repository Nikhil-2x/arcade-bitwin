# Phase 5: Level 3, story carry-over, endings and results

**Goal:** the finale, the consequences of earlier choices, and the closing screens.

## Implemented

- **Level 3 map** ([level3.ts](../../../frontend/src/game/data/levels/level3.ts)): power-cut night, darkest palette, 120 s, 4 s cards, no hints.
  The **hospital road** is the long, emergency-lit serpentine with a Safe Zone, a guard ally and calm lamps. The **underpass** is a dark
  vertical tunnel that cuts through every lane: about 85 tiles shorter (roughly 35 s), 1.5x isolation fill, and three closable gates.
- **All abilities plus Isolate**, with higher starting energy.
- **Cards**: collapsed person (108/112, 108 best), group harassment (112 or 181/1091 accepted, 181/1091 shown as best), fire (112/101).
- **Code Phrase call**: a call from "Meera" says a phrase. Match = real (boost, Meera arrives, Isolate cleared), mismatch = fake
  (points, Fake Message and Isolate locked). Believing a fake call costs battery and a few seconds.
- **Carry-over** (per Priya, see [GameState.ts](../../../frontend/src/game/state/GameState.ts)):
  - `reportedLight` lights the home-side stretch of the last lane (community-repaired) and can add a neighbour ally.
  - `checkedIn` gives Meera as a starting ally.
  - `helpedKavya` gives Kavya as a starting ally **and** opens a bonus shortcut.
  - `fellForScam` makes a fake message return early and gives the Barrier +20 starting energy.
  - `batteryCarry` and charging decide the start battery (under 30% means the phone is nearly dead).
  - `networkScore` adds a starting ally when high.
- **Bystander round** (after each Level 3 round, [RoundEndScene.ts](../../../frontend/src/game/scenes/RoundEndScene.ts)): the Barrier player
  (or the solo player) chooses Ignore / Check in / Alert authority / Call helpline. Ignore shows "Silence helps no one" and scores nothing.
  Any helping choice scores 60 and **a Bystander walks to Priya as a surprise ally in the next round**. `bystanderChoice` is recorded.
- **Endings** ([EndingScene.ts](../../../frontend/src/game/scenes/EndingScene.ts)): The Circle Complete (a ring of allies appears), Walked It Alone,
  Help Arrived, The Silence Wins (with "Replay as an ally?"). Then the final reflection screen from the bible.
- **Results** ([ResultsScene.ts](../../../frontend/src/game/scenes/ResultsScene.ts)): Helpline Report (calls, correct, numbers missed with the right
  answer), Barrier Ledger (lights, gates, decoys, other gaps and "every one of these could be repaired"), badges (Light Keeper, Network Builder,
  Helpline Hero, Bystander Hero), and a **Copy result card** button (clipboard text).

## How to check

`#dev=3` starts Level 3 with Meera, Kavya and a community-lit lane. Take the tunnel at the open column in the middle of the first lane,
or the long road for the Safe Zone.

## Left in this phase

- The bystander scene is a choice prompt, not a playable side scene.
- Ending thresholds are simple (`networkScore >= 4`, `reportedLight`, at most 2 wrong calls for the best ending). Tune after playtests.
- The result card is copied as text. Rendering it to a shareable image is not done.
- "Level 3 starts with 2 allies for a high network" works through the start-ally list (max 3 followers). The exact "+1 ally if won,
  reported the light and charged" rule is approximated.
