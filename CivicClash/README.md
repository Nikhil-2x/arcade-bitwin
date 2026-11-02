# CivicClash
### Trust. Respond. Deceive.

**A Two-Player Asymmetric Multiplayer Civic Awareness Game**

> Truth is a responsibility. Deception is a strategy.

---

## 1. Project Overview

**CivicClash** is a 3D, real-time, two-player online multiplayer game in which one player takes the role of a responsible citizen trying to respond to an incident, while the other secretly plays the role of a manipulator trying to create confusion, influence people, and conceal their involvement.

The game combines elements of:

- **Among Us:** Hidden identity, suspicious behaviour, tasks, evidence, accusations and voting.
- **Overcooked:** Time pressure, simultaneous objectives, prioritisation and coordination.
- **Social deduction games:** Trust, deception, conflicting information and strategic decisions.
- **Simulation games:** Interactive environments, NPC behaviour and consequences of player actions.
- **Civic education:** Learning how to respond responsibly to real-world incidents.

Unlike conventional multiplayer games, CivicClash is not about eliminating another player or simply completing the most tasks.

It is about **who can control the situation, who can earn people's trust, who can identify the truth, and who can make the best decisions under pressure.**

### 1.1 Core Concept

Every match contains two players:

| Player | Secret role | Primary responsibility |
|---|---|---|
| Player A | Responsible Citizen (Runner) | Respond to the incident, help people, collect reliable evidence and identify the manipulator. |
| Player B | Hidden Manipulator (Saboteur) | Influence the situation, create distractions, manipulate information and avoid being identified. |

The roles must remain secret from the opposing player.

Both players exist in the same 3D environment, interact with the same NPCs and objects, and experience the consequences of each other's actions.

The Saboteur is not required to behave like an obvious villain. In fact, the most effective strategy is to sometimes genuinely help people, gain their trust and use that credibility to influence the situation.

### 1.2 Design Philosophy

CivicClash should always prioritise:

1. Fun and engaging gameplay.
2. Meaningful decisions rather than repetitive button pressing.
3. Hidden identity and strategic deception.
4. Real-time multiplayer interaction.
5. Visible environmental consequences.
6. Fair and balanced gameplay.
7. Learning through gameplay rather than lengthy explanations.
8. Replayability through different strategies and outcomes.

---

# 2. Game Structure

## 2.1 Players

The game is designed for exactly two active human players per match.

**Runner**
- Receives private civic-response objectives.
- Must complete important emergency-response activities.
- Interacts with witnesses, victims, NPCs and environmental objects.
- Collects evidence and evaluates suspicious behaviour.
- Submits a final accusation.

**Saboteur**
- Receives private cover and manipulation objectives.
- Can perform legitimate helpful activities.
- Can secretly manipulate selected environmental mechanisms.
- Can influence NPC trust and witness statements.
- Must maintain credibility and avoid being identified.
- Submits a final alternative explanation or counter-accusation.

NPCs provide the additional social complexity needed to make a two-player game engaging. They are not substitutes for the two human players.

## 2.2 Match Structure

A complete match consists of three levels, with two rounds per level.

| Level | Scenario | Round 1 | Round 2 |
|---|---|---|---|
| 1 | Hit and Run — First Response | A: Runner, B: Saboteur | A: Saboteur, B: Runner |
| 2 | Public Safety — Marketplace Incident | A: Runner, B: Saboteur | A: Saboteur, B: Runner |
| 3 | The Cover-up — Construction Site Accident | A: Runner, B: Saboteur | A: Saboteur, B: Runner |

The roles reverse after every round.

This guarantees that both players experience both roles and that the final winner is determined by performance across the entire match rather than one role alone.

**Total match: 3 levels × 2 rounds = 6 rounds.**

The match flow is:

1. Main menu.
2. Create or join multiplayer room.
3. Wait for both players.
4. Lobby and readiness confirmation.
5. Level introduction.
6. Private role assignment.
7. Private task briefing.
8. Round gameplay.
9. Final accusation and counter-accusation.
10. Round results and civic-learning debrief.
11. Role switch.
12. Next round.
13. Final match results.
14. Rematch or return to lobby.

The server must control the match lifecycle. Clients must not independently decide the active round, actual role, score or winner.

---

# 3. Hidden Role System

## 3.1 Role Privacy Is Mandatory

The opposing player must never be able to identify someone's role through the interface or network messages.

Do not display:
- Runner or Saboteur beside a player's name.
- Role-specific colours or badges visible to the opponent.
- Public role icons.
- Private task names or progress.
- Saboteur energy, cooldowns or available abilities.
- Private notifications that reveal role identity.
- Role-specific animations or character models that reveal identity.

Both players should have visually identical player-name presentation.

Each client receives its own private role information from the server.

The server must maintain the authoritative mapping between player IDs and roles.

**Security requirement:** Hiding a role badge in React is insufficient. Private role and task information must also be excluded from public Socket.IO broadcasts, shared game state, logs exposed to clients and other public payloads.

## 3.2 Runner's Private Interface

The Runner sees:
- Their own role.
- Their own civic-response task list.
- Emergency-response progress.
- Available interactions.
- Evidence collected.
- Witness information.
- Public environmental events.
- Their own investigation notes.
- Suspicion clues that they have legitimately discovered.

## 3.3 Saboteur's Private Interface

The Saboteur sees:
- Their own role.
- Their private cover objectives.
- Their manipulation objectives.
- Available abilities.
- Sabotage energy and cooldowns.
- Their own credibility/trust progress.
- Their private strategy information.

