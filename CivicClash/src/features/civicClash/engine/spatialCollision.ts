import type { AABB } from './collisionSystem.ts'

export interface ObstacleDefinition extends AABB {
  id: string
  name: string
}

export const LEVEL_1_OBSTACLES: ObstacleDefinition[] = [
  // ─────────────────────────────────────────────────────────────
  // DHABA & KIRANA STORE (North-West)
  // Compound building walls with open doorway at x: [-17.5, -14.5], z: -11.5
  // Interior houses the CCTV console at (-14.5, -14.0)
  // ─────────────────────────────────────────────────────────────
  { id: 'dhaba_wall_back', name: 'Dhaba Back Wall', minX: -25.0, maxX: -11.0, minZ: -25.0, maxZ: -23.8 },
  { id: 'dhaba_wall_west', name: 'Dhaba West Wall', minX: -25.0, maxX: -23.8, minZ: -25.0, maxZ: -11.0 },
  { id: 'dhaba_wall_east', name: 'Dhaba East Wall', minX: -12.2, maxX: -11.0, minZ: -25.0, maxZ: -11.0 },
  { id: 'dhaba_wall_front_left', name: 'Dhaba Front Wall Left', minX: -25.0, maxX: -17.5, minZ: -12.2, maxZ: -11.0 },
  { id: 'dhaba_wall_front_right', name: 'Dhaba Front Wall Right', minX: -14.5, maxX: -11.0, minZ: -12.2, maxZ: -11.0 },
  { id: 'dhaba_counter', name: 'Dhaba Service Counter', minX: -14.2, maxX: -8.8, minZ: -10.8, maxZ: -9.2 },

  // ─────────────────────────────────────────────────────────────
  // CITY STATION / COMMERCIAL HIGH-RISE (South-East)
  // Solid inaccessible structure
  // ─────────────────────────────────────────────────────────────
  { id: 'city_station', name: 'City Metro Station High-Rise', minX: 11.0, maxX: 27.0, minZ: 11.0, maxZ: 27.0 },

  // ─────────────────────────────────────────────────────────────
  // BUS STOP SHELTER (North-East)
  // Support pillars & passenger bench
  // ─────────────────────────────────────────────────────────────
  { id: 'bus_shelter', name: 'Bus Stop Municipal Shelter', minX: 11.0, maxX: 17.0, minZ: -14.5, maxZ: -10.5 },

  // ─────────────────────────────────────────────────────────────
  // ACCIDENT CRASH CAR (Accident Zone)
  // Dented black sedan
  // ─────────────────────────────────────────────────────────────
  { id: 'crash_car', name: 'Collision Sedan Vehicle', minX: -4.0, maxX: -1.0, minZ: -1.0, maxZ: 4.0 },

  // ─────────────────────────────────────────────────────────────
  // SOUTH-WEST ESCAPE ALLEY WALLS & AUTO-RICKSHAW
  // ─────────────────────────────────────────────────────────────
  { id: 'alley_wall_north', name: 'Alley North Brick Wall', minX: -25.0, maxX: -11.0, minZ: 10.0, maxZ: 12.0 },
  { id: 'alley_wall_south', name: 'Alley South Brick Wall', minX: -25.0, maxX: -11.0, minZ: 20.0, maxZ: 22.0 },
  { id: 'parked_auto', name: 'Parked CNG Auto-Rickshaw', minX: -10.2, maxX: -6.8, minZ: 6.0, maxZ: 9.0 },

  // ─────────────────────────────────────────────────────────────
  // STREET LAMPS (4 Junction Corners)
  // ─────────────────────────────────────────────────────────────
  { id: 'lamp_nw', name: 'Street Lamp NW', minX: -7.85, maxX: -7.15, minZ: -7.85, maxZ: -7.15 },
  { id: 'lamp_ne', name: 'Street Lamp NE', minX: 7.15, maxX: 7.85, minZ: -7.85, maxZ: -7.15 },
  { id: 'lamp_sw', name: 'Street Lamp SW', minX: -7.85, maxX: -7.15, minZ: 7.15, maxZ: 7.85 },
  { id: 'lamp_se', name: 'Street Lamp SE', minX: 7.15, maxX: 7.85, minZ: 7.15, maxZ: 7.85 }
]

export const LEVEL_1_BOUNDS = {
  minX: -36.0,
  maxX: 36.0,
  minZ: -36.0,
  maxZ: 36.0
}

