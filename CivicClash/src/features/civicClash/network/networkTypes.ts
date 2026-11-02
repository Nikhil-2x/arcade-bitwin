export type PlayerRole = 'runner' | 'saboteur'

export interface PlayerInfo {
  id: string
  name: string
  role: PlayerRole
  ready: boolean
}

export interface RoomState {
  code: string
  host: PlayerInfo | null
  guest: PlayerInfo | null
  status: 'waiting' | 'in_game'
  selectedLevel?: number
}

export interface MovementPacket {
  x: number
  y: number
  z: number
  yaw: number
  isMoving: boolean
  isSprinting: boolean
  timestamp: number
}

export interface PeerMovementEvent extends MovementPacket {
  id: string
  role: PlayerRole
}

export interface SpawnData {
  runnerSpawn: { x: number; y: number; z: number; yaw: number }
  saboteurSpawn: { x: number; y: number; z: number; yaw: number }
}

