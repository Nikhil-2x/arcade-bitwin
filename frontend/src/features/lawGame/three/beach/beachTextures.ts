import * as THREE from 'three'

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const once = <T,>(make: () => T) => {
  let value: T | undefined
  return () => (value ??= make())
}

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/** A clear morning: deep blue overhead, pale at the horizon, a line of hazy hills, and fair-weather cloud. */
export const skyTexture = once(() =>
  canvasTexture(4096, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024)
    g.addColorStop(0, '#2f86cf')
    g.addColorStop(0.3, '#62b2e6')
    g.addColorStop(0.47, '#c4e8f6')
    g.addColorStop(0.5, '#e6f4f4')
    g.addColorStop(0.51, '#2f8fa8')
    g.addColorStop(1, '#14586f')
    c.fillStyle = g
    c.fillRect(0, 0, 4096, 1024)

    const r = seeded(11)
    for (let i = 0; i < 46; i++) {
      const x = r() * 4096
      const y = 250 + r() * 215
      const size = 0.3 + ((y - 250) / 215) * 0.6
      c.globalAlpha = 0.45 + r() * 0.4
      for (let puff = 0; puff < 12; puff++) {
        const px = x + (r() - 0.5) * 300 * size
        const py = y + (r() - 0.5) * 34 * size
        const radius = (28 + r() * 44) * size
        // Drawn again a full turn away, so a cloud crossing the texture's edge has no seam.
        for (const wrap of [-4096, 0, 4096]) {
          const cloud = c.createRadialGradient(px + wrap, py, 0, px + wrap, py, radius)
          cloud.addColorStop(0, 'rgba(255,255,255,0.85)')
          cloud.addColorStop(1, 'rgba(255,255,255,0)')
          c.fillStyle = cloud
          c.fillRect(px + wrap - radius, py - radius, radius * 2, radius * 2)
        }
      }
    }
    c.globalAlpha = 1

    // Hills across part of the horizon: the coast carries on in the haze.
    c.fillStyle = 'rgba(102,146,160,0.75)'
    c.beginPath()
    c.moveTo(900, 512)
    for (let x = 900; x <= 2300; x += 20) {
      const t = (x - 900) / 1400
      c.lineTo(x, 512 - Math.sin(t * Math.PI) * (20 + Math.sin(x * 0.012) * 8 + Math.sin(x * 0.037) * 4))
    }
    c.closePath()
    c.fill()
  }),
)

const softDisc = (stops: ReadonlyArray<readonly [number, string]>) => () =>
  canvasTexture(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    for (const [at, color] of stops) g.addColorStop(at, color)
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
  })

export const sunTexture = once(softDisc([[0, 'rgba(255,255,245,1)'], [0.16, 'rgba(255,250,215,1)'], [0.3, 'rgba(255,236,170,0.4)'], [1, 'rgba(255,225,150,0)']]))
/** Dark in the middle and fading out, for the soft shadow under anything sitting on the sand. */
export const shadowTexture = once(softDisc([[0, 'rgba(20,16,12,0.5)'], [0.55, 'rgba(20,16,12,0.3)'], [1, 'rgba(20,16,12,0)']]))

function sign(lines: ReadonlyArray<readonly [text: string, font: string, color: string]>, background: string, border: string) {
  return canvasTexture(512, 320, (c) => {
    c.fillStyle = background
    c.fillRect(0, 0, 512, 320)
    c.strokeStyle = border
    c.lineWidth = 12
    c.strokeRect(10, 10, 492, 300)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const step = 280 / lines.length
    lines.forEach(([text, font, color], i) => {
      c.font = font
      c.fillStyle = color
      c.fillText(text, 256, 20 + step * (i + 0.5))
    })
  })
}

export const hatcherySign = once(() =>
  sign(
    [
      ['TURTLE HATCHERY', 'bold 46px sans-serif', '#14513a'],
      ['Olive ridley nests', '34px sans-serif', '#14513a'],
      ['Protected: Schedule I', '34px sans-serif', '#14513a'],
      ['Wild Life (Protection) Act, 1972', '26px sans-serif', '#14513a'],
      ['Report harm: call 112', 'bold 32px sans-serif', '#a3231c'],
    ],
    '#f3eccf',
    '#2d6a4f',
  ),
)

export const flagSign = once(() =>
  sign(
    [
      ['DANGER', 'bold 74px sans-serif', '#b3261e'],
      ['Strong currents', '38px sans-serif', '#222'],
      ['Swim only between the flags', '30px sans-serif', '#222'],
      ['Obey the lifeguard', 'bold 34px sans-serif', '#222'],
    ],
    '#fff6d6',
    '#b3261e',
  ),
)

export const barSign = once(() =>
  sign(
    [
      ['ROSA’S', 'bold 92px Georgia, serif', '#fff3c9'],
      ['Beach shack', 'italic 46px Georgia, serif', '#ffd98a'],
      ['Fresh lime soda · Fried fish', '28px sans-serif', '#fff3c9'],
    ],
    '#b0432c',
    '#6b2518',
  ),
)

export const lostPropertySign = once(() =>
  sign(
    [
      ['LOST PROPERTY', 'bold 54px sans-serif', '#1d3b5c'],
      ['Handed in on the beach', '34px sans-serif', '#1d3b5c'],
      ['Ask a lifeguard', '34px sans-serif', '#1d3b5c'],
    ],
    '#f1f4f6',
    '#2f6f9e',
  ),
)

export const tapeTexture = once(() =>
  canvasTexture(512, 48, (c) => {
    c.fillStyle = '#ffcf3a'
    c.fillRect(0, 0, 512, 48)
    c.fillStyle = '#1b1304'
    c.font = 'bold 26px sans-serif'
    c.textBaseline = 'middle'
    c.fillText('FOREST DEPT  DO NOT CROSS', 40, 25)
  }),
)
