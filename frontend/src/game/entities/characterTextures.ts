import Phaser from 'phaser'

/**
 * Builds high-resolution canvas textures for Priya (the girl matching reference image)
 * and stylized Indian humanoid characters for allies and NPCs.
 */
export function buildCharacterTextures(scene: Phaser.Scene) {
  const tex = scene.textures

  buildPriyaTextures(tex)
  buildHumanoidTextures(tex)
}

function buildPriyaTextures(tex: Phaser.Textures.TextureManager) {
  // 1. Priya Head & Face (64x64)
  if (!tex.exists('priya_head')) {
    const canvas = tex.createCanvas('priya_head', 64, 64)!
    const ctx = canvas.getContext()

    // Base skin (face profile/3/4 facing right)
    ctx.save()
    // Neck
    ctx.fillStyle = '#e4b090'
    ctx.fillRect(26, 36, 12, 14)
    ctx.fillStyle = '#f6d2b5'
    ctx.fillRect(28, 36, 10, 14)

    // Face base shape
    ctx.beginPath()
    ctx.moveTo(26, 20)
    ctx.bezierCurveTo(26, 14, 38, 12, 46, 18) // forehead
    ctx.bezierCurveTo(49, 22, 50, 26, 50, 30) // eye/cheek
    ctx.bezierCurveTo(50, 34, 48, 38, 43, 42) // chin
    ctx.bezierCurveTo(36, 45, 26, 42, 24, 34) // jaw & ear
    ctx.closePath()
    ctx.fillStyle = '#f6d2b5'
    ctx.fill()
    ctx.strokeStyle = '#2b170c'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Soft blush on cheek
    const blushGrd = ctx.createRadialGradient(42, 33, 0, 42, 33, 7)
    blushGrd.addColorStop(0, 'rgba(251, 113, 133, 0.45)')
    blushGrd.addColorStop(1, 'rgba(251, 113, 133, 0)')
    ctx.fillStyle = blushGrd
    ctx.beginPath()
    ctx.arc(42, 33, 7, 0, Math.PI * 2)
    ctx.fill()

    // Cute ear with earring
    ctx.beginPath()
    ctx.arc(28, 30, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = '#e4b090'
    ctx.fill()
    ctx.strokeStyle = '#2b170c'
    ctx.lineWidth = 1.2
    ctx.stroke()
    // Silver stud earring
    ctx.beginPath()
    ctx.arc(28, 33, 1.6, 0, Math.PI * 2)
    ctx.fillStyle = '#f8fafc'
    ctx.fill()

    // Anime Eye (looking right/forward)
    // Sclera
    ctx.beginPath()
    ctx.ellipse(42, 26, 4.5, 3.2, 0.1, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    // Iris (deep warm brown)
    ctx.beginPath()
    ctx.ellipse(43, 26, 3.2, 3.2, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#451a03'
    ctx.fill()
    // Inner amber highlight
    ctx.beginPath()
    ctx.arc(43, 27, 2, 0, Math.PI)
    ctx.fillStyle = '#b45309'
    ctx.fill()
    // Pupil
    ctx.beginPath()
    ctx.arc(43, 25.5, 1.4, 0, Math.PI * 2)
    ctx.fillStyle = '#0f0502'
    ctx.fill()
    // Eye shine / glint reflection
    ctx.beginPath()
    ctx.arc(44, 24.5, 1.1, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(42, 27.5, 0.6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fill()
    // Upper eyelid lash
    ctx.beginPath()
    ctx.moveTo(37, 24)
    ctx.quadraticCurveTo(42, 22, 47, 25)
    ctx.strokeStyle = '#1e1008'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.stroke()

    // Eyebrow
    ctx.beginPath()
    ctx.moveTo(37, 19.5)
    ctx.quadraticCurveTo(42, 18, 47, 20.5)
    ctx.strokeStyle = '#3a2010'
    ctx.lineWidth = 1.6
    ctx.stroke()

    // Small nose tip
    ctx.beginPath()
    ctx.moveTo(49, 30)
    ctx.lineTo(50.5, 31)
    ctx.lineTo(49, 32)
    ctx.strokeStyle = '#c27a60'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Gentle lips
    ctx.beginPath()
    ctx.moveTo(44, 37.5)
    ctx.lineTo(48, 38)
    ctx.strokeStyle = '#b96b58'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Front Hair & Bangs (dark chocolate brown #3a2010 with warm highlights)
    ctx.fillStyle = '#3a2010'
    // Crown of head
    ctx.beginPath()
    ctx.moveTo(22, 24)
    ctx.bezierCurveTo(20, 8, 36, 6, 48, 12)
    ctx.bezierCurveTo(52, 14, 52, 20, 48, 22)
    ctx.bezierCurveTo(44, 20, 38, 20, 36, 24)
    ctx.bezierCurveTo(34, 20, 30, 20, 28, 24)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#1f1007'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Bang strands
    ctx.beginPath()
    ctx.moveTo(34, 12)
    ctx.quadraticCurveTo(40, 18, 44, 23)
    ctx.quadraticCurveTo(39, 17, 34, 12)
    ctx.fillStyle = '#4a2815'
    ctx.fill()

    // Front side lock framing cheek
    ctx.beginPath()
    ctx.moveTo(32, 18)
    ctx.quadraticCurveTo(32, 34, 30, 42)
    ctx.quadraticCurveTo(35, 34, 35, 20)
    ctx.fillStyle = '#3a2010'
    ctx.fill()
    ctx.strokeStyle = '#1f1007'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Gloss highlight curve on hair
    ctx.beginPath()
    ctx.arc(36, 12, 10, -Math.PI * 0.8, -Math.PI * 0.2)
    ctx.strokeStyle = '#704526'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
    canvas.refresh()
  }

  // 2. Priya Hair Back / Ponytail (56x72) - Pivot at top left (16, 10)
  if (!tex.exists('priya_hair_back')) {
    const canvas = tex.createCanvas('priya_hair_back', 56, 72)!
    const ctx = canvas.getContext()

    // Hair scrunchie / tie band
    ctx.beginPath()
    ctx.arc(18, 14, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#a855f7'
    ctx.fill()
    ctx.strokeStyle = '#6b21a8'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Long cascading locks
    ctx.beginPath()
    ctx.moveTo(18, 16)
    ctx.bezierCurveTo(8, 24, 6, 42, 12, 58)
    ctx.bezierCurveTo(16, 68, 28, 68, 24, 56)
    ctx.bezierCurveTo(20, 44, 26, 32, 22, 18)
    ctx.closePath()
    ctx.fillStyle = '#3a2010'
    ctx.fill()
    ctx.strokeStyle = '#1f1007'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Inner hair strands & highlights
    ctx.beginPath()
    ctx.moveTo(16, 20)
    ctx.quadraticCurveTo(10, 36, 14, 54)
    ctx.strokeStyle = '#5a351e'
    ctx.lineWidth = 2.2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(20, 22)
    ctx.quadraticCurveTo(16, 40, 20, 52)
    ctx.strokeStyle = '#704526'
    ctx.lineWidth = 1.8
    ctx.stroke()

    canvas.refresh()
  }

  // 3. Priya Torso with Lavender Hoodie & Backpack (64x64)
  if (!tex.exists('priya_torso')) {
    const canvas = tex.createCanvas('priya_torso', 64, 64)!
    const ctx = canvas.getContext()

    // Backpack (behind the hoodie, on left side)
    ctx.fillStyle = '#1e1b4b' // deep indigo/navy
    ctx.beginPath()
    ctx.roundRect(8, 16, 20, 36, 8)
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.stroke()
    // Backpack zipper / pocket
    ctx.beginPath()
    ctx.roundRect(6, 24, 10, 22, 4)
    ctx.fillStyle = '#2e2a72'
    ctx.fill()
    ctx.strokeStyle = '#818cf8'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Big Lavender Hoodie Body
    ctx.beginPath()
    ctx.moveTo(22, 14)
    ctx.bezierCurveTo(22, 8, 44, 8, 46, 14) // neck / shoulders
    ctx.lineTo(50, 44)
    ctx.bezierCurveTo(50, 52, 20, 52, 20, 44) // waist
    ctx.closePath()
    const hoodieGrd = ctx.createLinearGradient(20, 10, 50, 50)
    hoodieGrd.addColorStop(0, '#d8b4fe')
    hoodieGrd.addColorStop(0.4, '#c084fc')
    hoodieGrd.addColorStop(1, '#9333ea')
    ctx.fillStyle = hoodieGrd
    ctx.fill()
    ctx.strokeStyle = '#581c87'
    ctx.lineWidth = 2
    ctx.stroke()

    // Hood draped behind neck
    ctx.beginPath()
    ctx.moveTo(18, 14)
    ctx.bezierCurveTo(14, 18, 16, 28, 24, 26)
    ctx.bezierCurveTo(22, 20, 22, 16, 26, 14)
    ctx.fillStyle = '#a855f7'
    ctx.fill()
    ctx.strokeStyle = '#581c87'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // White Hoodie drawstrings
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(33, 16)
    ctx.quadraticCurveTo(31, 26, 33, 33)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(37, 16)
    ctx.quadraticCurveTo(39, 25, 37, 31)
    ctx.stroke()
    // Aglets (tips)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(32, 33, 2, 3)
    ctx.fillRect(36, 31, 2, 3)

    // Kangaroo Front Pouch Pocket
    ctx.beginPath()
    ctx.moveTo(28, 38)
    ctx.lineTo(44, 38)
    ctx.lineTo(47, 48)
    ctx.lineTo(25, 48)
    ctx.closePath()
    ctx.fillStyle = '#a855f7'
    ctx.fill()
    ctx.strokeStyle = '#6b21a8'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Ribbed waistband
    ctx.fillStyle = '#7e22ce'
    ctx.beginPath()
    ctx.roundRect(20, 48, 29, 6, [0, 0, 4, 4])
    ctx.fill()

    // Backpack strap across shoulder
    ctx.beginPath()
    ctx.moveTo(26, 14)
    ctx.quadraticCurveTo(28, 26, 25, 42)
    ctx.strokeStyle = '#1e1b4b'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.strokeStyle = '#818cf8'
    ctx.lineWidth = 1.5
    ctx.stroke()

    canvas.refresh()
  }

  // 4. Priya Back Arm (36x44) - Swings behind body
  if (!tex.exists('priya_arm_back')) {
    const canvas = tex.createCanvas('priya_arm_back', 36, 44)!
    const ctx = canvas.getContext()

    // Shoulder to hand
    ctx.beginPath()
    ctx.moveTo(14, 6)
    ctx.bezierCurveTo(8, 16, 8, 28, 12, 36)
    ctx.lineTo(18, 36)
    ctx.bezierCurveTo(16, 26, 18, 16, 22, 6)
    ctx.closePath()
    ctx.fillStyle = '#a855f7'
    ctx.fill()
    ctx.strokeStyle = '#581c87'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Wrist cuff
    ctx.fillStyle = '#7e22ce'
    ctx.fillRect(10, 33, 9, 4)

    // Hand
    ctx.beginPath()
    ctx.arc(14, 39, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#f6d2b5'
    ctx.fill()
    ctx.strokeStyle = '#c27a60'
    ctx.lineWidth = 1
    ctx.stroke()

    canvas.refresh()
  }

  // 5. Priya Front Arm with Glowing Smartphone (48x48)
  if (!tex.exists('priya_arm_front')) {
    const canvas = tex.createCanvas('priya_arm_front', 48, 48)!
    const ctx = canvas.getContext()

    // Sleeve bent forward at elbow
    ctx.beginPath()
    ctx.moveTo(12, 10)
    ctx.quadraticCurveTo(18, 18, 26, 20)
    ctx.lineTo(34, 20)
    ctx.lineTo(34, 28)
    ctx.quadraticCurveTo(24, 28, 10, 20)
    ctx.closePath()
    ctx.fillStyle = '#c084fc'
    ctx.fill()
    ctx.strokeStyle = '#581c87'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Wrist cuff
    ctx.fillStyle = '#7e22ce'
    ctx.fillRect(31, 19, 5, 10)

    // Hand holding phone
    ctx.beginPath()
    ctx.arc(38, 24, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = '#f6d2b5'
    ctx.fill()

    // Smartphone (tilted upward/facing Priya)
    ctx.save()
    ctx.translate(39, 21)
    ctx.rotate(-0.25)

    // Phone casing (dark charcoal)
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(-2, -10, 9, 18, 2)
    ctx.fill()
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.stroke()

    // Phone glowing screen
    ctx.fillStyle = '#e0f2fe'
    ctx.beginPath()
    ctx.roundRect(0, -9, 6, 16, 1)
    ctx.fill()

    // Bright cyan/white screen glow bloom
    const glow = ctx.createRadialGradient(3, -1, 0, 3, -1, 12)
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    glow.addColorStop(0.4, 'rgba(56, 189, 248, 0.65)')
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(3, -1, 12, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
    canvas.refresh()
  }

  // 6. Priya Phone Ambient Glow Overlay (64x64)
  if (!tex.exists('priya_phone_glow')) {
    const canvas = tex.createCanvas('priya_phone_glow', 64, 64)!
    const ctx = canvas.getContext()
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 30)
    grd.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    grd.addColorStop(0.3, 'rgba(125, 211, 252, 0.55)')
    grd.addColorStop(0.7, 'rgba(56, 189, 248, 0.2)')
    grd.addColorStop(1, 'rgba(56, 189, 248, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 64, 64)
    canvas.refresh()
  }

  // 7. Priya Leg (Left & Right - 32x56)
  if (!tex.exists('priya_leg')) {
    const canvas = tex.createCanvas('priya_leg', 32, 56)!
    const ctx = canvas.getContext()

    // Dark charcoal pants leg
    ctx.beginPath()
    ctx.moveTo(10, 4)
    ctx.lineTo(22, 4)
    ctx.bezierCurveTo(23, 20, 21, 34, 20, 42)
    ctx.lineTo(12, 42)
    ctx.bezierCurveTo(11, 34, 9, 20, 10, 4)
    ctx.closePath()
    ctx.fillStyle = '#1e293b' // dark slate/charcoal
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // Pant crease highlights
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(14, 12)
    ctx.lineTo(17, 36)
    ctx.stroke()

    // Rolled cuff above ankle
    ctx.fillStyle = '#334155'
    ctx.beginPath()
    ctx.roundRect(11, 40, 10, 4, 1.5)
    ctx.fill()

    // Ankle / sock
    ctx.fillStyle = '#f6d2b5'
    ctx.fillRect(13, 44, 6, 3)

    // Purple Sneaker (matching reference image)
    // Shoe body
    ctx.beginPath()
    ctx.moveTo(12, 46)
    ctx.lineTo(20, 46)
    ctx.bezierCurveTo(24, 48, 27, 49, 27, 52)
    ctx.lineTo(8, 52)
    ctx.bezierCurveTo(8, 48, 10, 46, 12, 46)
    ctx.closePath()
    ctx.fillStyle = '#a855f7' // purple shoe upper
    ctx.fill()
    ctx.strokeStyle = '#581c87'
    ctx.lineWidth = 1.4
    ctx.stroke()

    // White sole & white toe cap
    ctx.fillStyle = '#ffffff'
    // Crisp white sole
    ctx.fillRect(7, 51, 21, 4)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 0.8
    ctx.strokeRect(7, 51, 21, 4)

    // White toe cap
    ctx.beginPath()
    ctx.arc(25, 51, 3, 0, Math.PI * 1.5, true)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // White laces
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(16, 47)
    ctx.lineTo(20, 49)
    ctx.moveTo(18, 47)
    ctx.lineTo(22, 49)
    ctx.stroke()

    canvas.refresh()
  }

  // 8. Ground Shadow & Wet Puddle Sheen (56x22)
  if (!tex.exists('priya_shadow')) {
    const canvas = tex.createCanvas('priya_shadow', 56, 22)!
    const ctx = canvas.getContext()

    // Soft asphalt shadow
    const grd = ctx.createRadialGradient(28, 11, 0, 28, 11, 26)
    grd.addColorStop(0, 'rgba(5, 7, 18, 0.65)')
    grd.addColorStop(0.5, 'rgba(5, 7, 18, 0.4)')
    grd.addColorStop(1, 'rgba(5, 7, 18, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(28, 11, 26, 9, 0, 0, Math.PI * 2)
    ctx.fill()

    // Wet puddle specular sheen (subtle gold/cyan reflection)
    ctx.beginPath()
    ctx.ellipse(28, 11, 16, 4.5, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 214, 153, 0.16)'
    ctx.fill()

    canvas.refresh()
  }
}

/**
 * Builds stylized Indian humanoid characters for Allies, Salim, Aunty, Kavya, Guard, etc.
 */
function buildHumanoidTextures(tex: Phaser.Textures.TextureManager) {
  const npcStyles: Record<string, { skin: string; hair: string; shirt: string; shirtShade: string; pants: string; extra?: string }> = {
    orange: { skin: '#e2ad8b', hair: '#2b1b11', shirt: '#ea580c', shirtShade: '#c2410c', pants: '#1e293b', extra: 'moustache' }, // Mr. Salim
    lime: { skin: '#deb887', hair: '#1a1008', shirt: '#65a30d', shirtShade: '#4d7c0f', pants: '#3f6212', extra: 'dupatta' }, // Neighbor aunty
    yellow: { skin: '#f6d2b5', hair: '#3a2010', shirt: '#eab308', shirtShade: '#ca8a04', pants: '#1e293b', extra: 'student' }, // Kavya
    blue: { skin: '#d29b76', hair: '#1c1917', shirt: '#2563eb', shirtShade: '#1d4ed8', pants: '#0f172a', extra: 'cap' }, // Guard
    cyan: { skin: '#f6d2b5', hair: '#3a2010', shirt: '#06b6d4', shirtShade: '#0891b2', pants: '#1e293b', extra: 'scarf' }, // Meera
    white: { skin: '#f6d2b5', hair: '#442816', shirt: '#f8fafc', shirtShade: '#cbd5e1', pants: '#334155', extra: 'helper' }, // Helper
    red: { skin: '#deb887', hair: '#2d180b', shirt: '#dc2626', shirtShade: '#b91c1c', pants: '#1e293b' },
    green: { skin: '#e2ad8b', hair: '#1f1309', shirt: '#16a34a', shirtShade: '#15803d', pants: '#1e293b' },
    purple: { skin: '#f6d2b5', hair: '#2b170c', shirt: '#9333ea', shirtShade: '#7e22ce', pants: '#1e293b' },
    brown: { skin: '#c88e68', hair: '#1c1917', shirt: '#854d0e', shirtShade: '#713f12', pants: '#1e293b' },
  }

  for (const [colorName, s] of Object.entries(npcStyles)) {
    // 1. Humanoid Head (52x52)
    const headKey = `human_head_${colorName}`
    if (!tex.exists(headKey)) {
      const canvas = tex.createCanvas(headKey, 52, 52)!
      const ctx = canvas.getContext()

      // Face base
      ctx.beginPath()
      ctx.arc(26, 26, 14, 0, Math.PI * 2)
      ctx.fillStyle = s.skin
      ctx.fill()
      ctx.strokeStyle = '#2b170c'
      ctx.lineWidth = 1.4
      ctx.stroke()

      // Eyes
      ctx.fillStyle = '#1c1917'
      ctx.beginPath()
      ctx.arc(32, 25, 2, 0, Math.PI * 2)
      ctx.arc(22, 25, 2, 0, Math.PI * 2)
      ctx.fill()

      // Hair
      ctx.fillStyle = s.hair
      if (s.extra === 'cap') {
        // Guard cap
        ctx.fillStyle = '#1e3a8a'
        ctx.beginPath()
        ctx.arc(26, 20, 14, Math.PI, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(16, 18, 22, 5)
        ctx.fillStyle = '#fbbf24' // gold badge
        ctx.fillRect(24, 15, 4, 4)
      } else if (s.extra === 'dupatta') {
        // Aunty hair with dupatta border
        ctx.beginPath()
        ctx.arc(26, 20, 14, Math.PI * 0.9, Math.PI * 2.1)
        ctx.fill()
        ctx.strokeStyle = '#bef264'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(26, 24, 15, Math.PI * 0.8, Math.PI * 1.5)
        ctx.stroke()
      } else {
        // Standard hair
        ctx.beginPath()
        ctx.arc(26, 20, 14, Math.PI * 0.85, Math.PI * 2.15)
        ctx.fill()
      }

      // Moustache for Salim
      if (s.extra === 'moustache') {
        ctx.strokeStyle = '#1c1917'
        ctx.lineWidth = 2.2
        ctx.beginPath()
        ctx.moveTo(21, 31)
        ctx.quadraticCurveTo(26, 33, 31, 31)
        ctx.stroke()
      } else {
        // Smile
        ctx.strokeStyle = '#b96b58'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(27, 28, 4, 0.2, Math.PI * 0.8)
        ctx.stroke()
      }

      canvas.refresh()
    }

    // 2. Humanoid Torso (56x56)
    const torsoKey = `human_torso_${colorName}`
    if (!tex.exists(torsoKey)) {
      const canvas = tex.createCanvas(torsoKey, 56, 56)!
      const ctx = canvas.getContext()

      // Shirt / Jacket
      ctx.beginPath()
      ctx.roundRect(14, 10, 28, 38, [6, 6, 3, 3])
      ctx.fillStyle = s.shirt
      ctx.fill()
      ctx.strokeStyle = s.shirtShade
      ctx.lineWidth = 2
      ctx.stroke()

      // Collar
      ctx.fillStyle = s.shirtShade
      ctx.beginPath()
      ctx.moveTo(22, 10)
      ctx.lineTo(28, 20)
      ctx.lineTo(34, 10)
      ctx.closePath()
      ctx.fill()

      if (s.extra === 'moustache') {
        // Salim's tea vendor towel over shoulder
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(15, 12, 6, 30)
      }

      canvas.refresh()
    }

    // 3. Humanoid Leg (28x48)
    const legKey = `human_leg_${colorName}`
    if (!tex.exists(legKey)) {
      const canvas = tex.createCanvas(legKey, 28, 48)!
      const ctx = canvas.getContext()

      // Pants
      ctx.fillStyle = s.pants
      ctx.beginPath()
      ctx.roundRect(8, 4, 12, 36, 2)
      ctx.fill()

      // Shoe
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(6, 38, 16, 7, 2)
      ctx.fill()

      canvas.refresh()
    }
  }
}
