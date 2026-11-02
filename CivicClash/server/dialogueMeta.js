// Dialogue option previews.
//
// Every option the player can click gets a short, honest preview of what it
// will do BEFORE they click it: tone, stat changes on the NPC, what it unlocks,
// what it risks. This is what stops the conversation feeling like "clicking
// random buttons". Keep these numbers in sync with handleDialogueChoice() in
// gameManager.js (test_dialogue_meta.js checks the stat deltas against the
// real handler so they cannot drift).
//
// tone: 'empathy' | 'legal' | 'info' | 'action' | 'pressure' | 'deceive'
//   pressure = the "tempting but backfires" choice, it teaches de-escalation.
// effects: { trust, fear, cooperation } deltas on the NPC (first-time use).
// unlocks: plain-language goal progress. needs: what must already be true.
// risk:    plain-language downside. counters: reverses a saboteur manipulation.

export const TONE_LABEL = {
  empathy: 'Empathy',
  legal: 'Cite the law',
  info: 'Ask for facts',
  action: 'Take action',
  pressure: 'Pressure (risky)',
  deceive: 'Deception'
}

export const OPTION_META = {
  // ── Level 1: Hit & Run ──────────────────────────────────────────────
  arjun_firstaid: {
    tone: 'action',
    effects: { trust: 40, fear: -30 },
    needs: 'First-Aid Kit in your bag',
    unlocks: 'Stabilises the victim, completes the first-aid objective'
  },
  arjun_ask_car: { tone: 'info', unlocks: 'Vehicle clue for the case file' },
  ramesh_opt_A: {
    tone: 'empathy',
    effects: { cooperation: 25, trust: 10 },
    unlocks: 'Ramesh opens up at 50% Cooperation, which unlocks the CCTV console'
  },
  ramesh_opt_B: {
    tone: 'legal',
    effects: { trust: 25, fear: -20 },
    counters: 'Undoes the "you will be harassed" scare tactic',
    unlocks: 'Calms his fear of police trouble'
  },
  ramesh_opt_C: {
    tone: 'pressure',
    effects: { trust: -20, fear: 15 },
    risk: 'Threats make witnesses clam up. Helps the Saboteur.'
  },
  priya_opt_plate: {
    tone: 'info',
    effects: { trust: 20, cooperation: 20 },
    counters: 'Restores her memory if the Saboteur planted doubt',
    unlocks: 'Partial number plate: a verified clue for the final accusation'
  },
  priya_opt_reassure: {
    tone: 'empathy',
    effects: { trust: 20, cooperation: 20 },
    counters: 'Restores her confidence if the Saboteur planted doubt',
    unlocks: 'Partial number plate: a verified clue for the final accusation'
  },
  priya_opt_confirm_route: { tone: 'info', unlocks: 'Direction of travel for the police report' },
  amit_opt_call: {
    tone: 'action',
    unlocks: 'Amit runs to the Emergency Pillar and dials 112'
  },
  sharma_opt_report: {
    tone: 'action',
    needs: 'CCTV footage AND the plate clue in your log',
    unlocks: 'Filing a verified report completes the mission'
  },

  amit_opt_crowd: { tone: 'action', effects: { trust: 10, cooperation: 15 }, unlocks: 'Keeps Arjun safe and calm while you work' },
  sharma_opt_traffic: { tone: 'action', effects: { trust: 15, cooperation: 20 }, unlocks: 'Clears the road for the ambulance' },
  // ── Level 2: Marketplace fire ───────────────────────────────────────
  sunil_opt_source: {
    tone: 'info',
    effects: { trust: 25, cooperation: 20 },
    unlocks: 'Location of the main electrical breaker'
  },
  deepak_opt_calm: {
    tone: 'empathy',
    effects: { fear: -35, trust: 30 },
    counters: 'Reverses panic spread by the Saboteur',
    unlocks: 'Crowd management objective'
  },
  meera_opt_assist: {
    tone: 'action',
    effects: { cooperation: 30, trust: 20 },
    unlocks: 'Clears the textile corridor'
  },
  rajesh_opt_keys: {
    tone: 'legal',
    effects: { cooperation: 40 },
    counters: 'Overrides a Saboteur-jammed exit',
    unlocks: 'Guard unlocks the emergency exit shutter'
  },
  verma_opt_coord: {
    tone: 'action',
    effects: { trust: 30 },
    unlocks: 'Briefing the Fire Commander completes the mission'
  },

  sunil_opt_guide: { tone: 'empathy', effects: { trust: 15, fear: -20, cooperation: 10 }, unlocks: 'Gets Sunil out safely' },
  deepak_opt_guide: { tone: 'empathy', effects: { fear: -15, cooperation: 20 }, counters: 'Reverses panic spread by the Saboteur' },
  meera_opt_shutter: { tone: 'action', effects: { trust: 10, cooperation: 20 }, unlocks: 'Starts moving families toward the exit' },
  rajesh_opt_shutter: { tone: 'info', effects: { cooperation: 15 }, unlocks: 'Softens the guard; the keys option finishes the job' },
  verma_opt_hydrant: { tone: 'info', effects: { trust: 15, cooperation: 10 }, unlocks: 'Builds trust before you brief the Commander' },
  // ── Level 3: Construction site cover-up ─────────────────────────────
  laxman_opt_triage: {
    tone: 'action',
    effects: { trust: 40, fear: -35 },
    needs: 'Site Trauma Kit in your bag',
    unlocks: 'Stabilises the injured worker'
  },
  bose_opt_whistleblow: {
    tone: 'pressure',
    effects: { trust: -30, fear: 35 },
    risk: 'Accusing a supervisor head-on makes him defensive. Gather the logs first.'
  },
  kishore_opt_access: {
    tone: 'legal',
    effects: { cooperation: 35, trust: 25 },
    unlocks: 'Safety logbook registers for your evidence'
  },
  gupta_opt_audit: {
    tone: 'action',
    effects: { trust: 35 },
    unlocks: 'Submitting proof to the Inspector completes the mission'
  },

  laxman_opt_reassure: { tone: 'legal', effects: { trust: 20, fear: -25 }, counters: 'Undoes the Saboteur\u2019s waiver threat', unlocks: 'Laxman is calm enough to give a statement' },
  bose_opt_inspect: { tone: 'pressure', effects: { trust: -15, fear: 20 }, risk: 'Confronting him without the logbook makes him defensive. Get the logbook from Kishore first.' },
  kishore_opt_protect: { tone: 'legal', effects: { trust: 20, fear: -25 }, counters: 'Undoes the Saboteur\u2019s threat about his provident fund', unlocks: 'Makes Kishore willing to hand over the registers' },
  gupta_opt_evidence: { tone: 'info', effects: { trust: 15 }, unlocks: 'Prepares the Inspector for your final audit' },
  // ── Saboteur options (only ever sent to the Saboteur) ───────────────
  sab_ramesh_A: {
    tone: 'deceive',
    effects: { fear: 30, cooperation: -25 },
    heat: 15,
    risk: 'Counter: the Runner can calm him by citing s.134A'
  },
  sab_ramesh_B: {
    tone: 'deceive',
    effects: { cooperation: -20 },
    heat: 10,
    risk: 'Weak effect: easy for the Runner to undo'
  },
  sab_ramesh_C: {
    tone: 'deceive',
    effects: { cooperation: -30 },
    heat: 18,
    risk: 'High heat. The Runner can verify the claim'
  },
  sab_priya_A: {
    tone: 'deceive',
    effects: { fear: 25, cooperation: -20 },
    heat: 15,
    risk: 'Counter: the Runner can reassure Priya and recover the plate'
  },
  sab_priya_B: { tone: 'deceive', effects: { fear: 20, cooperation: -15 }, heat: 12, risk: 'Counter: the Runner can reassure Priya and recover the plate' },
  sab_amit_A: {
    tone: 'deceive',
    heat: 12,
    risk: 'Amit walks away. If the Runner already used him, this is wasted'
  },
  sab_sharma_A: {
    tone: 'deceive',
    heat: 25,
    risk: 'Very high heat. Planted rumours show up as LOW reliability'
  },
  sab_deepak_panic: {
    tone: 'deceive',
    effects: { fear: 30 },
    risk: 'Counter: the Runner can calm him with smoke-safety guidance'
  },
  sab_rajesh_lock: {
    tone: 'deceive',
    effects: { cooperation: -35 },
    risk: 'Counter: the Runner can cite the fire-exit rules'
  },
  sab_laxman_waiver: {
    tone: 'deceive',
    effects: { fear: 30 },
    risk: 'Intimidating an injured worker raises your suspicion'
  },
  sab_kishore_threaten: {
    tone: 'deceive',
    effects: { cooperation: -30 },
    risk: 'Counter: the Runner can cite whistleblower protection'
  }
}

// Build the preview object sent with each option. `npc` is used to tell the
// Runner when an option would reverse something the Saboteur already did.
export function buildPreview(optionId, npc) {
  const meta = OPTION_META[optionId]
  if (!meta) return null
  const preview = {
    tone: meta.tone,
    toneLabel: TONE_LABEL[meta.tone],
    effects: meta.effects || {},
    unlocks: meta.unlocks || null,
    needs: meta.needs || null,
    risk: meta.risk || null,
    heat: meta.heat || 0,
    // Only highlight a counter when there is actually something to counter.
    counters: meta.counters && npc && npc.manipulated ? meta.counters : null
  }
  return preview
}

// Convert real stat movement into the "what actually happened" summary.
export function summariseEffects(before, after) {
  return {
    trust: after.trust - before.trust,
    fear: after.fear - before.fear,
    cooperation: after.cooperation - before.cooperation
  }
}
