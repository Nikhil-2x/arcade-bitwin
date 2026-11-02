import type { 
  LevelConfig, 
  WitnessNPC, 
  EnvironmentalElement, 
  PlayerState, 
  Role,
  RescueChainStep
} from '../types.ts'

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  level: LevelConfig
  rescuerState: PlayerState
  saboteurState: PlayerState
  witnesses: WitnessNPC[]
  environment: EnvironmentalElement[]
  activeRole: Role
  timeRemainingSec: number
  animationTick: number
  rescueChain: RescueChainStep[]
  selectedWitnessId?: string
  nearbyTarget?: { type: 'npc' | 'victim' | 'env' | 'cone' | 'fact'; id: string; name: string }
  saboteurShout?: { text: string; timer: number }
  clickMoveTarget?: { x: number; y: number } | null
}

export function renderDiorama(rc: RenderContext) {
  const { ctx, width, height, level, rescuerState, saboteurState, witnesses, environment, activeRole, animationTick, rescueChain, clickMoveTarget } = rc

  ctx.clearRect(0, 0, width, height)

  // 1. Camera transform (smoothly tracking the active player)
  const focusPlayer = activeRole === 'rescuer' ? rescuerState : saboteurState
  const cameraX = Math.max(0, Math.min(level.mapWidth - width, focusPlayer.x - width / 2))
  const cameraY = Math.max(0, Math.min(level.mapHeight - height, focusPlayer.y - height / 2))

  ctx.save()
  ctx.translate(-cameraX, -cameraY)

  // 2. Draw Ground, Sidewalks, Asphalt Roads, Crosswalks
  drawRichIsometricEnvironment(ctx, level, rc)

  // 3. Draw Active Objective Waypoint & Guiding Path
  drawObjectiveBeaconAndPath(ctx, rc)

  // 4. Click-to-move destination marker
  if (clickMoveTarget) {
    drawClickDestination(ctx, clickMoveTarget.x, clickMoveTarget.y, animationTick)
  }

  // 5. Y-Sorted Entity Rendering (Isometric Depth)
  const renderList: Array<{ y: number; render: () => void }> = []

  // Buildings & Environment Props
  for (const env of environment) {
    renderList.push({
      y: env.y + env.height,
      render: () => drawRichEnvironmentProp(ctx, env, level, rc)
    })
  }

  // Victim & Crash Scene
  renderList.push({
    y: level.victimPos.y + 18,
    render: () => drawRichVictimScene(ctx, level, rc)
  })

  // Placed Warning Cones
  for (const cone of rescuerState.placedCones) {
    renderList.push({
      y: cone.y + 12,
      render: () => drawTrafficCone(ctx, cone.x, cone.y, animationTick)
    })
  }

  // Witnesses / NPCs
  for (const w of witnesses) {
    renderList.push({
      y: w.y + 26,
      render: () => drawRichNPC(ctx, w, level, rc)
    })
  }

  // Rescuer
  renderList.push({
    y: rescuerState.y + 26,
    render: () => drawRichCharacter(ctx, rescuerState.x, rescuerState.y, 'rescuer', rescuerState, rc)
  })

  // Saboteur
  if (saboteurState.blendInActiveTimer <= 0 || activeRole === 'saboteur') {
    renderList.push({
      y: saboteurState.y + 26,
      render: () => drawRichCharacter(ctx, saboteurState.x, saboteurState.y, 'saboteur', saboteurState, rc)
    })
  }

  // Sort by Y for 3/4 Isometric Depth
  renderList.sort((a, b) => a.y - b.y)

  for (const item of renderList) {
    item.render()
  }

  // 6. Floating Saboteur Speech/Rumor Bubble
  if (rc.saboteurShout && rc.saboteurShout.timer > 0) {
    drawSaboteurRumorBubble(ctx, saboteurState.x, saboteurState.y, rc.saboteurShout.text, rc.animationTick)
  }

  // 7. Ambient Lighting & Streetlights
  drawStreetlightsAndAtmosphere(ctx, level, rc)

  ctx.restore()

  // 8. Screen Edge Compass Arrow pointing to Current Objective if off-screen
  drawOffscreenObjectiveArrow(rc, cameraX, cameraY)
}

