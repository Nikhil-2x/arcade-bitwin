import Phaser from 'phaser'

/**
 * Builds high-resolution canvas textures for Indian street elements matching the reference image:
 * - Salim's Chai Tapri ("चाय" / "Salim Tea")
 * - Bus stop shelter ("The Last Bus")
 * - Vintage Indian Scooter (Bajaj Chetak style)
 * - Road barricades with diagonal hazard stripes
 * - Traffic cones & street signs
 * - Auto-rickshaw
 */
export function buildPropTextures(scene: Phaser.Scene) {
  const tex = scene.textures

  buildBusStop(tex)
  buildChaiStall(tex)
  buildScooter(tex)
  buildBarricade(tex)
  buildCone(tex)
  buildStreetSign(tex)
  buildAuto(tex)
}

function buildBusStop(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_bus_stop')) return
  const canvas = tex.createCanvas('prop_bus_stop', 200, 140)!
  const ctx = canvas.getContext()

  // 1. Dark Steel Frame & Columns
  ctx.fillStyle = '#1e293b' // dark slate frame
  // Left post
  ctx.fillRect(20, 20, 8, 110)
  // Right post
  ctx.fillRect(172, 20, 8, 110)

  // 2. Translucent Glass Back Panel
  const glassGrd = ctx.createLinearGradient(20, 20, 180, 120)
  glassGrd.addColorStop(0, 'rgba(56, 189, 248, 0.18)')
  glassGrd.addColorStop(1, 'rgba(15, 23, 42, 0.5)')
  ctx.fillStyle = glassGrd
  ctx.fillRect(28, 26, 144, 90)
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 1.2
  ctx.strokeRect(28, 26, 144, 90)

  // 3. Transit Route Map Poster on glass
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(40, 40, 48, 62)
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1
  ctx.strokeRect(40, 40, 48, 62)
  // Mini transit lines
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(46, 50)
  ctx.lineTo(60, 68)
  ctx.lineTo(80, 68)
  ctx.stroke()
  ctx.strokeStyle = '#3b82f6'
  ctx.beginPath()
  ctx.moveTo(46, 80)
  ctx.lineTo(68, 80)
  ctx.lineTo(82, 54)
  ctx.stroke()

  // 4. Curved Roof Canopy
  ctx.beginPath()
  ctx.moveTo(10, 24)
  ctx.quadraticCurveTo(100, 8, 190, 24)
  ctx.lineTo(185, 30)
  ctx.quadraticCurveTo(100, 16, 15, 30)
  ctx.closePath()
  ctx.fillStyle = '#334155'
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 2
  ctx.stroke()

  // 5. Warm Overhead Illuminated Light Fixture
  const lampGrd = ctx.createRadialGradient(100, 30, 2, 100, 60, 60)
  lampGrd.addColorStop(0, 'rgba(255, 243, 199, 0.95)')
  lampGrd.addColorStop(0.3, 'rgba(251, 191, 36, 0.6)')
  lampGrd.addColorStop(1, 'rgba(251, 191, 36, 0)')
  ctx.fillStyle = lampGrd
  ctx.beginPath()
  ctx.ellipse(100, 54, 75, 40, 0, 0, Math.PI * 2)
  ctx.fill()

  // Fluorescent bulb strip
  ctx.fillStyle = '#fffbeb'
  ctx.roundRect(65, 28, 70, 6, 3)
  ctx.fill()

  // 6. Wooden Slatted Bench inside
  ctx.fillStyle = '#78350f' // warm wood
  ctx.fillRect(36, 96, 76, 6)
  ctx.fillRect(36, 104, 76, 5)
  // Metal bench legs
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(42, 109, 4, 18)
  ctx.fillRect(102, 109, 4, 18)

  // 7. Blue Bus Icon Sign on pole
  ctx.fillStyle = '#475569'
  ctx.fillRect(178, 10, 4, 30)
  // Sign plate
  ctx.fillStyle = '#0284c7'
  ctx.beginPath()
  ctx.roundRect(168, -4 + 10, 24, 22, 4)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // White Bus icon
  ctx.fillStyle = '#ffffff'
  ctx.roundRect(173, 10, 14, 13, 2)
  ctx.fill()
  // Bus windows & wheels
  ctx.fillStyle = '#0284c7'
  ctx.fillRect(175, 12, 10, 5)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(176, 23.5, 1.4, 0, Math.PI * 2)
  ctx.arc(184, 23.5, 1.4, 0, Math.PI * 2)
  ctx.fill()

  canvas.refresh()
}

