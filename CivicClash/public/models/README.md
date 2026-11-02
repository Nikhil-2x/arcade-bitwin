# 3D Environment & Asset Integration Guide (SketchFab / GLTF Pipeline)

CivicClash features a dual-pipeline 3D architecture:
1. **Procedural Built-in 3D Environments:** High-performance, zero-latency Three.js procedural environments for all 3 levels.
2. **Custom / SketchFab 3D Models:** Dynamic support for external `.glb` / `.gltf` scenes and props dropped into this directory.

If a level model is present in this directory, CivicClash automatically loads and optimizes it. If absent, the engine seamlessly falls back to the built-in procedural environment with zero delay and zero network overhead.

---

## 1. File Naming Conventions

Drop prebuilt `.glb` binary scenes directly into this directory using the standard level filenames:

| Filename | Mission Level | Environment Setting | Primary Civic Law Theme |
|---|---|---|---|
| `level_1.glb` | **Level 1** | Urban Crossroad & Dhaba | Good Samaritan Protection (§134A MV Act) |
| `level_2.glb` | **Level 2** | Commercial Bazaar & Market Stalls | Electrical Safety & Fire Evacuation Protocols |
| `level_3.glb` | **Level 3** | High-Rise Construction Site & Scaffolding | BOCW Act Statutory Accident Reporting (§38) |

### Optional Modular Asset Naming
You may also modularize individual character and prop models:
- **Characters:** `runner.glb`, `saboteur.glb`, `citizen.glb`
- **Level 1 Props:** `obj_cctv.glb`, `obj_phone.glb`, `obj_firstaid.glb`, `obj_light_switch.glb`, `obj_crash_car.glb`
- **Level 2 Props:** `obj_electrical_panel.glb`, `obj_fire_alarm.glb`, `obj_extinguisher.glb`, `obj_exit_shutter.glb`, `obj_water_source.glb`
- **Level 3 Props:** `obj_report_terminal.glb`, `obj_site_siren.glb`, `obj_safety_records.glb`, `obj_cctv_tower.glb`

---

## 2. World Coordinate System & Scale Conventions

To ensure 1:1 synchronization between client visual rendering and server-side spatial collision validation:

- **Coordinate System:** Right-handed Cartesian coordinates (`+Y` = Up, `+X` = East / Right, `+Z` = South / Forward).
- **Scale:** `1 Unit = 1 Meter`. Human character heights are approximately `1.8m`.
- **World Origin `(0, 0, 0)`:** Center of the active incident zone.
- **Ground Floor:** `Y = 0` (all walkable terrain, road surfaces, and ground floors must be at `Y = 0`).

---

## 3. Spatial Anchor Coordinates (Matching Server Collision & Gameplay)

When designing or aligning custom models in Blender, Maya, or SketchFab, align your geometry to match the server's authoritative spawn points, interactable props, and NPC waypoints:

### Common Spawn Points (All Levels)
- **Runner Spawn:** `(-8.0, 0.0, 12.0)` (Yaw: `0 rad` — facing North)
- **Saboteur Spawn:** `(8.0, 0.0, -12.0)` (Yaw: `3.14 rad` — facing South)
- **Perimeter Map Bounds:** `X: [-28, 28]`, `Z: [-28, 28]`

### Level 1: Hit & Run (Urban Crossroad & Dhaba)
| Entity / Prop | Coordinate `(X, Y, Z)` | Radius / Bounds | Description |
|---|---|---|---|
| **Incident Focus (Arjun)** | `(0.0, 0.0, 2.2)` | 3.5m radius | Injured pedestrian on zebra crossing |
| **Crash Vehicle** | `(2.5, 0.0, 2.8)` | 4.0m × 2.0m | Damaged sedan with hazard flashers |
| **Dhaba (Shri Ganesh Bhojnalaya)** | `(-15.0, 0.0, -11.0)` | 10.0m × 8.0m | Open-front road eatery with Ramesh inside |
| **Dhaba CCTV Console** | `(-11.0, 0.0, -13.0)` | 2.5m radius | Desktop surveillance DVR |
| **Emergency Phone Booth (112)** | `(-14.0, 0.0, 6.0)` | 2.5m radius | Red telephone pole / terminal |
| **First-Aid Kit Cabinet** | `(-8.5, 0.0, 6.0)` | 2.5m radius | Wall-mounted medical box near bus stop |
| **Streetlight Breaker Switch** | `(7.5, 0.0, 6.8)` | 2.8m radius | Utility pole power cutoff switch |
| **Witness Priya (Tea Stall)** | `(12.0, 0.0, -11.0)` | 3.0m radius | Eyewitness standing with chai glass |
| **Officer Sharma (Police Booth)** | `(14.0, 0.0, 14.0)` | 3.0m radius | Delhi Traffic Police post |
| **Highway Escape Zone** | `(18.0, 0.0, 18.0)` | 3.5m radius | Saboteur highway exit channel |

