import { io, Socket } from 'socket.io-client'
import type { 
  PlayerInfo, 
  RoomState, 
  MovementPacket, 
  PeerMovementEvent, 
  SpawnData 
} from './networkTypes.ts'
import type {
  NPCState,
  InteractiveObjectState,
  InformationEntry,
  DialogueSession,
  DialogueOutcome,
  DialogueStatDelta,
  GameTelemetryM2
} from './milestone2Types.ts'
import type {
  MatchState,
  RoundResult,
  LevelSummary,
  FinalMatchResult
} from './milestone4Types.ts'

export class SocketClient {
  private socket: Socket | null = null
  private serverUrl: string

  constructor() {
    if (typeof window !== 'undefined') {
      const customUrl = (import.meta as any).env?.VITE_SERVER_URL
      const isViteDev = window.location.port === '5173' || window.location.port === '5174'
      if (customUrl) {
        this.serverUrl = customUrl
      } else if (isViteDev) {
        this.serverUrl = `http://${window.location.hostname}:8788`
      } else {
        // Production: Connect to the same origin serving the web application (auto http/https and ws/wss)
        this.serverUrl = window.location.origin
      }
    } else {
      this.serverUrl = 'http://localhost:8788'
    }
  }

  public connect(): Socket {
    if (this.socket) {
      return this.socket
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    })

