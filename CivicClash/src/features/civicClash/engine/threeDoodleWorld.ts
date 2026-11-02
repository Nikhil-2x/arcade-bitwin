import * as THREE from 'three'
import type { 
  LevelConfig, 
  WitnessNPC, 
  EnvironmentalElement, 
  PlayerState, 
  Role,
  RescueChainStep
} from '../types.ts'
import { distance } from './physics.ts'

export interface ThreeWorldContext {
  container: HTMLElement
  level: LevelConfig
  rescuerState: PlayerState
  saboteurState: PlayerState
  witnesses: WitnessNPC[]
  environment: EnvironmentalElement[]
  activeRole: Role
  rescueChain: RescueChainStep[]
  onEntityClick: (type: 'npc' | 'victim' | 'env', id: string) => void
  onGroundClick: (x: number, y: number) => void
}

/**
 * Three.js 3D Doodle / Sketchbook World
 * Inspired by doodleshooter.vercel.app:
 * - Notebook lined paper ground with blue ruling lines and red margin
 * - Hand-drawn ink style 3D buildings with crosshatched shadows
 * - 3D procedural vehicles (dented car, ambulance with flashing lights, auto-rickshaw)
 * - Animated 2.5D doodle cutout characters with walking animations and shadows
 * - 3D glowing waypoint beacon & holographic objective path
 */
export class ThreeDoodleWorld {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  // Lighting
  private dirLight: THREE.DirectionalLight
  private ambLight: THREE.AmbientLight
  private ambulanceLightRed: THREE.PointLight
  private ambulanceLightBlue: THREE.PointLight

  // Meshes
  private groundMesh: THREE.Mesh
  private rescuerMesh: THREE.Group
  private saboteurMesh: THREE.Group
  private witnessMeshes: Map<string, THREE.Group> = new Map()
  private environmentMeshes: Map<string, THREE.Group> = new Map()
  private victimMesh: THREE.Group
  private coneMeshes: THREE.Group[] = []
  private objectiveBeacon: THREE.Group
  private breadcrumbLine: THREE.Line

  // Textures generated procedurally
  private notebookTexture: THREE.CanvasTexture

  private animFrameId: number = 0
  private tick: number = 0
  private callbacks: {
    onEntityClick: (type: 'npc' | 'victim' | 'env', id: string) => void
    onGroundClick: (x: number, y: number) => void
  }

  constructor(ctx: ThreeWorldContext) {
    this.container = ctx.container
    this.callbacks = {
      onEntityClick: ctx.onEntityClick,
      onGroundClick: ctx.onGroundClick
    }

    // 1. Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#fbf8f1') // Notebook paper color

    // 2. Camera: Angled 3D Isometric View
    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 3000)
    this.camera.position.set(0, 480, 560)
    this.camera.lookAt(0, 0, 0)

    // 3. Renderer with shadow map
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    // 4. Lighting
    this.ambLight = new THREE.AmbientLight('#ffffff', 0.85)
    this.scene.add(this.ambLight)

    this.dirLight = new THREE.DirectionalLight('#fffcf0', 1.2)
    this.dirLight.position.set(200, 500, 300)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width = 2048
    this.dirLight.shadow.mapSize.height = 2048
    this.dirLight.shadow.camera.near = 10
    this.dirLight.shadow.camera.far = 1500
    const d = 600
    this.dirLight.shadow.camera.left = -d
    this.dirLight.shadow.camera.right = d
    this.dirLight.shadow.camera.top = d
    this.dirLight.shadow.camera.bottom = -d
    this.scene.add(this.dirLight)

    // Flashing ambulance emergency beacon lights
    this.ambulanceLightRed = new THREE.PointLight('#ef4444', 2, 180)
    this.ambulanceLightBlue = new THREE.PointLight('#3b82f6', 2, 180)
    this.scene.add(this.ambulanceLightRed)
    this.scene.add(this.ambulanceLightBlue)

