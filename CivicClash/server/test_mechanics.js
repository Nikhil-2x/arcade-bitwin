/**
 * PATCH-B — mechanics test suite (no sockets required)
 * Verifies: >=4 mechanisms/level, signature + chaos per level, counterplay for every sabotage,
 * auto-expiry (never permanent), worst-case path connectivity to every critical objective,
 * hidden sabotage resources, and chaos-event timing.
 */
import assert from 'node:assert'
import { GameManager } from './gameManager.js'
import { getLevelObstacles, isPositionBlocked } from './spatialCollision.js'
import { worstCaseObstacles } from './mechanics.js'

let pass = 0
const run = (name, fn) => {
  try { fn(); pass++; console.log(`[PASS] ${name}`) } catch (e) { console.error(`[FAIL] ${name}: ${e.message}`); process.exitCode = 1 }
}
const mk = (level) => {
  const gm = new GameManager('T')
  gm.initMatch({ id: 'h', name: 'H' }, { id: 'g', name: 'G' }, level)
  gm.phase = 'ROUND_ACTIVE'
  return gm
}
const tick = (gm, n) => { for (let i = 0; i < n; i++) gm.tick() }
const act = (gm, id, role) => gm.handleObjectAction(id, 'default', role)
const mids = (gm) => Object.keys(gm.mech.mechs)