    this.socket.on('connect', () => {
      console.log(`[SocketClient] Connected: ${this.socket?.id} at ${this.serverUrl}`)
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`[SocketClient] Disconnected: ${reason}`)
    })

    this.socket.on('connect_error', (err) => {
      console.warn(`[SocketClient] Connection error:`, err.message)
    })

    return this.socket
  }

  public getSocket(): Socket | null {
    return this.socket
  }

  public isConnected(): boolean {
    return !!(this.socket && this.socket.connected)
  }

  public createRoom(playerName: string) {
    this.connect().emit('create-room', { playerName })
  }

  public joinRoom(code: string, playerName: string) {
    this.connect().emit('join-room', { code, playerName })
  }

  public startMatch(startingLevel?: number) {
    this.connect().emit('start-match', { startingLevel })
  }

  public selectLobbyLevel(level: number) {
    this.connect().emit('lobby:level:select', { level })
  }

  public chooseMatchLevel(level: number) {
    this.connect().emit('match:choose-level', { level })
  }

  public sendMovement(packet: MovementPacket) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player-move', packet)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MILESTONE 2 & 3: ACTIONS
  // ─────────────────────────────────────────────────────────────
  public interactWithNPC(npcId: string) {
    this.connect().emit('npc:interact', { npcId })
  }

  public selectDialogueOption(npcId: string, optionId: string) {
    this.connect().emit('npc:dialogue:select', { npcId, optionId })
  }

  public performObjectAction(objId: string, actionType: string = 'default') {
    this.connect().emit('object:action', { objId, actionType })
  }

  public useSaboteurAbility(abilityId: string) {
    this.connect().emit('saboteur:ability:use', { abilityId })
  }

  public useRunnerTool(tool: 'scan' | 'lock' | 'verify' | 'help', targetId: string = '') {
    this.connect().emit('runner:tool:use', { tool, targetId })
  }

  public onRunnerToolResult(cb: (data: { success: boolean; message: string; found?: boolean }) => void) {
    const s = this.connect()
    s.off('runner:tool:result')
    s.on('runner:tool:result', cb)
  }

  public startEscapeChannel() {
    this.connect().emit('escape:channel:start')
  }

  public cancelEscapeChannel() {
    this.connect().emit('escape:channel:cancel')
  }

  public requestInformation() {
    this.connect().emit('information:request')
  }

  // ─────────────────────────────────────────────────────────────
  // MILESTONE 4: MATCH LIFECYCLE ACTIONS
  // ─────────────────────────────────────────────────────────────
  public togglePlayerReady(ready: boolean) {
    this.connect().emit('match:player:ready', { ready })
  }

  public addBotPlayer() {
    this.connect().emit('lobby:bot:add')
  }

  public removeBotPlayer() {
    this.connect().emit('lobby:bot:remove')
  }

  public confirmRoundReady() {
    this.connect().emit('match:round:ready')
  }

  public forceStartRound() {
    this.connect().emit('match:round:force-start')
  }

  public continueMatch() {
    this.connect().emit('match:continue')
  }

  public requestRematch() {
    this.connect().emit('match:rematch:request')
  }

  public leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave-room')
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────
  public onRoomCreated(cb: (data: { code: string; player: PlayerInfo; room: RoomState }) => void) {
    const s = this.connect()
    s.off('room-created')
    s.on('room-created', cb)
  }

  public onRoomJoined(cb: (data: { code: string; player: PlayerInfo; room: RoomState }) => void) {
    const s = this.connect()
    s.off('room-joined')
    s.on('room-joined', cb)
  }

  public onJoinError(cb: (data: { message: string }) => void) {
    const s = this.connect()
    s.off('join-error')
    s.on('join-error', cb)
  }

  public onStartError(cb: (data: { message: string }) => void) {
    const s = this.connect()
    s.off('start-error')
    s.on('start-error', cb)
  }

  public onPeerJoined(cb: (data: { guest: PlayerInfo; room: RoomState }) => void) {
    const s = this.connect()
    s.off('peer-joined')
    s.on('peer-joined', cb)
  }

  public onPeerLeft(cb: (data: { message: string }) => void) {
    const s = this.connect()
    s.off('peer-left')
    s.on('peer-left', cb)
  }

  public onRoomClosed(cb: (data: { message: string }) => void) {
    const s = this.connect()
    s.off('room-closed')
    s.on('room-closed', cb)
  }

  public onMatchStarted(
    cb: (data: {
      room: RoomState
      spawnData: SpawnData
      matchState?: MatchState
      worldState?: {
        npcs: Record<string, NPCState>
        objects: Record<string, InteractiveObjectState>
        informationLog: InformationEntry[]
        telemetry: GameTelemetryM2
      }
    }) => void
  ) {
    const s = this.connect()
    s.off('match-started')
    s.on('match-started', cb)
  }

  public onPeerMoved(cb: (data: PeerMovementEvent) => void) {
    const s = this.connect()
    s.off('peer-moved')
    s.on('peer-moved', cb)
  }

  public onPlayerPositionCorrected(cb: (data: { x: number; y: number; z: number; yaw: number; reason: string }) => void) {
    const s = this.connect()
    s.off('player-position-corrected')
    s.on('player-position-corrected', cb)
  }

  // Milestone 2 Specific Listeners
  public onNPCDialogueSession(cb: (session: DialogueSession) => void) {
    const s = this.connect()
    s.off('npc:dialogue:session')
    s.on('npc:dialogue:session', cb)
  }

  public onDialogueResult(cb: (data: {
    npcId: string
    statusMessage: string
    npcState: NPCState
    physicalReaction?: string
    learningTip?: string
    clueUnlocked?: string
    pointsAwarded?: number
    outcome?: DialogueOutcome
    effects?: DialogueStatDelta
    npcResponseText?: string
    updatedSession?: DialogueSession
  }) => void) {
    const s = this.connect()
    s.off('dialogue:result')
    s.on('dialogue:result', cb)
  }

  public onNPCStateUpdate(cb: (data: { npcId: string; npcState: NPCState }) => void) {
    const s = this.connect()
    s.off('npc:state:update')
    s.on('npc:state:update', cb)
  }

  public onObjectStateUpdate(cb: (data: { objId: string; objState: InteractiveObjectState }) => void) {
    const s = this.connect()
    s.off('object:state:update')
    s.on('object:state:update', cb)
  }

  public onInformationUpdate(cb: (data: { informationLog: InformationEntry[] }) => void) {
    const s = this.connect()
    s.off('information:update')
    s.on('information:update', cb)
  }

  public onGameTelemetryUpdate(cb: (data: { telemetry: GameTelemetryM2 }) => void) {
    const s = this.connect()
    s.off('game:telemetry:update')
    s.on('game:telemetry:update', cb)
  }

  public onInteractionResult(cb: (data: { success: boolean; message: string }) => void) {
    const s = this.connect()
    s.off('interaction:result')
    s.on('interaction:result', cb)
  }

  public onNPCBatchUpdate(cb: (data: { npcs: Record<string, NPCState> }) => void) {
    const s = this.connect()
    s.off('npc:batch:update')
    s.on('npc:batch:update', cb)
  }

  public onNPCReactionTrigger(cb: (data: { npcId: string; reaction: any }) => void) {
    const s = this.connect()
    s.off('npc:reaction:trigger')
    s.on('npc:reaction:trigger', cb)
  }

  // ─────────────────────────────────────────────────────────────
  // MILESTONE 4: MATCH STATE & EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────
  public onLobbyReadyUpdate(cb: (data: { hostReady: boolean; guestReady: boolean; room: RoomState }) => void) {
    const s = this.connect()
    s.off('lobby:ready:update')
    s.on('lobby:ready:update', cb)
  }

  public onLobbyLevelUpdate(cb: (data: { selectedLevel: number; room: RoomState }) => void) {
    const s = this.connect()
    s.off('lobby:level:updated')
    s.on('lobby:level:updated', cb)
  }

  public onMatchLevelChanged(cb: (data: any) => void) {
    const s = this.connect()
    s.off('match:level:changed')
    s.on('match:level:changed', cb)
  }

  public onMatchStateUpdate(cb: (data: { matchState: MatchState }) => void) {
    const s = this.connect()
    s.off('match:state:update')
    s.on('match:state:update', cb)
  }

  public onMatchRoundStart(cb: (data: {
    currentLevel: number
    currentRound: number
    matchState: MatchState
    telemetry: GameTelemetryM2
    worldState: {
      npcs: Record<string, NPCState>
      objects: Record<string, InteractiveObjectState>
      informationLog: InformationEntry[]
    }
  }) => void) {
    const s = this.connect()
    s.off('match:round:start')
    s.on('match:round:start', cb)
  }

  public onMatchRoundEnd(cb: (data: { roundResult: RoundResult; matchState: MatchState }) => void) {
    const s = this.connect()
    s.off('match:round:end')
    s.on('match:round:end', cb)
  }

  public onMatchRoleSwitch(cb: (data: {
    currentLevel: number
    currentRound: number
    playerRoles: Record<string, any>
    matchState: MatchState
  }) => void) {
    const s = this.connect()
    s.off('match:role:switch')
    s.on('match:role:switch', cb)
  }

  public onMatchLevelResults(cb: (data: {
    summary: LevelSummary
    nextLevel: number
    matchState: MatchState
  }) => void) {
    const s = this.connect()
    s.off('match:level:results')
    s.on('match:level:results', cb)
  }

  public onMatchFinalResults(cb: (data: {
    finalResult: FinalMatchResult
    matchState: MatchState
  }) => void) {
    const s = this.connect()
    s.off('match:final:results')
    s.on('match:final:results', cb)
  }

  public onMatchRematchStart(cb: (data: {
    matchState: MatchState
    telemetry: GameTelemetryM2
    worldState: any
  }) => void) {
    const s = this.connect()
    s.off('match:rematch:start')
    s.on('match:rematch:start', cb)
  }

  public onMatchPaused(cb: (data: { reason: string; pauseRemainingSec: number }) => void) {
    const s = this.connect()
    s.off('match:paused')
    s.on('match:paused', cb)
  }

  // Milestone 6: Sealed Verdict & Environmental Chaos
  public submitVerdict(data: { suspectId: string; selectedEvidenceIds: string[]; counterNarrativeId?: string }) {
    this.connect().emit('verdict:submit', data)
  }

  public onMatchVerdictReveal(cb: (data: { verdictReveal: any; matchState: any }) => void) {
    const s = this.connect()
    s.off('match:verdict:reveal')
    s.on('match:verdict:reveal', cb)
  }

  public onEnvironmentUpdate(cb: (data: { environmentalState: any }) => void) {
    const s = this.connect()
    s.off('environment:update')
    s.on('environment:update', cb)
  }

  public onEnvironmentNoise(cb: (data: { position: { x: number; y: number; z: number } }) => void) {
    const s = this.connect()
    s.off('environment:noise:trigger')
    s.on('environment:noise:trigger', cb)
  }

  public removeGameListeners() {
    if (this.socket) {
      this.socket.off('room-created')
      this.socket.off('room-joined')
      this.socket.off('join-error')
      this.socket.off('peer-joined')
      this.socket.off('peer-left')
      this.socket.off('room-closed')
      this.socket.off('match-started')
      this.socket.off('peer-moved')
      this.socket.off('npc:dialogue:session')
      this.socket.off('dialogue:result')
      this.socket.off('npc:state:update')
      this.socket.off('object:state:update')
      this.socket.off('information:update')
      this.socket.off('game:telemetry:update')
      this.socket.off('interaction:result')
      this.socket.off('npc:batch:update')
      this.socket.off('npc:reaction:trigger')
      this.socket.off('lobby:ready:update')
      this.socket.off('match:state:update')
      this.socket.off('match:round:start')
      this.socket.off('match:round:end')
      this.socket.off('match:role:switch')
      this.socket.off('match:level:results')
      this.socket.off('match:final:results')
      this.socket.off('match:rematch:start')
      this.socket.off('match:paused')
    }
  }
}

export const socketClient = new SocketClient()