// ─────────────────────────────────────────────────────────────
// LEVEL 2: MARKETPLACE FIRE BAZAAR OBSTACLES
// ─────────────────────────────────────────────────────────────
export const LEVEL_2_OBSTACLES: ObstacleDefinition[] = [
  { id: 'market_wall_west', name: 'West Bazaar Shop Wall', minX: -26.0, maxX: -24.0, minZ: -25.0, maxZ: 25.0 },
  { id: 'market_wall_east', name: 'East Bazaar Shop Wall', minX: 24.0, maxX: 26.0, minZ: -25.0, maxZ: 25.0 },
  { id: 'market_stall_nw1', name: 'Spice & Grain Stall NW', minX: -18.0, maxX: -11.0, minZ: -18.0, maxZ: -13.0 },
  { id: 'market_stall_ne1', name: 'Textile Stall NE', minX: 11.0, maxX: 18.0, minZ: -18.0, maxZ: -13.0 },
  { id: 'market_stall_sw1', name: 'Pottery & Brass Stall SW', minX: -18.0, maxX: -11.0, minZ: 13.0, maxZ: 18.0 },
  { id: 'market_stall_se1', name: 'Fruit Vendor Stall SE', minX: 11.0, maxX: 18.0, minZ: 13.0, maxZ: 18.0 },
  { id: 'market_burning_stall', name: 'Burning Central Stall', minX: -3.5, maxX: 1.5, minZ: -2.5, maxZ: 2.5 },
  { id: 'market_breaker_wall', name: 'Electrical Panel Enclosure', minX: -16.5, maxX: -13.0, minZ: -15.5, maxZ: -13.0 },
  { id: 'city_station', name: 'Commercial Complex High-Rise', minX: 11.0, maxX: 27.0, minZ: 11.0, maxZ: 27.0 },
  { id: 'market_pillar_nw', name: 'Market Arch Pillar NW', minX: -7.85, maxX: -7.15, minZ: -7.85, maxZ: -7.15 },
  { id: 'market_pillar_ne', name: 'Market Arch Pillar NE', minX: 7.15, maxX: 7.85, minZ: -7.85, maxZ: -7.15 },
  { id: 'market_pillar_sw', name: 'Market Arch Pillar SW', minX: -7.85, maxX: -7.15, minZ: 7.15, maxZ: 7.85 },
  { id: 'market_pillar_se', name: 'Market Arch Pillar SE', minX: 7.15, maxX: 7.85, minZ: 7.15, maxZ: 7.85 }
]

// ─────────────────────────────────────────────────────────────
// LEVEL 3: CONSTRUCTION SITE ACCIDENT OBSTACLES
// ─────────────────────────────────────────────────────────────
export const LEVEL_3_OBSTACLES: ObstacleDefinition[] = [
  { id: 'highrise_core', name: 'Concrete Structural Core', minX: 11.0, maxX: 27.0, minZ: 11.0, maxZ: 27.0 },
  { id: 'scaffold_nw', name: 'Steel Scaffolding Tower NW', minX: -22.0, maxX: -12.0, minZ: -22.0, maxZ: -12.0 },
  { id: 'scaffold_debris', name: 'Collapsed Scaffolding Hazard Zone', minX: -3.5, maxX: 1.5, minZ: -2.5, maxZ: 2.5 },
  { id: 'cement_mixer_bay', name: 'Cement Mixer Station SW', minX: -20.0, maxX: -12.0, minZ: 12.0, maxZ: 18.0 },
  { id: 'stacked_materials', name: 'Cinderblock & Rebar Depot NE', minX: 11.0, maxX: 18.0, minZ: -18.0, maxZ: -12.0 },
  { id: 'site_office_wall', name: 'Site Compliance Kiosk Wall', minX: 5.0, maxX: 8.5, minZ: 5.0, maxZ: 8.0 },
  { id: 'floodlight_nw', name: 'Floodlight Mast NW', minX: -7.85, maxX: -7.15, minZ: -7.85, maxZ: -7.15 },
  { id: 'floodlight_ne', name: 'Floodlight Mast NE', minX: 7.15, maxX: 7.85, minZ: -7.85, maxZ: -7.15 },
  { id: 'floodlight_sw', name: 'Floodlight Mast SW', minX: -7.85, maxX: -7.15, minZ: 7.15, maxZ: 7.85 },
  { id: 'floodlight_se', name: 'Floodlight Mast SE', minX: 7.15, maxX: 7.85, minZ: 7.15, maxZ: 7.85 }
]

export function getLevelObstacles(level = 1): ObstacleDefinition[] {
  if (level === 2) return LEVEL_2_OBSTACLES
  if (level === 3) return LEVEL_3_OBSTACLES
  return LEVEL_1_OBSTACLES
}
