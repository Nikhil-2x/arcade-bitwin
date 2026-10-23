# Phase 8: Gameplay fixes and level selection

**Goal:** eight requested changes to timers, controls, allies, scoring and flow. Nothing else changed.

## Implemented

| # | Change | Where |
| --- | --- | --- |
| 1 | Helpline card timer: **10 s** in Levels 1 and 2 (was 5), **8 s** in Level 3 (was 4). Other cards (scam 4 s, code phrase 6 s) are unchanged | `cardTimer` in [level1.ts](../../../frontend/src/game/data/levels/level1.ts), [level2.ts](../../../frontend/src/game/data/levels/level2.ts), [level3.ts](../../../frontend/src/game/data/levels/level3.ts) |
| 2 | Helpline cards are answered with **W / S** to move the highlight and **Space** to answer. The mouse and the number keys are ignored on these cards, because they belong to the Barrier player. Held keys (auto-repeat) don't count, so walking with W or holding Space can't answer by accident | `keyboardOnly` in [PromptScene.ts](../../../frontend/src/game/scenes/PromptScene.ts), `setFocus` in [widgets.ts](../../../frontend/src/game/ui/widgets.ts) |
| 3 | Meera (the Check-In Contact) starts walking only in the **last 10 seconds** of a level (was 55% of the time) | `updateRunnerEffects` in [LevelScene.ts](../../../frontend/src/game/scenes/LevelScene.ts) |
| 4 | Nobody starts Level 2 or 3 already walking with Priya: the Meera, Kavya and Neighbor escorts are removed. Allies earned during the level (helpers from correct calls, Kavya after being helped, the hospital guard, Meera from the code call) still join | `startAllies` in level2.ts and level3.ts; extra Neighbor removed from LevelScene.ts |
| 5 | Share Location no longer sends a Patrol in any level. It still costs 5% battery and still cancels the Barrier's Isolate | `shareLocation` in LevelScene.ts |
| 6 | Who plays what is highlighted: a filled player-colour chip (P1 cyan, P2 yellow, AI violet) on the HUD and on the Brief cards. A "Player X is Priya, Player Y is the Barrier" toast appears at round start. The second round of each level gets a **ROLES SWAPPED** strip | [Hud.ts](../../../frontend/src/game/ui/Hud.ts), [BriefScene.ts](../../../frontend/src/game/scenes/BriefScene.ts), `PLAYER_COLORS` in [GameState.ts](../../../frontend/src/game/state/GameState.ts) |
| 7 | **Level winner** screen after every level. 2-player: each player's total = score as Priya + score as the Barrier (+ the Level 3 bystander bonus). Solo: your Runner score against the AI Barrier's score | [LevelResultScene.ts](../../../frontend/src/game/scenes/LevelResultScene.ts), `tally` in GameState.ts |
| 8 | **Level selection** page after choosing 1 or 2 players. All three levels are open. The chosen level is played on its own (1 round solo, 2 rounds with roles swapped in 2-player), then the level result shows and play returns to level selection. Level 3 continues into the endings and results as before | [LevelSelectScene.ts](../../../frontend/src/game/scenes/LevelSelectScene.ts), `startLevel` in GameState.ts |

### Follow-up: one rule for every card

Items 1 and 2 were then extended from helpline cards to **every card**:

- **All cards have 10 seconds** to answer. This covers helpline cards (Level 3 was 8 s), Spot the Scam (was 4 s), the code-phrase call (was 6 s), and the Trust Check, Ride Check, Meera's check-in, the code-phrase pick and the Bystander round, which had no timer before. The time lives in one place: `BALANCE.cardTime` in [constants.ts](../../../frontend/src/game/config/constants.ts). The per-level `cardTimer` field was removed.
- **All cards are answered with W / S + Space, or by clicking / tapping an option.** The pointer is kept so cards work on phones. Hovering an option moves the same highlight W / S uses, so only one option is ever highlighted. A click or tap anywhere skips the result once it has shown. Number keys stay off on cards, because they are the Barrier's ability keys.
- **Ride Check (pick 2):** Space or a click / tap ticks an option (✓), and doing it again unticks it. The card answers as soon as two are ticked, so there is no Confirm button.
- **If a card runs out of time:**
  - Quiz cards count as wrong, as before. For the Trust Check and Ride Check, which had no timer before, this means a timeout now applies their wrong-answer penalty.
  - Story choices fall back safely: no check-in with Meera, the first code phrase, or "ignore" for the Bystander.
- A correct answer is graded PERFECT / QUICK / GOOD on every card.
- An `incoming` flag on a card gives it the INCOMING header and the phone ring (helpline cards, scam texts and the code-phrase call).

## Session rules that follow from level selection

- Picking 1 or 2 players starts a session. Story choices (battery, reported light, Kavya, scam and so on) carry across the levels played in that session, so playing 1 → 2 → 3 in order still works like the campaign.
- The Prologue (Meera's check-in) plays once per session, before the first level picked.
- Each time a level starts, its score tally, the Level 3 ending counters and the bystander's surprise ally are reset, so replaying a level is judged on that play only.
- Round End "Next:" notes no longer mention the removed start-of-level escorts.

## How to check

- Menu → 1 or 2 players → Level select → pick a level.
- In 2-player, round 2's Brief shows ROLES SWAPPED, and after it the Level Result names the winner.
- `#dev=1`, `#dev=2` or `#dev=3` still start a solo level directly.

A headless Chrome run covered:
- the full 2-player Level 1 flow (Level Select → Prologue → two rounds → Level Result → back to Level Select)
- a solo Level 2 result
- each rule directly: timers 10 / 10 / 8, no followers at the start of Levels 2 and 3, Meera sent at 111 s of 120 but not at 109 s, Share Location adds no ally, and mouse clicks ignored on helpline cards

It finished with no console errors. `npm run lint` and `npm run build` pass.

## Left

- In solo the Level Result compares two different scoring formulas (Runner vs Barrier), so it's not a balanced contest.
