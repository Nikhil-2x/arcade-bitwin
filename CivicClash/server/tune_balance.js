#!/usr/bin/env node
/**
 * PATCH-C — coordinate-descent helper for balance.js.
 *   node server/tune_balance.js [--rounds 4] [--matches 450] [--start k=v,k=v]
 * Runs sim_balance.js repeatedly with candidate overrides and prints the best
 * set found (as --set flags). It never edits balance.js; copy values over yourself.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const get = (k, d) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : d)
const passes = get('--rounds', 4)
const matches = get('--matches', 450)

// path, min, max, step, start
const PARAMS = [
  ['scoring.runnerPointsMult', 0.6, 1.1, 0.05, 0.95],
  ['scoring.saboteurPointsMult', 0.8, 1.6, 0.05, 1.15],
  ['scoring.disruptionPoints', 2, 14, 1, 8],
  ['runnerTools.sabotageDurationSec', 20, 80, 5, 60],
  ['escape.earliestSec', 60, 140, 10, 100],
  ['bots.easy.interceptRate', 0.1, 0.9, 0.1, 0.2],
  ['bots.easy.errorRate', 0.1, 0.5, 0.05, 0.3],
  ['bots.easy.wasteRate', 0.1, 0.5, 0.05, 0.35],
  ['bots.normal.reactionSec', 5, 12, 1, 8],
  ['bots.normal.heatCaution', 50, 85, 5, 62],
  ['bots.hard.reactionSec', 3, 8, 1, 5],
  ['bots.hard.heatCaution', 40, 85, 5, 50],
  ['scoring.levelMult.1.runner', 0.5, 1.5, 0.1, 1],
  ['scoring.levelMult.3.runner', 0.5, 1.5, 0.1, 1],
  ['scoring.levelMult.2.runner', 0.5, 1.5, 0.1, 1],
  ['bots.hard.interceptRate', 0.2, 0.9, 0.1, 0.8],
  ['bots.normal.interceptRate', 0.2, 0.9, 0.1, 0.5],
  ['bots.normal.toolUse', 0.2, 1, 0.1, 0.6],
  ['bots.hard.toolUse', 0.2, 1, 0.1, 1]
]
const cur = Object.fromEntries(PARAMS.map((p) => [p[0], p[4]]))
// Resume: --start "scoring.runnerPointsMult=1,bots.easy.errorRate=0.35"
const si = args.indexOf('--start')
if (si >= 0) for (const kv of args[si + 1].split(',')) { const [k, v] = kv.split('='); if (k in cur) cur[k] = Number(v) }

function evaluate(vals) {
  const flags = Object.entries(vals).flatMap(([k, v]) => ['--set', `${k}=${v}`])
  const out = execFileSync('node', [path.join(here, 'sim_balance.js'), '--matches', String(matches), '--cross', '0', '--json', ...flags], { maxBuffer: 1 << 28 }).toString()
  const m = JSON.parse(out).mirror
  const rates = ['easy', 'normal', 'hard'].map((l) => (m[l].runnerWins + 0.5 * m[l].draws) / m[l].rounds)
  // Per game level (all difficulties combined) must be balanced too.
  const lv = [1, 2, 3].map((L) => {
    let r = 0, n = 0
    for (const d of ['easy', 'normal', 'hard']) { const b = m[d].byLevel[L]; r += b[0] + 0.5 * b[2]; n += b[0] + b[1] + b[2] }
    return r / n
  })
  const loss = rates.reduce((s, r) => s + (r - 0.5) ** 2, 0) + lv.reduce((s, r) => s + (r - 0.5) ** 2, 0)
  return { rates: [...rates, ...lv], loss }
}

let best = evaluate(cur)
console.log('start', best.rates.map((r) => (r * 100).toFixed(1)).join(' / '), 'loss', best.loss.toFixed(4))
for (let pass = 0; pass < passes; pass++) {
  let improved = false
  for (const [key, lo, hi, step] of PARAMS) {
    for (const dir of [1, -1]) {
      const v = Math.round((cur[key] + dir * step) * 1000) / 1000
      if (v < lo || v > hi) continue
      const trial = { ...cur, [key]: v }
      const r = evaluate(trial)
      if (r.loss < best.loss - 1e-5) {
        best = r; cur[key] = v; improved = true
        console.log(`pass ${pass} ${key}=${v} -> ${r.rates.map((x) => (x * 100).toFixed(1)).join(' / ')} loss ${r.loss.toFixed(4)}`)
        break
      }
    }
  }
  if (!improved) break
}
console.log('\nBEST', best.rates.map((r) => (r * 100).toFixed(1)).join(' / '))
console.log(Object.entries(cur).map(([k, v]) => `--set ${k}=${v}`).join(' '))
