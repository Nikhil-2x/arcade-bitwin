import * as THREE from 'three'
import type { PlayerRole } from '../network/networkTypes.ts'

export class CharacterModel {
  public group: THREE.Group
  public role: PlayerRole
  public name: string

  private leftLeg: THREE.Mesh
  private rightLeg: THREE.Mesh
  private leftArm: THREE.Mesh
  private rightArm: THREE.Mesh
  private bodyMesh: THREE.Mesh
  private nametagSprite: THREE.Sprite

  private walkPhase: number = 0

  constructor(role: PlayerRole, name: string) {
    this.role = role
    this.name = name
    this.group = new THREE.Group()

    // Milestone 6: Characters wear comparable neutral citizen attire
    // No role-based clothing differences (prevents visual deduction)
    const bodyColor = 0x2563eb // Classic dark blue citizen jacket
    const accentColor = 0x38bdf8 // Sky blue trim
    const pantsColor = 0x1e293b // Dark denim jeans
    const skinColor = 0xf5d0b5
    const hairColor = 0x171717

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 })
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 })
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 })
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 })
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.9
    })

    // 1. Torso
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45)
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    this.bodyMesh.position.y = 1.15
    this.bodyMesh.castShadow = true
    this.group.add(this.bodyMesh)

    // Vest / Accent Stripe
    const vestGeo = new THREE.BoxGeometry(0.72, 0.35, 0.47)
    const vestMesh = new THREE.Mesh(vestGeo, accentMat)
    vestMesh.position.y = 1.2
    vestMesh.castShadow = true
    this.group.add(vestMesh)

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.42, 0.44, 0.42)
    const headMesh = new THREE.Mesh(headGeo, skinMat)
    headMesh.position.y = 1.85
    headMesh.castShadow = true
    this.group.add(headMesh)

    // Hair / Cap
    const hairGeo = new THREE.BoxGeometry(0.46, 0.18, 0.46)
    const hairMesh = new THREE.Mesh(hairGeo, hairMat)
    hairMesh.position.y = 2.05
    this.group.add(hairMesh)

    // 3. Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24)

    this.leftLeg = new THREE.Mesh(legGeo, pantsMat)
    this.leftLeg.position.set(-0.18, 0.38, 0)
    this.leftLeg.castShadow = true
    this.group.add(this.leftLeg)

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat)
    this.rightLeg.position.set(0.18, 0.38, 0)
    this.rightLeg.castShadow = true
    this.group.add(this.rightLeg)

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2)

    this.leftArm = new THREE.Mesh(armGeo, bodyMat)
    this.leftArm.position.set(-0.48, 1.15, 0)
    this.leftArm.castShadow = true
    this.group.add(this.leftArm)

    this.rightArm = new THREE.Mesh(armGeo, bodyMat)
    this.rightArm.position.set(0.48, 1.15, 0)
    this.rightArm.castShadow = true
    this.group.add(this.rightArm)

    // 5. Floating Nametag Billboard
    this.nametagSprite = this.createNametag(name, role)
    this.nametagSprite.position.y = 2.45
    this.group.add(this.nametagSprite)
  }

  private createNametag(name: string, _role: PlayerRole): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 260
    canvas.height = 60
    const ctx = canvas.getContext('2d')!

    // Milestone 6: Neutral nametag with no role badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.roundRect(6, 6, 248, 48, 10)
    ctx.fill()
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(name, 130, 36)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(2.0, 0.5, 1)
    return sprite
  }

  public updateNametag(name: string) {
    this.name = name
    this.group.remove(this.nametagSprite)
    this.nametagSprite = this.createNametag(name, this.role)
    this.nametagSprite.position.y = 2.45
    this.group.add(this.nametagSprite)
  }

  public animate(isMoving: boolean, isSprinting: boolean, delta: number) {
    if (isMoving) {
      const speedMultiplier = isSprinting ? 18 : 10
      this.walkPhase += delta * speedMultiplier

      const legAngle = Math.sin(this.walkPhase) * 0.75
      const armAngle = Math.cos(this.walkPhase) * 0.65

      this.leftLeg.rotation.x = legAngle
      this.rightLeg.rotation.x = -legAngle

      this.leftArm.rotation.x = -armAngle
      this.rightArm.rotation.x = armAngle

      // Slight vertical bobbing
      this.bodyMesh.position.y = 1.15 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.06
    } else {
      // Idle pose reset smoothly
      this.leftLeg.rotation.x *= 0.8
      this.rightLeg.rotation.x *= 0.8
      this.leftArm.rotation.x *= 0.8
      this.rightArm.rotation.x *= 0.8
      this.bodyMesh.position.y = 1.15
    }
  }

  public setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z)
  }

  public setRotation(yaw: number) {
    this.group.rotation.y = yaw
  }
}

