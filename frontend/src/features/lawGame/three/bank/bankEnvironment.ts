import type { LoadedEnvironment } from '../environments.ts'
import { BankAmbience } from './BankAmbience.tsx'
import { BankLights } from './BankLights.tsx'
import { BankScenery } from './BankProps.tsx'
import { BankQueries } from './BankQueries.ts'
import { SPAWN, TABLE_TOP_MATERIAL } from './bankLayout.ts'

const bank: LoadedEnvironment = {
  Scenery: BankScenery,
  Lights: BankLights,
  Ambience: BankAmbience,
  // The model is baked into metres by scripts/optimize-bank.mjs.
  scale: 1,
  createQueries: (root) => new BankQueries(root),
  spawn: () => ({ x: SPAWN[0], z: SPAWN[1], yaw: 0 }),
  itemsRestOn: TABLE_TOP_MATERIAL,
}

export default bank