The Runner must not receive this information.

---

# 4. Core Gameplay Loop

Every round follows the same basic gameplay loop:

1. **Observe:** Understand the incident and environment.
2. **Act:** Complete objectives and interact with the environment.
3. **React:** NPCs and environmental systems respond to both players.
4. **Investigate:** Gather information, compare statements and observe behaviour.
5. **Deceive:** The Saboteur attempts to influence the situation without exposing their identity.
6. **Evaluate:** Players review the evidence and decide what happened.
7. **Accuse:** Both players submit their final decisions privately.
8. **Reveal:** The server reveals the actual role and evaluates the round.
9. **Learn:** Players receive a short civic-awareness debrief.
10. **Continue:** The next round begins with roles switched.

Each action should have a visible or meaningful consequence.

---

# 5. Role 1 — Responsible Citizen (Runner)

## 5.1 Objective

The Runner must respond responsibly to the incident, assist people, request appropriate emergency support, collect reliable evidence and identify the hidden Saboteur.

The Runner wins the role-specific challenge by balancing:

- Victim assistance.
- Emergency response.
- Evidence collection.
- Witness cooperation.
- Environmental awareness.
- Investigation.
- Correct identification of the Saboteur.

The Runner must not be rewarded for merely rushing through tasks. Correct actions, reliable evidence and sensible priorities matter.

## 5.2 Runner Task System

The Runner receives a private task list.

Tasks should be divided into:

- Critical response tasks.
- Investigation tasks.
- Optional bonus tasks.

### Example: Level 1 — Hit and Run

| Task | Expected action |
|---|---|
| Inspect the accident scene | Observe the incident and identify hazards. |
| Check the victim | Approach the injured person and perform the safe in-game assessment interaction. |
| Request emergency assistance | Use the emergency phone to simulate a call to 112. |
| Bring the first-aid kit | Locate and collect the kit. |
| Apply basic first aid | Use the designated safe first-aid interaction. |
| Ask a bystander for help | Request assistance from an available NPC. |
| Speak to the eyewitness | Collect the eyewitness's account. |
| Speak to the shopkeeper | Ask about the incident and available CCTV. |
| Preserve CCTV evidence | Access the CCTV console and record relevant information. |
| Record vehicle details | Collect available vehicle information. |
| Preserve the scene | Avoid disturbing important evidence and manage the surrounding area. |
| Identify suspicious behaviour | Review events and compare witness accounts. |
| Submit final accusation | Select the suspected Saboteur and supporting evidence. |

Tasks may have prerequisites.

For example:
- The Runner must discover the emergency phone before using it.
- The Runner must collect the first-aid kit before applying it.
- CCTV evidence must be retrieved before it can be attached to an accusation.

The UI must clearly communicate completed, pending, unavailable and optional tasks.

## 5.3 Runner Task Prioritisation

The game should teach that emergency response is not a race to collect every object.

Critical safety tasks should be prioritised over optional evidence tasks.

A player should receive meaningful credit for requesting emergency assistance even if the Saboteur later escapes or disrupts the investigation.

The Runner should never be punished for choosing a responsible emergency-response action.

## 5.4 Runner Abilities

Possible Runner actions include:

- Inspect the scene.
- Interact with NPCs.
- Request emergency assistance.
- Collect and apply first-aid resources.
- Request bystander assistance.
- Preserve evidence.
- Review CCTV.
- Record witness statements.
- Compare conflicting accounts.
- Report the incident.
- Submit a final accusation.

Actions must have meaningful effects and must not be farmable by repeating the same interaction.

---

# 6. Role 2 — Hidden Manipulator (Saboteur)

## 6.1 Objective

The Saboteur's objective is to manipulate the situation, influence NPCs, create confusion, conceal their involvement and maintain the appearance of a helpful or innocent person.

The Saboteur is not simply a player who performs negative actions.

A strong Saboteur can:
- Genuinely help the victim.
- Bring the first-aid kit.
- Direct people toward safety.
- Help the Runner locate an object.
- Reassure a witness.
- Gain the trust of NPCs.
- Create a distraction at the right moment.
- Introduce misleading information.
- Exploit conflicting witness accounts.

This makes the role more strategic and less predictable.

## 6.2 Saboteur Task Categories

The Saboteur receives a private task list containing three categories.

### A. Cover Tasks — Appear Helpful

Examples:

| Task | Expected action |
|---|---|
| Help the injured person | Perform an appropriate safe assistance interaction. |
| Bring the first-aid kit | Locate and deliver it. |
| Help a bystander | Direct an NPC toward a useful activity. |
| Reassure the shopkeeper | Build trust through conversation. |
| Help locate the emergency phone | Provide assistance without revealing the hidden role. |
| Manage the crowd | Encourage people to remain away from the accident area. |
| Support the Runner | Complete a legitimate helpful activity. |

These tasks are important because the Saboteur should have credible reasons to interact with the environment.

### B. Manipulation Tasks — Create Chaos

Examples:

| Task | Expected action |
|---|---|
| Create a distraction | Trigger an approved noise source. |
| Change the lighting | Turn off a designated non-critical streetlight. |
| Redirect attention | Encourage NPCs to look toward an irrelevant location. |
| Influence a witness | Attempt to introduce a misleading interpretation. |
| Create a false lead | Introduce a plausible but incorrect clue. |
| Delay information sharing | Convince an NPC to postpone sharing their account. |
| Temporarily interrupt CCTV | Use a designated simulated CCTV mechanism. |
| Cause confusion | Create a conflicting account of the incident. |