/**
 * Renders textured roads, sidewalks, pedestrian crossings, and grass verges
 */
function drawRichIsometricEnvironment(ctx: CanvasRenderingContext2D, level: LevelConfig, rc: RenderContext) {
  // Ground grass/pavement
  ctx.fillStyle = level.palette.ground
  ctx.fillRect(0, 0, level.mapWidth, level.mapHeight)

  // Subtle isometric tile grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.lineWidth = 1
  for (let x = 0; x < level.mapWidth; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, level.mapHeight)
    ctx.stroke()
  }
  for (let y = 0; y < level.mapHeight; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(level.mapWidth, y)
    ctx.stroke()
  }

  if (level.id === 1) {
    // 4-WAY HIGHWAY JUNCTION
    // Main east-west highway
    ctx.fillStyle = '#222831'
    ctx.fillRect(0, 350, level.mapWidth, 200)

    // Crossing north-south avenue
    ctx.fillRect(470, 0, 200, level.mapHeight)

    // Textured asphalt grain dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    for (let i = 0; i < 200; i++) {
      const rx = (i * 97) % level.mapWidth
      const ry = 350 + (i * 53) % 200
      ctx.fillRect(rx, ry, 2, 2)
    }

    // Curbs & Sidewalks with 3D bevels
    draw3DCurb(ctx, 0, 335, 470, 15)
    draw3DCurb(ctx, 670, 335, level.mapWidth - 670, 15)
    draw3DCurb(ctx, 0, 550, 470, 15)
    draw3DCurb(ctx, 670, 550, level.mapWidth - 670, 15)

    // Double solid yellow center divider
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 448)
    ctx.lineTo(470, 448)
    ctx.moveTo(670, 448)
    ctx.lineTo(level.mapWidth, 448)
    ctx.moveTo(0, 454)
    ctx.lineTo(470, 454)
    ctx.moveTo(670, 454)
    ctx.lineTo(level.mapWidth, 454)
    ctx.stroke()

    // Crosswalk Zebra Stripes
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(485 + i * 22, 365, 14, 170)
    }

    // Emergency Corridor Zone
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)'
    ctx.fillRect(670, 460, level.mapWidth - 670, 80)
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 3
    ctx.setLineDash([16, 12])
    ctx.strokeRect(670, 460, level.mapWidth - 670, 80)
    ctx.setLineDash([])

    // Painted Road Stencil
    ctx.font = '700 14px "JetBrains Mono", sans-serif'
    ctx.fillStyle = '#f59e0b'
    ctx.fillText('⚡ 108 AMBULANCE ONLY — PENALTY ₹10,000 (s.194E)', 720, 506)

  } else if (level.id === 2) {
    // BAZAAR MARKET STREETS
    ctx.fillStyle = '#2d1b4e'
    ctx.fillRect(80, 220, level.mapWidth - 160, 180)
    ctx.fillRect(80, 480, level.mapWidth - 160, 180)
    ctx.fillRect(490, 60, 200, level.mapHeight - 120)

    // Bazaar colorful shop walkways
    ctx.fillStyle = '#4a287a'
    ctx.fillRect(80, 205, level.mapWidth - 160, 15)
    ctx.fillRect(80, 400, level.mapWidth - 160, 15)
  } else {
    // STATION HOUSE COURTYARD
    ctx.fillStyle = '#1e382b'
    ctx.fillRect(120, 280, 960, 280)
    ctx.fillRect(380, 80, 240, level.mapHeight - 160)

    // Flagpole courtyard circle
    ctx.fillStyle = '#2d5a45'
    ctx.beginPath()
    ctx.arc(600, 420, 70, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function draw3DCurb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Top curb face
  ctx.fillStyle = '#64748b'
  ctx.fillRect(x, y, w, h)
  // 3D vertical face
  ctx.fillStyle = '#334155'
  ctx.fillRect(x, y + h, w, 5)
  // Highlighting edge
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(x, y, w, 2)
}

/**
 * Draws the active mission beacon and glowing breadcrumb path from player to target!
 */
function drawObjectiveBeaconAndPath(ctx: CanvasRenderingContext2D, rc: RenderContext) {
  const { rescuerState, rescueChain, level, animationTick } = rc

  // Determine current pending step
  const activeStep = rescueChain.find((s) => !s.completed)
  if (!activeStep) return

  let targetPos = { x: level.victimPos.x, y: level.victimPos.y }
  let targetLabel = 'ASSESS VICTIM'

  if (activeStep.stepNumber === 1) {
    targetPos = { x: level.victimPos.x, y: level.victimPos.y }
    targetLabel = 'STEP 1: INSPECT INJURIES (PRESS E)'
  } else if (activeStep.stepNumber === 2) {
    // Target Sharma or landline
    const sharma = rc.witnesses.find((w) => w.id === 'w1')
    targetPos = sharma ? { x: sharma.x, y: sharma.y } : { x: 300, y: 320 }
    targetLabel = 'STEP 2: TALK TO SHARMA TO CALL 112'
  } else if (activeStep.stepNumber === 3) {
    targetPos = { x: 800, y: 480 }
    targetLabel = 'STEP 3: PLACE 3 CONES IN LANE (KEY C)'
  } else if (activeStep.stepNumber === 4) {
    targetPos = { x: 380, y: 530 }
    targetLabel = 'STEP 4: GET AUTO/AMBULANCE TRANSPORT'
  } else if (activeStep.stepNumber === 5) {
    targetPos = { x: level.exitPos.x, y: level.exitPos.y }
    targetLabel = 'STEP 5: CITY HOSPITAL GATE'
  }

  // 1. Draw glowing dashed breadcrumb path
  ctx.save()
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'
  ctx.lineWidth = 3
  ctx.setLineDash([10, 8])
  ctx.lineDashOffset = -animationTick * 0.8
  ctx.beginPath()
  ctx.moveTo(rescuerState.x, rescuerState.y)
  ctx.lineTo(targetPos.x, targetPos.y)
  ctx.stroke()
  ctx.restore()

  // 2. Draw Pulsating Ground Target Rings
  const pulse = (Math.sin(animationTick * 0.1) + 1) * 0.5
  ctx.save()
  ctx.translate(targetPos.x, targetPos.y)

  // Outer glow ring
  ctx.fillStyle = `rgba(56, 189, 248, ${0.15 + pulse * 0.2})`
  ctx.beginPath()
  ctx.ellipse(0, 10, 42 + pulse * 14, 18 + pulse * 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Inner ring
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(0, 10, 28, 12, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Floating 3D Bouncing Arrow
  const arrowBounce = Math.sin(animationTick * 0.15) * 8
  ctx.translate(0, -60 + arrowBounce)

  // Arrow Head
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.moveTo(0, 12)
  ctx.lineTo(-12, -8)
  ctx.lineTo(12, -8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()

  // Arrow Shaft
  ctx.fillStyle = '#38bdf8'
  ctx.fillRect(-4, -24, 8, 16)
  ctx.strokeRect(-4, -24, 8, 16)

  // Floating Label Banner
  ctx.font = '700 12px "Bungee", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 6
  ctx.fillText(targetLabel, 0, -32)

  ctx.restore()
}

/**
 * Click-to-move destination ripple
 */
function drawClickDestination(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const ripple = (tick % 30) / 30
  ctx.save()
  ctx.strokeStyle = `rgba(245, 158, 11, ${1 - ripple})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.ellipse(x, y, 12 + ripple * 20, 6 + ripple * 10, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/**
 * Draws the crash scene: damaged car, victim, helmet, medical beacon
 */
function drawRichVictimScene(ctx: CanvasRenderingContext2D, level: LevelConfig, rc: RenderContext) {
  const { x, y } = level.victimPos

  // 1. Dented fleeing driver's car (parked awkwardly near junction)
  if (level.id === 1) {
    ctx.save()
    ctx.translate(410, 390)
    // Car Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.beginPath()
    ctx.ellipse(0, 15, 60, 22, 0, 0, Math.PI * 2)
    ctx.fill()

    // Car Body (dark sedan with dented front bumper)
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.roundRect(-48, -20, 96, 36, 8)
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.stroke()

    // Windshield & windows
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.roundRect(-22, -16, 44, 24, 4)
    ctx.fill()

    // Damaged Front Bumper (Left side dented)
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.moveTo(48, -12)
    ctx.lineTo(44, 4)
    ctx.lineTo(48, 14)
    ctx.stroke()

    // Blinking Hazard Lights (flashing orange)
    const hazardOn = Math.floor(rc.animationTick / 15) % 2 === 0
    if (hazardOn) {
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(48, -14, 5, 0, Math.PI * 2)
      ctx.arc(48, 14, 5, 0, Math.PI * 2)
      ctx.arc(-48, -14, 5, 0, Math.PI * 2)
      ctx.arc(-48, 14, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // 2. Fallen Scooter
  if (level.id === 1) {
    ctx.save()
    ctx.translate(x - 34, y - 12)
    ctx.rotate(-0.55)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(-18, -8, 36, 16)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.5
    ctx.strokeRect(-18, -8, 36, 16)
    // Wheels
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(-14, 10, 8, 0, Math.PI * 2)
    ctx.arc(14, 10, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // 3. Injured Person (Drawn with care, non-violent cartoon illustration)
  ctx.save()
  ctx.translate(x, y)

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(0, 8, 32, 12, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body lying down
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.roundRect(-22, -6, 44, 14, 4)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // Head
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.arc(26, 0, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Helmet resting beside safely
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.arc(36, -16, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Pulsing Emergency Beacon
  const pulse = (Math.sin(rc.animationTick * 0.1) + 1) * 0.5
  ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.5})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 36 + pulse * 14, 0, Math.PI * 2)
  ctx.stroke()

  // First Aid Clean Dressing if assisted
  const isAssessed = rc.rescueChain[0]?.completed
  if (isAssessed) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-4, -5, 10, 10)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(0, -5, 2, 10)
    ctx.fillRect(-4, -1, 10, 2)
  }

  ctx.restore()
}

/**
 * Draws traffic cones with bright reflective stripes
 */
function drawTrafficCone(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  ctx.save()
  ctx.translate(x, y)

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 4, 14, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Base
  ctx.fillStyle = '#ea580c'
  ctx.fillRect(-10, -3, 20, 6)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 2
  ctx.strokeRect(-10, -3, 20, 6)

  // Cone Body
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(-8, -3)
  ctx.lineTo(8, -3)
  ctx.lineTo(0, -26)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Reflective White Bands
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(-5, -12)
  ctx.lineTo(5, -12)
  ctx.lineTo(3, -18)
  ctx.lineTo(-3, -18)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

/**
 * Renders characters with animated walking limbs, distinctive styling, and status
 */
function drawRichCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  role: Role,
  state: PlayerState,
  rc: RenderContext
) {
  const isRescuer = role === 'rescuer'
  const isMoving = state.isMoving
  const walkBobble = isMoving ? Math.sin(rc.animationTick * 0.3) * 3 : 0
  const legSwing = isMoving ? Math.sin(rc.animationTick * 0.3) * 6 : 0

  ctx.save()
  ctx.translate(x, y)

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 6, 16, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Walking Legs
  ctx.fillStyle = isRescuer ? '#1e3a8a' : '#1e293b'
  ctx.fillRect(-7 + legSwing, 0, 5, 9)
  ctx.fillRect(2 - legSwing, 0, 5, 9)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5
  ctx.strokeRect(-7 + legSwing, 0, 5, 9)
  ctx.strokeRect(2 - legSwing, 0, 5, 9)

  // Torso
  ctx.translate(0, -walkBobble)
  ctx.fillStyle = isRescuer ? '#2563eb' : '#475569'
  ctx.beginPath()
  ctx.roundRect(-11, -20, 22, 21, 4)
  ctx.fill()
  ctx.strokeStyle = '#090d16'
  ctx.lineWidth = 2.5
  ctx.stroke()

  if (isRescuer) {
    // Heroic Emerald Scarf & Cross
    ctx.fillStyle = '#10b981'
    ctx.fillRect(-9, -19, 18, 6)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-2, -12, 4, 10)
  } else {
    // Saboteur Collar
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(-9, -19, 18, 6)
  }

  // Head
  ctx.fillStyle = '#ffd1a4'
  ctx.beginPath()
  ctx.arc(0, -28, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Headwear / Cap
  if (isRescuer) {
    ctx.fillStyle = '#1d4ed8'
    ctx.beginPath()
    ctx.arc(0, -31, 9, Math.PI, 0)
    ctx.fill()
    ctx.stroke()
  } else {
    // Dark flat cap & sunglasses
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(-10, -35, 20, 6)
    ctx.fillRect(-6, -29, 12, 4)
  }

  // Directional Eyes
  let eyeX = 0
  if (state.facing === 'left') eyeX = -4
  if (state.facing === 'right') eyeX = 4
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(eyeX, -28, 1.8, 0, Math.PI * 2)
  ctx.fill()

  // Called Out Stun Aura
  if (!isRescuer && state.isCalledOut) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.arc(0, -14, 28, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.font = '700 12px "Bungee", sans-serif'
    ctx.fillStyle = '#ef4444'
    ctx.textAlign = 'center'
    ctx.fillText('🚨 EXPOSED / STUNNED!', 0, -48)
  }

  // Floating Player Overhead Role Tag
  ctx.font = '700 11px "Bungee", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = isRescuer ? '#38bdf8' : '#f43f5e'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 4
  ctx.fillText(isRescuer ? 'YOU (RESCUER)' : 'SABOTEUR', 0, -42)

  ctx.restore()
}

/**
 * Draws lively NPCs with clothes, thought bubbles, and names
 */
function drawRichNPC(
  ctx: CanvasRenderingContext2D,
  w: WitnessNPC,
  level: LevelConfig,
  rc: RenderContext
) {
  const bobble = Math.sin((rc.animationTick + w.x) * 0.06) * 1.5

  ctx.save()
  ctx.translate(w.x, w.y)

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 5, 15, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  // Golden Resolute Aura if inoculated
  if (w.resoluteTimer && w.resoluteTimer > 0) {
    ctx.strokeStyle = '#eab308'
    ctx.lineWidth = 3
    ctx.fillStyle = 'rgba(234, 179, 8, 0.15)'
    ctx.beginPath()
    ctx.arc(0, -12, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // Body
  ctx.translate(0, -bobble)
  ctx.fillStyle = w.avatarColor
  ctx.beginPath()
  ctx.roundRect(-10, -18, 20, 20, 4)
  ctx.fill()
  ctx.strokeStyle = '#090d16'
  ctx.lineWidth = 2.4
  ctx.stroke()

  // Head
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.arc(0, -25, 8.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Distinct Hair / Turban
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.arc(0, -28, 8.5, Math.PI, 0)
  ctx.fill()

  // Active Task Progress Bar
  if (w.status === 'tasked' && w.taskProgress !== undefined) {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(-22, 12, 44, 7)
    ctx.fillStyle = '#10b981'
    ctx.fillRect(-22, 12, 44 * (w.taskProgress / 100), 7)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(-22, 12, 44, 7)
  }

  // Name Tag
  ctx.font = '700 11px "Varela Round", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 4
  ctx.fillText(w.name, 0, 26)

  // Floating Mind Bubble
  drawRichMindBubble(ctx, w, rc)

  ctx.restore()
}

function drawRichMindBubble(ctx: CanvasRenderingContext2D, w: WitnessNPC, rc: RenderContext) {
  let bubbleColor = '#f59e0b'
  let labelText = `${w.hesitation}%`
  let emoji = '🤔'

  if (w.hesitation <= 30) {
    bubbleColor = '#10b981'
    emoji = '🤝 WILLING'
    labelText = 'READY'
  } else if (w.hesitation >= 70) {
    bubbleColor = '#ef4444'
    emoji = '🤐 SILENT'
    labelText = 'FEAR'
  }

  if (w.status === 'tasked') {
    bubbleColor = '#3b82f6'
    emoji = '⚡ WORKING'
  }
  if (w.resoluteTimer && w.resoluteTimer > 0) {
    bubbleColor = '#eab308'
    emoji = '🛡️ RESOLUTE'
  }

  ctx.save()
  ctx.translate(0, -42)

  // Bubble Box
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = bubbleColor
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.roundRect(-30, -12, 60, 20, 6)
  ctx.fill()
  ctx.stroke()

  // Text
  ctx.font = '700 9px "JetBrains Mono", sans-serif'
  ctx.fillStyle = bubbleColor
  ctx.textAlign = 'center'
  ctx.fillText(emoji, 0, 2)

  ctx.restore()
}

/**
 * Draws floating red deceptions/rumor bubble over Saboteur
 */
function drawSaboteurRumorBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  tick: number
) {
  ctx.save()
  ctx.translate(x, y - 64)

  ctx.fillStyle = '#7f1d1d'
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.roundRect(-90, -16, 180, 28, 8)
  ctx.fill()
  ctx.stroke()

  // Tail
  ctx.beginPath()
  ctx.moveTo(-6, 12)
  ctx.lineTo(0, 18)
  ctx.lineTo(6, 12)
  ctx.fill()
  ctx.stroke()

  ctx.font = '700 10px "Varela Round", sans-serif'
  ctx.fillStyle = '#fef2f2'
  ctx.textAlign = 'center'
  ctx.fillText(`😈 "${text}"`, 0, 2)

  ctx.restore()
}

/**
 * Draws detailed 3D environment buildings, dhabas, traffic lights
 */
function drawRichEnvironmentProp(
  ctx: CanvasRenderingContext2D,
  env: EnvironmentalElement,
  level: LevelConfig,
  rc: RenderContext
) {
  ctx.save()
  ctx.translate(env.x, env.y)

  // Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(env.width / 2, env.height + 6, env.width / 2 + 8, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  if (env.type === 'traffic_signal') {
    // 3D Metal Pole & Housing
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(env.width / 2 - 4, env.height, 8, 30)
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(0, 0, env.width, env.height, 6)
    ctx.fill()
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 2
    ctx.stroke()

    // Lights
    const isRed = env.state === 'red'
    ctx.fillStyle = isRed ? '#ef4444' : '#1e293b'
    ctx.beginPath()
    ctx.arc(env.width / 2, env.height / 3, 10, 0, Math.PI * 2)
    ctx.fill()
    if (isRed) {
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 12
    }

    ctx.fillStyle = !isRed ? '#22c55e' : '#1e293b'
    ctx.beginPath()
    ctx.arc(env.width / 2, (env.height * 2) / 3, 10, 0, Math.PI * 2)
    ctx.fill()
  } else if (env.type === 'dhaba_cctv') {
    // Highway Dhaba Stall
    ctx.fillStyle = '#b45309'
    ctx.fillRect(0, 0, env.width, env.height)
    ctx.fillStyle = '#78350f'
    ctx.fillRect(0, env.height, env.width, 10) // 3D side
    // Canopy
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-6, -10, env.width + 12, 12)
    // Signboard
    ctx.font = '700 9px "Bungee", sans-serif'
    ctx.fillStyle = '#fef08a'
    ctx.textAlign = 'center'
    ctx.fillText('📹 CCTV DHABA', env.width / 2, env.height / 2 + 3)
  } else if (env.type === 'auto_rickshaw') {
    // Green & Yellow Indian Auto-Rickshaw
    ctx.fillStyle = '#eab308' // Yellow top
    ctx.beginPath()
    ctx.roundRect(0, 0, env.width, env.height * 0.45, 6)
    ctx.fill()
    ctx.fillStyle = '#15803d' // Green bottom
    ctx.beginPath()
    ctx.roundRect(0, env.height * 0.45, env.width, env.height * 0.55, 4)
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = '700 9px "JetBrains Mono", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText('AUTO-TAXI', env.width / 2, env.height / 2 + 3)
  } else {
    // General 3D Machine/Desk
    ctx.fillStyle = '#334155'
    ctx.fillRect(0, 0, env.width, env.height)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, env.height, env.width, 8)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, env.width, env.height)
    ctx.font = '700 9px "Varela Round", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(env.name.slice(0, 10), env.width / 2, env.height / 2 + 3)
  }

  ctx.restore()
}

/**
 * Draws atmospheric streetlights and twilight shadows
 */
function drawStreetlightsAndAtmosphere(
  ctx: CanvasRenderingContext2D,
  level: LevelConfig,
  rc: RenderContext
) {
  // Streetlights at 4 corners of junction
  const lights = [
    { x: 450, y: 320 },
    { x: 690, y: 320 },
    { x: 450, y: 560 },
    { x: 690, y: 560 }
  ]

  for (const light of lights) {
    const grad = ctx.createRadialGradient(light.x, light.y, 10, light.x, light.y, 120)
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.25)')
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(light.x, light.y, 120, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Screen edge pointer if current objective is off-screen!
 */
function drawOffscreenObjectiveArrow(rc: RenderContext, camX: number, camY: number) {
  const { width, height, level, rescuerState, rescueChain } = rc
  const activeStep = rescueChain.find((s) => !s.completed)
  if (!activeStep) return

  let targetX = level.victimPos.x
  let targetY = level.victimPos.y
  if (activeStep.stepNumber === 3) {
    targetX = 800
    targetY = 480
  } else if (activeStep.stepNumber === 5) {
    targetX = level.exitPos.x
    targetY = level.exitPos.y
  }

  // Check if target is inside screen viewport
  const screenX = targetX - camX
  const screenY = targetY - camY

  const isOffscreen = screenX < 50 || screenX > width - 50 || screenY < 80 || screenY > height - 80
  if (!isOffscreen) return

  // Draw arrow pinned to screen border
  const angle = Math.atan2(targetY - rescuerState.y, targetX - rescuerState.x)
  const edgeMargin = 40
  const pinnedX = Math.max(edgeMargin, Math.min(width - edgeMargin, width / 2 + Math.cos(angle) * (width / 2 - edgeMargin)))
  const pinnedY = Math.max(edgeMargin + 60, Math.min(height - edgeMargin, height / 2 + Math.sin(angle) * (height / 2 - edgeMargin)))

  rc.ctx.save()
  rc.ctx.translate(pinnedX, pinnedY)
  rc.ctx.rotate(angle)

  rc.ctx.fillStyle = '#38bdf8'
  rc.ctx.beginPath()
  rc.ctx.moveTo(14, 0)
  rc.ctx.lineTo(-10, -10)
  rc.ctx.lineTo(-10, 10)
  rc.ctx.closePath()
  rc.ctx.fill()
  rc.ctx.strokeStyle = '#ffffff'
  rc.ctx.lineWidth = 2
  rc.ctx.stroke()

  rc.ctx.restore()
}
