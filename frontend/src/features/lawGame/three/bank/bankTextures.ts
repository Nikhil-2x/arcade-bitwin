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

function once<T>(make: () => T) {
  let value: T | null = null
  return () => (value ??= make())
}

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Segoe UI', Arial, sans-serif"

export const bankSign = once(() =>
  canvasTexture(1216, 160, (c) => {
    const brass = c.createLinearGradient(0, 0, 0, 160)
    brass.addColorStop(0, '#d9b566')
    brass.addColorStop(1, '#a37f35')
    c.fillStyle = brass
    c.fillRect(0, 0, 1216, 160)
    c.strokeStyle = '#3a2a12'
    c.lineWidth = 5
    c.strokeRect(9, 9, 1198, 142)
    c.fillStyle = '#2b1e0c'
    c.font = `bold 84px ${SERIF}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('KAVERI UNION BANK', 608, 84)
  }),
)

export const auditSign = once(() =>
  canvasTexture(512, 128, (c) => {
    c.fillStyle = '#ffcf3a'
    c.fillRect(0, 0, 512, 128)
    c.fillStyle = '#1b1304'
    c.font = `bold 48px ${SANS}`
    c.textAlign = 'center'
    c.fillText('AUDIT IN PROGRESS', 256, 58)
    c.font = `26px ${SANS}`
    c.fillText('Please do not disturb the table', 256, 100)
  }),
)

export const kioskScreen = once(() =>
  canvasTexture(256, 340, (c) => {
    c.fillStyle = '#0f2c49'
    c.fillRect(0, 0, 256, 340)
    c.fillStyle = '#f0c674'
    c.font = `bold 44px ${SANS}`
    c.textAlign = 'center'
    c.fillText('TAKE A', 128, 82)
    c.fillText('TOKEN', 128, 132)
    c.fillStyle = '#fff'
    c.beginPath()
    c.roundRect(48, 172, 160, 92, 16)
    c.fill()
    c.fillStyle = '#0f2c49'
    c.font = `bold 66px ${SANS}`
    c.fillText('E', 128, 242)
    c.fillStyle = '#b8c8db'
    c.font = `22px ${SANS}`
    c.fillText('Press to print', 128, 308)
  }),
)

export const securitySign = once(() =>
  canvasTexture(512, 96, (c) => {
    c.fillStyle = '#16202c'
    c.fillRect(0, 0, 512, 96)
    c.fillStyle = '#f0c674'
    c.font = `bold 44px ${SANS}`
    c.textAlign = 'center'
    c.fillText('SECURITY DESK', 256, 64)
  }),
)

/** Four grainy views of a hall, drawn once: this is set dressing, the real help comes from pressing E. */
export const cctvScreen = once(() =>
  canvasTexture(512, 288, (c) => {
    c.fillStyle = '#05090c'
    c.fillRect(0, 0, 512, 288)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const x = col * 256 + 4
        const y = row * 144 + 4
        const glow = c.createLinearGradient(x, y, x, y + 136)
        glow.addColorStop(0, '#49604f')
        glow.addColorStop(1, '#1a2a21')
        c.fillStyle = glow
        c.fillRect(x, y, 248, 136)
        c.fillStyle = '#7f9c87'
        c.fillRect(x + 20 + col * 40, y + 70, 80, 40)
        c.fillRect(x + 150, y + 30, 16, 90)
        c.fillStyle = '#c6e0cc'
        c.font = `16px ${SANS}`
        c.fillText(`CAM ${row * 2 + col + 1}   REC`, x + 8, y + 20)
      }
    }
  }),
)

export interface NoticeText {
  title: string
  lines: readonly string[]
  footer: string
}

const NOTICES: readonly NoticeText[] = [
  { title: 'NEVER SHARE YOUR OTP', lines: ['No bank employee will', 'ever ask for your OTP,', 'PIN or password.', '', 'A caller who does is', 'cheating you.'], footer: 'IT Act 2000, Section 66D' },
  { title: 'DO NOT LEND YOUR ACCOUNT', lines: ['Paid to let someone use', 'your account? That makes', 'you a money mule.', '', 'You can be prosecuted', 'for money laundering.'], footer: 'PMLA 2002, Section 3' },
  { title: 'A CHEQUE IS A PROMISE', lines: ['A cheque that bounces', 'can mean up to 2 years', 'in prison, or a fine of', 'twice the amount.', '', 'Check before you sign.'], footer: 'NI Act 1881, Section 138' },
  { title: 'TOO GOOD TO BE TRUE?', lines: ['Unregulated deposit', 'schemes are banned,', 'however good the', 'promised returns.', '', 'Walk away and report.'], footer: 'BUDS Act 2019, Section 3' },
]

function drawNotice(c: CanvasRenderingContext2D, notice: NoticeText, width: number, height: number) {
  c.fillStyle = '#f7f1e1'
  c.fillRect(0, 0, width, height)
  c.fillStyle = '#123a5e'
  c.fillRect(0, 0, width, height * 0.25)
  c.fillStyle = '#c9a24a'
  c.fillRect(0, height * 0.25, width, height * 0.012)
  c.textAlign = 'center'
  c.fillStyle = '#fff'
  const words = notice.title.split(' ')
  const half = Math.ceil(words.length / 2)
  c.font = `bold ${width * 0.1}px ${SANS}`
  c.fillText(words.slice(0, half).join(' '), width / 2, height * 0.115)
  c.fillText(words.slice(half).join(' '), width / 2, height * 0.195)
  c.fillStyle = '#1b1f28'
  c.font = `${width * 0.066}px ${SANS}`
  notice.lines.forEach((line, i) => c.fillText(line, width / 2, height * 0.34 + i * height * 0.075))
  c.fillStyle = '#123a5e'
  c.font = `bold ${width * 0.05}px ${SANS}`
  c.fillText(notice.footer, width / 2, height * 0.875)
  c.fillStyle = '#7a1d28'
  c.font = `bold ${width * 0.056}px ${SANS}`
  c.fillText('Cyber fraud helpline: 1930', width / 2, height * 0.95)
}

const noticeTextures: THREE.CanvasTexture[] = []
export function noticeTexture(index: number) {
  const i = index % NOTICES.length
  return (noticeTextures[i] ??= canvasTexture(420, 690, (c) => drawNotice(c, NOTICES[i], 420, 690)))
}

export const wallPanelTexture = once(() =>
  canvasTexture(512, 920, (c) => {
    c.fillStyle = '#123a5e'
    c.fillRect(0, 0, 512, 920)
    c.strokeStyle = '#c9a24a'
    c.lineWidth = 10
    c.strokeRect(22, 22, 468, 876)
    c.textAlign = 'center'
    c.fillStyle = '#f0c674'
    c.font = `bold 58px ${SERIF}`
    c.fillText('KAVERI', 256, 130)
    c.fillText('UNION BANK', 256, 200)
    c.fillStyle = '#fff'
    c.font = `34px ${SERIF}`
    const lines = ['Your money is', 'entrusted to us.', '', 'Your account is', 'yours alone.', '', 'Spotted something', 'wrong? Tell us, or', 'dial 1930.']
    lines.forEach((line, i) => c.fillText(line, 256, 300 + i * 50))
    c.fillStyle = '#f0c674'
    c.font = `bold 92px ${SERIF}`
    c.fillText('1930', 256, 850)
  }),
)

export const strongroomDoor = once(() =>
  canvasTexture(320, 256, (c) => {
    const steel = c.createLinearGradient(0, 0, 320, 0)
    steel.addColorStop(0, '#3a3e46')
    steel.addColorStop(0.5, '#62666f')
    steel.addColorStop(1, '#3a3e46')
    c.fillStyle = steel
    c.fillRect(0, 0, 320, 256)
    c.strokeStyle = '#23262c'
    c.lineWidth = 6
    c.strokeRect(6, 6, 308, 244)
    c.beginPath()
    c.arc(160, 128, 88, 0, Math.PI * 2)
    c.fillStyle = '#50545d'
    c.fill()
    c.strokeStyle = '#c9a24a'
    c.lineWidth = 7
    c.stroke()
    c.lineWidth = 10
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3 + 0.3
      c.beginPath()
      c.moveTo(160 - Math.cos(a) * 50, 128 - Math.sin(a) * 50)
      c.lineTo(160 + Math.cos(a) * 50, 128 + Math.sin(a) * 50)
      c.stroke()
    }
    c.beginPath()
    c.arc(160, 128, 17, 0, Math.PI * 2)
    c.fillStyle = '#c9a24a'
    c.fill()
  }),
)

export const shadowTexture = once(() =>
  canvasTexture(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 2, 32, 32, 32)
    g.addColorStop(0, 'rgba(20,14,8,0.5)')
    g.addColorStop(0.65, 'rgba(20,14,8,0.22)')
    g.addColorStop(1, 'rgba(20,14,8,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
  }),
)

/** The "now serving" board: redrawn only when the number changes. */
export function makeTokenBoard() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const c = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const draw = (token: number, counter: number) => {
    c.fillStyle = '#07090f'
    c.fillRect(0, 0, 512, 256)
    c.fillStyle = '#f0c674'
    c.font = `bold 34px ${SANS}`
    c.textAlign = 'center'
    c.fillText('NOW SERVING', 256, 50)
    c.fillStyle = '#ff5a3c'
    c.font = 'bold 118px Consolas, monospace'
    c.fillText(String(token).padStart(3, '0'), 256, 162)
    c.fillStyle = '#7ee0c4'
    c.font = `bold 38px ${SANS}`
    c.fillText(`Counter ${counter}`, 256, 222)
    texture.needsUpdate = true
  }
  return { texture, draw }
}