### C. Trust Tasks — Protect Your Identity

Examples:

- Gain the shopkeeper's trust.
- Convince a witness that your explanation is credible.
- Complete a legitimate helpful action before creating a distraction.
- Become the NPC's preferred source of information.
- Avoid drawing unnecessary attention.
- Give a plausible explanation for suspicious activity.

Not every objective should be negative.

The best gameplay comes from making the Saboteur decide when to help and when to manipulate.

## 6.3 Saboteur Environmental Abilities

The Saboteur can interact with selected environmental mechanisms.

| Ability | Example effect | Suggested energy |
|---|---|---:|
| Noise distraction | Creates sound and attracts nearby NPCs. | 10 |
| Lighting manipulation | Turns off a designated non-critical light. | 15 |
| Witness influence | Changes an NPC's willingness to share information. | 15 |
| Crowd distraction | Redirects nearby NPC movement. | 20 |
| False lead | Introduces a misleading information clue. | 20 |
| CCTV interruption | Temporarily interrupts a designated simulated camera. | 25 |

These values are initial balancing suggestions, not immutable rules.

The implementation may adjust them after playtesting.

### Ability Requirements

Every ability must:
- Have a visible or understandable effect.
- Have a valid interaction range.
- Have a server-validated cooldown.
- Consume server-authoritative energy.
- Be synchronised between both players.
- Produce relevant NPC or environmental reactions.
- Avoid permanently blocking critical objectives.

The Saboteur must not be able to:
- Disable emergency exits.
- Prevent emergency assistance permanently.
- Make a victim's condition worse.
- Cause unavoidable player death.
- Permanently destroy essential evidence.
- Make a level impossible to complete.

## 6.4 Saboteur Energy

The Saboteur has a limited energy resource.

Energy is used to activate manipulation abilities.

The UI should display:
- Current energy.
- Maximum energy.
- Ability costs.
- Cooldown status.
- Ability availability.

Energy regeneration, if implemented, must be balanced and server-controlled.

A Saboteur should need to think carefully before spending energy.

---

# 7. Trust, Suspicion and NPC Behaviour

## 7.1 Trust

NPC trust represents how comfortable an NPC feels interacting with a player.

Trust may increase when a player:
- Provides appropriate assistance.
- Gives useful information.
- Reassures an NPC.
- Performs a legitimate task.
- Behaves consistently.

Trust may decrease when a player:
- Gives contradictory information.
- Behaves aggressively.
- Attempts to manipulate the NPC.
- Provides information that is later disproved.

Trust is not the same as innocence.

A Saboteur can have high trust, and a Runner can have low trust.

## 7.2 Suspicion

Suspicion represents how suspicious a player's observable behaviour appears.

Suspicion may be influenced by:
- Being near a manipulated object.
- Being seen using a suspicious mechanism.
- Contradictions between statements and observed events.
- Witness testimony.
- Repeated suspicious behaviour.
- Timing of environmental changes.

A sabotage action should not automatically reveal the Saboteur's identity.

Suspicion should depend on available evidence and NPC perception.

## 7.3 NPC System

NPCs must behave like participants in the environment, not static dialogue boxes.

Each NPC should support:
- Position and movement.
- Interaction.
- Dialogue.
- Trust and cooperation.
- Knowledge of the incident.
- Reactions to events.
- Witness statements.
- State transitions.
- Shared synchronisation.

NPC behaviour should be believable and consistent.

### Example NPC states

- Idle.
- Walking.
- Observing.
- Frightened.
- Distracted.
- Cooperating.
- Suspicious.
- Helping.
- Refusing to cooperate.
- Reporting an observation.

NPCs should react to both players and shared environmental events.

---

# 8. Level Design

The game must contain three complete, playable levels.

Each level must have:
- A distinct environment.
- A clear incident.
- Different NPCs.
- Runner objectives.
- Saboteur objectives.
- Environmental mechanisms.
- Evidence.
- A final accusation.
- A civic-learning takeaway.

## LEVEL 1 — HIT AND RUN: FIRST RESPONSE

### Setting

A busy Indian urban intersection.

The scene includes:
- Road intersection.
- Footpath.
- Small shop or dhaba.
- Bus stop.
- Streetlights.
- CCTV camera.
- Traffic signal.
- Emergency phone.
- First-aid kit.
- Accident evidence.
- Nearby pedestrians.

### Incident

A pedestrian named Arjun has been injured in a hit-and-run incident.

A vehicle has left the scene.

Several people witnessed different parts of the incident, but their accounts may not be consistent.

The Runner must respond appropriately and investigate what happened.

The Saboteur tries to influence the witnesses and control the flow of information.

### NPCs

| NPC | Role |
|---|---|
| Arjun | Injured victim |
| Ramesh | Shopkeeper |
| Priya | Eyewitness |
| Amit | Bystander |
| Officer Sharma | Traffic officer |

### Interactive Objects

1. Emergency phone.
2. First-aid kit.
3. CCTV console.
4. Traffic signal.
5. Designated non-critical streetlight switch.
6. Noise source.
7. Information board.
8. Accident evidence.

### Runner's Learning Outcomes

- Check scene safety.
- Request emergency help.
- Understand the role of India's 112 emergency response system.
- Avoid unnecessary movement of an injured person.
- Seek appropriate assistance.
- Avoid crowding the incident.
- Preserve factual information.
- Collect witness accounts responsibly.
- Understand the Good Samaritan concept.

