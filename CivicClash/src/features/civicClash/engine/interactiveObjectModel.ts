import * as THREE from 'three'
import type { InteractiveObjectState } from '../network/milestone2Types.ts'

export class InteractiveObjectModel {
  public group: THREE.Group
  public id: string
  public name: string
  public radius: number

  private stateSprite: THREE.Sprite
  private dynamicMesh: THREE.Mesh | null = null

  constructor(state: InteractiveObjectState) {
    this.id = state.id
    this.name = state.name
    this.radius = state.radius
    this.group = new THREE.Group()

    this.buildMesh(state)

    this.stateSprite = this.renderStateSprite(state)
    this.stateSprite.position.y = 2.4
    this.stateSprite.visible = !state.id.startsWith('mech_') // PATCH-B: mechanismsView draws its own live labels
    this.group.add(this.stateSprite)

    this.group.position.set(state.position.x, state.position.y, state.position.z)
  }

  private buildMesh(state: InteractiveObjectState) {
    if (state.id === 'obj_phone') {
      // 1. Emergency Call Pillar (112)
      const postGeo = new THREE.CylinderGeometry(0.25, 0.28, 2.8, 12)
      const postMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }) // Red emergency pillar
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.y = 1.4
      post.castShadow = true
      this.group.add(post)

      const boxGeo = new THREE.BoxGeometry(0.65, 0.8, 0.4)
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 }) // Yellow call box
      const box = new THREE.Mesh(boxGeo, boxMat)
      box.position.set(0, 1.8, 0.15)
      box.castShadow = true
      this.group.add(box)

      // 112 beacon light
      const light = new THREE.PointLight(0xef4444, 1.5, 8)
      light.position.set(0, 2.9, 0)
      this.group.add(light)
    } else if (state.id === 'obj_cctv') {
      // 2. CCTV DVR Monitor Console
      const deskGeo = new THREE.BoxGeometry(1.6, 1.0, 1.0)
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x475569 })
      const desk = new THREE.Mesh(deskGeo, deskMat)
      desk.position.y = 0.5
      desk.castShadow = true
      this.group.add(desk)

      const monitorGeo = new THREE.BoxGeometry(1.0, 0.7, 0.15)
      const monitorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a })
      const monitor = new THREE.Mesh(monitorGeo, monitorMat)
      monitor.position.set(0, 1.35, 0)
      this.group.add(monitor)

      // Screen
      const screenGeo = new THREE.PlaneGeometry(0.85, 0.55)
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }) // Green active monitor
      this.dynamicMesh = new THREE.Mesh(screenGeo, screenMat)
      this.dynamicMesh.position.set(0, 1.35, 0.08)
      this.group.add(this.dynamicMesh)
    } else if (state.id === 'obj_signal') {
      // 3. Traffic Signal Box
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.14, 4.2, 8)
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155 })
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = 2.1
      pole.castShadow = true
      this.group.add(pole)

      const boxGeo = new THREE.BoxGeometry(0.55, 1.2, 0.45)
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
      const box = new THREE.Mesh(boxGeo, boxMat)
      box.position.set(0, 3.2, 0)
      this.group.add(box)

      // Glowing light lens
      const lensGeo = new THREE.SphereGeometry(0.16, 12, 8)
      const lensMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }) // Red by default
      this.dynamicMesh = new THREE.Mesh(lensGeo, lensMat)
      this.dynamicMesh.position.set(0, 3.4, 0.22)
      this.group.add(this.dynamicMesh)
    } else if (state.id === 'obj_firstaid') {
      // 4. First-Aid Medical Box
      const tableGeo = new THREE.BoxGeometry(1.2, 0.85, 0.8)
      const tableMat = new THREE.MeshStandardMaterial({ color: 0x78716c })
      const table = new THREE.Mesh(tableGeo, tableMat)
      table.position.y = 0.425
      table.castShadow = true
      this.group.add(table)

      const kitGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4)
      const kitMat = new THREE.MeshStandardMaterial({ color: 0xffffff }) // White medical box
      const kit = new THREE.Mesh(kitGeo, kitMat)
      kit.position.set(0, 1.025, 0)
      kit.castShadow = true
      this.group.add(kit)

      // Red cross crossbar
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.08), crossMat)
      c1.position.set(0, 1.025, 0.21)
      const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.24), crossMat)
      c2.position.set(0, 1.025, 0.21)
      this.group.add(c1, c2)
    } else if (state.id === 'obj_infoboard') {
      // 5. Incident Notice Board
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8)
      const legMat = new THREE.MeshStandardMaterial({ color: 0x334155 })
      const leg1 = new THREE.Mesh(legGeo, legMat)
      leg1.position.set(-0.7, 1.2, 0)
      const leg2 = new THREE.Mesh(legGeo, legMat)
      leg2.position.set(0.7, 1.2, 0)
      this.group.add(leg1, leg2)

      const boardGeo = new THREE.BoxGeometry(1.8, 1.2, 0.12)
      const boardMat = new THREE.MeshStandardMaterial({ color: 0xb45309 }) // Wooden corkboard
      const board = new THREE.Mesh(boardGeo, boardMat)
      board.position.set(0, 1.8, 0)
      board.castShadow = true
      this.group.add(board)
    } else if (state.id === 'obj_electrical_panel') {
      // Main Electrical Breaker Panel (Level 2)
      const cabinetGeo = new THREE.BoxGeometry(1.2, 1.8, 0.5)
      const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 })
      const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat)
      cabinet.position.y = 1.0
      cabinet.castShadow = true
      this.group.add(cabinet)

      const signGeo = new THREE.PlaneGeometry(0.5, 0.5)
      const signMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      const sign = new THREE.Mesh(signGeo, signMat)
      sign.position.set(0, 1.3, 0.26)
      this.group.add(sign)

      const leverGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8)
      const leverMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 })
      const lever = new THREE.Mesh(leverGeo, leverMat)
      lever.position.set(0, 0.8, 0.28)
      this.group.add(lever)
    } else if (state.id === 'obj_fire_alarm' || state.id === 'obj_emergency_alarm') {
      // Manual Fire Alarm Pull Siren / Construction Siren (Level 2 & 3)
      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.2, 2.6, 10)
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 })
      const pillar = new THREE.Mesh(pillarGeo, pillarMat)
      pillar.position.y = 1.3
      pillar.castShadow = true
      this.group.add(pillar)

      const boxGeo = new THREE.BoxGeometry(0.6, 0.7, 0.35)
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 })
      const box = new THREE.Mesh(boxGeo, boxMat)
      box.position.set(0, 1.6, 0.15)
      box.castShadow = true
      this.group.add(box)

      const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.25, 8)
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      const beacon = new THREE.Mesh(beaconGeo, beaconMat)
      beacon.position.set(0, 2.7, 0)
      this.group.add(beacon)
    } else if (state.id === 'obj_extinguisher') {
      // CO2 Fire Extinguisher Station (Level 2)
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8)
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569 })
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.y = 0.9
      this.group.add(post)

      const cylGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 12)
      const cylMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 })
      const cyl = new THREE.Mesh(cylGeo, cylMat)
      cyl.position.set(0, 0.95, 0.12)
      cyl.castShadow = true
      this.group.add(cyl)
    } else if (state.id === 'obj_exit_shutter') {
      // Emergency Exit Shutter Gate (Level 2)
      const frameGeo = new THREE.BoxGeometry(2.4, 2.8, 0.3)
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b })
      const frame = new THREE.Mesh(frameGeo, frameMat)
      frame.position.y = 1.4
      frame.castShadow = true
      this.group.add(frame)

      const signGeo = new THREE.PlaneGeometry(1.0, 0.35)
      const signMat = new THREE.MeshBasicMaterial({ color: 0x22c55e })
      const sign = new THREE.Mesh(signGeo, signMat)
      sign.position.set(0, 2.5, 0.16)
      this.group.add(sign)
    } else if (state.id === 'obj_water_source') {
      // Municipal Water Supply Hydrant (Level 2)
      const hydGeo = new THREE.CylinderGeometry(0.22, 0.26, 1.1, 10)
      const hydMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
      const hyd = new THREE.Mesh(hydGeo, hydMat)
      hyd.position.y = 0.55
      hyd.castShadow = true
      this.group.add(hyd)

      const topGeo = new THREE.SphereGeometry(0.22, 8, 8)
      const top = new THREE.Mesh(topGeo, hydMat)
      top.position.y = 1.1
      this.group.add(top)
    } else if (state.id === 'obj_report_terminal') {
      // Digital Incident Reporting Terminal (Level 3 - BOCW Act Kiosk)
      const baseGeo = new THREE.BoxGeometry(1.2, 1.2, 0.8)
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a })
      const base = new THREE.Mesh(baseGeo, baseMat)
      base.position.y = 0.6
      base.castShadow = true
      this.group.add(base)

      const screenHousingGeo = new THREE.BoxGeometry(1.0, 0.8, 0.2)
      const screenHousing = new THREE.Mesh(screenHousingGeo, baseMat)
      screenHousing.position.set(0, 1.5, 0)
      this.group.add(screenHousing)

      const screenGeo = new THREE.PlaneGeometry(0.85, 0.65)
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 })
      const screen = new THREE.Mesh(screenGeo, screenMat)
      screen.position.set(0, 1.5, 0.11)
      this.group.add(screen)
    } else if (state.id === 'obj_first_aid_station') {
      // Construction Site Trauma Medical Station (Level 3)
      const tableGeo = new THREE.BoxGeometry(1.4, 0.9, 0.8)
      const tableMat = new THREE.MeshStandardMaterial({ color: 0x334155 })
      const table = new THREE.Mesh(tableGeo, tableMat)
      table.position.y = 0.45
      table.castShadow = true
      this.group.add(table)

      const boxGeo = new THREE.BoxGeometry(0.7, 0.45, 0.4)
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x16a34a })
      const box = new THREE.Mesh(boxGeo, boxMat)
      box.position.set(0, 1.1, 0)
      box.castShadow = true
      this.group.add(box)
    } else if (state.id === 'obj_safety_records') {
      // Safety Compliance Logbook Desk (Level 3)
      const deskGeo = new THREE.BoxGeometry(1.6, 0.85, 0.9)
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x78350f })
      const desk = new THREE.Mesh(deskGeo, deskMat)
      desk.position.y = 0.425
      desk.castShadow = true
      this.group.add(desk)

      const bookGeo = new THREE.BoxGeometry(0.5, 0.08, 0.4)
      const bookMat = new THREE.MeshStandardMaterial({ color: 0x2563eb })
      const book = new THREE.Mesh(bookGeo, bookMat)
      book.position.set(0, 0.88, 0)
      this.group.add(book)
    } else if (state.id === 'obj_cctv_tower') {
      // High-Mast Site Surveillance Camera (Level 3)
      const mastGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.0, 8)
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569 })
      const mast = new THREE.Mesh(mastGeo, mastMat)
      mast.position.y = 2.5
      mast.castShadow = true
      this.group.add(mast)

      const camGeo = new THREE.SphereGeometry(0.25, 8, 8)
      const camMat = new THREE.MeshBasicMaterial({ color: 0x0f172a })
      const cam = new THREE.Mesh(camGeo, camMat)
      cam.position.set(0, 5.0, 0)
      this.group.add(cam)
    } else if (state.id === 'obj_market_escape' || state.id === 'obj_site_escape' || state.id === 'obj_escape') {
      // Escape Zone Perimeter Gate
      const gateGeo = new THREE.RingGeometry(1.6, 1.8, 24)
      gateGeo.rotateX(-Math.PI / 2)
      const gateMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide })
      const gate = new THREE.Mesh(gateGeo, gateMat)
      gate.position.y = 0.05
      this.group.add(gate)
    }
  }

  private renderStateSprite(state: InteractiveObjectState): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 70
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
    ctx.roundRect(8, 8, 264, 54, 12)
    ctx.fill()
    ctx.strokeStyle = state.state === 'disabled' ? '#ef4444' : '#facc15'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(state.name, 140, 32)

    ctx.fillStyle = state.state === 'disabled' ? '#f87171' : '#4ade80'
    ctx.font = 'bold 13px sans-serif'
    const statusText = state.state === 'disabled' ? `DISABLED (${state.disabledTimer || 0}s)` : state.state.toUpperCase()
    ctx.fillText(`STATUS: ${statusText}`, 140, 52)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(2.2, 0.55, 1)
    return sprite
  }

  public updateState(state: InteractiveObjectState) {
    this.name = state.name

    this.group.remove(this.stateSprite)
    this.stateSprite = this.renderStateSprite(state)
    this.stateSprite.position.y = 2.4
    this.stateSprite.visible = !this.id.startsWith('mech_')
    this.group.add(this.stateSprite)

    // Dynamic material adjustments
    if (this.id === 'obj_cctv' && this.dynamicMesh) {
      const mat = this.dynamicMesh.material as THREE.MeshBasicMaterial
      if (state.state === 'disabled') {
        mat.color.setHex(0xef4444) // Red disabled static
      } else {
        mat.color.setHex(0x22c55e) // Green active
      }
    } else if (this.id === 'obj_signal' && this.dynamicMesh) {
      const mat = this.dynamicMesh.material as THREE.MeshBasicMaterial
      if (state.state === 'green') mat.color.setHex(0x22c55e)
      else if (state.state === 'tampered') mat.color.setHex(0xf59e0b)
      else mat.color.setHex(0xef4444)
    } else if (this.id === 'obj_firstaid') {
      if (state.state === 'collected') {
        this.group.visible = false
      }
    }
  }
}

