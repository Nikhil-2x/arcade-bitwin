import * as THREE from 'three'
import type { NPCState, NPCPhysicalReaction } from '../network/milestone2Types.ts'

export class NPCModel {
  public group: THREE.Group
  public id: string
  public name: string
  public roleTitle: string

  private bodyMesh: THREE.Mesh
  private headMesh: THREE.Mesh
  private nametagSprite: THREE.Sprite
  private statusSprite: THREE.Sprite

  private leftArm: THREE.Mesh
  private rightArm: THREE.Mesh
  private leftLeg: THREE.Mesh
  private rightLeg: THREE.Mesh

  public currentFacingYaw: number = 0
  public isWalking: boolean = false
  public isSitting: boolean = false

  // Procedural Animation State
  private walkPhase: number = 0
  private reactionTimeRemaining: number = 0
  public activeReaction: NPCPhysicalReaction = 'idle'
  private idlePhase: number = Math.random() * Math.PI * 2

  constructor(npcState: NPCState) {
    this.id = npcState.id
    this.name = npcState.name
    this.roleTitle = npcState.roleTitle
    this.currentFacingYaw = npcState.facingYaw
    this.isSitting = npcState.id === 'npc_arjun'
    this.group = new THREE.Group()

    let bodyColor = 0x3b82f6
    let pantsColor = 0x1e293b
    let accentColor = 0xf59e0b

    if (npcState.id === 'npc_arjun') {
      bodyColor = 0xef4444 // Red casualty shirt
      pantsColor = 0x334155
      this.isSitting = true
    } else if (npcState.id === 'npc_ramesh') {
      bodyColor = 0xb45309 // Dhaba apron
      pantsColor = 0x78716c
      accentColor = 0xffffff
    } else if (npcState.id === 'npc_priya') {
      bodyColor = 0xec4899 // Pink student kurti
      pantsColor = 0x0f172a
      accentColor = 0x06b6d4
    } else if (npcState.id === 'npc_amit') {
      bodyColor = 0x10b981 // Green casual shirt
      pantsColor = 0x1e293b
    } else if (npcState.id === 'npc_sharma') {
      bodyColor = 0xd97706 // Khaki police uniform
      pantsColor = 0xb45309
      accentColor = 0xffffff
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 })
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 })
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b5, roughness: 0.7 })
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 })

    // 1. Torso
    const bodyGeo = new THREE.BoxGeometry(0.68, 0.85, 0.42)
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    this.bodyMesh.position.y = this.isSitting ? 0.6 : 1.15
    this.bodyMesh.castShadow = true
    this.group.add(this.bodyMesh)

    // Officer Sharma white belt
    if (npcState.id === 'npc_sharma') {
      const beltGeo = new THREE.BoxGeometry(0.7, 0.15, 0.44)
      const belt = new THREE.Mesh(beltGeo, accentMat)
      belt.position.y = 0.95
      this.group.add(belt)
    }

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.42, 0.4)
    this.headMesh = new THREE.Mesh(headGeo, skinMat)
    this.headMesh.position.y = this.isSitting ? 1.25 : 1.8
    this.headMesh.castShadow = true
    this.group.add(this.headMesh)

    // Police Cap for Officer Sharma
    if (npcState.id === 'npc_sharma') {
      const capGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.18, 12)
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
      const cap = new THREE.Mesh(capGeo, capMat)
      cap.position.y = 2.05
      this.group.add(cap)
    }

    // 3. Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24)
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat)
    this.rightLeg = new THREE.Mesh(legGeo, pantsMat)

    if (this.isSitting) {
      this.leftLeg.rotation.x = Math.PI / 2.2
      this.leftLeg.position.set(-0.18, 0.28, 0.35)
      this.rightLeg.rotation.x = Math.PI / 2.5
      this.rightLeg.position.set(0.18, 0.28, 0.35)
    } else {
      this.leftLeg.position.set(-0.18, 0.38, 0)
      this.rightLeg.position.set(0.18, 0.38, 0)
    }
    this.group.add(this.leftLeg, this.rightLeg)

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2)
    this.leftArm = new THREE.Mesh(armGeo, bodyMat)
    this.leftArm.position.set(-0.46, this.isSitting ? 0.6 : 1.15, 0)
    this.rightArm = new THREE.Mesh(armGeo, bodyMat)
    this.rightArm.position.set(0.46, this.isSitting ? 0.6 : 1.15, 0)
    this.group.add(this.leftArm, this.rightArm)

    // 5. Overhead Billboards
    this.nametagSprite = this.renderNametag(npcState)
    this.nametagSprite.position.y = this.isSitting ? 1.85 : 2.5
    this.group.add(this.nametagSprite)

    this.statusSprite = this.renderStatusBadge(npcState)
    this.statusSprite.position.y = this.isSitting ? 2.3 : 2.95
    this.group.add(this.statusSprite)

    // Initial position & yaw
    this.group.position.set(npcState.position.x, npcState.position.y, npcState.position.z)
    this.group.rotation.y = this.currentFacingYaw

    if (npcState.currentReaction) {
      this.triggerReaction(npcState.currentReaction, 3.0)
    }
  }

  private renderNametag(npc: NPCState): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 76
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
    ctx.roundRect(8, 8, 284, 60, 12)
    ctx.fill()
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(npc.name, 150, 34)

    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(npc.roleTitle, 150, 56)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(2.2, 0.55, 1)
    return sprite
  }

  private renderStatusBadge(npc: NPCState): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 56
    const ctx = canvas.getContext('2d')!

    let badgeColor = '#64748b'
    if (npc.state === 'COOPERATIVE') badgeColor = '#22c55e'
    else if (npc.state === 'HESITANT') badgeColor = '#f59e0b'
    else if (npc.state === 'IN_CONVERSATION') badgeColor = '#38bdf8'
    else if (npc.state === 'MISINFORMED') badgeColor = '#ef4444'

    ctx.fillStyle = badgeColor
    ctx.roundRect(6, 6, 228, 44, 10)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`● ${npc.state}`, 120, 33)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(1.6, 0.38, 1)
    return sprite
  }

  public updateState(npc: NPCState) {
    this.name = npc.name
    this.roleTitle = npc.roleTitle

    // Update billboard sprites
    this.group.remove(this.nametagSprite)
    this.group.remove(this.statusSprite)

    this.nametagSprite = this.renderNametag(npc)
    this.nametagSprite.position.y = this.isSitting ? 1.85 : 2.5
    this.group.add(this.nametagSprite)

    this.statusSprite = this.renderStatusBadge(npc)
    this.statusSprite.position.y = this.isSitting ? 2.3 : 2.95
    this.group.add(this.statusSprite)

    this.currentFacingYaw = npc.facingYaw
    this.group.rotation.y = this.currentFacingYaw

    if (npc.currentReaction && npc.currentReaction !== 'idle') {
      this.triggerReaction(npc.currentReaction, npc.reactionDurationSec || 3.0)
    }
  }

  public turnTowards(targetPos: THREE.Vector3) {
    const dx = targetPos.x - this.group.position.x
    const dz = targetPos.z - this.group.position.z
    this.currentFacingYaw = Math.atan2(dx, dz)
    this.group.rotation.y = this.currentFacingYaw
  }

  public triggerReaction(reaction: NPCPhysicalReaction, durationSec: number = 3.0) {
    this.activeReaction = reaction
    this.reactionTimeRemaining = durationSec
  }

  /**
   * Procedural animation loop called each frame
   */
  public animate(delta: number) {
    this.idlePhase += delta * 2.0

    // Handle reaction timer
    if (this.reactionTimeRemaining > 0) {
      this.reactionTimeRemaining -= delta
      if (this.reactionTimeRemaining <= 0) {
        this.activeReaction = 'idle'
      }
    }

    // 1. Injured Victim (Arjun) Breathing & Distress
    if (this.isSitting) {
      if (this.activeReaction === 'pain_relieved') {
        // Stabilized breathing
        this.headMesh.rotation.x = Math.sin(this.idlePhase * 0.8) * 0.05
        this.bodyMesh.position.y = 0.6 + Math.sin(this.idlePhase * 0.8) * 0.02
        this.leftArm.rotation.x = 0.3
        this.rightArm.rotation.x = 0.3
      } else {
        // Heavy distress, clutching side
        this.headMesh.rotation.x = 0.28 + Math.sin(this.idlePhase * 1.8) * 0.08
        this.headMesh.rotation.z = Math.sin(this.idlePhase * 1.2) * 0.06
        this.bodyMesh.position.y = 0.58 + Math.abs(Math.sin(this.idlePhase * 1.5)) * 0.03
        this.leftArm.rotation.x = 0.65 // clutching ribs
        this.leftArm.rotation.z = 0.25
        this.rightArm.rotation.x = 0.5
      }
      return
    }

    // 2. Walking Animation for Ambulatory NPCs
    if (this.isWalking) {
      this.walkPhase += delta * 8.0
      const legAngle = Math.sin(this.walkPhase) * 0.65
      const armAngle = Math.cos(this.walkPhase) * 0.55

      this.leftLeg.rotation.x = legAngle
      this.rightLeg.rotation.x = -legAngle

      // If not performing an active arm reaction, swing arms
      if (this.activeReaction === 'idle') {
        this.leftArm.rotation.x = -armAngle
        this.rightArm.rotation.x = armAngle
        this.leftArm.rotation.z = 0
        this.rightArm.rotation.z = 0
      }

      this.bodyMesh.position.y = 1.15 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.04
    } else {
      // Return legs to neutral standing
      this.leftLeg.rotation.x *= 0.85
      this.rightLeg.rotation.x *= 0.85
      this.bodyMesh.position.y = 1.15
    }

    // 3. Procedural Physical Reactions
    const timeProgress = 3.0 - this.reactionTimeRemaining

    switch (this.activeReaction) {
      case 'nod': {
        // Two distinct nods
        const nodAngle = Math.abs(Math.sin(timeProgress * 5.5)) * 0.35
        this.headMesh.rotation.x = nodAngle
        this.headMesh.rotation.y = 0
        this.rightArm.rotation.x = 0.2
        this.leftArm.rotation.x = 0.2
        break
      }

      case 'shake_head': {
        // Side to side head shaking (hesitation / rejection)
        const shakeAngle = Math.sin(timeProgress * 7.0) * 0.4
        this.headMesh.rotation.y = shakeAngle
        this.headMesh.rotation.x = 0
        // Cross arms in refusal
        this.leftArm.rotation.x = 0.7
        this.leftArm.rotation.z = 0.35
        this.rightArm.rotation.x = 0.7
        this.rightArm.rotation.z = -0.35
        break
      }

      case 'point_cctv': {
        // Point right arm towards Dhaba CCTV console
        this.headMesh.rotation.x = 0.05
        this.rightArm.rotation.x = -1.4 // extended arm
        this.rightArm.rotation.y = -0.5 // angled towards shop DVR
        this.rightArm.rotation.z = 0.2
        this.leftArm.rotation.x = 0.1
        break
      }

      case 'point_road': {
        // Point right arm towards North road
        this.headMesh.rotation.x = 0.05
        this.rightArm.rotation.x = -1.55 // raised straight forward
        this.rightArm.rotation.y = 0.2
        this.leftArm.rotation.x = 0.1
        break
      }

      case 'step_back': {
        // Shift back defensively
        const stepDist = Math.min(0.5, timeProgress * 0.6)
        this.headMesh.rotation.x = -0.15
        this.leftArm.rotation.x = -0.6
        this.rightArm.rotation.x = -0.6
        this.leftArm.rotation.z = 0.3
        this.rightArm.rotation.z = -0.3
        break
      }

      case 'call_phone': {
        // Right arm raised holding phone receiver to ear
        this.rightArm.rotation.x = -1.8
        this.rightArm.rotation.z = -0.45
        this.headMesh.rotation.z = 0.18
        this.leftArm.rotation.x = 0.2
        break
      }

      case 'direct_traffic': {
        // Traffic management arm wave
        const wave = Math.sin(timeProgress * 3.5) * 0.7
        this.leftArm.rotation.x = -1.2 + wave * 0.3
        this.leftArm.rotation.z = 0.4 + wave * 0.2
        this.rightArm.rotation.x = -1.1 // stop palm raised forward
        this.rightArm.rotation.z = -0.1
        this.headMesh.rotation.y = Math.sin(timeProgress * 1.5) * 0.25
        break
      }

      case 'idle':
      default: {
        // Natural subtle idle breathing & head scanning
        this.headMesh.rotation.x = Math.sin(this.idlePhase * 0.7) * 0.04
        this.headMesh.rotation.y = Math.sin(this.idlePhase * 0.4) * 0.08
        if (!this.isWalking) {
          this.leftArm.rotation.x *= 0.9
          this.rightArm.rotation.x *= 0.9
          this.leftArm.rotation.z *= 0.9
          this.rightArm.rotation.z *= 0.9
        }
        break
      }
    }
  }
}