### Saboteur Opportunities

- Create a noise distraction.
- Manipulate a witness.
- Change a non-critical light.
- Introduce a false lead.
- Temporarily interrupt designated CCTV.
- Gain the shopkeeper's trust.
- Help the victim to appear innocent.

---

## LEVEL 2 — PUBLIC SAFETY: MARKETPLACE INCIDENT

### Setting

A busy Indian marketplace with:
- Multiple shops.
- Pedestrians.
- A small fire incident.
- Fire alarm.
- Electrical control panel.
- Exit shutters.
- Emergency signs.
- Public announcement system.
- Fire extinguisher props.
- Safe evacuation routes.

### Incident

A fire breaks out in a marketplace.

People are confused, and several NPCs have conflicting information about the source of the incident.

The Runner must initiate an appropriate safety response and guide people toward safety.

The Saboteur attempts to create confusion and redirect attention without causing irreversible harm.

### NPCs

Suggested characters:
- Shopkeeper.
- Shop worker.
- Customer.
- Security guard.
- Market representative.

### Interactive Objects

1. Fire alarm.
2. Designated non-critical lighting control.
3. Simulated electrical control panel.
4. Emergency exit signage.
5. Public announcement system.
6. Crowd-control barriers.
7. Incident reporting terminal.

### Runner's Learning Outcomes

- Raise the alarm.
- Alert people.
- Follow safe evacuation routes.
- Avoid smoke-affected areas.
- Avoid using lifts during a fire.
- Follow emergency personnel instructions.
- Avoid re-entering unsafe areas.

### Saboteur Opportunities

- Create a harmless simulated distraction.
- Mislead an NPC about the source of the alarm.
- Influence the market representative.
- Create conflicting information.
- Temporarily disrupt a non-critical display.
- Gain the trust of a shopkeeper.

**Safety restriction:** Emergency exit systems, fire alarms and essential evacuation routes must never become permanently unavailable. The game must not reward actions that endanger people.

---

## LEVEL 3 — THE COVER-UP: CONSTRUCTION SITE ACCIDENT

### Setting

An Indian construction site containing:
- Partially completed buildings.
- Scaffolding.
- Safety boards.
- Construction equipment.
- Site office.
- Access gate.
- CCTV.
- Incident reporting terminal.
- Warning alarms.
- Designated safe zones.

### Incident

A construction worker has been injured in an accident.

There are questions about whether proper safety procedures were followed.

Some people want to report the incident, while others want to avoid responsibility.

The Runner must assist the injured worker, secure the area and gather reliable information.

The Saboteur attempts to influence statements and conceal relevant information.

### NPCs

Suggested characters:
- Injured worker.
- Site supervisor.
- Contractor.
- Security guard.
- Nearby resident.

### Interactive Objects

1. Safety control board.
2. CCTV system.
3. Warning alarm.
4. Site access gate.
5. Incident reporting terminal.
6. Safety information board.
7. Evidence/document collection points.

### Runner's Learning Outcomes

- Recognise unsafe conditions.
- Alert responsible people.
- Seek emergency assistance.
- Keep people away from unsafe areas.
- Avoid disturbing the incident scene.
- Preserve factual evidence.
- Report safety concerns appropriately.

### Saboteur Opportunities

- Manipulate witness accounts.
- Create a misleading explanation.
- Temporarily interrupt a designated camera.
- Redirect NPC attention.
- Build trust with the supervisor.
- Introduce a false lead.
- Appear helpful while concealing involvement.

---

# 9. Shared Environment and Environmental Chaos

Both players must experience the same world.

If one player changes an object, the other must see the same change.

Examples:

| Action | Shared consequence |
|---|---|
| Turn off a designated streetlight | Both clients see the light turn off. |
| Trigger a noise distraction | Both clients hear the sound and see NPC reactions. |
| Influence a witness | Both clients see the NPC's changed behaviour, but private influence details remain hidden. |
| Interrupt CCTV | Both clients see the camera's simulated status change. |
| Move a barrier | Both clients see its new position. |
| Complete an emergency task | Shared world state updates. |

The game should make the consequences of sabotage visible without automatically identifying the Saboteur.

Environmental mechanisms should be implemented as actual interactive game objects, not just text notifications.

## 9.1 Environmental Lighting

Lighting manipulation must visibly affect the environment.

Requirements:
- Actual light source state changes.
- Appropriate visual transition.
- NPC reactions.
- Shared multiplayer synchronisation.
- Restoration after the relevant cooldown or interaction.

Emergency lighting must remain available.

## 9.2 Noise Distraction

Requirements:
- A visible or identifiable source.
- Sound effect.
- NPCs react according to distance.
- Crowd movement or attention changes.
- Both clients see the same outcome.

## 9.3 CCTV

Requirements:
- Functional interaction.
- Camera status.
- Relevant incident information.
- Temporary interruption when allowed.
- Evidence preservation.
- No permanent removal of essential evidence.

---

# 10. Evidence and Investigation System

Evidence is essential to the final accusation.

The game must distinguish between:
- Verified evidence.
- Witness testimony.
- Unverified claims.
- Contradictory information.
- Misleading information.

Examples of evidence:
- CCTV observations.
- Witness statements.
- Timeline events.
- Environmental changes.
- Object interaction history.
- Conflicting explanations.

