# CivicClash: Plan for a multiplayer game where every decision matters

## 1. Where the game stands today

| Your requirement | Status | Where it lives |
|---|---|---|
| Learning in every level | Present, now clearer | `DIALOGUE_INSIGHTS` (real-world rule after every choice), civic debrief after each round, quizzes in `data/quizzes.ts` |
| Saboteur cannot win by spamming traps | Present | Heat meter, global cooldown, lockout, per-round point cap, repeat-use diminishing returns (`server/loadout.js`, `balance.js`). `test_strategy.js` has the anti-spam test |
| Runner can counter / avoid / reverse sabotage | Present, now visible | Runner tools `scan`, `lock`, `verify`, `help`; dialogue counters (see section 3) |
| Strategic decisions from both players | Present | Saboteur loadout draft (3 of N abilities), energy vs heat trade-off; Runner chooses tools, order of NPCs, when to accuse |
| High-risk mission in a controlled arena | Present | 3 arenas (street, bazaar fire, construction site) with a hard round timer and one mission-ending report per level |

Balance check (`npm run sim:check`, 1500 bot matches): mirror matches sit at 47-52% Runner win rate, inside the 45-55% target.

## 2. What was fixed in this pass

1. **"Buttons that do nothing" (dialogue).** Every dialogue option now shows, before you click it:
   tone (empathy / cite the law / ask for facts / take action / pressure / deception), the exact Trust / Fear / Cooperation change, what it unlocks, what it needs (e.g. First-Aid Kit), what it risks, and, when the Saboteur has already manipulated that NPC, a green "counters" line.
   After you click, an outcome card says whether it **worked, backfired, was blocked, or was already covered**, with the real stat changes, points, any evidence gained, and the real-world rule behind it.
   Previews come from one file (`server/dialogueMeta.js`) and `test_dialogue_meta.js` checks every number against the real server handler, so the UI cannot promise something the game does not do.
2. **12 options did literally nothing** (they only showed text). They now move the NPC. One Saboteur option (`sab_priya_B`) charged energy and had no effect; it now works.
3. **Fake points.** The UI showed "+10 pts" for choices that scored nothing. It now shows only points actually awarded.
4. **Conversation has memory.** The last turns appear as a short log, and keys 1-4 select options.
5. **Verdict screen.** The Runner no longer sees their own name. They get one clear question: "Is <opponent> the Saboteur?" or "Not enough evidence". The server also refuses self-accusation.

## 3. Counterplay map (Saboteur move, Runner answer)

| Saboteur move | Runner answer | What the Runner learns |
|---|---|---|
| Scare Ramesh about police harassment | Cite s.134A (Good Samaritan law) | Good Samaritans cannot be detained or sued |
| Plant doubt in Priya's memory | Reassure or ask for the plate again | Witness protection and how to recover testimony |
| Incite panic (Deepak) | Calm him with low-posture smoke guidance | Crowd management in a fire |
| Jam the fire exit (Rajesh) | Cite NBC fire-exit rules | Exits must open from inside |
| Threaten watchman about PF (Kishore) | Cite whistleblower protection | Reporting protections at work |
| Plant a false lead | `verify` tool, LOW-reliability tag | Source reliability |
| Tamper with CCTV / lights | `lock`, `scan`, witness camera (mechanics tests) | Preserving evidence |

Rule of thumb for design: every Saboteur ability needs (a) a visible cost (energy + heat), (b) a Runner answer that is cheaper to find than the sabotage was to place, and (c) a lesson attached to the answer.

## 4. Plan to make it the best version (in priority order)

### P0: before showing it to more people (1-2 days)
- [ ] Run `npm install && npm run build` and click through all 3 levels on both seats. Type-checking could not be run in the environment where this pass was written (no network), so confirm `tsc -b` is clean.
- [ ] Playtest the new dialogue screen with 2 real people; watch where they hesitate.
- [ ] Add a one-line "Next step" hint on the HUD (e.g. "Ramesh needs 50% Cooperation to open the CCTV") driven by the same objective data.
- [ ] Sound/animation cue for outcome: soft chime for success, low thud for backfire.

### P1: make decisions harder (3-5 days)
- [ ] **Hidden-information trade-off:** previews show direction and size, so the decision is about *which NPC first* and *what to spend time on*, not about reading buttons. Add a Runner tool that costs time to reveal *how much* trust an NPC has before you commit.
- [ ] **Order matters:** make some options available only after another (Kishore's logbook makes the Bose confrontation safe; today it only makes it defensible).
- [ ] **Saboteur bluff:** let the Saboteur do one *helpful* action that earns a Runner trust bonus, which is the strongest cover story and the best fake-out.
- [ ] **Risk/reward mission clock:** an optional "Golden Hour" bonus for finishing early, paid for by skipping verification (fast but exposed to false leads).

### P2: replayability and polish (1-2 weeks)
- [ ] Daily scenario seed so two friends can compare runs.
- [ ] Post-round replay: a 20-second timeline of "what you did vs what the other player did".
- [ ] Teach-back quiz after each level that unlocks a cosmetic or a small starting bonus next level.
- [ ] Tutorial: one scripted 90-second practice round against the easy bot.
- [ ] Accessibility: colour-blind safe stat chips (already paired with arrows), full keyboard play, reduced-motion respected.

## 5. How to know it is working (playtest metrics)

| Signal | Target |
|---|---|
| Runner / Saboteur win rate (human matches) | 45-55% each |
| Players who can say what a clicked option did | 9 of 10 |
| Saboteur wins by spamming (heat lockout reached 3+ times) | under 10% of rounds |
| Rounds where the Runner used a counter | over 60% |
| "I learned something" after each level (1 question, thumbs up/down) | over 80% |
| Rounds that end in the first 60 seconds (too easy) or by timeout with nothing done (too hard) | under 10% each |

Re-run `npm run sim:check` after every balance change, and `node server/test_dialogue_meta.js` after editing any dialogue option.

## 6. Test commands

```
node server/test_dialogue_meta.js   # 39 checks: previews match real effects, no role leak, no self-accusation
node server/test_strategy.js        # anti-spam, heat, loadout, runner tools
node server/test_mechanics.js       # sabotage mechanics and counters
node server/test_privacy_leak.js    # role privacy across all payloads
npm run sim:check                   # balance, 1500 bot matches
```
(`test_level_selection_and_winner`, `test_solo_and_bot_match_start` and `test_full_six_rounds_match` need `npm install` for socket.io.)