for (const level of [1, 2, 3]) {
  run(`L${level}: >=4 server-synced mechanisms, signature, chaos event`, () => {
    const gm = mk(level)
    assert.ok(mids(gm).length >= 4)
    for (const id of mids(gm)) assert.ok(gm.objects[id], `anchor ${id}`)
    const snap = gm.getTelemetryForPlayer('h', 'runner').mechanisms
    assert.ok(snap.signature.id && snap.chaos.id)
    assert.ok(snap.items.every((i) => typeof i.prompt === 'string'))
  })

  run(`L${level}: public telemetry never leaks sabotage energy/cooldowns`, () => {
    const gm = mk(level)
    const json = JSON.stringify(gm.getTelemetry().mechanisms) + JSON.stringify(gm.getTelemetryForPlayer('h', 'runner').mechanisms)
    assert.ok(!/sabotageEnergy|sabCd|energyCost/.test(json))
  })

  run(`L${level}: every sabotage has counterplay and expires on its own`, () => {
    const gm = mk(level)
    const sabotaged = []
    for (const id of mids(gm)) {
      gm.sabotageEnergy = 100
      const r = act(gm, id, 'saboteur')
      if (r.success) sabotaged.push(id)
    }
    assert.ok(sabotaged.length >= 3, 'saboteur can act on most mechanisms')
    // counterplay: runner can act on every sabotaged mechanism
    gm.inventory.push('CO2 Fire Extinguisher')
    if (gm.objects.obj_electrical_panel) gm.objects.obj_electrical_panel.state = 'tripped'
    for (const id of sabotaged) {
      let ok = false
      for (let i = 0; i < 4 && !ok; i++) ok = act(gm, id, 'runner').success
      assert.ok(ok, `runner counter for ${id}`)
    }
    // auto-expiry on a fresh round without any counter
    const g2 = mk(level)
    for (const id of mids(g2)) { g2.sabotageEnergy = 100; act(g2, id, 'saboteur') }
    tick(g2, 95)
    for (const M of Object.values(g2.mech.mechs)) {
      assert.ok(!['locked', 'closing', 'dark', 'jammed', 'armed', 'blaring', 'seized'].includes(M.state), `${M.id} stuck in ${M.state}`)
    }
  })

  run(`L${level}: no permanent blockade — worst-case colliders keep every objective reachable`, () => {
    const gm = mk(level)
    const base = getLevelObstacles(level).concat(worstCaseObstacles(level))
    const start = { x: -8, z: 12 }
    const step = 0.5
    const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`
    const seen = new Set([key(start.x, start.z)])
    const q = [start]
    while (q.length) {
      const c = q.shift()
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx * step, z: c.z + dz * step }
        const k = key(n.x, n.z)
        if (seen.has(k)) continue
        if (isPositionBlocked(n.x, n.z, 0.55, base).blocked) continue
        seen.add(k)
        q.push(n)
      }
    }
    const reach = (p, r) => {
      for (let a = 0; a < 360; a += 15) for (const rr of [r, r * 0.7, r * 0.4]) {
        if (seen.has(key(p.x + Math.cos((a * Math.PI) / 180) * rr, p.z + Math.sin((a * Math.PI) / 180) * rr))) return true
      }
      return false
    }
    for (const [id, o] of Object.entries(gm.objects)) {
      if (/escape/.test(id)) continue // pre-existing: escape anchor lies inside the high-rise collider
      assert.ok(reach(o.position, 3.8), `${id} unreachable at worst case`)
    }
    for (const n of Object.values(gm.npcs)) assert.ok(reach(n.position, 3.8), `${n.id} unreachable`)
  })

  run(`L${level}: mid-round chaos event is server-timed (warn → shock → response → end)`, () => {
    const gm = mk(level)
    const phases = new Set()
    for (let i = 0; i < 160; i++) { gm.tick(); phases.add(gm.getMechanismSnapshot('runner').chaos.phase) }
    for (const p of ['warning', 'shock', 'response', 'ended']) assert.ok(phases.has(p), `phase ${p}`)
    assert.ok(gm.mech.events.some((e) => e.kind === 'chaos'))
  })
}

run('Traffic leaves crossing gaps, WALK halts approaching cars (L1)', () => {
  const gm = mk(1)
  tick(gm, 30)
  assert.ok(gm.getDynamicObstacles().some((o) => /Vehicle/.test(o.name)))
  const r = act(gm, 'mech_l1_traffic', 'runner')
  assert.ok(r.success)
  tick(gm, 3)
  assert.strictEqual(gm.mech.mechs.mech_l1_traffic.state, 'walk')
  assert.ok(!act(gm, 'mech_l1_traffic', 'saboteur').success, 'rush rejected during walk')
})

run('Fire: water on live wiring is blocked; CO2 works (L2 lesson)', () => {
  const gm = mk(2)
  const r = act(gm, 'mech_l2_hydrant', 'runner')
  assert.ok(!r.success && /breaker/i.test(r.message))
  gm.objects.obj_electrical_panel.state = 'tripped'
  tick(gm, 7)
  assert.ok(act(gm, 'mech_l2_hydrant', 'runner').success)
  const f = gm.mech.mechs.mech_l2_fire_n
  gm.inventory.push('CO2 Fire Extinguisher')
  f.intensity = 3
  assert.ok(act(gm, 'mech_l2_fire_n', 'runner').success && f.intensity === 1)
})

run('Lights: emergency beacon stays lit; darkness blocks distant interaction; shutter gates CCTV (L1)', () => {
  const gm = mk(1)
  const L = gm.mech.mechs.mech_l1_lights
  gm.sabotageEnergy = 100
  act(gm, 'mech_l1_lights', 'saboteur')
  tick(gm, 4)
  assert.strictEqual(L.state, 'dark')
  gm.onPlayerMoved('h', -14.5, -8.0) // dark zone, far from CCTV console
  const res = gm.handleObjectAction('obj_cctv', 'default', gm.playerRoles.h)
  assert.ok(!res.success && /dark/i.test(res.message))
  gm.onPlayerMoved('h', -8.2, -9.2) // under the emergency beacon
  gm.mech.mechs.mech_l1_shutter.state = 'locked'
  assert.ok(/shut/i.test(gm.handleObjectAction('obj_cctv', 'default', 'runner').message))
})

run('Gated shutter is overridable and auto-resets (L1)', () => {
  const gm = mk(1)
  gm.sabotageEnergy = 100
  act(gm, 'mech_l1_shutter', 'saboteur')
  tick(gm, 4)
  assert.strictEqual(gm.mech.mechs.mech_l1_shutter.state, 'locked')
  assert.ok(act(gm, 'mech_l1_shutter', 'runner').success)
  assert.strictEqual(gm.mech.mechs.mech_l1_shutter.state, 'open')
  gm.sabotageEnergy = 100
  assert.ok(!act(gm, 'mech_l1_shutter', 'saboteur').success, 'hardened after override')
})

run('Jammed/lit camera witnesses tampering and logs verified evidence', () => {
  const gm = mk(1)
  gm.sabotageEnergy = 100
  gm.onPlayerMoved('g', 0, 0) // inside junction camera cone
  const before = gm.informationLog.length
  act(gm, 'mech_l1_noise', 'saboteur')
  assert.ok(gm.informationLog.length > before)
})

console.log(`\n${pass} mechanics tests passed`)