Each evidence item should contain:
- Unique evidence ID.
- Evidence type.
- Description.
- Source.
- Time collected.
- Reliability level.
- Verification status.

The Runner should be able to review collected evidence through an investigation panel.

Evidence should not automatically reveal the Saboteur.

A strong investigation requires comparing information and evaluating reliability.

The Saboteur should be able to introduce misleading information, but the game must retain enough verifiable information for a fair investigation.

---

# 11. Final Accusation System — The Civic Verdict

## 11.1 Why It Is Different

CivicClash has only two human players.

A conventional Among Us majority vote would not work fairly because there is no meaningful majority with two people, and the Saboteur already knows their own identity.

Therefore, CivicClash uses a **Sealed Accusation and Counter-Accusation System**.

Both players submit private decisions.

Neither can see the other's selection before locking their own.

## 11.2 Accusation Phase

At the end of a round:

1. The gameplay timer stops.
2. Players enter the verdict screen.
3. Both review their available information.
4. The Runner submits an accusation.
5. The Saboteur submits an alternative explanation.
6. Both submissions are locked privately.
7. The server reveals both submissions simultaneously.
8. The actual role is revealed.
9. The round score is calculated.

## 11.3 Runner Submission

The Runner selects:

**Who do you believe was the hidden manipulator?**

- Player A.
- Player B.
- Insufficient evidence.

The Runner must also select up to two supporting evidence items.

Possible supporting items:
- Witness testimony.
- CCTV observation.
- Environmental activity.
- Timeline contradiction.
- Suspicious interaction.
- Verified information.

The Runner should be rewarded for evidence quality, not simply guessing correctly.

## 11.4 Saboteur Submission

The Saboteur submits:
- An alternative explanation.
- A counter-accusation or defence.
- Supporting information from the available narrative cards.

Example narrative cards:
- The incident was a result of an accidental malfunction.
- A witness may have misunderstood the situation.
- Another suspicious event caused the confusion.
- The information is insufficient to establish responsibility.
- A different player interaction appears suspicious.

The Saboteur is evaluated on the credibility of their cover strategy and the extent to which they avoided detection.

The Saboteur cannot change the actual identity or server record of the criminal role.

## 11.5 Verdict Scoring

The verdict should evaluate:

| Factor | Purpose |
|---|---|
| Correct identification | Did the Runner identify the actual Saboteur? |
| Evidence quality | Were the selected items reliable and relevant? |
| Verification | Did the Runner verify conflicting information? |
| Investigation coverage | Did the Runner examine important clues? |
| Deception quality | Did the Saboteur maintain credibility? |
| Suspicion management | Did the Saboteur avoid exposing suspicious activity? |
| Counter-narrative | Was the alternative explanation consistent with available information? |

A random correct guess must not earn the same score as a correct evidence-backed accusation.

---

# 12. Scoring and Winner Determination

The final winner is determined across all six rounds.

The game must not automatically declare the Runner or Saboteur the winner merely because of their role.

Both players have opportunities to score points in both roles.

## 12.1 Runner Scoring

Suggested scoring:

| Action | Suggested points |
|---|---:|
| Correctly assess the scene | +10 |
| Request emergency assistance | +20 |
| Obtain the first-aid kit | +10 |
| Apply appropriate first aid | +15 |
| Request bystander assistance | +10 |
| Obtain a useful witness statement | +10 |
| Verify witness information | +10 |
| Preserve CCTV evidence | +15 |
| Collect relevant evidence | +10 |
| Submit a correct evidence-backed accusation | +25 |
| Submit a correct accusation with strong evidence | Additional bonus |
| Complete optional civic objective | +5 |

These are starting values and may be adjusted through testing.

## 12.2 Saboteur Scoring

Suggested scoring:

| Action | Suggested points |
|---|---:|
| Complete a legitimate cover task | +10 |
| Gain meaningful NPC trust | +10 |
| Complete a manipulation objective | +10 |
| Create a successful distraction | +10 |
| Introduce a plausible false lead | +15 |
| Influence a witness without immediate exposure | +15 |
| Complete a strategic helpful action | +10 |
| Maintain credibility until the verdict | +15 |
| Avoid a well-supported accusation | +20 |

The Saboteur must not earn points for harming a victim, blocking emergency response, preventing evacuation or creating irreversible danger.

## 12.3 Important Scoring Rules

- Each rewardable action must be credited only once per round, unless explicitly designed as a repeatable action.
- Repeating dialogue must not generate additional trust, score or information rewards.
- Similar interactions should share reward groups where appropriate.
- Scores must be validated by the server.
- Clients must never be trusted to submit their own score.
- All values must have sensible bounds.
- A failed action should not grant full success points.
- Critical Runner tasks should retain meaningful value even if the final accusation is wrong.
- Saboteur scoring should reward strategy, not reckless sabotage.

## 12.4 Final Winner

At the end of all six rounds:

**Total Match Score = Sum of all round scores for each player.**

The player with the higher total match score wins.

Possible results:

- Player A wins.
- Player B wins.
- Draw.

The final screen should show:
- Total points.
- Runner performance.
- Saboteur performance.
- Round-by-round scores.
- Correct accusations.
- Completed objectives.
- Civic-learning achievements.
- Final winner.

Role-specific performance should also be displayed separately so players can understand how they performed in each role.

---

# 13. Timers and Match Pacing

Every round should have a time limit.

Suggested initial design:

