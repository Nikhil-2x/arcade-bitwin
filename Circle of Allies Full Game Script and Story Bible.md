# Circle of Allies: Full Game Script and Story Bible

*PS02 Chaos Control | 2-player asymmetric game | Women's safety theme*

**Logline:** Priya has to get home through three very different nights. Player 1 is Priya, the Runner. Player 2 is the Barrier, who controls the city's gaps. Every choice carries into the next level, and by the end both players have seen how much safety depends on lights, people and places, not on one person's choices.

---

## 1. Core systems

### Runner resources (Priya)

| Resource | Start | Effect |
| --- | --- | --- |
| **Battery** | 100% | Drains slowly. Share Location, helpline calls and wrong calls drain it faster. At 0% the phone is dead: no calls, no location sharing, minimum light. Not an instant loss, but very hard to recover from. |
| **Light radius** | Small | Grows near allies, shrinks when alone or on dark routes. |
| **Network** | 0 | Allies following her. Each ally widens the light and blocks one Barrier ability. |
| **Awareness points** | 0 | Earned for good decisions. Spend to unlock shortcuts or call an extra ally. |

### Barrier resources (Player 2)

| Resource | Effect |
| --- | --- |
| **Energy** | Regenerates slowly. Every ability costs energy and has a cooldown, with a cap of 3 uses per ability per round. |
| **Isolation meter** | Fills while Priya is alone in the dark. Fills completely = Barrier wins the round. |
| **Intel** | The Barrier sees the whole map but not Priya's phone. Reading her choices (battery drops, route picks) reveals her plan. |

### Win and loss

- **Runner wins:** reaches home before the timer ends and before the Isolation meter fills.
- **Barrier wins:** Isolation meter fills, or the timer runs out.
- Rounds are 90 to 120 seconds. After each round, roles swap and scores carry over.

### Runner features

1. **Call the Right Number (helpline cards).** A Situation Card appears, you get 5 seconds and 3 to 4 options. Correct: a Helper Ally joins for 20 seconds, full light, one Barrier ability locked for 10 seconds, +battery boost (+10%, a charging tip from the operator). Wrong: **-15% battery** (long wasted call), light shrinks, Barrier gains +1 energy, and the right number plus a one-line reason is shown. Timeout counts as wrong. Three wrong calls in a round: help "didn't reach her in time" and the Barrier wins.
2. **Two-path choices.** Forks between a **short dark shortcut** and a **longer lit road**.
3. **Trust Check.** Pick which of 3 people to approach, by setting and context (open shop, family with kids, empty dark corner).
4. **Spot the Scam.** Her phone buzzes with a message. Reply, Ignore or Report in 4 seconds.
5. **Phone charging points** (Safe Zones such as shops and tea stalls): +20% battery over 5 seconds while standing in one. The Barrier cannot see her inside.
6. **Share Location** (limited uses). Her ally network is alerted and the nearest ally walks toward her. Costs 5% battery.
7. **Report a Fault.** Tap a broken light for 2 seconds. It stays on for the round and she earns bonus points.
8. **Check-In Contact** (set before Level 1). The contact starts walking toward her if she is late.
9. **Code Phrase** (unlocked in Level 2). Used to verify real calls from friends and family against fake ones.
10. **Ride Check** (Level 2). Verify plate, share trip, sit behind the driver.
11. **Community Event** (random). Neighborhood watch patrol, lights repaired, festival crowd, power cut, rain.

### Barrier abilities

| Ability | Cost | What it does | Counter |
| --- | --- | --- | --- |
| **Lights Out** | Low | Turns off a streetlight | Report the fault or stay near an ally |
| **Close the Way** | Medium | Blocks a path or gate | Alternate route, helpline call |
| **Decoy Sign** | Medium | Fake "Exit this way" that points to a dead end | Verify with an ally or the map |
| **Crowd Flow** | Medium | Redirects NPC foot traffic away from her route | Safe Zones |
| **Fake Message** | High | Sends a fake text or call | Code Phrase, Ignore or Report |
| **Drain** | Low | Triggers a heavy app update, battery drops 5% | Charge point |
| **Flicker Bluff** | Free, once | Light flicker that looks like a closure | Move on and test the path |

