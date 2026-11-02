import type { LoadedEnvironment } from '../environments.ts'
import { CART_TOP_MATERIAL, RailwayQueries } from './RailwayQueries.ts'
import { StationAmbience } from './StationAmbience.tsx'
import { StationLights } from './StationLights.tsx'
import { StationScenery } from './StationProps.tsx'

const railway: LoadedEnvironment = {
  Scenery: StationScenery,
  Lights: StationLights,
  Ambience: StationAmbience,
  scale: 1,
  createQueries: (root) => new RailwayQueries(root),
  // On the concourse with the parcel trolley ahead and the train behind it, facing the platform.
  spawn: () => ({ x: -19, z: 13, yaw: 0 }),
  itemsRestOn: CART_TOP_MATERIAL,
}

export default railway