| Phase | Suggested duration |
|---|---:|
| Level introduction | 15–20 seconds |
| Role/task briefing | 15 seconds |
| Active gameplay | 4–6 minutes |
| Final accusation | 30–45 seconds |
| Results and debrief | 20–30 seconds |

The exact duration should be configurable per level.

The timer must be server-authoritative.

Both clients must display the same remaining time.

When the timer reaches zero:
- Active interactions stop.
- The game enters the accusation phase.
- Both players submit their decisions.
- The round is evaluated.

The game must handle players disconnecting or reconnecting without corrupting the match state.

---

# 14. User Interface and Experience

The UI must be clean, modern, immersive and easy to understand.

## 14.1 Main Menu

Include:
- CivicClash title.
- Tagline.
- Play button.
- Create room.
- Join room.
- Instructions.
- Credits.
- Sound settings.

## 14.2 Multiplayer Lobby

Display:
- Room code.
- Player names.
- Connection status.
- Ready status.
- Start status.

Do not display roles before or during the match.

## 14.3 In-Game HUD

Public elements:
- Round timer.
- Level name.
- Shared event notifications.
- Interaction prompts.
- Public objective status where appropriate.
- Player names without role labels.

Private elements:
- Own role.
- Own tasks.
- Own abilities.
- Own resources.
- Own evidence/investigation panel.

Private elements must never be exposed to the other client.

## 14.4 Task Panel

Task list should:
- Be readable.
- Show completion state.
- Support optional and critical objectives.
- Update immediately after successful actions.
- Provide useful instructions.
- Avoid excessive screen obstruction.

## 14.5 Interaction System

Use a consistent interaction approach.

Example:
- Approach an object or NPC.
- Display an interaction prompt.
- Press E or use the defined interaction key.
- Open a dialogue or action panel.
- Complete the action.
- Show the result.

All important interactions should have visual and audio feedback.

## 14.6 Results Screen

Display:
- Round result.
- Actual roles revealed.
- Runner points.
- Saboteur points.
- Objectives completed.
- Evidence quality.
- Important events.
- Civic takeaway.
- Next-round button or automatic transition.

---

# 15. Controls

Suggested default controls:

| Input | Action |
|---|---|
| W | Move forward |
| A | Move left |
| S | Move backward |
| D | Move right |
| Mouse | Camera control |
| Shift | Sprint |
| E | Interact |
| Tab | Open task/evidence panel |
| Esc | Pause/settings |

Controls should be configurable where practical.

The game must support:
- Smooth third-person movement.
- Camera control.
- Collision detection.
- Multiplayer movement synchronisation.
- Interaction range checks.
- Server validation.

---

# 16. Civic Learning and Educational Value

CivicClash should teach through gameplay.

Players should learn by making decisions and observing their consequences.

Each level must end with a concise learning debrief.

The debrief should answer:

1. What did you do correctly?
2. Which important safety step did you miss?
3. What was the consequence of your decisions?
4. What is the correct real-world takeaway?

### Level 1 Learning

- Scene safety.
- Requesting emergency assistance through India's 112 system.
- Appropriate basic first response.
- Avoiding unnecessary movement of injured people.
- Managing bystanders.
- Preserving evidence.
- Good Samaritan awareness.

### Level 2 Learning

- Raising the alarm.
- Following safe evacuation routes.
- Avoiding smoke.
- Not using lifts during a fire.
- Following emergency instructions.
- Avoiding re-entry into unsafe areas.

### Level 3 Learning

- Recognising unsafe working conditions.
- Alerting responsible personnel.
- Requesting emergency assistance.
- Keeping people away from hazards.
- Preserving evidence.
- Reporting factual safety concerns.

All real-world emergency, legal and medical information must be checked against authoritative sources.

The game is an educational simulation, not a substitute for professional medical, emergency or legal advice.

**Never make the simulated emergency phone contact actual emergency services.**

---

# 17. Technical Architecture and Multiplayer Requirements

The implementation must preserve the existing project architecture unless there is a clear technical reason to change it.

Current architecture:

### Frontend
- React 19.
- TypeScript.
- Three.js.
- 3D third-person game environment.
- Real-time client-side rendering.
- Socket.IO client.

### Backend
- Node.js.
- Socket.IO.
- Authoritative game manager.
- Server-controlled match state.
- Server-controlled scoring and abilities.

### Existing project areas

The project has been developed around:

- `src/features/civicClash/`
- `server/server.js`
- `server/gameManager.js`

The exact file structure should be inspected before modifications. Do not assume every component is located at the paths above without checking the repository.

## 17.1 Server Authority

The server must control:
- Player identity.
- Room membership.
- Role assignments.
- Match state.
- Round transitions.
- Timers.
- NPC state.
- Interactive object state.
- Sabotage abilities.
- Energy and cooldowns.
- Trust and suspicion.
- Evidence records.
- Task completion.
- Score calculation.
- Accusation submission.
- Winner determination.

The frontend is responsible for rendering and user interaction, not deciding the authoritative outcome.

## 17.2 Multiplayer Synchronisation

Both players must receive consistent updates for:
- Player positions.
- NPC positions and states.
- Interactive object states.
- Environmental changes.
- Public events.
- Shared objectives.
- Incident progression.
- Round state.

Private data must be delivered only to the intended player.

## 17.3 Private and Public Events

Use separate event payloads for public and private information.

Examples of public information:
- Player movement.
- Public NPC reactions.
- Environmental changes.
- Shared object state.
- Public incident updates.

Examples of private information:
- Role assignment.
- Private task list.
- Saboteur energy.
- Ability cooldowns.
- Private investigation notes.
- Private accusation before reveal.