### Level 2: Marketplace Fire (Commercial Bazaar)
| Entity / Prop | Coordinate `(X, Y, Z)` | Radius / Bounds | Description |
|---|---|---|---|
| **Central Fire Incident** | `(0.0, 0.0, 0.0)` | 4.0m radius | Burning spices & textile stall |
| **Electrical Breaker Panel** | `(-14.5, 0.0, -14.0)` | 3.0m radius | Main electrical isolation cabinet |
| **Manual Fire Alarm Station** | `(14.0, 0.0, -14.0)` | 3.0m radius | Red pull-siren alarm box |
| **Fire Extinguisher Station** | `(-14.0, 0.0, 0.0)` | 2.5m radius | CO2 / Dry chemical extinguisher stand |
| **Water Source / Fire Hydrant** | `(-14.0, 0.0, 14.0)` | 3.0m radius | Municipal municipal water connection |
| **Bazaar Evacuation Shutter** | `(0.0, 0.0, 18.0)` | 4.0m radius | Primary broad exit shutter for crowd |
| **Market Escape Route** | `(18.0, 0.0, 18.0)` | 3.5m radius | Dark rear loading dock alley |

### Level 3: Construction Site (High-Rise Scaffold Incident)
| Entity / Prop | Coordinate `(X, Y, Z)` | Radius / Bounds | Description |
|---|---|---|---|
| **Collapsed Scaffolding** | `(0.0, 0.0, 0.0)` | 4.5m radius | Steel pipes, loose planks, trapped worker |
| **BOCW Statutory Filing Terminal**| `(-14.0, 0.0, 14.0)` | 3.0m radius | Section 38 incident reporting kiosk |
| **Site Evacuation Siren** | `(14.0, 0.0, 14.0)` | 3.0m radius | High-rise emergency audible siren |
| **Safety Logbook Desk** | `(-14.0, 0.0, -14.0)` | 3.0m radius | Site engineer's safety compliance desk |
| **CCTV Surveillance Tower** | `(14.0, 0.0, -14.0)` | 3.0m radius | High-angle mast camera console |
| **Trapped Worker Rajesh** | `(2.0, 0.0, 1.5)` | 3.0m radius | Injured construction worker |
| **Safety Auditor Verma** | `(-10.0, 0.0, 10.0)` | 3.0m radius | Statutory BOCW safety inspector |
| **Site Perimeter Escape Gate** | `(0.0, 0.0, 18.0)` | 3.5m radius | Security gate leading to main avenue |

---

## 4. Web & Multiplayer Performance Budgets

To maintain 60 FPS performance across web browsers and low latency for WebSockets:

| Metric | Recommended Budget | Maximum Upper Bound |
|---|---|---|
| **Format** | Binary `.glb` (self-contained) | Single `.glb` with embedded textures |
| **Total Triangles / Scene** | 25,000 – 40,000 tris | 60,000 tris maximum |
| **Total File Size** | 5 MB – 15 MB | 25 MB maximum |
| **Draw Calls** | 15 – 30 draw calls | 50 draw calls maximum |
| **Textures Resolution** | 1024×1024 (Diff/ORM) | 2048×2048 for hero assets |
| **Texture Format** | JPEG / WebP / KTX2 Basis | PNG only where alpha transparency is required |
| **Material Types** | PBR Metalness/Roughness | Max 10 distinct materials per level |

---

## 5. Blender Export Settings Checklist

When exporting from Blender (File -> Export -> glTF 2.0):

1. **Format:** `glTF Binary (.glb)`.
2. **Include:**
   - [x] Limit to Selected Objects (or active collection)
   - [x] Custom Properties
3. **Transform:**
   - [x] `+Y Up` (Standard Three.js coordinate orientation)
4. **Geometry:**
   - [x] Apply Modifiers
   - [x] UVs
   - [x] Normals
   - [x] Tangents (if using normal maps)
5. **Materials:**
   - [x] Export Materials (`Principled BSDF` nodes)
   - [x] Pack textures directly into the `.glb`
6. **Compression (Optional but recommended):**
   - Enable **Draco Compression** (Compression level: 7) for 60-80% smaller file sizes.

---

## 6. Sourcing Free Models from SketchFab

CivicClash works great with Creative Commons (CC0 / CC-BY) models from SketchFab. Search queries that match the game's levels:
- **Level 1:** `"indian street"`, `"roadside dhaba"`, `"delhi junction"`, `"city crossroad"`
- **Level 2:** `"bazaar stalls"`, `"market alley"`, `"night bazaar"`, `"commercial market"`
- **Level 3:** `"construction site"`, `"scaffolding building"`, `"unfinished concrete building"`

### Optimizing Downloaded Models with CLI:
You can optimize any downloaded `.glb` file directly using `gltf-pipeline`:
```bash
# Install tool globally
npm install -g gltf-pipeline

# Deduplicate vertices, merge materials, and apply Draco compression
gltf-pipeline -i downloaded_model.glb -o level_1.glb -d
```

---

## 7. Engine Automatic Optimizations

When a `.glb` is detected in this directory, `ThreeUrbanScene` automatically applies:
- **Frustum Culling:** `mesh.frustumCulled = true` on every sub-mesh.
- **Dynamic Shadows:** Automatically configures `castShadow` and `receiveShadow`.
- **Memory Management:** Automatically disposes geometry buffers and texture GPU allocations when transitioning between levels or returning to the lobby.
- **SPA Fallback Protection:** Headers are verified before parsing so missing files never throw JSON syntax errors.
