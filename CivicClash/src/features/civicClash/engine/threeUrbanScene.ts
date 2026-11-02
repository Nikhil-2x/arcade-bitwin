import * as THREE from 'three'
import { CharacterModel } from './characterModel.ts'
import { NPCModel } from './npcModel.ts'
import { InteractiveObjectModel } from './interactiveObjectModel.ts'
import { ThirdPersonCamera } from './thirdPersonCamera.ts'
import { CollisionSystem, type AABB, type DynamicEntityCollider } from './collisionSystem.ts'
import { LEVEL_1_OBSTACLES, LEVEL_2_OBSTACLES, LEVEL_3_OBSTACLES, getLevelObstacles } from './spatialCollision.ts'
import type { PlayerRole, MovementPacket, PeerMovementEvent } from '../network/networkTypes.ts'
import type { NPCState, InteractiveObjectState, NPCPhysicalReaction } from '../network/milestone2Types.ts'

export interface UrbanSceneOptions {
  container: HTMLDivElement
  localRole: PlayerRole
  localName: string
  remoteRole: PlayerRole
  remoteName: string
  initialLocalPos: { x: number; y: number; z: number; yaw: number }
  initialRemotePos: { x: number; y: number; z: number; yaw: number }
  initialWorldState?: {
    npcs: Record<string, NPCState>
    objects: Record<string, InteractiveObjectState>
  }
  onLocalMove: (packet: MovementPacket) => void
}

export class ThreeUrbanScene {
  private container: HTMLDivElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer

  public thirdPersonCamera: ThirdPersonCamera
  public collisionSystem: CollisionSystem

  // Characters
  public localCharacter: CharacterModel
  public remoteCharacter: CharacterModel

  // Milestone 2 & 3: NPCs and Interactive Objects
  public npcModels: Map<string, NPCModel> = new Map()
  public npcTargets: Map<string, { pos: THREE.Vector3; yaw: number; isMoving: boolean }> = new Map()
  public objectModels: Map<string, InteractiveObjectModel> = new Map()

  // Local movement state
  public localPos: THREE.Vector3
  public localYaw: number
  public isMoving: boolean = false
  public isSprinting: boolean = false

  // Remote interpolation target
  private remoteTargetPos: THREE.Vector3
  private remoteTargetYaw: number = 0
  private remoteIsMoving: boolean = false
  private remoteIsSprinting: boolean = false

  public localRole: PlayerRole
  private onLocalMoveCallback: (packet: MovementPacket) => void
  private lastNetworkSendTime: number = 0

  // Milestone 5: Debug Collision Visualizer
  public debugCollisionMode: boolean = false
  private debugCollisionGroup: THREE.Group = new THREE.Group()

  // Milestone 6: Environmental Chaos & Mechanisms
  public streetLights: THREE.PointLight[] = []
  public streetLightBulbs: THREE.Mesh[] = []
  private ambientLight!: THREE.AmbientLight

  // Modular & SketchFab 3D Environment Systems
  public environmentGroup: THREE.Group = new THREE.Group()
  public currentLevel: number = 1

  private isRunning: boolean = true
  private animFrameId: number = 0
  private clock: THREE.Clock = new THREE.Clock()

  constructor(opts: UrbanSceneOptions) {
    this.container = opts.container
    this.localRole = opts.localRole
    this.onLocalMoveCallback = opts.onLocalMove

    this.localPos = new THREE.Vector3(
      opts.initialLocalPos.x,
      opts.initialLocalPos.y,
      opts.initialLocalPos.z
    )
    this.localYaw = opts.initialLocalPos.yaw

    this.remoteTargetPos = new THREE.Vector3(
      opts.initialRemotePos.x,
      opts.initialRemotePos.y,
      opts.initialRemotePos.z
    )
    this.remoteTargetYaw = opts.initialRemotePos.yaw

    // 1. Scene & Renderer setup (Indian Evening Theme)
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1e1b4b) // Deep evening indigo
    this.scene.fog = new THREE.FogExp2(0x312e81, 0.018)

    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.container.replaceChildren(this.renderer.domElement)

