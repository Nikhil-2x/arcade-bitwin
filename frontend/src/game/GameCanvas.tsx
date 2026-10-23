import { useEffect, useRef } from 'react'
import { createGame } from './createGame.ts'

/**
 * React only hosts the canvas plus two DOM layers Phaser can't do cheaply:
 * the flashlight cursor and the CRT feed overlay. All gameplay lives in Phaser scenes.
 */
export default function GameCanvas() {
  const host = useRef<HTMLDivElement>(null)
  const cursor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const game = createGame(host.current!)
    return () => game.destroy(true)
  }, [])

  // Flashlight cursor: eases toward the pointer and grows over anything Phaser marks clickable.
  useEffect(() => {
    const el = cursor.current!
    if (!matchMedia('(pointer: fine)').matches) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let tx = innerWidth / 2
    let ty = innerHeight / 2
    let x = tx
    let y = ty
    let raf = 0
    let canvas: HTMLCanvasElement | null | undefined
    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      el.classList.add('is-visible')
    }
    const onLeave = () => el.classList.remove('is-visible')
    const onDown = () => el.classList.add('is-down')
    const onUp = () => el.classList.remove('is-down')
    const tick = () => {
      const k = still ? 1 : 0.28
      x += (tx - x) * k
      y += (ty - y) * k
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      canvas ??= host.current?.querySelector('canvas')
      el.classList.toggle('is-hover', canvas?.style.cursor === 'pointer')
      raf = requestAnimationFrame(tick)
    }
    addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    addEventListener('pointerdown', onDown)
    addEventListener('pointerup', onUp)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      removeEventListener('pointerdown', onDown)
      removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div className="stage">
      <div ref={host} className="h-full w-full" />
      <div className="feed" />
      <div ref={cursor} className="cursor" />
      <div className="rotate">
        Turn your phone sideways
        <small>Circle of Allies plays in landscape.</small>
      </div>
    </div>
  )
}
