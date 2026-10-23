import Phaser from 'phaser'
import { H, W } from './config/constants.ts'
import { BootScene } from './scenes/BootScene.ts'
import { BriefScene } from './scenes/BriefScene.ts'
import { EndingScene } from './scenes/EndingScene.ts'
import { LevelResultScene } from './scenes/LevelResultScene.ts'
import { LevelScene } from './scenes/LevelScene.ts'
import { LevelSelectScene } from './scenes/LevelSelectScene.ts'
import { MenuScene } from './scenes/MenuScene.ts'
import { PrologueScene } from './scenes/PrologueScene.ts'
import { PromptScene } from './scenes/PromptScene.ts'
import { ResultsScene } from './scenes/ResultsScene.ts'
import { RoundEndScene } from './scenes/RoundEndScene.ts'
import { TrailerScene } from './scenes/TrailerScene.ts'

export function createGame(parent: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#05060f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: [
      BootScene,
      TrailerScene,
      MenuScene,
      LevelSelectScene,
      PrologueScene,
      BriefScene,
      LevelScene,
      PromptScene,
      RoundEndScene,
      LevelResultScene,
      EndingScene,
      ResultsScene,
    ],
  })
  // handy for debugging in the browser console and in automated smoke tests
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game
  return game
}