    // 2. Camera controller
    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.renderer.domElement)
    this.thirdPersonCamera.yaw = this.localYaw

    // 3. Collision System & Urban Environment
    this.collisionSystem = new CollisionSystem()
    this.scene.add(this.environmentGroup)
    this.buildLevelEnvironment(1)

    // Debug Collision Group & Shortcuts
    this.scene.add(this.debugCollisionGroup)
    window.addEventListener('keydown', this.onKeyDown)

    // 4. Spawn Milestone 2 NPCs and Objects
    if (opts.initialWorldState) {
      for (const [id, npc] of Object.entries(opts.initialWorldState.npcs)) {
        const npcMesh = new NPCModel(npc)
        this.npcModels.set(id, npcMesh)
        this.scene.add(npcMesh.group)
      }

      for (const [id, obj] of Object.entries(opts.initialWorldState.objects)) {
        const objMesh = new InteractiveObjectModel(obj)
        this.objectModels.set(id, objMesh)
        this.scene.add(objMesh.group)
      }
    }

    // 5. Characters instantiation
    this.localCharacter = new CharacterModel(opts.localRole, opts.localName)
    this.localCharacter.setPosition(this.localPos.x, this.localPos.y, this.localPos.z)
    this.localCharacter.setRotation(this.localYaw)
    this.scene.add(this.localCharacter.group)

    this.remoteCharacter = new CharacterModel(opts.remoteRole, opts.remoteName)
    this.remoteCharacter.setPosition(
      opts.initialRemotePos.x,
      opts.initialRemotePos.y,
      opts.initialRemotePos.z
    )
    this.remoteCharacter.setRotation(opts.initialRemotePos.yaw)
    this.scene.add(this.remoteCharacter.group)

    // 6. Lighting
    this.setupEveningLighting()

    // Window resize
    window.addEventListener('resize', this.onWindowResize)

    // Start 60 FPS animation loop
    this.animateLoop()
  }

  private setupEveningLighting() {
    // Ambient evening dusk light
    this.ambientLight = new THREE.AmbientLight(0x4338ca, 0.8)
    this.scene.add(this.ambientLight)

    // Warm Sunset directional sunlight
    const sunLight = new THREE.DirectionalLight(0xf97316, 1.4) // Amber sunset glow
    sunLight.position.set(28, 30, 24)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 120
    sunLight.shadow.camera.left = -35
    sunLight.shadow.camera.right = 35
    sunLight.shadow.camera.top = 35
    sunLight.shadow.camera.bottom = -35
    sunLight.shadow.bias = -0.0005
    this.scene.add(sunLight)

    // Hemisphere bounce
    const hemiLight = new THREE.HemisphereLight(0xfb923c, 0x1e1b4b, 0.6)
    this.scene.add(hemiLight)
  }

  /**
   * Builds the realistic Indian urban intersection with 5 identifiable zones
   */

  // ─────────────────────────────────────────────────────────────
  // MODULAR & SKETCHFAB 3D ENVIRONMENT PIPELINE
  // ─────────────────────────────────────────────────────────────
  private clearEnvironment() {
    this.environmentGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else {
            mesh.material.dispose()
          }
        }
      }
    })
    this.environmentGroup.clear()
    this.streetLights = []
    this.streetLightBulbs = []
  }

  /**
   * Loads and optimizes external Sketchfab 3D models from /models/level_{level}.glb
   * Automatically optimizes geometry, enables frustum culling and shadows for web multiplayer
   */
  public async loadSketchfabModel(level: number): Promise<boolean> {
    try {
      const url = `/models/level_${level}.glb`
      const res = await fetch(url, { method: 'HEAD' })
      const contentType = res.headers.get('content-type') || ''
      // Protect against Vite SPA fallback serving index.html on missing assets
      if (!res.ok || contentType.includes('text/html') || contentType.includes('text/plain')) {
        return false
      }

      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()

      return new Promise((resolve) => {
        loader.load(
          url,
          (gltf) => {
            // Apply web & multiplayer optimization
            gltf.scene.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                mesh.castShadow = true
                mesh.receiveShadow = true
                mesh.frustumCulled = true
              }
            })
            this.environmentGroup.add(gltf.scene)
            resolve(true)
          },
          undefined,
          () => resolve(false)
        )
      })
    } catch {
      return false
    }
  }

  public buildLevelEnvironment(level: number) {
    this.currentLevel = level
    this.clearEnvironment()

    if (level === 2) {
      this.scene.background = new THREE.Color(0x271a0c) // Dark amber night bazaar
      this.scene.fog = new THREE.FogExp2(0x3a220e, 0.016)
      this.buildMarketplaceEnvironment()
      this.collisionSystem.setObstacles(getLevelObstacles(2))
    } else if (level === 3) {
      this.scene.background = new THREE.Color(0x0f172a) // Industrial night
      this.scene.fog = new THREE.FogExp2(0x1e293b, 0.015)
      this.buildConstructionEnvironment()
      this.collisionSystem.setObstacles(getLevelObstacles(3))
    } else {
      this.scene.background = new THREE.Color(0x1e1b4b) // Evening indigo
      this.scene.fog = new THREE.FogExp2(0x312e81, 0.018)
      this.buildIndianUrbanEnvironment()
      this.collisionSystem.setObstacles(getLevelObstacles(1))
    }

    // Attempt optional sketchfab GLTF model load if placed in /models/
    this.loadSketchfabModel(level)
  }

  public setLevelEnvironment(level: number, worldState?: any) {
    if (this.currentLevel !== level) {
      this.buildLevelEnvironment(level)
    }

    if (worldState) {
      if (worldState.npcs) {
        for (const [id, npcModel] of this.npcModels) {
          if (!worldState.npcs[id]) {
            this.scene.remove(npcModel.group)
            this.npcModels.delete(id)
            this.npcTargets.delete(id)
          }
        }
        this.updateNPCBatch(worldState.npcs)
      }

      if (worldState.objects) {
        for (const [id, objModel] of this.objectModels) {
          if (!worldState.objects[id]) {
            this.scene.remove(objModel.group)
            this.objectModels.delete(id)
          }
        }
        for (const [id, obj] of Object.entries(worldState.objects)) {
          this.updateObject(id, obj as any)
        }
      }
    }
  }

  /**
   * LEVEL 2: Authentic Indian Marketplace Bazaar Fire Incident Environment
   */
  private buildMarketplaceEnvironment() {
    // 1. Cobblestone Bazaar Ground
    const groundGeo = new THREE.PlaneGeometry(90, 90)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.95 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.environmentGroup.add(ground)

    // Paved stone market lanes
    const laneMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 })
    const nsLane = new THREE.Mesh(new THREE.PlaneGeometry(12, 80), laneMat)
    nsLane.rotation.x = -Math.PI / 2
    nsLane.position.y = 0.02
    nsLane.receiveShadow = true
    this.environmentGroup.add(nsLane)

    const ewLane = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), laneMat)
    ewLane.rotation.x = -Math.PI / 2
    ewLane.position.y = 0.02
    ewLane.receiveShadow = true
    this.environmentGroup.add(ewLane)

    // Perimeter Bazaar Shop Walls (West & East)
    const bazaarWallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.0, 50.0), bazaarWallMat)
    wallWest.position.set(-25.0, 3.5, 0)
    wallWest.castShadow = true
    this.environmentGroup.add(wallWest)

    const wallEast = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.0, 50.0), bazaarWallMat)
    wallEast.position.set(25.0, 3.5, 0)
    wallEast.castShadow = true
    this.environmentGroup.add(wallEast)

    // ZONE 1: ACCIDENT ZONE — Burning Central Market Stall ([0, 0])
    this.createZoneBanner('🔥 BURNING MARKET STALL (ACCIDENT)', 0, 4.5, 0, '#ef4444')

    const burnStall = new THREE.Group()
    const charredMat = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.95 })
    const stallRoof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), charredMat)
    stallRoof.position.y = 3.2
    stallRoof.rotation.z = 0.15
    burnStall.add(stallRoof)

    for (let i = -1; i <= 1; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), charredMat)
      crate.position.set(i * 1.1, 0.45, (i % 2) * 0.4)
      burnStall.add(crate)
    }

    const fireLight = new THREE.PointLight(0xf97316, 2.5, 18)
    fireLight.position.set(0, 1.8, 0)
    burnStall.add(fireLight)

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    const flameGeo = new THREE.ConeGeometry(0.6, 2.0, 8)
    const flame1 = new THREE.Mesh(flameGeo, flameMat)
    flame1.position.set(0.3, 1.5, 0)
    const flame2 = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }))
    flame2.position.set(-0.4, 1.3, 0.2)
    flame2.scale.set(0.8, 0.8, 0.8)
    burnStall.add(flame1, flame2)

    burnStall.position.set(-1.0, 0, 0)
    this.environmentGroup.add(burnStall)

    // ZONE 2: SHOP ZONE — Electrical Breaker Alley (North-West [-14.5, -14.0])
    this.createZoneBanner('⚡ ELECTRICAL BREAKER ALLEY', -14.5, 5.0, -14.0, '#38bdf8')
    const breakerWall = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 5.0, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.7 })
    )
    breakerWall.position.set(-14.5, 2.5, -14.0)
    breakerWall.castShadow = true
    this.environmentGroup.add(breakerWall)

    // ZONE 3: VENDOR ROWS (North-East [14, -15])
    this.createZoneBanner('🛒 BAZAAR VENDOR ROWS', 14, 5.0, -15, '#10b981')

    const colors = [0xdc2626, 0x0284c7, 0xf59e0b, 0x16a34a]
    for (let s = 0; s < 4; s++) {
      const stallGroup = new THREE.Group()
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.25, 2.8),
        new THREE.MeshStandardMaterial({ color: colors[s], roughness: 0.6 })
      )
      awning.position.y = 2.8
      awning.rotation.x = 0.1
      const table = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.9, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x92400e })
      )
      table.position.y = 0.45
      stallGroup.add(awning, table)

      const posX = s < 2 ? 14 : -14
      const posZ = (s % 2 === 0 ? -16 : 16)
      stallGroup.position.set(posX, 0, posZ)
      this.environmentGroup.add(stallGroup)
    }

    // ZONE 4: TRAFFIC ZONE — Commercial Metro Complex (South-East [16, 16])
    this.createZoneBanner('🚒 EMERGENCY HYDRANT ZONE', 16, 5.0, 16, '#f59e0b')
    const commercialBldg = new THREE.Mesh(
      new THREE.BoxGeometry(16, 14, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    )
    commercialBldg.position.set(19, 7, 19)
    commercialBldg.castShadow = true
    this.environmentGroup.add(commercialBldg)

    // ZONE 5: ESCAPE ZONE — Rear Market Route (South-West [-16, 16])
    this.createZoneBanner('🚪 REAR MARKET ESCAPE', -16, 5.0, 16, '#a855f7')
    const rearWall = new THREE.Mesh(
      new THREE.BoxGeometry(12, 5, 2),
      new THREE.MeshStandardMaterial({ color: 0x451a03 })
    )
    rearWall.position.set(-16, 2.5, 18)
    this.environmentGroup.add(rearWall)

    const escapeMarker = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide })
    )
    escapeMarker.rotation.x = -Math.PI / 2
    escapeMarker.position.set(18, 0.05, 18)
    this.environmentGroup.add(escapeMarker)
    this.createZoneBanner('🏃 ESCAPE ZONE (Border)', 18, 4.5, 18, '#a855f7')

    // Market String Lanterns
    const lanternPositions = [
      { x: -7.5, z: -7.5 },
      { x: 7.5, z: -7.5 },
      { x: -7.5, z: 7.5 },
      { x: 7.5, z: 7.5 }
    ]
    for (const lp of lanternPositions) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      )
      post.position.set(lp.x, 3, lp.z)
      this.environmentGroup.add(post)

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      )
      bulb.position.set(lp.x, 5.8, lp.z)
      this.environmentGroup.add(bulb)
      this.streetLightBulbs.push(bulb)

      const light = new THREE.PointLight(0xfde047, 1.4, 20, 1.2)
      light.position.set(lp.x, 5.7, lp.z)
      this.environmentGroup.add(light)
      this.streetLights.push(light)
    }
  }

  /**
   * LEVEL 3: Authentic High-Rise Construction Site Incident Environment
   */
  private buildConstructionEnvironment() {
    // 1. Concrete & Gravel Work Ground
    const groundGeo = new THREE.PlaneGeometry(90, 90)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.environmentGroup.add(ground)

    // Concrete Slab roads
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
    const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, 80), slabMat)
    nsRoad.rotation.x = -Math.PI / 2
    nsRoad.position.y = 0.02
    this.environmentGroup.add(nsRoad)

    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), slabMat)
    ewRoad.rotation.x = -Math.PI / 2
    ewRoad.position.y = 0.02
    this.environmentGroup.add(ewRoad)

    // Concrete Structural Core (Tower in South-East)
    const coreBldg = new THREE.Mesh(
      new THREE.BoxGeometry(16, 22, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })
    )
    coreBldg.position.set(19, 11, 19)
    coreBldg.castShadow = true
    this.environmentGroup.add(coreBldg)

    // ZONE 1: ACCIDENT ZONE — Collapsed Scaffolding Debris ([0, 0])
    this.createZoneBanner('⚠️ SCAFFOLD COLLAPSE HAZARD (ACCIDENT)', 0, 4.5, 0, '#ef4444')

    const debrisGroup = new THREE.Group()
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 })
    for (let p = 0; p < 6; p++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8), poleMat)
      pipe.position.set((p % 3) * 0.8 - 0.8, 0.25, Math.floor(p / 3) * 1.0 - 0.5)
      pipe.rotation.set(0.3 * p, 0.5 * p, 1.2)
      debrisGroup.add(pipe)
    }

    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
    for (let b = 0; b < 4; b++) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.9), rubbleMat)
      block.position.set((b - 1.5) * 1.0, 0.3, (b % 2) * 0.7)
      debrisGroup.add(block)
    }

    debrisGroup.position.set(-1.0, 0, 0)
    this.environmentGroup.add(debrisGroup)

    const blinkerLight = new THREE.PointLight(0xef4444, 2.0, 12)
    blinkerLight.position.set(-1.0, 1.6, 0)
    this.environmentGroup.add(blinkerLight)

    // ZONE 2: SHOP ZONE — Modular Site Supervisor Office (North-West [-14.5, -14.0])
    this.createZoneBanner('📋 SITE SAFETY OFFICE & RECORDS', -14.5, 5.0, -14.0, '#38bdf8')
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(8, 5, 6),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
    )
    cabin.position.set(-16.0, 2.5, -16.0)
    cabin.castShadow = true
    this.environmentGroup.add(cabin)

    // ZONE 3: BUS STOP ZONE — Multi-Tier Scaffolding Tower (North-East [14, -15])
    this.createZoneBanner('🏗️ STRUCTURAL SCAFFOLDING TOWER', 14, 5.0, -15, '#10b981')
    const scaffoldTower = new THREE.Group()
    const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5 })
    for (const sx of [-2.5, 2.5]) {
      for (const sz of [-2.0, 2.0]) {
        const standard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 10, 8), scaffoldMat)
        standard.position.set(sx, 5, sz)
        scaffoldTower.add(standard)
      }
    }
    for (const h of [3.0, 6.0, 9.0]) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 4.2), new THREE.MeshStandardMaterial({ color: 0x78716c }))
      deck.position.set(0, h, 0)
      scaffoldTower.add(deck)
    }
    scaffoldTower.position.set(14, 0, -15)
    this.environmentGroup.add(scaffoldTower)

    // Cement Mixer
    const mixerGroup = new THREE.Group()
    const mixerChassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.4), new THREE.MeshStandardMaterial({ color: 0x1e293b }))
    mixerChassis.position.y = 0.4
    const drum = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 10), new THREE.MeshStandardMaterial({ color: 0xf59e0b }))
    drum.position.set(0, 1.2, 0)
    drum.rotation.z = -Math.PI / 4
    mixerGroup.add(mixerChassis, drum)
    mixerGroup.position.set(-14, 0, 14)
    this.environmentGroup.add(mixerGroup)

    // ZONE 4: TRAFFIC ZONE — Incident Reporting Terminal (South-East [16, 16])
    this.createZoneBanner('💻 MANDATORY STATUTORY TERMINAL', 16, 5.0, 16, '#f59e0b')

    // ZONE 5: ESCAPE ZONE — Rear Construction Gate (South-West [-16, 16])
    this.createZoneBanner('🚧 SITE SERVICE GATE (BORDER)', -16, 5.0, 16, '#a855f7')
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true })
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), fenceMat)
    fence.position.set(-16, 2, 18)
    this.environmentGroup.add(fence)

    const escapeMarker = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide })
    )
    escapeMarker.rotation.x = -Math.PI / 2
    escapeMarker.position.set(18, 0.05, 18)
    this.environmentGroup.add(escapeMarker)
    this.createZoneBanner('🏃 ESCAPE ZONE (Border)', 18, 4.5, 18, '#a855f7')

    // 4 Industrial High-Mast Floodlights
    const floodlightPositions = [
      { x: -7.5, z: -7.5 },
      { x: 7.5, z: -7.5 },
      { x: -7.5, z: 7.5 },
      { x: 7.5, z: 7.5 }
    ]
    for (const fp of floodlightPositions) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
      )
      mast.position.set(fp.x, 4, fp.z)
      this.environmentGroup.add(mast)

      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      )
      fixture.position.set(fp.x, 7.9, fp.z)
      this.environmentGroup.add(fixture)
      this.streetLightBulbs.push(fixture)

      const floodlight = new THREE.PointLight(0xf8fafc, 1.8, 24, 1.1)
      floodlight.position.set(fp.x, 7.8, fp.z)
      this.environmentGroup.add(floodlight)
      this.streetLights.push(floodlight)
    }
  }

  private buildIndianUrbanEnvironment() {
    const obstacles: AABB[] = []

    // 1. Base Ground (Asphalt & Soil)
    const groundGeo = new THREE.PlaneGeometry(90, 90)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.environmentGroup.add(ground)

    // 2. Asphalt Roads (Main North-South & East-West Indian highway junction)
    const roadWidth = 13
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 })

    const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 80), roadMat)
    nsRoad.rotation.x = -Math.PI / 2
    nsRoad.position.y = 0.02
    nsRoad.receiveShadow = true
    this.environmentGroup.add(nsRoad)

    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(80, roadWidth), roadMat)
    ewRoad.rotation.x = -Math.PI / 2
    ewRoad.position.y = 0.02
    ewRoad.receiveShadow = true
    this.environmentGroup.add(ewRoad)

    // Yellow and White Road Dividers & Markings
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    for (let z = -36; z <= 36; z += 4) {
      if (Math.abs(z) > roadWidth / 2) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.2), yellowMat)
        stripe.rotation.x = -Math.PI / 2
        stripe.position.set(0, 0.03, z)
        this.environmentGroup.add(stripe)
      }
    }
    for (let x = -36; x <= 36; x += 4) {
      if (Math.abs(x) > roadWidth / 2) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.35), yellowMat)
        stripe.rotation.x = -Math.PI / 2
        stripe.position.set(x, 0.03, 0)
        this.environmentGroup.add(stripe)
      }
    }

    // 4 Crosswalks
    const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    const drawCrosswalk = (centerX: number, centerZ: number, isVertical: boolean) => {
      for (let i = -5.5; i <= 5.5; i += 1.4) {
        const bar = new THREE.Mesh(
          isVertical ? new THREE.PlaneGeometry(0.85, 3.8) : new THREE.PlaneGeometry(3.8, 0.85),
          zebraMat
        )
        bar.rotation.x = -Math.PI / 2
        if (isVertical) bar.position.set(centerX + i, 0.035, centerZ)
        else bar.position.set(centerX, 0.035, centerZ + i)
        this.environmentGroup.add(bar)
      }
    }
    drawCrosswalk(0, 9.2, true)
    drawCrosswalk(0, -9.2, true)
    drawCrosswalk(9.2, 0, false)
    drawCrosswalk(-9.2, 0, false)

    // 3. Sidewalks & Footpaths
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
    const sidewalkSize = 32
    const offset = roadWidth / 2 + sidewalkSize / 2

    const corners = [
      { x: -offset, z: -offset },
      { x: offset, z: -offset },
      { x: -offset, z: offset },
      { x: offset, z: offset }
    ]

    for (const c of corners) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(sidewalkSize, 0.22, sidewalkSize), sidewalkMat)
      sw.position.set(c.x, 0.11, c.z)
      sw.receiveShadow = true
      this.environmentGroup.add(sw)
    }

    // ─────────────────────────────────────────────────────────────
    // 4. THE 5 IDENTIFIABLE ZONES
    // ─────────────────────────────────────────────────────────────

    // ZONE 1: ACCIDENT ZONE (Center [0, 0])
    // Crash site with hazard cone, dented crash car, barrier
    this.createZoneBanner('⚠️ ACCIDENT ZONE', 0, 4.5, 0, '#ef4444')

    // Dented Crash Car
    const carGroup = new THREE.Group()
    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.1, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }) // Dark sedan
    )
    carBody.position.y = 0.65
    carBody.castShadow = true
    carGroup.add(carBody)

    // Smashed front dent
    const dentMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    )
    dentMesh.position.set(0, 0.5, 2.1)
    carGroup.add(dentMesh)

    carGroup.position.set(-2.5, 0, 1.5)
    carGroup.rotation.y = 0.35
    this.environmentGroup.add(carGroup)

    obstacles.push({
      minX: -4.0,
      maxX: -1.0,
      minZ: -1.0,
      maxZ: 4.0
    })

    // Hazard Blinkers on car
    const hazardLight = new THREE.PointLight(0xf59e0b, 2.0, 10)
    hazardLight.position.set(-2.5, 1.4, 3.6)
    this.environmentGroup.add(hazardLight)

    // ZONE 2: SHOP ZONE (North-West [-16, -16])
    // Dhaba & Kirana store, CCTV console, tables
    this.createZoneBanner('🏪 SHOP ZONE · DHABA', -16, 5.0, -16, '#38bdf8')

    // Dhaba Compound Building Structure with Accessible Open Doorway
    const dhabaMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
    const wallTrimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })

    // Back Wall (North): [-25.0, -11.0] x [-25.0, -23.8] -> width 14, depth 1.2, height 6
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 1.2), dhabaMat)
    wallBack.position.set(-18.0, 3.0, -24.4)
    wallBack.castShadow = true
    wallBack.receiveShadow = true
    this.environmentGroup.add(wallBack)

    // West Wall: [-25.0, -23.8] x [-25.0, -11.0] -> width 1.2, depth 14, height 6
    const wallWest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 14), dhabaMat)
    wallWest.position.set(-24.4, 3.0, -18.0)
    wallWest.castShadow = true
    wallWest.receiveShadow = true
    this.environmentGroup.add(wallWest)

    // East Wall: [-12.2, -11.0] x [-25.0, -11.0] -> width 1.2, depth 14, height 6
    const wallEast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 14), dhabaMat)
    wallEast.position.set(-11.6, 3.0, -18.0)
    wallEast.castShadow = true
    wallEast.receiveShadow = true
    this.environmentGroup.add(wallEast)

    // Front Wall Left: [-25.0, -17.5] x [-12.2, -11.0] -> width 7.5, depth 1.2, height 6
    const wallFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(7.5, 6, 1.2), dhabaMat)
    wallFrontLeft.position.set(-21.25, 3.0, -11.6)
    wallFrontLeft.castShadow = true
    wallFrontLeft.receiveShadow = true
    this.environmentGroup.add(wallFrontLeft)

    // Front Wall Right: [-14.5, -11.0] x [-12.2, -11.0] -> width 3.5, depth 1.2, height 6
    const wallFrontRight = new THREE.Mesh(new THREE.BoxGeometry(3.5, 6, 1.2), dhabaMat)
    wallFrontRight.position.set(-12.75, 3.0, -11.6)
    wallFrontRight.castShadow = true
    wallFrontRight.receiveShadow = true
    this.environmentGroup.add(wallFrontRight)

    // Doorway Header Lintel: above door opening [-17.5, -14.5] from y: 3.5 to 6.0
    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.5, 1.2), wallTrimMat)
    doorLintel.position.set(-16.0, 4.75, -11.6)
    this.environmentGroup.add(doorLintel)

    // Doorway Welcome Mat / Entrance Threshold
    const doorMat = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.04, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x0f766e })
    )
    doorMat.position.set(-16.0, 0.02, -11.6)
    this.environmentGroup.add(doorMat)

    // Dhaba Interior Tiled Floor
    const interiorFloor = new THREE.Mesh(
      new THREE.BoxGeometry(12.0, 0.04, 12.0),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 })
    )
    interiorFloor.position.set(-18.0, 0.02, -18.0)
    interiorFloor.receiveShadow = true
    this.environmentGroup.add(interiorFloor)

    // Interior Warm Lighting
    const interiorLight = new THREE.PointLight(0xfef08a, 1.6, 16)
    interiorLight.position.set(-17.0, 4.0, -17.0)
    this.environmentGroup.add(interiorLight)

    // Red Tin Roof Canopy
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.6, 15),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 })
    )
    roof.position.set(-18, 8.3, -18)
    this.environmentGroup.add(roof)

    // Dhaba Counter Stall
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 1.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x78716c })
    )
    counter.position.set(-11.5, 0.55, -10.0)
    counter.castShadow = true
    this.environmentGroup.add(counter)
    obstacles.push({ minX: -14.2, maxX: -8.8, minZ: -10.8, maxZ: -9.2 })

    // Warm Dhaba Lantern Light
    const lantern = new THREE.PointLight(0xfde047, 1.8, 14)
    lantern.position.set(-11.5, 3.2, -10.0)
    this.environmentGroup.add(lantern)

    // ZONE 3: BUS STOP ZONE (North-East [16, -16])
    this.createZoneBanner('🚌 BUS STOP ZONE', 16, 5.0, -16, '#10b981')

    // Authentic Indian Bus Stop Shelter (Curved roof, yellow support pillars)
    const busShelter = new THREE.Group()
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.5), new THREE.MeshStandardMaterial({ color: 0x334155 }))
    p1.position.set(-2.5, 1.75, -1.2)
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.5), new THREE.MeshStandardMaterial({ color: 0x334155 }))
    p2.position.set(2.5, 1.75, -1.2)
    const shelterRoof = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.35, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x15803d }) // Green municipal roof
    )
    shelterRoof.position.set(0, 3.5, 0)
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: 0x475569 }))
    bench.position.set(0, 0.45, -1.0)

    busShelter.add(p1, p2, shelterRoof, bench)
    busShelter.position.set(14.0, 0, -12.5)
    this.environmentGroup.add(busShelter)
    obstacles.push({ minX: 11.0, maxX: 17.0, minZ: -14.5, maxZ: -10.5 })

    // ZONE 4: TRAFFIC ZONE (South-East [16, 16])
    this.createZoneBanner('🚦 TRAFFIC ZONE', 16, 5.0, 16, '#f59e0b')

    // City Station & High-Rise Building in Traffic Zone
    const station = new THREE.Mesh(
      new THREE.BoxGeometry(16, 14, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    )
    station.position.set(19, 7, 19)
    station.castShadow = true
    this.environmentGroup.add(station)
    obstacles.push({ minX: 11, maxX: 27, minZ: 11, maxZ: 27 })

    // ZONE 5: ESCAPE ZONE (South-West [-16, 16])
    // Dark alleyway for Saboteur getaway
    this.createZoneBanner('🏃 ESCAPE ALLEY', -16, 5.0, 16, '#a855f7')

    const brickMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 2), brickMat)
    wall1.position.set(-18, 3, 11)
    wall1.castShadow = true
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 2), brickMat)
    wall2.position.set(-18, 3, 21)
    wall2.castShadow = true
    this.environmentGroup.add(wall1, wall2)
    obstacles.push({ minX: -25, maxX: -11, minZ: 10, maxZ: 12 })
    obstacles.push({ minX: -25, maxX: -11, minZ: 20, maxZ: 22 })

    // Parked Green CNG Auto-Rickshaw in South-West
    const autoGroup = new THREE.Group()
    const autoBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.4, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x15803d }) // Green
    )
    autoBody.position.y = 0.8
    const autoRoof = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.25, 2.9),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 }) // Yellow roof
    )
    autoRoof.position.y = 1.6
    autoGroup.add(autoBody, autoRoof)
    autoGroup.position.set(-8.5, 0, 7.5)
    autoGroup.rotation.y = 1.2
    this.environmentGroup.add(autoGroup)
    obstacles.push({ minX: -10.2, maxX: -6.8, minZ: 6.0, maxZ: 9.0 })

    // Milestone 3: Interactive Escape Zone Ground Marker (North-East highway border)
    const escapeMarkerGeo = new THREE.RingGeometry(2.2, 3.2, 32)
    escapeMarkerGeo.rotateX(-Math.PI / 2)
    const escapeMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    })
    const escapeMarker = new THREE.Mesh(escapeMarkerGeo, escapeMarkerMat)
    escapeMarker.position.set(18, 0.05, 18)
    this.environmentGroup.add(escapeMarker)
    this.createZoneBanner('🏃 ESCAPE ZONE (Border)', 18, 4.5, 18, '#a855f7')

    // 5. Street Lamps with Point Lights
    const lampPositions = [
      { x: -7.5, z: -7.5 },
      { x: 7.5, z: -7.5 },
      { x: -7.5, z: 7.5 },
      { x: 7.5, z: 7.5 }
    ]

    for (const lp of lampPositions) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 })
      )
      pole.position.set(lp.x, 3, lp.z)
      this.environmentGroup.add(pole)

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      )
      bulb.position.set(lp.x, 5.9, lp.z)
      this.environmentGroup.add(bulb)
      this.streetLightBulbs.push(bulb)

      const light = new THREE.PointLight(0xfef08a, 1.4, 20, 1.2)
      light.position.set(lp.x, 5.8, lp.z)
      this.environmentGroup.add(light)
      this.streetLights.push(light)

      obstacles.push({ minX: lp.x - 0.35, maxX: lp.x + 0.35, minZ: lp.z - 0.35, maxZ: lp.z + 0.35 })
    }

    // Authoritative compound obstacles for Level 1
    this.collisionSystem.setObstacles(LEVEL_1_OBSTACLES)
  }

  private createZoneBanner(title: string, x: number, y: number, z: number, color: string) {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 70
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
    ctx.roundRect(8, 8, 284, 54, 12)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = color
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, 150, 42)

    const texture = new THREE.CanvasTexture(canvas)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }))
    sprite.position.set(x, y, z)
    sprite.scale.set(3.2, 0.75, 1)
    this.environmentGroup.add(sprite)
  }

  /**
   * Called every frame by user input
   */
  public handleLocalMovement(
    inputForward: number,
    inputRight: number,
    isSprinting: boolean,
    delta: number
  ) {
    this.isSprinting = isSprinting

    const moveVector = new THREE.Vector3(0, 0, 0)
    const forwardVec = this.thirdPersonCamera.getForwardVector()
    const rightVec = this.thirdPersonCamera.getRightVector()

    if (inputForward !== 0) {
      moveVector.addScaledVector(forwardVec, inputForward)
    }
    if (inputRight !== 0) {
      moveVector.addScaledVector(rightVec, inputRight)
    }

    if (moveVector.lengthSq() > 0.001) {
      moveVector.normalize()
      this.isMoving = true

      const speed = isSprinting ? 9.5 : 5.0
      const deltaDist = speed * delta

      const deltaX = moveVector.x * deltaDist
      const deltaZ = moveVector.z * deltaDist

      // Dynamic Entity Colliders (Remote Player + NPCs)
      const dynamicEntities: DynamicEntityCollider[] = [
        {
          id: 'remote_player',
          x: this.remoteCharacter.group.position.x,
          z: this.remoteCharacter.group.position.z,
          radius: 0.55
        }
      ]
      for (const [id, npc] of this.npcModels) {
        dynamicEntities.push({
          id,
          x: npc.group.position.x,
          z: npc.group.position.z,
          radius: 0.5
        })
      }

      // Dynamic Collision Resolution (cannot walk through other player or NPCs)
      const resolved = this.collisionSystem.resolvePositionWithEntities(
        this.localPos.x,
        this.localPos.z,
        deltaX,
        deltaZ,
        dynamicEntities
      )

      this.localPos.x = resolved.x
      this.localPos.z = resolved.z

      // Smoothly rotate character to face movement direction
      const targetYaw = Math.atan2(moveVector.x, moveVector.z)
      let diff = targetYaw - this.localYaw
      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2
      this.localYaw += diff * Math.min(1, delta * 12)
    } else {
      this.isMoving = false
    }

    // Apply to local model
    this.localCharacter.setPosition(this.localPos.x, this.localPos.y, this.localPos.z)
    this.localCharacter.setRotation(this.localYaw)
    this.localCharacter.animate(this.isMoving, this.isSprinting, delta)

    // Update Follow Camera
    this.thirdPersonCamera.update(this.localPos)

    // Network Sync throttling (~30-60 Hz)
    const now = performance.now()
    if (now - this.lastNetworkSendTime > 30) {
      this.lastNetworkSendTime = now
      this.onLocalMoveCallback({
        x: Number(this.localPos.x.toFixed(3)),
        y: Number(this.localPos.y.toFixed(3)),
        z: Number(this.localPos.z.toFixed(3)),
        yaw: Number(this.localYaw.toFixed(3)),
        isMoving: this.isMoving,
        isSprinting: this.isSprinting,
        timestamp: now
      })
    }
  }

  /**
   * Called when server relays peer movement packet
   */
  public handlePeerMovement(event: PeerMovementEvent) {
    this.remoteTargetPos.set(event.x, event.y, event.z)
    this.remoteTargetYaw = event.yaw
    this.remoteIsMoving = event.isMoving
    this.remoteIsSprinting = event.isSprinting
  }

  // ─────────────────────────────────────────────────────────────
  // MILESTONE 2: PROXIMITY DETECTION & UPDATES
  // ─────────────────────────────────────────────────────────────
  public getNearestInteractable(maxRadius: number = 3.6): {
    type: 'npc' | 'object'
    id: string
    name: string
    prompt: string
  } | null {
    let nearest: { type: 'npc' | 'object'; id: string; name: string; prompt: string } | null = null
    let minDist = maxRadius

    // 1. Check NPCs
    for (const [id, npc] of this.npcModels) {
      const dist = this.localPos.distanceTo(npc.group.position)
      if (dist < minDist) {
        minDist = dist
        nearest = {
          type: 'npc',
          id,
          name: npc.name,
          prompt: `[E] Talk to ${npc.name} (${npc.roleTitle})`
        }
      }
    }

    // 2. Check Objects
    for (const [id, obj] of this.objectModels) {
      if (!obj.group.visible) continue
      const dist = this.localPos.distanceTo(obj.group.position)
      if (dist < minDist) {
        minDist = dist
        let promptAction = 'Interact'
        if (id === 'obj_phone') promptAction = 'Use Emergency Phone (112)'
        else if (id === 'obj_cctv') promptAction = 'Access CCTV Console'
        else if (id === 'obj_signal') promptAction = 'Operate Traffic Signal'
        else if (id === 'obj_firstaid') promptAction = 'Pick up First-Aid Kit'
        else if (id === 'obj_infoboard') promptAction = 'Inspect Information Board'

        nearest = {
          type: 'object',
          id,
          name: obj.name,
          prompt: `[E] ${promptAction}`
        }
      }
    }

    // 3. Check Escape Zone (Saboteur only)
    if (this.localRole === 'saboteur') {
      const escapeDist = this.localPos.distanceTo(new THREE.Vector3(18, 0, 18))
      if (escapeDist < 4.5 && escapeDist < minDist) {
        minDist = escapeDist
        nearest = {
          type: 'object',
          id: 'zone_escape',
          name: 'Highway Escape Route',
          prompt: '[E] Hold Position to Channel Escape (5s)'
        }
      }
    }

    return nearest
  }

  public updateNPC(npcId: string, npcState: NPCState) {
    let model = this.npcModels.get(npcId)
    if (!model) {
      model = new NPCModel(npcState)
      this.npcModels.set(npcId, model)
      this.scene.add(model.group)
    }
    model.updateState(npcState)
  }

  public updateNPCBatch(npcs: Record<string, NPCState>) {
    for (const id in npcs) {
      const state = npcs[id]
      let model = this.npcModels.get(id)
      if (!model) {
        model = new NPCModel(state)
        this.npcModels.set(id, model)
        this.scene.add(model.group)
      }
      let target = this.npcTargets.get(id)
      if (!target) {
        target = {
          pos: new THREE.Vector3(state.position.x, state.position.y, state.position.z),
          yaw: state.facingYaw,
          isMoving: !!state.isMoving
        }
        this.npcTargets.set(id, target)
      } else {
        target.pos.set(state.position.x, state.position.y, state.position.z)
        target.yaw = state.facingYaw
        target.isMoving = !!state.isMoving
      }
      model.updateState(state)
      if (state.currentReaction && state.currentReaction !== 'idle') {
        model.triggerReaction(state.currentReaction, state.reactionDurationSec || 3.0)
      }
    }
  }

  public triggerNPCReaction(npcId: string, reaction: NPCPhysicalReaction) {
    const model = this.npcModels.get(npcId)
    if (model) {
      model.triggerReaction(reaction, 3.5)
    }
  }

  // Milestone 6: Environmental Chaos Controls
  public setStreetlightsActive(active: boolean) {
    for (const light of this.streetLights) {
      light.intensity = active ? 1.4 : 0.15
    }
    for (const bulb of this.streetLightBulbs) {
      const mat = bulb.material as THREE.MeshBasicMaterial
      if (mat) mat.color.setHex(active ? 0xfef08a : 0x334155)
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = active ? 0.8 : 0.35
    }
  }

  public triggerNoiseDistraction(pos: { x: number; y: number; z: number }) {
    const ringGeo = new THREE.RingGeometry(0.5, 0.8, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(pos.x, 0.1, pos.z)
    this.scene.add(ring)

    let scale = 1.0
    const interval = setInterval(() => {
      scale += 0.25
      ring.scale.set(scale, scale, 1)
      ringMat.opacity -= 0.08
      if (ringMat.opacity <= 0) {
        clearInterval(interval)
        this.scene.remove(ring)
        ringGeo.dispose()
        ringMat.dispose()
      }
    }, 40)
  }

  public updateObject(objId: string, objState: InteractiveObjectState) {
    let model = this.objectModels.get(objId)
    if (!model) {
      model = new InteractiveObjectModel(objState)
      this.objectModels.set(objId, model)
      this.scene.add(model.group)
    }
    model.updateState(objState)
  }

  // ─────────────────────────────────────────────────────────────
  // Milestone 5: Collision Visualizer & Dev Inspection (F2)
  // ─────────────────────────────────────────────────────────────
  public toggleDebugCollisionVisualizer(): boolean {
    this.debugCollisionMode = !this.debugCollisionMode
    this.updateDebugCollisionVisuals()
    return this.debugCollisionMode
  }

  private updateDebugCollisionVisuals() {
    this.debugCollisionGroup.clear()
    if (!this.debugCollisionMode) return

    // 1. Static Obstacles (Red wireframe boxes)
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true })
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xeab308, wireframe: true })
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, wireframe: true })
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true })

    for (const obs of LEVEL_1_OBSTACLES) {
      const width = obs.maxX - obs.minX
      const depth = obs.maxZ - obs.minZ
      const height = 4.0
      const geo = new THREE.BoxGeometry(width, height, depth)
      const mesh = new THREE.Mesh(geo, redMat)
      mesh.position.set(obs.minX + width / 2, height / 2, obs.minZ + depth / 2)
      this.debugCollisionGroup.add(mesh)
    }

    // 2. Doorway opening indicator (Yellow wireframe box)
    const doorGeo = new THREE.BoxGeometry(3.0, 3.5, 1.2)
    const doorMesh = new THREE.Mesh(doorGeo, yellowMat)
    doorMesh.position.set(-16.0, 1.75, -11.6)
    this.debugCollisionGroup.add(doorMesh)

    // 3. Dynamic Player colliders (Green wireframe cylinder/capsule)
    const playerGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.8, 16)
    const localCollider = new THREE.Mesh(playerGeo, greenMat)
    localCollider.position.copy(this.localPos)
    localCollider.position.y = 0.9
    this.debugCollisionGroup.add(localCollider)

    // 4. Object trigger radius (Cyan wireframe circles)
    for (const [_, obj] of this.objectModels) {
      const radius = obj.radius || 2.5
      const triggerGeo = new THREE.RingGeometry(Math.max(0.2, radius - 0.05), radius, 32)
      triggerGeo.rotateX(-Math.PI / 2)
      const triggerMesh = new THREE.Mesh(triggerGeo, cyanMat)
      triggerMesh.position.set(obj.group.position.x, 0.1, obj.group.position.z)
      this.debugCollisionGroup.add(triggerMesh)
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'F2') {
      this.toggleDebugCollisionVisualizer()
    }
  }

  public repositionPlayers(
    localPos: { x: number; y: number; z: number; yaw: number },
    remotePos: { x: number; y: number; z: number; yaw: number },
    newRole?: PlayerRole
  ) {
    if (newRole) {
      this.localRole = newRole
    }
    this.localPos.set(localPos.x, localPos.y, localPos.z)
    this.localYaw = localPos.yaw
    this.localCharacter.group.position.set(localPos.x, localPos.y, localPos.z)
    this.localCharacter.group.rotation.y = localPos.yaw

    this.remoteTargetPos.set(remotePos.x, remotePos.y, remotePos.z)
    this.remoteTargetYaw = remotePos.yaw
    this.remoteCharacter.group.position.set(remotePos.x, remotePos.y, remotePos.z)
    this.remoteCharacter.group.rotation.y = remotePos.yaw

    this.thirdPersonCamera.update(this.localPos)
  }

  private animateLoop = () => {
    if (!this.isRunning) return

    const delta = Math.min(this.clock.getDelta(), 0.1)

    // Smoothly interpolate Remote Player to target position and rotation
    this.remoteCharacter.group.position.lerp(this.remoteTargetPos, Math.min(1, delta * 16))

    let yawDiff = this.remoteTargetYaw - this.remoteCharacter.group.rotation.y
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    this.remoteCharacter.group.rotation.y += yawDiff * Math.min(1, delta * 16)

    this.remoteCharacter.animate(this.remoteIsMoving, this.remoteIsSprinting, delta)

    // Smoothly animate & interpolate NPCs
    for (const [id, npc] of this.npcModels) {
      const target = this.npcTargets.get(id)
      if (target) {
        npc.group.position.lerp(target.pos, Math.min(1, delta * 6))
        let diff = target.yaw - npc.group.rotation.y
        while (diff < -Math.PI) diff += Math.PI * 2
        while (diff > Math.PI) diff -= Math.PI * 2
        npc.group.rotation.y += diff * Math.min(1, delta * 8)
        npc.isWalking = target.isMoving
      }
      npc.animate(delta)
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera)

    this.animFrameId = requestAnimationFrame(this.animateLoop)
  }

  private onWindowResize = () => {
    if (!this.container || !this.renderer) return
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  public destroy() {
    this.isRunning = false
    cancelAnimationFrame(this.animFrameId)
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('keydown', this.onKeyDown)
    this.renderer.dispose()
    this.scene.clear()
  }
}
