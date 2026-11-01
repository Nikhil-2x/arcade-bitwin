import * as THREE from 'three'

/** Drawn once per session and reused by the hide and search screens: nothing here is downloaded. */
function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void, repeat = false) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

const once = <T,>(make: () => T) => {
  let value: T | undefined
  return () => (value ??= make())
}

/** Seeded, so the two rounds of a match see the same sky and gravel. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

export const skyTexture = once(() =>
  canvasTexture(4096, 1024, (c) => {
    // The arcade's synthwave dusk: ink overhead, burning down to orange at the horizon.
    const g = c.createLinearGradient(0, 0, 0, 1024)
    g.addColorStop(0, '#070914')
    g.addColorStop(0.3, '#12102e')
    g.addColorStop(0.42, '#2a1240')
    g.addColorStop(0.47, '#7a2a5c')
    g.addColorStop(0.495, '#ff8a5b')
    g.addColorStop(0.51, '#3a1c46')
    g.addColorStop(1, '#1a1426')
    c.fillStyle = g
    c.fillRect(0, 0, 4096, 1024)
    const r = seeded(7)
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.7})`
      const size = r() < 0.1 ? 2 : 1
      c.fillRect(r() * 4096, r() * 400, size, size)
    }
  }),
)

export const gravelTexture = once(() => {
  const t = canvasTexture(
    256,
    256,
    (c) => {
      c.fillStyle = '#3a3836'
      c.fillRect(0, 0, 256, 256)
      const r = seeded(11)
      for (let i = 0; i < 2600; i++) {
        const v = 40 + r() * 70
        c.fillStyle = `rgb(${v},${v - 2},${v - 5})`
        c.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3)
      }
    },
    true,
  )
  t.repeat.set(70, 30)
  return t
})

export const glowTexture = once(() =>
  canvasTexture(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
  }),
)

export const tapeTexture = once(() =>
  canvasTexture(
    512,
    48,
    (c) => {
      c.fillStyle = '#ffcf3a'
      c.fillRect(0, 0, 512, 48)
      c.fillStyle = '#1b1304'
      c.font = '30px Bungee, Impact, sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('CRIME SCENE  DO NOT CROSS', 256, 25)
    },
    true,
  ),
)

export const stationSignTexture = once(() =>
  canvasTexture(1024, 256, (c) => {
    // The yellow name board of every Indian station.
    c.fillStyle = '#f5c518'
    c.fillRect(0, 0, 1024, 256)
    c.strokeStyle = '#1a1405'
    c.lineWidth = 10
    c.strokeRect(10, 10, 1004, 236)
    c.fillStyle = '#1a1405'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = 'bold 84px "Nirmala UI", "Noto Sans Devanagari", Mangal, sans-serif'
    c.fillText('चंदनपुर जंक्शन', 512, 82)
    c.font = '72px Bungee, Impact, sans-serif'
    c.fillText('CHANDANPUR JN', 512, 182)
  }),
)

const DEPARTURES = [
  ['12627', 'Chandanpur Exp', 'HELD'],
  ['51204', 'Passenger', 'HELD'],
  ['17019', 'Coalfield Mail', 'HELD'],
  ['22410', 'Intercity', 'HELD'],
  ['08813', 'Parcel Special', 'HELD'],
]

export const departureBoardTexture = once(() =>
  canvasTexture(420, 525, (c) => {
    c.fillStyle = '#0a0d1c'
    c.fillRect(0, 0, 420, 525)
    c.textBaseline = 'middle'
    c.fillStyle = '#ffb547'
    c.font = '30px Bungee, Impact, sans-serif'
    c.fillText('DEPARTURES', 22, 40)
    c.fillStyle = '#9eecff'
    c.font = '19px "Varela Round", sans-serif'
    c.fillText('Platform 2, signal failure', 22, 76)
    c.fillStyle = 'rgba(255,255,255,0.15)'
    c.fillRect(22, 96, 376, 2)
    DEPARTURES.forEach(([number, name, status], i) => {
      const y = 134 + i * 54
      c.font = '20px "Varela Round", sans-serif'
      c.fillStyle = '#ffb547'
      c.fillText(number, 22, y)
      c.fillStyle = '#eef1ff'
      c.fillText(name, 92, y)
      c.fillStyle = '#ff6a5a'
      c.fillText(status, 340, y)
    })
    c.fillStyle = 'rgba(255,255,255,0.15)'
    c.fillRect(22, 404, 376, 2)
    c.fillStyle = '#eef1ff'
    c.font = '18px "Varela Round", sans-serif'
    c.fillText('See something wrong on the line?', 22, 440)
    c.fillStyle = '#ffb547'
    c.font = '30px Bungee, Impact, sans-serif'
    c.fillText('CALL 139 OR 112', 22, 484)
  }),
)

/** One coach of the passing train, repeated along its length. */
export const coachTexture = once(() => {
  const t = canvasTexture(
    512,
    96,
    (c) => {
      c.fillStyle = '#b9b6ac'
      c.fillRect(0, 0, 512, 96)
      c.fillStyle = '#2f5f9e'
      c.fillRect(0, 0, 512, 22)
      c.fillRect(0, 66, 512, 30)
      c.fillStyle = '#ffdca0'
      for (let x = 50; x < 470; x += 52) c.fillRect(x, 28, 30, 30)
      c.fillStyle = '#1b2d4c'
      c.fillRect(8, 24, 22, 66)
      c.fillRect(482, 24, 22, 66)
      c.fillStyle = '#05060c'
      c.fillRect(508, 0, 4, 96)
    },
    true,
  )
  return t
})