---

## 2. Characters

- **Priya:** 20, second-year student, determined and practical. She is not reckless. She just has to get home.
- **Meera:** her older cousin and Check-In Contact.
- **Mr. Salim:** the tea-stall owner in the lane (Level 1).
- **Kavya:** a stranger she may help in Level 2, who becomes a recurring ally.
- **Inspector Rao / the 112 operator:** calm voice on the helpline.
- **The Barrier:** not a person. The Barrier is every neglected light, closed gate, bad rumor and silent bystander. Player 2's persona changes each level.

---

## 3. Story state (carry-over flags)

The game quietly tracks these flags and uses them in later levels.

| Flag | Set by |
| --- | --- |
| `checkedIn` | Notified Meera before Level 1 |
| `reportedLight` | Reported the broken streetlight in Level 1 |
| `tookShortcut` | Number of shortcuts taken |
| `helpedKavya` | Helped the stranger in Level 2 |
| `fellForScam` | Fell for a fake message |
| `batteryCarry` | Battery % at end of each level (she can charge at the start of the next level only if she reached a charge point) |
| `wrongCalls` | Total wrong helpline calls |
| `networkScore` | Allies gained across levels |
| `bystanderChoice` | Barrier player's choice in Level 3's Bystander round |

---

## 4. Prologue

**Black screen. Heartbeat. A phone buzzes.**

> **Meera (text):** Reached home? Tell me when you leave.

**CHOICE 0: Before you leave**

- **A. "I'll text you when I'm out."** `checkedIn = true`. Meera becomes your Check-In Contact.
- **B. "I'm fine, don't worry."** `checkedIn = false`. No backup this level.

> **Narrator:** Priya checks her battery. 100%. Three nights, one way home. She isn't alone. She just doesn't know it yet.

---

## 5. LEVEL 1: "The Last Bus" (Neighborhood lane)

**Story:** Evening, after her coaching class. The bus drops her at the colony gate, 12 minutes from home. Half the streetlights have been out for weeks.

**Tone:** Quiet, tense, small-scale. This level teaches the basics.

**Time:** 90 seconds. **Allies available:** Mr. Salim (tea stall), a neighbor aunty. **Cards:** 2 helpline cards, 3 options each, hints shown.

### Barrier persona: **"The Neglect"**

> *Barrier's perspective (shown to Player 2):* You are not a villain. You are every light nobody repaired and every gate nobody locked properly. You do not chase her. You just do not help. Switch off the lights. Close the lane. Watch what happens when a place is left alone.

**Barrier abilities:** Lights Out, Close the Way, Drain.

### Scene beats

**Beat 1: Bus stop.** Priya steps off in near-darkness. Only a small circle of light is visible.

> **Priya (thought):** Okay. Twelve minutes. Stay on the main lane.

**Beat 2: First fork (path choice)**

- **Path A: Shortcut through the empty park.** 4 minutes faster. No lights, no allies. The Barrier's Lights Out costs half energy here.
- **Path B: Lit main lane via the tea stall.** 3 minutes longer. Mr. Salim's stall is a Safe Zone and charge point.

*Outcome:* Path A raises the Isolation meter fast. Path B gives a free ally chance and a charge point. `tookShortcut` increments when A is taken.

**Beat 3: The broken streetlight.** A flickering lamp. Tap to **Report** (2 seconds).

- Report: `reportedLight = true`. The lamp stays lit for the round and she earns bonus points.
- Ignore: saves 2 seconds but the Barrier can use Lights Out on it again.

**Beat 4: Helpline Card 1.** A phone call arrives from an unknown number, then a message.