Never broadcast a full internal game state if it contains secret information.

## 17.4 Validation

Every important action must be validated by the server.

Validate:
- Player belongs to the room.
- Correct match phase.
- Correct interaction range.
- Valid object or NPC.
- Ability availability.
- Energy balance.
- Cooldown.
- Task prerequisites.
- Duplicate action prevention.
- Valid scoring conditions.
- Accusation submission state.

---

# 18. Collision, Movement and World Integrity

The world must feel physically believable.

Requirements:
- Players cannot enter buildings through walls.
- Players cannot walk through solid objects.
- NPCs should not walk through buildings or obstacles.
- Players should not overlap each other.
- World boundaries must be enforced.
- Interactive objects must have appropriate interaction ranges.
- NPCs should not become permanently stuck.
- Doors and permitted entry points must have intentional collision behaviour.

Collision should use appropriate collider geometry rather than relying solely on visual meshes.

Debug collision visualisation should be available during development.

---

# 19. Anti-Exploit and Fairness Requirements

The game must prevent repeated actions from generating unlimited points or trust.

Examples of exploits to prevent:

### Dialogue farming
A player repeatedly selects the same dialogue option to gain trust.

**Expected behaviour:** Each rewardable dialogue action can grant its reward only once per applicable reward group per round.

### Task farming
A player repeatedly completes the same task to accumulate points.

**Expected behaviour:** Task rewards are recorded using unique task IDs and server-side completion records.

### Ability spamming
A player repeatedly triggers the same environmental ability.

**Expected behaviour:** Server-authoritative energy and cooldown enforcement.

### Fake evidence
A client attempts to submit evidence that was never collected.

**Expected behaviour:** Evidence IDs must be validated against the server's actual evidence records.

### Score manipulation
A client sends an artificially high score.

**Expected behaviour:** All scoring happens on the server.

### Role information leakage
A client attempts to inspect another player's private role or task state.

**Expected behaviour:** Private information is never included in public payloads.

### Movement exploits
A client attempts to teleport or move through walls.

**Expected behaviour:** Movement bounds, collision and server-side validation prevent unfair movement.

---

# 20. Audio, Animation and Visual Feedback

The game should not feel like a collection of static 3D models.

Use appropriate:
- Walking and running animations.
- NPC gestures.
- Pointing and looking animations.
- Frightened and confused reactions.
- Environmental sound effects.
- Emergency ambience.
- Interaction feedback.
- UI transitions.
- Lighting transitions.

Important actions must be visually understandable.

For example:
- When a light is turned off, the environment visibly darkens.
- When a noise distraction occurs, NPCs react.
- When a witness is influenced, their behaviour or statement changes.
- When the Runner helps a victim, the victim shows an appropriate response.

Audio and animation must remain synchronised with gameplay state.

---

# 21. Match Reset, Reconnection and Rematch

The game must support a complete lifecycle.

### Round Reset
When a new round begins:
- Reset round-specific scores and task states.
- Reset temporary environmental changes.
- Reset NPC states as required.
- Reset round-specific evidence.
- Reset sabotage energy and cooldowns.
- Switch roles according to the match schedule.

### Match Completion
When all six rounds finish:
- Calculate total scores.
- Determine the winner or draw.
- Show the complete results screen.
- Offer a rematch.

### Reconnection
If a player disconnects:
- Preserve the authoritative match state.
- Allow reconnection where possible.
- Restore the correct private state to the reconnecting player.
- Do not expose the other player's private data.
- Avoid resetting a match unnecessarily.

If reconnection is not possible within the configured timeout, end or resolve the match fairly.

---

# 22. Testing and Acceptance Criteria

The game is considered complete only when the expected functionality works in an actual two-client multiplayer test.

Do not rely exclusively on static code inspection.

Use automated browser testing, preferably Playwright with two independent browser contexts.

## 22.1 Multiplayer Tests

- Two players can create/join the same room.
- Both players see each other's movement.
- Both players see the same NPC state.
- Both players see the same environmental changes.
- Both players see consistent timers.
- Both players experience the same round transitions.

## 22.2 Role Privacy Tests

- Runner sees only their own role.
- Saboteur sees only their own role.
- Neither player can identify the other role through visible UI.
- Public network payloads contain no secret role information.
- Private tasks are not visible to the opponent.
- Saboteur abilities and energy are private.

## 22.3 Task Tests

- Runner tasks appear correctly.
- Saboteur tasks appear correctly.
- Task prerequisites work.
- Task completion is synchronised where appropriate.
- Duplicate completion does not award points.
- Role-specific tasks cannot be completed by the wrong player unless explicitly allowed.

## 22.4 Environmental Tests

- Lighting changes are visible to both players.
- Noise distractions produce NPC reactions.
- CCTV changes are synchronised.
- NPCs respond to player actions.
- Critical emergency mechanisms remain functional.
- Environmental changes reset correctly.

## 22.5 Investigation Tests

- Evidence is recorded correctly.
- Evidence reliability is represented accurately.
- Witness statements can be compared.
- Misleading information does not permanently destroy the truth.
- Evidence cannot be fabricated by a client.
- Accusations can reference only collected evidence.

## 22.6 Verdict Tests

- Both players can submit independently.
- One player's submission remains private until both lock.
- Submissions are revealed together.
- Actual role identity comes from the server.
- Correct and incorrect accusations are scored appropriately.
- Timeout and disconnect behaviour are handled.

