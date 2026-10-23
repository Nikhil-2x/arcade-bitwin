import { useEffect, useRef } from 'react'
import { createGame } from './createGame.ts'

/** React only hosts the canvas. All gameplay lives in Phaser scenes. */
export default function GameCanvas() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const game = createGame(host.current!)
    return () => game.destroy(true)
  }, [])

  return <div ref={host} className="h-full w-full" />
}