> **Situation:** "You feel someone has been following you for several minutes on a dark road. Who do you call?" Options: **112 (emergency)** / 181 (women helpline) / 1098 (Childline)

- Correct (112): the operator's voice, a patrol ally appears for 20 seconds, full light.
- Wrong: -15% battery, a short "This number handles something else" screen, plus the right number and reason.

**Beat 5: Home gate.** She reaches the door, or the lane closes in the dark.

### Branching outcomes of Level 1

| Result | What changes next |
| --- | --- |
| Won, reported the light, charged phone | Level 3's lane is lit by the community, +1 ally to start |
| Won, took shortcut twice | Battery carry-over is low, Level 2 starts at 60% |
| Lost (isolated) | Level 2 opens with Meera's worried call. If `checkedIn`, she arrives as an ally. If not, no backup |

**After-round card:** *"Streetlights and nearby shops make a route safer. Reporting a fault can fix it for everyone. Verify helpline numbers in advance (112 for emergencies, 181 and 1091 for women-specific help)."*

---

## 6. LEVEL 2: "Market Night" (Bus station and festival market)

**Story:** Next evening. Priya missed her connecting bus after a study group and has to cross a festival market to reach the station. The crowd is big but noisy, and no one is looking at her.

**Tone:** Chaotic, loud, confusing. This level teaches verification and trust.

**Time:** 105 seconds. **New mechanics:** Trust Check, Spot the Scam, Ride Check, Code Phrase, charging points. **Cards:** 3 helpline cards, 3 to 4 options, hints reduced.

### Barrier persona: **"The Noise"**

> *Barrier's perspective:* You are rumor, confusion and the crowd that doesn't notice. You never touch her. You just make everything unclear: a sign pointing the wrong way, a message from "a friend," a crowd that moves away at the wrong time. If she trusts the wrong thing, you win.

**Barrier abilities:** Decoy Sign, Crowd Flow, Fake Message, Drain, Flicker Bluff.

### Scene beats

**Beat 1: Market entrance.** Crowds, music, stalls.

> **Priya (thought):** Everyone's here and no one is looking. How do I find the station?

**Beat 2: Decoy signs.** Two signs point to the station. One is real. Verify by asking an ally, checking the map, or testing the path (costs time).

**Beat 3: Trust Check.** She looks lost. Three options appear:

- **A.** A woman with two children at a snack stall
- **B.** A shop owner behind a lit counter with a staff badge
- **C.** A person standing alone in a closed, dark alley

Correct: A or B (both public, visible, staffed or family settings). Wrong: C. Cost: lost time and Barrier +1 energy. *(Clarify to the player that the lesson is about the setting, not the person.)*

**Beat 4: Spot the Scam.** Her phone buzzes.

> **"Your cab driver has changed. Share OTP 4821 to confirm."** Options: **Reply with OTP** / **Ignore** / **Report**