## 22.7 Scoring Tests

- Runner points are calculated correctly.
- Saboteur points are calculated correctly.
- Duplicate rewards are prevented.
- Negative or invalid values are rejected.
- Client score manipulation is impossible.
- Final winner is based on all six rounds.

## 22.8 World Tests

- Players cannot enter solid buildings.
- Players cannot walk through walls.
- NPC navigation avoids solid obstacles.
- Players cannot exploit movement to bypass the level.
- Interaction ranges are enforced.

## 22.9 Complete Match Test

Automate a full match:

1. Create a room.
2. Join with the second client.
3. Start the match.
4. Play Level 1 Round 1.
5. Submit both verdicts.
6. Verify scoring and role switching.
7. Play Level 1 Round 2.
8. Continue through all three levels.
9. Verify all six rounds.
10. Verify final score and winner.
11. Test rematch.

The automated test must verify the actual gameplay state, not merely that buttons are visible or pages load.

---

# 23. Development Rules for AI Coding Agents

This README is the **master specification of CivicClash**.

Any AI coding agent, including Claude Sonnet, Claude Code or another development assistant, must follow these instructions when modifying the project.

## 23.1 Before Making Changes

1. Inspect the complete existing repository.
2. Read this README fully.
3. Understand the existing architecture.
4. Identify implemented features.
5. Identify partially implemented features.
6. Identify missing features.
7. Identify bugs and conflicts with this specification.
8. Inspect existing automated tests.
9. Prepare an implementation plan.

Do not immediately rewrite the project.

## 23.2 Preserve Existing Functionality

- Do not remove working multiplayer functionality.
- Do not replace the existing 3D environment without a clear reason.
- Do not remove working NPC systems.
- Do not break room creation and joining.
- Do not remove existing levels or interactions.
- Do not replace working components with static mockups.
- Avoid unnecessary architectural rewrites.

Prefer targeted improvements.

## 23.3 Implementation Priority

When a feature is incomplete, implement in this order:

1. Core multiplayer stability.
2. Correct hidden-role privacy.
3. Complete Runner and Saboteur task systems.
4. Interactive and synchronised environments.
5. NPC trust, suspicion and behaviour.
6. Evidence and investigation.
7. Sealed verdict system.
8. Fair scoring and final winner.
9. Civic-learning debrief.
10. Animation, sound, polish and replayability.

Do not prioritise visual polish over broken core gameplay.

## 23.4 Testing Is Mandatory

After changes:
- Run the frontend build.
- Run the backend.
- Run available automated tests.
- Run two-client Playwright tests.
- Test relevant gameplay interactions.
- Inspect browser console errors.
- Inspect server errors.
- Verify multiplayer synchronisation.
- Verify role privacy.
- Verify that previous features still work.

Never claim that a test passed unless it was actually executed and passed.

If a test cannot be executed, explicitly report why.

## 23.5 README as the Source of Truth

If an existing implementation contradicts this README, treat the README as the intended game design.

However, inspect the implementation before changing it.

If a requested feature cannot be implemented safely or conflicts with another requirement, explain the conflict and propose a solution rather than silently removing functionality.

Update this README whenever a deliberate design decision changes.

---

# 24. Definition of Done — Final Game

CivicClash is considered complete when all of the following are true:

- [ ] Two players can join and play in the same online room.
- [ ] Both players control their own 3D characters.
- [ ] Roles remain hidden from the opposing player.
- [ ] Runner receives meaningful civic-response objectives.
- [ ] Saboteur receives meaningful cover and manipulation objectives.
- [ ] Both players can interact with NPCs.
- [ ] NPCs react to both players.
- [ ] Environmental sabotage has visible consequences.
- [ ] Shared world changes synchronise correctly.
- [ ] Trust and suspicion influence gameplay.
- [ ] Evidence can be collected and evaluated.
- [ ] Players can submit private verdicts.
- [ ] Verdicts are revealed simultaneously.
- [ ] Scoring is server-authoritative.
- [ ] Repeated actions cannot farm rewards.
- [ ] All three levels are fully playable.
- [ ] Both roles are switched after every round.
- [ ] All six rounds can be completed.
- [ ] The final winner is calculated correctly.
- [ ] Civic-learning debriefs appear after rounds.
- [ ] Collision and world boundaries work.
- [ ] Disconnect/reconnect is handled fairly.
- [ ] Rematch works.
- [ ] Automated two-client tests pass.
- [ ] No critical gameplay or console errors remain.

---

# 25. Final Vision

CivicClash should create a situation where two players are constantly questioning each other's actions.

The Runner is thinking:

- Who is actually helping?
- Why did that person change the lighting?
- Why are the witness statements different?
- Which evidence can I trust?
- Am I focusing on the emergency or getting distracted?

The Saboteur is thinking:

- Should I help the victim to build trust?
- When should I create a distraction?
- How do I influence the witness without appearing suspicious?
- Can I make a misleading explanation sound believable?
- How do I stay helpful enough that nobody suspects me?

Both players must make decisions, adapt to changing circumstances and think strategically.

The game should be enjoyable even for players who know nothing about civic laws. At the same time, players should finish each level having learned something useful about real-world safety and responsible action.

**CivicClash is not just about completing tasks. It is about trust, responsibility, deception and the ability to recognise the truth when everything around you is designed to create confusion.**

### Final Tagline

**CivicClash — Trust. Respond. Deceive.**

*One incident. Two perspectives. Only one truth.*