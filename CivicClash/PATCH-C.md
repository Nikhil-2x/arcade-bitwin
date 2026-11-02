# PATCH-C — Strategy depth & balance

## What changed
| File | Status | Purpose |
|---|---|---|
| `server/balance.js` | new | Every tunable: energy, heat, anti-spam, loadout, runner tools, comeback, scoring, escape, bot difficulty |
| `server/loadout.js` | new | `StrategyLayer` (loadout draft, heat meter, runner tools, comeback, anti-spam, L2/L3 ability effects) + `registerStrategyHandlers` |
| `server/botBrain.js` | new | Server-side easy/normal/hard bots (`RunnerBot`, `SaboteurBot`, `BotManager`) |
| `server/sim_balance.js` | new | Headless bot-vs-bot simulation (1500 matches default) |
| `server/tune_balance.js` | new | Coordinate-descent helper that suggests `--set` overrides |
| `server/test_strategy.js`, `server/test_privacy_leak.js` | new | 20 rule tests; payload-level role-privacy test |
| `src/features/civicClash/engine/bot.ts` | edited | Client bot gets `difficulty` param + heat-aware throttling (back-compatible default `normal`) |
| `server/gameManager.js`, `server/server.js`, `package.json` | small hooks | Marked `PATCH-C` (see `PATCH-C-hooks.diff`) |

## Merge notes (hooks in files owned by other patches)
- `gameManager.js`: strategy created in constructor; `reset()` after `initSaboteurAbilities`; `awardScore` calls `strategy.adjustPoints`; `tick` calls `strategy.tick()` (replaces flat +1 energy and random heat decay); `handleSaboteurAbility` and `handleObjectAction` are now thin wrappers around `_…Core`; `startEscapeChannel` is gated; telemetry gains a role-filtered `strategy` field.
- `server.js`: one `registerStrategyHandlers(...)` call per connection, a `lobby:bot:difficulty` event, and a bot step inside the existing 1 s tick loop.

## Behaviour fixes found during the audit
1. Level 2/3 saboteur abilities spent energy and did nothing (no effect, no score). They now have real effects.
2. `initTasks()` was never called after round 1, so Level 2/3 reused Level 1's tasks and alibi progress carried across rounds. Now reloaded each round.
3. `sab_discourage` shared the `CCTV_DELAY` score key with `sab_cctv`, so pairing them paid once. It now has its own key.
4. Lobby bots never acted on the server. They now do (`botBrain.js`).
5. `npc.interactedWithSaboteur` was broadcast to both players. It is now non-serialisable.
6. Object-path sabotage bypassed cooldowns and heat. It now obeys the loadout, global cooldown and heat.

## Client contract (for PATCH-D UI)
- `loadout:request` → `loadout:options` `{level,picks,abilities[{id,name,icon,tradeoff,energyCost,cooldownSec,heat,loud}],archetypes,defaults,locked}`
- `loadout:submit {abilityIds:[3 ids]}` → `loadout:result {success,message,archetype}`; allowed outside `ROUND_ACTIVE`; undrafted Saboteur is auto-drafted with `loadout.defaults` on first ability use.
- `runner:tool:use {tool:'scan'|'lock'|'verify'|'help', targetId}` → `runner:tool:result`
- `lobby:bot:difficulty {level:'easy'|'normal'|'hard'}` (host only)
- Telemetry `strategy`: Saboteur gets `{heat,band,thresholds,loadout,archetype,lockoutSec,globalCooldownSec,comebackActive,escapeEarliestSec}`; Runner gets `{tools:{scan,lock,verify,help:{uses,cooldownSec}},toolsBusySec,watched[],comebackActive,culpritExposed}`.

## Tuning
`npm run sim` (report), `npm run sim:check` (exit 1 if any mirror difficulty leaves 45–55%), `node server/sim_balance.js --set heat.decayPerSec=0.45`. Role win = higher round score; draws count half.