Correct: Ignore or Report (+points, the Barrier's Fake Message is locked for 10 seconds). Wrong: `fellForScam = true`, battery -20% (a fake app drains it), and a trust alert.

**Beat 5: Kavya.** A student sits alone, crying, her phone dead.

- **Help Kavya:** costs 8 seconds, but `helpedKavya = true` and Kavya joins as an ally. She lends light, and she will return in Level 3.
- **Keep moving:** saves time, but `networkScore` is lower.

**Beat 6: Ride Check.** A cab arrives.

> **Pick the 2 correct actions of 4:** Verify the plate number / Share trip with Meera / Sit behind the driver / Check the app match

Correct: smooth ride, the Barrier loses an ability for the remainder of the level. Skipped: the Barrier gets a free Decoy.

**Beat 7: Station.** She arrives, or the crowd carries her the wrong way.

### Branching outcomes of Level 2

| Result | What changes next |
| --- | --- |
| `helpedKavya` | Kavya appears in Level 3 and unlocks a bonus path |
| `fellForScam` | A fake message appears in Level 3 and the Barrier starts with extra Intel |
| Battery under 30% | Level 3 starts with the phone nearly dead (a charge point is the first priority) |
| High `networkScore` | Level 3 starts with 2 allies |

**After-round card:** *"Never share an OTP. Verify cab and driver details. Public, lit, staffed places are the safest places to ask for help. Report cyber harassment on 1930 or cybercrime.gov.in."*

---

## 7. LEVEL 3: "The Underpass" (Late-night route)

**Story:** The night before her final exam. A power cut hits the city. The usual road is closed and the only way home goes through an underpass. This is the hardest night, and everything she did in Levels 1 and 2 matters now.

**Tone:** Dark, tense, emotional, with an uplifting finish.

**Time:** 120 seconds. **Cards:** 3 helpline cards, 4 options, no hints, 4-second timer. **Allies come from your past choices.**

### Barrier persona: **"The Silence"**

> *Barrier's perspective:* You are the silence of everyone who looked away. You do not need darkness alone. You need people to say "it's not my problem." Cut her off from her allies. Close the underpass. Make her feel there is no one left. But remember: you only win if nobody steps in.

**Barrier abilities:** All, with higher energy. Adds **Isolate**, which breaks one ally's link to Priya for 8 seconds (counter: Share Location, Code Phrase).

### Scene beats

**Beat 1: Power cut.** The whole map goes dark. Light radius begins at minimum.

- If `reportedLight` from Level 1: one lane has working lights (a community-repaired stretch).
- If `checkedIn`: Meera's contact appears at the entrance as a distant light.
- If `helpedKavya`: Kavya waves from the corner and joins as an ally.

**Beat 2: Final fork**

- **A. The underpass:** the shortest route, closed by a power cut, with the Barrier's strongest Isolate zone.
- **B. The long loop via the hospital road:** lit emergency lights, patrols, a Safe Zone and charge point, but 40 seconds longer.

This decision shapes the finale. The hospital road gives a Helper Ally and calm music. The underpass is a high-risk, high-reward bluff round.

**Beat 3: Helpline Card 1 (underpass).**

> **Situation:** "A person has collapsed ahead and needs medical help." Options: **108 / 112** (both acceptable, 108 is faster) / 1098 / 1930

**Beat 4: Helpline Card 2.**

> **Situation:** "A group is harassing someone on the road and you need women-specific support." Options: **112** / **181 or 1091** / 108 / 1930

(Accept both 112 and 181/1091 here, but show the one best matched to the scene. Verify all numbers on official sources.)

**Beat 5: Code Phrase call.** A call comes from "Meera." Does it match the code phrase?

- Match: real. She gains a boost and Meera arrives.
- Mismatch: fake. The Barrier's Fake Message is canceled and she gains points.

**Beat 6: The Bystander Round (role swap).** The Barrier player now plays **a Bystander** in a short side scene: someone is struggling in a street corner and the Bystander sees them.

> **Choices:** Ignore / Check in / Alert authority / Call helpline.

- Ignore: the Bystander loses points and the screen reads *"Silence helps no one."*
- Check in or call: the Bystander gains the most points and **appears as a surprise ally in Priya's route** in the next round. `bystanderChoice` is recorded.

**Beat 7: Home.** Priya reaches the door, or help reaches her.

---

## 8. Endings

| Ending | Conditions | Closing line |
| --- | --- | --- |
| **The Circle Complete** | Won Level 3, networkScore high, `reportedLight`, few wrong calls | *"She was never alone. Neither can anyone be, if the circle holds."* |
| **Walked It Alone** | Won with few allies, low battery | *"She made it. But safety shouldn't depend on luck."* |
| **Help Arrived** | Lost Level 3 but made at least 2 correct calls, an ally reaches her | *"Help didn't come fast enough, but it came. Next time, it can be sooner."* |
| **The Silence Wins** | Lost, no allies, 3 wrong calls | *"No one came. That is the real cost of looking away."* (immediately followed by a prompt: *"Replay as an ally?"*) |

**Final reflection screen (after the role swap):**

> *"As the Barrier, you made her path harder with small gaps. As Priya, you felt what allies, lights and the right number can change. In real life, you can be the ally."*

---

## 9. Scoring and results

**Runner:** time remaining + resources collected + correct calls + allies made + faults reported. **Barrier:** seconds Priya was delayed + wrong calls she made + isolation seconds.

**Results screen (shareable card):**

- **Helpline Report:** calls made, correct, and a list of numbers you missed.
- **Barrier Ledger:** how many fixable gaps you exploited (lights, gates, decoys). *"Every one of these could be repaired."*
- **Badges:** Light Keeper (reported 2+ faults), Network Builder (4+ allies), Helpline Hero (all correct), Bystander Hero (helped in Level 3).

---

## 10. Helpline content bank (verify all numbers on official government sources before display)

| # | Situation | Correct | Reason shown on screen |
| --- | --- | --- | --- |
| 1 | Someone is following you at night | 112 | One national emergency number for police, fire and ambulance |
| 2 | You need women-specific help or counseling | 181 / 1091 | Women's helplines |
| 3 | Accident, someone is injured | 108 / 112 | Ambulance dispatch |
| 4 | A child is lost or in danger | 1098 | Childline |
| 5 | Online harassment or cyber fraud | 1930 / cybercrime.gov.in | National cybercrime reporting |
| 6 | Fire in a nearby building | 112 (or 101) | Emergency services |
| 7 | Someone is being harassed in public | 112 / 181 | Police and women's support |
| 8 | Fake OTP message demands money | Ignore, then report at 1930 | Never share OTPs |
| 9 | Cab driver acts suspiciously | 112 + share trip | Share trip and call emergency |
| 10 | Medical emergency in a crowd | 108 / 112 | Ambulance |

---

## 11. Balance numbers (starting values)

| Setting | Value |
| --- | --- |
| Battery drain | 0.1% per second, +0.2% when lit by the phone |
| Wrong call | -15% battery, +1 Barrier energy |
| Correct call | +10% battery, 20s Helper Ally, 10s ability lockout |
| Barrier energy | 100, +3/sec, abilities cost 15 to 40 |
| Isolation meter | +2/sec alone in dark, +0.5/sec near 1 ally, 0 near 2 or more |
| Card timer | 5s (L1), 5s (L2), 4s (L3) |
| Target win rate | Runner 50 to 60%. Above 70%: shorten timers. Below 40%: lengthen the windows. |

---

## 12. Tech and data structure (Phaser 3)

```json
{ "id": "s01", "level": 1, "text": "Someone has followed you for minutes.",
  "options": ["112","181","1098"], "correctIndex": 0,
  "reason": "112 reaches police, fire and ambulance." }
```

- Scenes: `Boot`, `Menu`, `Prologue`, `Level1`, `Level2`, `Level3`, `CardOverlay`, `RoleSwap`, `Results`.
- A global `GameState` object holds all flags above and carries over between scenes.
- Light mask: a dark overlay with a geometry mask that follows Priya, radius = base + allies.
- Controls: Runner: WASD + Space. Barrier: arrow keys + number keys (or mouse).

---

## 13. 15-hour build priority

- **Must have:** movement, light mask, battery, helpline cards, path forks, Barrier abilities with energy, timer, role swap, scoring, 3 levels.
- **Should have:** Trust Check, Spot the Scam, flags carrying over, Safe Zones, endings.
- **Nice to have:** Ride Check, Code Phrase, Bystander round, badges, shareable result card, juice and sound.
- **Cut first:** extra events, skins, online play.

## 14. Tone guardrails

- Never show harassment or violence graphically. The threat stays abstract.
- Don't blame the Runner. Lessons are about what communities and systems should provide.
- Trust Check is about settings, not appearance.
- Verify every number and statistic before display.
