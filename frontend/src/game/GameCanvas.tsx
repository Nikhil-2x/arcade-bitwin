import { useEffect, useRef } from 'react'
import { createGame } from './createGame.ts'

/** Hosts the one Phaser game. It lives in the layout, so it survives every route change. */
export default function GameCanvas() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const game = createGame(host.current!)
    return () => game.destroy(true)
  }, [])

  return <div ref={host} className="game-host h-full w-full" />
}