function buildChaiStall(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_stall_salim')) return
  const canvas = tex.createCanvas('prop_stall_salim', 220, 160)!
  const ctx = canvas.getContext()

  // 1. Warm ambient golden stall glow
  const stallGlow = ctx.createRadialGradient(100, 80, 10, 100, 80, 95)
  stallGlow.addColorStop(0, 'rgba(255, 214, 102, 0.75)')
  stallGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)')
  stallGlow.addColorStop(1, 'rgba(245, 158, 11, 0)')
  ctx.fillStyle = stallGlow
  ctx.fillRect(0, 0, 220, 160)

  // 2. Wooden Stall Structure & Back Wall
  ctx.fillStyle = '#3e2723'
  ctx.fillRect(20, 44, 160, 96)
  // Wood plank lines
  ctx.strokeStyle = '#271815'
  ctx.lineWidth = 1.5
  for (let y = 54; y < 140; y += 12) {
    ctx.beginPath()
    ctx.moveTo(20, y)
    ctx.lineTo(180, y)
    ctx.stroke()
  }

  // 3. Slanted Corrugated Tin Roof Awning
  ctx.beginPath()
  ctx.moveTo(10, 46)
  ctx.lineTo(30, 20)
  ctx.lineTo(190, 20)
  ctx.lineTo(196, 46)
  ctx.closePath()
  const roofGrd = ctx.createLinearGradient(0, 20, 0, 46)
  roofGrd.addColorStop(0, '#52525b')
  roofGrd.addColorStop(0.5, '#71717a')
  roofGrd.addColorStop(1, '#3f3f46')
  ctx.fillStyle = roofGrd
  ctx.fill()
  ctx.strokeStyle = '#18181b'
  ctx.lineWidth = 2
  ctx.stroke()

  // Roof corrugation ridges
  ctx.strokeStyle = '#a1a1aa'
  ctx.lineWidth = 1.2
  for (let x = 36; x < 184; x += 14) {
    ctx.beginPath()
    ctx.moveTo(x, 20)
    ctx.lineTo(x + (x > 100 ? 5 : -4), 46)
    ctx.stroke()
  }

  // 4. Wooden Support Posts
  ctx.fillStyle = '#451a03'
  ctx.fillRect(22, 44, 6, 96)
  ctx.fillRect(172, 44, 6, 96)

  // 5. Mr. Salim inside the stall (Chaiwala)
  // Head
  ctx.beginPath()
  ctx.arc(146, 68, 10, 0, Math.PI * 2)
  ctx.fillStyle = '#deb887'
  ctx.fill()
  // Hair & moustache
  ctx.fillStyle = '#1c1917'
  ctx.beginPath()
  ctx.arc(146, 64, 10, Math.PI * 0.9, Math.PI * 2.1)
  ctx.fill()
  ctx.strokeStyle = '#1c1917'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(141, 72)
  ctx.quadraticCurveTo(146, 74, 151, 72)
  ctx.stroke()
  // Orange vest
  ctx.fillStyle = '#ea580c'
  ctx.fillRect(134, 78, 24, 26)
  // White towel over shoulder
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(132, 80, 6, 24)

  // 6. Hanging Warm Glowing Edison Bulb
  ctx.strokeStyle = '#18181b'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(100, 36)
  ctx.lineTo(100, 56)
  ctx.stroke()
  // Bulb glass
  const bulbGlow = ctx.createRadialGradient(100, 59, 1, 100, 59, 12)
  bulbGlow.addColorStop(0, '#ffffff')
  bulbGlow.addColorStop(0.4, '#fde047')
  bulbGlow.addColorStop(1, 'rgba(245, 158, 11, 0)')
  ctx.fillStyle = bulbGlow
  ctx.beginPath()
  ctx.arc(100, 59, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(100, 59, 4, 0, Math.PI * 2)
  ctx.fill()

  // 7. Illuminated Signboard ("चाय" / "TEA")
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.roundRect(46, 40, 62, 24, 3)
  ctx.fill()
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Devanagari "चाय" text in bold gold
  ctx.fillStyle = '#fef08a'
  ctx.font = 'bold 15px "Varela Round", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('चाय', 77, 57)

  // 8. Wooden Service Counter
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.roundRect(16, 98, 168, 42, 3)
  ctx.fill()
  ctx.strokeStyle = '#451a03'
  ctx.lineWidth = 2
  ctx.stroke()
  // Counter top rim
  ctx.fillStyle = '#92400e'
  ctx.fillRect(14, 98, 172, 6)

  // 9. Traditional Indian Chai Accessories on Counter
  // Large Aluminum/Brass Chai Kettle
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.arc(42, 92, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(35, 92, 14, 8)
  // Handle & spout
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(42, 85, 6, Math.PI, Math.PI * 2)
  ctx.moveTo(49, 93)
  ctx.lineTo(55, 87)
  ctx.stroke()

  // Wire Glass Caddy with Cutting-Chai Tumblers
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1
  ctx.strokeRect(64, 88, 32, 12)
  // 4 mini glass tumblers with hot amber tea
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fillRect(66 + i * 7.5, 88, 6, 11)
    ctx.fillStyle = '#b45309' // amber tea
    ctx.fillRect(67 + i * 7.5, 92, 4, 7)
  }

  // Glass Biscuit / Rusk Jar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.fillRect(106, 85, 14, 15)
  ctx.strokeStyle = '#94a3b8'
  ctx.strokeRect(106, 85, 14, 15)
  // Red jar lid
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(105, 83, 16, 3)
  // Biscuits inside
  ctx.fillStyle = '#d97706'
  ctx.fillRect(108, 90, 10, 8)

  // 10. Round Wooden Tea Stools in front
  const drawStool = (x: number, y: number) => {
    // Round wooden seat
    ctx.fillStyle = '#92400e'
    ctx.beginPath()
    ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = 1.2
    ctx.stroke()
    // 3 Legs
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(x - 8, y + 2)
    ctx.lineTo(x - 10, y + 18)
    ctx.moveTo(x, y + 4)
    ctx.lineTo(x, y + 19)
    ctx.moveTo(x + 8, y + 2)
    ctx.lineTo(x + 10, y + 18)
    ctx.stroke()
  }
  drawStool(50, 134)
  drawStool(100, 134)

  canvas.refresh()
}