    // 5. Procedural Notebook Lined Paper Ground Texture
    this.notebookTexture = this.generateNotebookTexture(ctx.level.mapWidth, ctx.level.mapHeight, ctx.level.id)
    const groundGeo = new THREE.PlaneGeometry(ctx.level.mapWidth, ctx.level.mapHeight)
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.notebookTexture,
      roughness: 0.9,
      metalness: 0.05
    })
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat)
    this.groundMesh.rotation.x = -Math.PI / 2
    this.groundMesh.receiveShadow = true
    this.scene.add(this.groundMesh)

    // 6. Build 3D Entities
    this.rescuerMesh = this.createCharacterMesh('rescuer')
    this.scene.add(this.rescuerMesh)

    this.saboteurMesh = this.createCharacterMesh('saboteur')
    this.scene.add(this.saboteurMesh)

    this.victimMesh = this.createVictimSceneMesh(ctx.level)
    this.scene.add(this.victimMesh)

    // Witnesses
    for (const w of ctx.witnesses) {
      const wMesh = this.createWitnessMesh(w)
      this.witnessMeshes.set(w.id, wMesh)
      this.scene.add(wMesh)
    }

    // Environment Props (Dhaba, Traffic signal, Auto, Bank)
    for (const env of ctx.environment) {
      const eMesh = this.createEnvironmentMesh(env)
      this.environmentMeshes.set(env.id, eMesh)
      this.scene.add(eMesh)
    }

    // 3D Objective Waypoint Beacon
    this.objectiveBeacon = this.createObjectiveBeaconMesh()
    this.scene.add(this.objectiveBeacon)

    // Breadcrumb line
    const lineMat = new THREE.LineDashedMaterial({
      color: '#0284c7',
      linewidth: 3,
      scale: 1,
      dashSize: 12,
      gapSize: 8
    })
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 2, 0),
      new THREE.Vector3(0, 2, 0)
    ])
    this.breadcrumbLine = new THREE.Line(lineGeo, lineMat)
    this.scene.add(this.breadcrumbLine)

    // 7. Raycaster for clicking
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('resize', this.onWindowResize)
  }

  /**
   * Generates a stylized notebook paper texture with hand-drawn blue ballpoint ink roads
   */
  private generateNotebookTexture(w: number, h: number, levelId: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!

    // Notebook paper background
    ctx.fillStyle = '#fbf7ee'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Blue horizontal lined notebook paper ruling lines
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)'
    ctx.lineWidth = 1.5
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Pink / Red vertical margin line
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(120, 0)
    ctx.lineTo(120, canvas.height)
    ctx.stroke()

    // Hand-drawn blue ballpoint ink road with crosshatched asphalt texture
    const scaleX = canvas.width / w
    const scaleY = canvas.height / h

    if (levelId === 1) {
      // Main Highway road
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 350 * scaleY, canvas.width, 200 * scaleY)

      // Crossing street
      ctx.fillRect(470 * scaleX, 0, 200 * scaleX, canvas.height)

      // Hand-drawn crosshatch pencil lines on road
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 24) {
        ctx.beginPath()
        ctx.moveTo(x, 350 * scaleY)
        ctx.lineTo(x + 20, 550 * scaleY)
        ctx.stroke()
      }

      // Yellow double center divider (hand-drawn ink style)
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, 448 * scaleY)
      ctx.lineTo(canvas.width, 448 * scaleY)
      ctx.moveTo(0, 454 * scaleY)
      ctx.lineTo(canvas.width, 454 * scaleY)
      ctx.stroke()

      // Crosswalk Zebra Stripes
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 7; i++) {
        ctx.fillRect((485 + i * 24) * scaleX, 365 * scaleY, 14 * scaleX, 170 * scaleY)
      }

      // Ambulance emergency corridor marked with yellow highlighter
      ctx.fillStyle = 'rgba(250, 204, 21, 0.15)'
      ctx.fillRect(670 * scaleX, 460 * scaleY, canvas.width - 670 * scaleX, 80 * scaleY)
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 3
      ctx.setLineDash([16, 12])
      ctx.strokeRect(670 * scaleX, 460 * scaleY, canvas.width - 670 * scaleX, 80 * scaleY)
      ctx.setLineDash([])

      // Road stencil text
      ctx.font = 'bold 20px "JetBrains Mono", sans-serif'
      ctx.fillStyle = '#facc15'
      ctx.fillText('⚡ 108 AMBULANCE LANE (s.194E PENALTY ₹10,000)', 720 * scaleX, 510 * scaleY)
    } else {
      // Marketplace or Station courtyard roads
      ctx.fillStyle = '#261b40'
      ctx.fillRect(80 * scaleX, 240 * scaleY, canvas.width - 160 * scaleX, 220 * scaleY)
      ctx.strokeStyle = '#93c5fd'
      ctx.lineWidth = 2
      ctx.strokeRect(80 * scaleX, 240 * scaleY, canvas.width - 160 * scaleX, 220 * scaleY)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
  }

  /**
   * Creates a 3D doodle character with animated walking limbs and ink borders
   */
  private createCharacterMesh(role: Role): THREE.Group {
    const group = new THREE.Group()

    // 1. Torso
    const isRescuer = role === 'rescuer'
    const shirtColor = isRescuer ? '#2563eb' : '#334155'
    const bodyGeo = new THREE.BoxGeometry(16, 22, 10)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: shirtColor,
      roughness: 0.6
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 20
    body.castShadow = true
    group.add(body)

    // Ink outline edges around body (Doodle Shooter style)
    const edges = new THREE.EdgesGeometry(bodyGeo)
    const lineMat = new THREE.LineBasicMaterial({ color: '#090d16', linewidth: 2 })
    const bodyOutline = new THREE.LineSegments(edges, lineMat)
    body.add(bodyOutline)

    // 2. Head
    const headGeo = new THREE.SphereGeometry(7, 16, 16)
    const headMat = new THREE.MeshStandardMaterial({ color: '#ffd1a4', roughness: 0.7 })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 36
    head.castShadow = true
    group.add(head)

    // Hat / Hair
    const capGeo = new THREE.CylinderGeometry(8, 8, 3, 16)
    const capMat = new THREE.MeshStandardMaterial({
      color: isRescuer ? '#1d4ed8' : '#0f172a'
    })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.y = 41
    group.add(cap)

    // Scarf for rescuer / collar for saboteur
    if (isRescuer) {
      const scarfGeo = new THREE.TorusGeometry(6, 2, 8, 16)
      const scarfMat = new THREE.MeshStandardMaterial({ color: '#10b981' })
      const scarf = new THREE.Mesh(scarfGeo, scarfMat)
      scarf.position.y = 30
      scarf.rotation.x = Math.PI / 2
      group.add(scarf)
    }

    // 3. Legs (animated)
    const legGeo = new THREE.BoxGeometry(4, 12, 4)
    const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b' })

    const leftLeg = new THREE.Mesh(legGeo, legMat)
    leftLeg.position.set(-4, 6, 0)
    leftLeg.castShadow = true
    leftLeg.name = 'leftLeg'
    group.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeo, legMat)
    rightLeg.position.set(4, 6, 0)
    rightLeg.castShadow = true
    rightLeg.name = 'rightLeg'
    group.add(rightLeg)

    // Overhead Role Banner Sprite
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = isRescuer ? '#2563eb' : '#dc2626'
    ctx.roundRect(10, 10, 236, 44, 12)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.font = 'bold 22px "Bungee", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(isRescuer ? 'YOU (RESCUER)' : 'SABOTEUR', 128, 40)

    const tagTexture = new THREE.CanvasTexture(canvas)
    const tagMat = new THREE.SpriteMaterial({ map: tagTexture })
    const tagSprite = new THREE.Sprite(tagMat)
    tagSprite.position.y = 56
    tagSprite.scale.set(45, 12, 1)
    group.add(tagSprite)

    return group
  }

  /**
   * Creates a Witness character with name tag and emotion thought bubble
   */
  private createWitnessMesh(w: WitnessNPC): THREE.Group {
    const group = new THREE.Group()

    // Torso
    const bodyGeo = new THREE.BoxGeometry(14, 20, 8)
    const bodyMat = new THREE.MeshStandardMaterial({ color: w.avatarColor, roughness: 0.7 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 18
    body.castShadow = true
    group.add(body)

    const edges = new THREE.EdgesGeometry(bodyGeo)
    const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#000' }))
    body.add(outline)

    // Head
    const headGeo = new THREE.SphereGeometry(6, 16, 16)
    const headMat = new THREE.MeshStandardMaterial({ color: '#fbcfe8' })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 32
    head.castShadow = true
    group.add(head)

    // Name tag sprite
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 72
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.roundRect(8, 8, 240, 56, 12)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = 'bold 20px "Varela Round", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(w.name, 128, 34)
    ctx.font = 'bold 16px "JetBrains Mono", sans-serif'
    ctx.fillStyle = w.hesitation <= 30 ? '#10b981' : w.hesitation >= 70 ? '#ef4444' : '#f59e0b'
    ctx.fillText(w.hesitation <= 30 ? 'READY TO HELP' : `FEAR: ${w.hesitation}%`, 128, 54)

    const tagTexture = new THREE.CanvasTexture(canvas)
    const tagMat = new THREE.SpriteMaterial({ map: tagTexture })
    const tagSprite = new THREE.Sprite(tagMat)
    tagSprite.position.y = 48
    tagSprite.scale.set(42, 12, 1)
    tagSprite.name = 'tagSprite'
    group.add(tagSprite)

    group.userData = { type: 'npc', id: w.id }
    return group
  }

  /**
   * Creates the 3D Accident scene with fallen scooter, victim, and damaged sedan
   */
  private createVictimSceneMesh(level: LevelConfig): THREE.Group {
    const group = new THREE.Group()

    // Victim lying on road
    const victimGeo = new THREE.BoxGeometry(28, 6, 12)
    const victimMat = new THREE.MeshStandardMaterial({ color: '#38bdf8' })
    const victim = new THREE.Mesh(victimGeo, victimMat)
    victim.position.set(0, 3, 0)
    victim.castShadow = true
    group.add(victim)

    // Head
    const headGeo = new THREE.SphereGeometry(5, 12, 12)
    const headMat = new THREE.MeshStandardMaterial({ color: '#ffd1a4' })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.set(18, 3, 0)
    group.add(head)

    // Red Crash Scooter
    const scooterGeo = new THREE.BoxGeometry(24, 10, 8)
    const scooterMat = new THREE.MeshStandardMaterial({ color: '#ef4444' })
    const scooter = new THREE.Mesh(scooterGeo, scooterMat)
    scooter.position.set(-24, 5, -8)
    scooter.rotation.z = -0.5
    scooter.castShadow = true
    group.add(scooter)

    // Floating Overhead Emergency Beacon
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 72
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#dc2626'
    ctx.roundRect(10, 10, 236, 52, 12)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.font = 'bold 20px "Bungee", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText('CRITICAL VICTIM [E]', 128, 42)

    const tagTexture = new THREE.CanvasTexture(canvas)
    const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture }))
    tagSprite.position.y = 28
    tagSprite.scale.set(48, 14, 1)
    group.add(tagSprite)

    group.position.set(level.victimPos.x - level.mapWidth / 2, 0, level.victimPos.y - level.mapHeight / 2)
    group.userData = { type: 'victim', id: 'victim' }
    return group
  }

  /**
   * Creates 3D Environmental Props (Dhaba, Traffic signal, Auto, Bank)
   */
  private createEnvironmentMesh(env: EnvironmentalElement): THREE.Group {
    const group = new THREE.Group()

    if (env.type === 'dhaba_cctv') {
      // 3D Dhaba roadside stall with wooden roof
      const buildingGeo = new THREE.BoxGeometry(env.width, 45, env.height)
      const buildingMat = new THREE.MeshStandardMaterial({ color: '#b45309' })
      const building = new THREE.Mesh(buildingGeo, buildingMat)
      building.position.y = 22.5
      building.castShadow = true
      building.receiveShadow = true
      group.add(building)

      // Canopy roof
      const roofGeo = new THREE.BoxGeometry(env.width + 12, 6, env.height + 12)
      const roofMat = new THREE.MeshStandardMaterial({ color: '#dc2626' })
      const roof = new THREE.Mesh(roofGeo, roofMat)
      roof.position.y = 48
      roof.castShadow = true
      group.add(roof)
    } else if (env.type === 'traffic_signal') {
      // 3D Traffic Signal Post
      const poleGeo = new THREE.CylinderGeometry(2, 2, 60, 8)
      const poleMat = new THREE.MeshStandardMaterial({ color: '#334155' })
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = 30
      pole.castShadow = true
      group.add(pole)

      const boxGeo = new THREE.BoxGeometry(16, 32, 14)
      const boxMat = new THREE.MeshStandardMaterial({ color: '#0f172a' })
      const box = new THREE.Mesh(boxGeo, boxMat)
      box.position.y = 50
      box.castShadow = true
      group.add(box)
    } else if (env.type === 'auto_rickshaw') {
      // 3D CNG Auto-Rickshaw
      const autoGeo = new THREE.BoxGeometry(40, 28, 26)
      const autoMat = new THREE.MeshStandardMaterial({ color: '#15803d' }) // Green
      const auto = new THREE.Mesh(autoGeo, autoMat)
      auto.position.y = 16
      auto.castShadow = true
      group.add(auto)

      const roofGeo = new THREE.BoxGeometry(42, 6, 28)
      const roofMat = new THREE.MeshStandardMaterial({ color: '#facc15' }) // Yellow roof
      const aRoof = new THREE.Mesh(roofGeo, roofMat)
      aRoof.position.y = 31
      group.add(aRoof)
    } else if (env.type === 'ambulance_lane') {
      // 3D Emergency ambulance lane ground decal
      const laneCanvas = document.createElement('canvas')
      laneCanvas.width = 256
      laneCanvas.height = 128
      const lctx = laneCanvas.getContext('2d')!
      lctx.fillStyle = 'rgba(34, 197, 94, 0.22)'
      lctx.fillRect(0, 0, 256, 128)
      lctx.strokeStyle = '#22c55e'
      lctx.lineWidth = 6
      lctx.setLineDash([16, 12])
      lctx.strokeRect(6, 6, 244, 116)
      lctx.fillStyle = '#166534'
      lctx.font = 'bold 22px sans-serif'
      lctx.textAlign = 'center'
      lctx.fillText('AMBULANCE LANE 🚑', 128, 70)

      const laneTex = new THREE.CanvasTexture(laneCanvas)
      const laneGeo = new THREE.PlaneGeometry(env.width, env.height)
      const laneMat = new THREE.MeshBasicMaterial({ map: laneTex, transparent: true })
      const laneMesh = new THREE.Mesh(laneGeo, laneMat)
      laneMesh.rotation.x = -Math.PI / 2
      laneMesh.position.y = 0.5
      group.add(laneMesh)

      // Saboteur roadblock barricade
      const barricade = new THREE.Group()
      barricade.name = 'saboteurBarricade'
      const plankGeo = new THREE.BoxGeometry(env.width * 0.75, 14, 4)
      const plankMat = new THREE.MeshStandardMaterial({ color: '#ea580c' })
      const plank = new THREE.Mesh(plankGeo, plankMat)
      plank.position.y = 12
      barricade.add(plank)

      const standGeo = new THREE.CylinderGeometry(2, 2, 22, 8)
      const standMat = new THREE.MeshStandardMaterial({ color: '#1e293b' })
      const s1 = new THREE.Mesh(standGeo, standMat)
      s1.position.set(-env.width * 0.3, 11, 0)
      const s2 = new THREE.Mesh(standGeo, standMat)
      s2.position.set(env.width * 0.3, 11, 0)
      barricade.add(s1, s2)

      const bCanvas = document.createElement('canvas')
      bCanvas.width = 256
      bCanvas.height = 64
      const bctx = bCanvas.getContext('2d')!
      bctx.fillStyle = '#dc2626'
      bctx.roundRect(8, 8, 240, 48, 8)
      bctx.fill()
      bctx.fillStyle = '#ffffff'
      bctx.font = 'bold 20px sans-serif'
      bctx.textAlign = 'center'
      bctx.fillText('ROAD HAZARD [Clear]', 128, 38)
      const bTex = new THREE.CanvasTexture(bCanvas)
      const bSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bTex }))
      bSprite.position.y = 30
      bSprite.scale.set(38, 9, 1)
      barricade.add(bSprite)

      barricade.visible = !!env.tamperedBySaboteur
      group.add(barricade)
    } else {
      // General 3D Machine/Structure
      const boxGeo = new THREE.BoxGeometry(env.width, 36, env.height)
      const boxMat = new THREE.MeshStandardMaterial({ color: '#475569' })
      const box = new THREE.Mesh(boxGeo, boxMat)
      box.position.y = 18
      box.castShadow = true
      group.add(box)
    }

    group.userData = { type: 'env', id: env.id }
    return group
  }

  /**
   * 3D Animated Objective Beacon (pulsing cyan cone & rings)
   */
  private createObjectiveBeaconMesh(): THREE.Group {
    const group = new THREE.Group()

    // Downward pointing arrow cone
    const coneGeo = new THREE.ConeGeometry(12, 24, 16)
    const coneMat = new THREE.MeshBasicMaterial({ color: '#0284c7' })
    const cone = new THREE.Mesh(coneGeo, coneMat)
    cone.rotation.x = Math.PI // Point down
    cone.position.y = 40
    group.add(cone)

    // Ground Ring
    const ringGeo = new THREE.RingGeometry(18, 24, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: '#0284c7', side: THREE.DoubleSide })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 2
    group.add(ring)

    return group
  }

  /**
   * Pointer down handler: raycast against entities or ground for 1-click movement & interaction!
   */
  private onPointerDown = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 1. Raycast against clickable entities
    const entityTargets: THREE.Object3D[] = [
      this.victimMesh,
      this.saboteurMesh,
      ...Array.from(this.witnessMeshes.values()),
      ...Array.from(this.environmentMeshes.values())
    ]

    const intersects = this.raycaster.intersectObjects(entityTargets, true)
    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object
      while (topObj && !topObj.userData?.type) {
        topObj = topObj.parent
      }
      if (topObj && topObj.userData?.type) {
        this.callbacks.onEntityClick(topObj.userData.type, topObj.userData.id)
        return
      }
    }

    // 2. Raycast against ground for Click-to-Move
    const groundHits = this.raycaster.intersectObject(this.groundMesh)
    if (groundHits.length > 0) {
      const pt = groundHits[0].point
      // Convert Three.js 3D coords back to 2D game map coordinates
      const mapX = pt.x + 600 // level.mapWidth / 2
      const mapY = pt.z + 400 // level.mapHeight / 2
      this.callbacks.onGroundClick(mapX, mapY)
    }
  }

  /**
   * 60 FPS update loop: updates positions, camera tracking, lights, and animations
   */
  public update(
    rescuerState: PlayerState,
    saboteurState: PlayerState,
    witnesses: WitnessNPC[],
    environment: EnvironmentalElement[],
    activeRole: Role,
    rescueChain: RescueChainStep[],
    level: LevelConfig
  ) {
    this.tick++

    const halfW = level.mapWidth / 2
    const halfH = level.mapHeight / 2

    // 1. Update Rescuer 3D Position
    this.rescuerMesh.position.set(rescuerState.x - halfW, 0, rescuerState.y - halfH)
    if (rescuerState.isMoving) {
      const legSwing = Math.sin(this.tick * 0.35) * 0.6
      const leftLeg = this.rescuerMesh.getObjectByName('leftLeg')
      const rightLeg = this.rescuerMesh.getObjectByName('rightLeg')
      if (leftLeg) leftLeg.rotation.x = legSwing
      if (rightLeg) rightLeg.rotation.x = -legSwing
    }

    // 2. Update Saboteur 3D Position
    this.saboteurMesh.position.set(saboteurState.x - halfW, 0, saboteurState.y - halfH)
    if (saboteurState.isMoving) {
      const legSwing = Math.sin(this.tick * 0.35) * 0.6
      const leftLeg = this.saboteurMesh.getObjectByName('leftLeg')
      const rightLeg = this.saboteurMesh.getObjectByName('rightLeg')
      if (leftLeg) leftLeg.rotation.x = legSwing
      if (rightLeg) rightLeg.rotation.x = -legSwing
    }

    // 3. Update Witnesses 3D Positions
    for (const w of witnesses) {
      const mesh = this.witnessMeshes.get(w.id)
      if (mesh) {
        mesh.position.set(w.x - halfW, 0, w.y - halfH)
      }
    }

    // 4. Update Environment Props & Saboteur Roadblocks
    for (const env of environment) {
      const mesh = this.environmentMeshes.get(env.id)
      if (mesh) {
        mesh.position.set(env.x + env.width / 2 - halfW, 0, env.y + env.height / 2 - halfH)
        const barricade = mesh.getObjectByName('saboteurBarricade')
        if (barricade) {
          barricade.visible = !!env.tamperedBySaboteur
        }
      }
    }

    // 5. Update Placed Traffic Cones in 3D
    // Rebuild cone meshes if count changed
    if (this.coneMeshes.length !== rescuerState.placedCones.length) {
      for (const cm of this.coneMeshes) this.scene.remove(cm)
      this.coneMeshes = []
      for (const cone of rescuerState.placedCones) {
        const cGroup = new THREE.Group()
        const coneGeo = new THREE.ConeGeometry(8, 22, 12)
        const coneMat = new THREE.MeshStandardMaterial({ color: '#f97316' })
        const cMesh = new THREE.Mesh(coneGeo, coneMat)
        cMesh.position.y = 11
        cMesh.castShadow = true
        cGroup.add(cMesh)
        cGroup.position.set(cone.x - halfW, 0, cone.y - halfH)
        this.scene.add(cGroup)
        this.coneMeshes.push(cGroup)
      }
    }

    // 6. Smooth Camera Tracking following active player
    const targetPlayer = activeRole === 'rescuer' ? rescuerState : saboteurState
    const targetX = targetPlayer.x - halfW
    const targetZ = targetPlayer.y - halfH

    this.camera.position.x += (targetX - this.camera.position.x) * 0.08
    this.camera.position.z += (targetZ + 320 - this.camera.position.z) * 0.08
    this.camera.lookAt(this.camera.position.x, 0, this.camera.position.z - 300)

    // 7. Flashing 108 Emergency Ambulance Lights
    const flash = Math.floor(this.tick / 12) % 2 === 0
    this.ambulanceLightRed.intensity = flash ? 3 : 0.2
    this.ambulanceLightBlue.intensity = !flash ? 3 : 0.2
    this.ambulanceLightRed.position.set(380 - halfW, 30, 480 - halfH)
    this.ambulanceLightBlue.position.set(400 - halfW, 30, 480 - halfH)

    // 8. Update Objective 3D Waypoint Beacon
    const pendingStep = rescueChain.find((s) => !s.completed)
    if (pendingStep) {
      this.objectiveBeacon.visible = true
      let objX = level.victimPos.x
      let objY = level.victimPos.y
      if (pendingStep.stepNumber === 2) {
        const sharma = witnesses.find((w) => w.id === 'w1')
        objX = sharma ? sharma.x : 280
        objY = sharma ? sharma.y : 320
      } else if (pendingStep.stepNumber === 3) {
        objX = 800
        objY = 480
      } else if (pendingStep.stepNumber === 4) {
        objX = 360
        objY = 540
      } else if (pendingStep.stepNumber === 5) {
        objX = level.exitPos.x
        objY = level.exitPos.y
      }

      this.objectiveBeacon.position.set(objX - halfW, 0, objY - halfH)
      this.objectiveBeacon.rotation.y = this.tick * 0.04
      const bBounce = Math.sin(this.tick * 0.12) * 6
      const cone = this.objectiveBeacon.children[0]
      if (cone) cone.position.y = 42 + bBounce

      // Update 3D Breadcrumb Line
      const pts = [
        new THREE.Vector3(rescuerState.x - halfW, 2, rescuerState.y - halfH),
        new THREE.Vector3(objX - halfW, 2, objY - halfH)
      ]
      this.breadcrumbLine.geometry.setFromPoints(pts)
      this.breadcrumbLine.computeLineDistances()
      this.breadcrumbLine.visible = true
    } else {
      this.objectiveBeacon.visible = false
      this.breadcrumbLine.visible = false
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera)
  }

  private onWindowResize = () => {
    if (!this.container) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  public destroy() {
    window.removeEventListener('resize', this.onWindowResize)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
    this.renderer.dispose()
  }
}

