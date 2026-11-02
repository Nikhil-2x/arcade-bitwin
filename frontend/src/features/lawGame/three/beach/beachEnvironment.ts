import type { LoadedEnvironment } from '../environments.ts'
import { BeachAmbience } from './BeachAmbience.tsx'
import { BeachLights } from './BeachLights.tsx'
import { BeachScenery } from './BeachProps.tsx'
import { BeachQueries } from './BeachQueries.ts'
import { SPAWN, TABLE_TOP_MATERIAL } from './beachLayout.ts'

const beach: LoadedEnvironment = {
  Scenery: BeachScenery,
  Lights: BeachLights,
  Ambience: BeachAmbience,
  // The scan scales itself, so that everything added to it can be placed in metres.
  scale: 1,
  createQueries: (root) => new BeachQueries(root),
  // On the deck, the lost-property table ahead and the bay beyond it.
  spawn: () => ({ x: SPAWN[0], z: SPAWN[1], yaw: 0 }),
  itemsRestOn: TABLE_TOP_MATERIAL,
}

export default beach