function buildScooter(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_scooter')) return
  const canvas = tex.createCanvas('prop_scooter', 96, 76)!
  const ctx = canvas.getContext()

  // Vintage Indian Scooter (Bajaj Chetak style) - Facing Right
  // Ground shadow
  ctx.fillStyle = 'rgba(5, 7, 18, 0.5)'
  ctx.beginPath()
  ctx.ellipse(48, 68, 38, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wheels (Black rubber with pressed steel grey rims)
  const drawWheel = (x: number, y: number) => {
    // Tire
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()
    // Steel rim
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  drawWheel(22, 58) // rear wheel
  drawWheel(72, 58) // front wheel

  // Rear Bulbous Cowl / Engine Cover (Mint-cream #a7c4bc with shade)
  ctx.beginPath()
  ctx.ellipse(28, 44, 18, 12, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#a7c4bc'
  ctx.fill()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.8
  ctx.stroke()
  // Engine ventilation louvers
  ctx.strokeStyle = '#52796f'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(22 + i * 5, 40)
    ctx.lineTo(26 + i * 5, 46)
    ctx.stroke()
  }

  // Spare Tire mounted on back carrier
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.ellipse(12, 38, 5, 10, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Center Footboard
  ctx.fillStyle = '#84a98c'
  ctx.fillRect(36, 52, 22, 6)
  ctx.fillStyle = '#2f3e46' // rubber runners
  ctx.fillRect(36, 54, 22, 2)

  // Front Curved Leg Shield / Apron
  ctx.beginPath()
  ctx.moveTo(56, 54)
  ctx.quadraticCurveTo(62, 36, 68, 22)
  ctx.lineTo(76, 22)
  ctx.quadraticCurveTo(70, 38, 62, 54)
  ctx.closePath()
  ctx.fillStyle = '#cad2c5'
  ctx.fill()
  ctx.strokeStyle = '#52796f'
  ctx.lineWidth = 1.8
  ctx.stroke()

  // Front Fender / Mudguard over front wheel
  ctx.beginPath()
  ctx.arc(72, 54, 14, Math.PI * 1.1, Math.PI * 1.9)
  ctx.lineTo(72, 50)
  ctx.fillStyle = '#a7c4bc'
  ctx.fill()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Split Dual Seat (Dark brown / charcoal leather)
  ctx.fillStyle = '#3e2723'
  ctx.beginPath()
  ctx.roundRect(22, 28, 30, 8, 3)
  ctx.fill()
  ctx.strokeStyle = '#1f140e'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Chrome Handlebar Stem & Round Headlight
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(69, 22)
  ctx.lineTo(69, 14)
  ctx.stroke()

  // Round Chrome Headlamp
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(74, 14, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Handlebars & Rear-view Mirror
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(64, 14)
  ctx.lineTo(74, 14)
  // Mirror stem
  ctx.moveTo(66, 14)
  ctx.lineTo(64, 6)
  ctx.stroke()
  // Mirror glass
  ctx.fillStyle = '#b6eefc'
  ctx.beginPath()
  ctx.arc(64, 6, 3, 0, Math.PI * 2)
  ctx.fill()

  canvas.refresh()
}

function buildBarricade(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_barricade')) return
  const canvas = tex.createCanvas('prop_barricade', 104, 48)!
  const ctx = canvas.getContext()

  // Heavy Indian Road Traffic Barricade
  // Tubular Black Frame & Feet
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 4
  ctx.strokeRect(6, 6, 92, 28)
  // Feet
  ctx.beginPath()
  ctx.moveTo(12, 34)
  ctx.lineTo(4, 44)
  ctx.moveTo(12, 34)
  ctx.lineTo(20, 44)
  ctx.moveTo(88, 34)
  ctx.lineTo(80, 44)
  ctx.moveTo(88, 34)
  ctx.lineTo(96, 44)
  ctx.stroke()

  // Main Barricade Board (Clip area for diagonal orange/white stripes)
  ctx.save()
  ctx.beginPath()
  ctx.rect(8, 8, 88, 24)
  ctx.clip()

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(8, 8, 88, 24)

  // 45-degree Safety Orange diagonal stripes
  ctx.fillStyle = '#ff7a00'
  for (let x = -20; x < 120; x += 22) {
    ctx.beginPath()
    ctx.moveTo(x, 8)
    ctx.lineTo(x + 14, 8)
    ctx.lineTo(x - 10, 32)
    ctx.lineTo(x - 24, 32)
    ctx.closePath()
    ctx.fill()
  }

  // Stencil "STOP / POLICE" text box in center
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(34, 15, 36, 10)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 8px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('STOP', 52, 23)

  ctx.restore()
  canvas.refresh()
}

function buildCone(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_cone')) return
  const canvas = tex.createCanvas('prop_cone', 32, 40)!
  const ctx = canvas.getContext()

  // Black rubber base
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(4, 32, 24, 6)

  // Orange cone
  ctx.beginPath()
  ctx.moveTo(16, 4)
  ctx.lineTo(25, 32)
  ctx.lineTo(7, 32)
  ctx.closePath()
  ctx.fillStyle = '#ff5722'
  ctx.fill()

  // White reflective center band
  ctx.beginPath()
  ctx.moveTo(13, 14)
  ctx.lineTo(19, 14)
  ctx.lineTo(21, 23)
  ctx.lineTo(11, 23)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  canvas.refresh()
}

function buildStreetSign(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_street_sign')) return
  const canvas = tex.createCanvas('prop_street_sign', 40, 64)!
  const ctx = canvas.getContext()

  // Steel pole
  ctx.fillStyle = '#475569'
  ctx.fillRect(18, 26, 4, 38)

  // Circular No Parking / Cross sign
  ctx.beginPath()
  ctx.arc(20, 18, 14, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4444' // red outer ring
  ctx.fill()

  ctx.beginPath()
  ctx.arc(20, 18, 11, 0, Math.PI * 2)
  ctx.fillStyle = '#2563eb' // blue inner field
  ctx.fill()

  // Red diagonal slash
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(11, 10)
  ctx.lineTo(29, 26)
  ctx.stroke()

  canvas.refresh()
}

function buildAuto(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('prop_auto')) return
  const canvas = tex.createCanvas('prop_auto', 96, 72)!
  const ctx = canvas.getContext()

  // Ground shadow
  ctx.fillStyle = 'rgba(5, 7, 18, 0.45)'
  ctx.beginPath()
  ctx.ellipse(48, 64, 40, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wheels
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(24, 56, 11, 0, Math.PI * 2)
  ctx.arc(74, 56, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.arc(24, 56, 5, 0, Math.PI * 2)
  ctx.arc(74, 56, 5, 0, Math.PI * 2)
  ctx.fill()

  // Lower Body (Classic Indian dark green / black)
  ctx.fillStyle = '#15803d'
  ctx.beginPath()
  ctx.roundRect(14, 36, 68, 22, [4, 12, 4, 4])
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.8
  ctx.stroke()

  // Yellow Curved Roof Canopy
  ctx.beginPath()
  ctx.moveTo(14, 36)
  ctx.lineTo(16, 18)
  ctx.quadraticCurveTo(50, 10, 76, 20)
  ctx.lineTo(76, 36)
  ctx.closePath()
  ctx.fillStyle = '#facc15' // bright autorickshaw yellow
  ctx.fill()
  ctx.strokeStyle = '#ca8a04'
  ctx.lineWidth = 1.8
  ctx.stroke()

  // Windshield & Passenger Opening
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)'
  ctx.fillRect(60, 22, 14, 16) // windshield
  ctx.fillStyle = '#0f172a' // passenger cabin open interior
  ctx.fillRect(22, 22, 32, 16)

  // Round Front Headlamp
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(82, 42, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ca8a04'
  ctx.lineWidth = 1.2
  ctx.stroke()

  canvas.refresh()
}
