import React, { useEffect, useRef, useState } from 'react'
import { socketClient } from './network/socketClient.ts'
import type { 
  PlayerRole, 
  RoomState, 
  MovementPacket, 
  PeerMovementEvent, 
  SpawnData 
} from './network/networkTypes.ts'
import type {
  DialogueSession,
  InformationEntry,
  GameTelemetryM2,
  NPCState,
  InteractiveObjectState,
  NPCPhysicalReaction
} from './network/milestone2Types.ts'
import type { MatchState } from './network/milestone4Types.ts'
import { ThreeUrbanScene } from './engine/threeUrbanScene.ts'
import { MainMenu } from './ui/MainMenu.tsx'
import { LobbyRoom } from './ui/LobbyRoom.tsx'
import { GameOverlayHUD } from './ui/GameOverlayHUD.tsx'
import { DialogueModalM2 } from './ui/DialogueModalM2.tsx'
import { EmergencyPhoneModal } from './ui/EmergencyPhoneModal.tsx'
import { InformationLogModal } from './ui/InformationLogModal.tsx'
import { LevelIntroModal } from './ui/LevelIntroModal.tsx'
import { RoundResultsModal } from './ui/RoundResultsModal.tsx'
import { RoleSwitchModal } from './ui/RoleSwitchModal.tsx'
import { LevelSummaryModal } from './ui/LevelSummaryModal.tsx'
import { FinalResultsModal } from './ui/FinalResultsModal.tsx'
import { TaskPanel } from './ui/TaskPanel.tsx'
import { AccusationModal } from './ui/AccusationModal.tsx'
import { VerdictRevealModal } from './ui/VerdictRevealModal.tsx'
import { CivicDebriefModal } from './ui/CivicDebriefModal.tsx'
import type { VerdictRevealData, CivicDebriefData } from './network/milestone6Types.ts'
import { sound } from './engine/audio.ts'
import { useJuice } from './engine/fx.ts'

export type AppView = 'menu' | 'lobby' | 'playing'

export default function CivicClashGame() {
  const [view, setView] = useState<AppView>('menu')
  const [isConnected, setIsConnected] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  const [playerName, setPlayerName] = useState(() => {
    return 'Player_' + Math.floor(100 + Math.random() * 900)
  })

  // Room & Player state
  const [room, setRoom] = useState<RoomState | null>(null)
  const [localRole, setLocalRole] = useState<PlayerRole>('runner')
  const [spawnData, setSpawnData] = useState<SpawnData | null>(null)

  const spawnDataRef = useRef<SpawnData | null>(null)
  useEffect(() => {
    spawnDataRef.current = spawnData
  }, [spawnData])

  const localRoleRef = useRef<PlayerRole>(localRole)
  useEffect(() => {
    localRoleRef.current = localRole
  }, [localRole])

  // 3D Viewport refs
  const threeContainerRef = useRef<HTMLDivElement | null>(null)
  const urbanSceneRef = useRef<ThreeUrbanScene | null>(null)

  // Local movement telemetry for HUD
  const [localCoords, setLocalCoords] = useState({ x: 0, y: 0, z: 0 })
  const [isLocalMoving, setIsLocalMoving] = useState(false)
  const [isLocalSprinting, setIsLocalSprinting] = useState(false)

  // Milestone 2, 3 & 4 State
  const [activeDialogue, setActiveDialogue] = useState<DialogueSession | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | undefined>()
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [isInfoLogOpen, setIsInfoLogOpen] = useState(false)
  const [informationLog, setInformationLog] = useState<InformationEntry[]>([])
  const [telemetry, setTelemetry] = useState<GameTelemetryM2 | null>(null)
  const [matchState, setMatchState] = useState<MatchState | null>(null)
  const [verdictReveal, setVerdictReveal] = useState<VerdictRevealData | null>(null)
  const [civicDebrief, setCivicDebrief] = useState<CivicDebriefData | null>(null)
  const [isDebriefOpen, setIsDebriefOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const [nearestInteractable, setNearestInteractable] = useState<{
    type: 'npc' | 'object'
    id: string
    name: string
    prompt: string
  } | null>(null)

  // Initial world state cache from match-started
  const worldStateRef = useRef<{
    npcs: Record<string, NPCState>
    objects: Record<string, InteractiveObjectState>
  } | undefined>(undefined)

  // Keyboard keys
  const keysDown = useRef<Record<string, boolean>>({})

  // Keep view in ref for network event callbacks
  const viewRef = useRef<AppView>(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // ─────────────────────────────────────────────────────────────
  // 1. SOCKET.IO NETWORK EVENT HOOKUPS (REGISTER ONCE ON MOUNT)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketClient.connect()

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) setIsConnected(true)

    // Room created (Host)
    socketClient.onRoomCreated(({ code, player, room }) => {
      console.log('[CivicClashGame] Room created:', code)
      setRoom(room)
      setLocalRole(player.role)
      setErrorMessage(undefined)
      setView('lobby')
    })

    // Room joined (Guest)
    socketClient.onRoomJoined(({ code, player, room }) => {
      console.log('[CivicClashGame] Room joined:', code)
      setRoom(room)
      setLocalRole(player.role)
      setErrorMessage(undefined)
      setView('lobby')
    })

    // Join error
    socketClient.onJoinError(({ message }) => {
      sound.playError()
      setErrorMessage(message)
    })

    // Start error
    socketClient.onStartError(({ message }) => {
      sound.playError()
      setErrorMessage(message)
    })

    // Peer joined
    socketClient.onPeerJoined(({ guest, room }) => {
      sound.playSuccess()
      setRoom(room)
    })

    // Peer left
    socketClient.onPeerLeft(({ message }) => {
      sound.playWhisper()
      setRoom((prev: RoomState | null) => (prev ? { ...prev, guest: null, status: 'waiting' } : null))
      if (viewRef.current === 'playing') {
        alert(message)
        setView('lobby')
      }
    })

    // Room closed
    socketClient.onRoomClosed(({ message }) => {
      sound.playError()
      alert(message)
      setRoom(null)
      setView('menu')
    })

    // Match started -> launch 3D environment!
    socketClient.onMatchStarted(({ room, spawnData, matchState: ms, worldState }) => {
      sound.playSuccess()
      setRoom(room)
      setSpawnData(spawnData)
      if (ms) {
        setMatchState(ms)
      }
      if (worldState) {
        worldStateRef.current = {
          npcs: worldState.npcs,
          objects: worldState.objects
        }
        if (worldState.informationLog) {
          setInformationLog(worldState.informationLog)
        }
        if (worldState.telemetry) {
          setTelemetry(worldState.telemetry)
        }
      }
      setView('playing')
    })

    // Lobby Ready check update
    socketClient.onLobbyReadyUpdate(({ hostReady, guestReady, room }) => {
      setRoom((prev) => prev ? { ...prev, host: room.host ? { ...room.host, ready: hostReady } : null, guest: room.guest ? { ...room.guest, ready: guestReady } : null, selectedLevel: room.selectedLevel } : null)
    })

    // Lobby Level Selection Update
    socketClient.onLobbyLevelUpdate(({ selectedLevel: lvl, room: updatedRoom }) => {
      setSelectedLevel(lvl)
      if (updatedRoom) setRoom(updatedRoom)
    })

    // Level Changed Broadcast
    socketClient.onMatchLevelChanged(({ level, matchState: ms, worldState }) => {
      sound.playSuccess()
      if (ms) setMatchState(ms)
      if (worldState) {
        if (worldState.informationLog) setInformationLog(worldState.informationLog)
        if (urbanSceneRef.current) {
          urbanSceneRef.current.setLevelEnvironment(level, worldState)
        }
      }
    })

    // Match State Synchronization
    socketClient.onMatchStateUpdate(({ matchState: ms }) => {
      setMatchState(ms)
    })

    // Round Started in active map
    socketClient.onMatchRoundStart((data: any) => {
      const { matchState: ms, telemetry: tel, worldState, assignedRole } = data
      sound.playSuccess()
      setMatchState(ms)
      setVerdictReveal(null)
      if (tel) setTelemetry(tel)
      if (worldState) {
        if (worldState.informationLog) setInformationLog(worldState.informationLog)
        if (urbanSceneRef.current) {
          urbanSceneRef.current.setLevelEnvironment(ms.currentLevel, worldState)
        }
      }
      // Re-align player positions for round
      if (urbanSceneRef.current && spawnDataRef.current) {
        const sId = socketClient.getSocket()?.id
        const currRole = assignedRole || (sId && ms.playerRoles && ms.playerRoles[sId]) || localRoleRef.current
        setLocalRole(currRole)
        const localPos = currRole === 'runner' ? spawnDataRef.current.runnerSpawn : spawnDataRef.current.saboteurSpawn
        const remotePos = currRole === 'runner' ? spawnDataRef.current.saboteurSpawn : spawnDataRef.current.runnerSpawn
        urbanSceneRef.current.repositionPlayers(localPos, remotePos, currRole)
      }
    })

    // Milestone 6: Environment Updates (Streetlights & Mechanisms)
    socketClient.onEnvironmentUpdate(({ environmentalState }) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.setStreetlightsActive(environmentalState.streetlights !== 'OFF')
      }
    })

    // Milestone 6: Noise Distraction Visual Cue
    socketClient.onEnvironmentNoise(({ position }) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.triggerNoiseDistraction(position)
      }
    })

    // Milestone 6: Sealed Verdict Reveal
    socketClient.onMatchVerdictReveal(({ verdictReveal: vr, matchState: ms }) => {
      sound.playSuccess()
      setVerdictReveal(vr)
      setMatchState(ms)
      if (ms.latestCivicDebrief) {
        setCivicDebrief(ms.latestCivicDebrief)
      }
    })

    // Round Ended
    socketClient.onMatchRoundEnd(({ roundResult, matchState: ms }) => {
      sound.playSuccess()
      setMatchState(ms)
    })

    // Role Switch Triggered
    socketClient.onMatchRoleSwitch(({ playerRoles, matchState: ms }) => {
      sound.playWhoosh()
      setMatchState(ms)
      const sId = socketClient.getSocket()?.id
      if (sId && playerRoles[sId]) {
        const newRole = playerRoles[sId]
        setLocalRole(newRole)
        if (urbanSceneRef.current && spawnDataRef.current) {
          const localPos = newRole === 'runner' ? spawnDataRef.current.runnerSpawn : spawnDataRef.current.saboteurSpawn
          const remotePos = newRole === 'runner' ? spawnDataRef.current.saboteurSpawn : spawnDataRef.current.runnerSpawn
          urbanSceneRef.current.repositionPlayers(localPos, remotePos, newRole)
        }
      }
    })

    // Level Results
    socketClient.onMatchLevelResults(({ matchState: ms }) => {
      sound.playSuccess()
      setMatchState(ms)
    })

    // Final Match Results
    socketClient.onMatchFinalResults(({ matchState: ms }) => {
      sound.playSuccess()
      setMatchState(ms)
    })

    // Rematch Started
    socketClient.onMatchRematchStart(({ matchState: ms }) => {
      sound.playSuccess()
      setMatchState(ms)
      const sId = socketClient.getSocket()?.id
      if (sId && ms.playerRoles[sId]) {
        setLocalRole(ms.playerRoles[sId])
      }
    })

    // Match Paused
    socketClient.onMatchPaused(({ reason, pauseRemainingSec }) => {
      setMatchState((prev) => prev ? { ...prev, isPaused: true, pauseReason: reason, pausedRemainingSec: pauseRemainingSec } : null)
    })

    // Peer moved -> update 3D remote character
    socketClient.onPeerMoved((event: PeerMovementEvent) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.handlePeerMovement(event)
      }
    })

    // Server-side authoritative movement correction (anti-wall penetration)
    socketClient.onPlayerPositionCorrected((data) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.localPos.set(data.x, data.y, data.z)
        urbanSceneRef.current.localCharacter.setPosition(data.x, data.y, data.z)
      }
    })

    // NPC Dialogue Session
    socketClient.onNPCDialogueSession((session: DialogueSession) => {
      setActiveDialogue(session)
      setStatusMessage(undefined)
      sound.playWhoosh()
    })

    // Dialogue Choice Result with Physical Reaction & Educational Insights
    socketClient.onDialogueResult(({ npcId, statusMessage, npcState, physicalReaction, learningTip, clueUnlocked, pointsAwarded, npcResponseText, outcome, effects, updatedSession }) => {
      setStatusMessage(statusMessage)
      if (urbanSceneRef.current) {
        urbanSceneRef.current.updateNPC(npcId, npcState)
        if (physicalReaction) {
          urbanSceneRef.current.triggerNPCReaction(npcId, physicalReaction as NPCPhysicalReaction)
        }
      }
      if (updatedSession) {
        setActiveDialogue({
          ...updatedSession,
          lastResponse: npcResponseText ? {
            npcSpoken: npcResponseText,
            learningTip: learningTip || '',
            clueUnlocked,
            pointsAwarded,
            outcome,
            effects
          } : undefined
        })
      } else {
        setActiveDialogue((prev) => {
          if (!prev || prev.npcId !== npcId) return prev
          return {
            ...prev,
            trust: npcState.trust,
            fear: npcState.fear,
            cooperation: npcState.cooperation,
            statusMessage,
            lastResponse: npcResponseText ? {
              npcSpoken: npcResponseText,
              learningTip: learningTip || '',
              clueUnlocked,
              pointsAwarded,
              outcome,
              effects
            } : prev.lastResponse
          }
        })
      }
    })

    // Runner Counter-tool response listener
    socketClient.onRunnerToolResult(({ success, message }) => {
      setStatusMessage(message)
      if (success) sound.playSuccess()
      else sound.playError()
    })

    // NPC Reaction Trigger Broadcast
    socketClient.onNPCReactionTrigger(({ npcId, reaction }) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.triggerNPCReaction(npcId, reaction as NPCPhysicalReaction)
      }
    })

    // Batch NPC Autonomous Movement Sync
    socketClient.onNPCBatchUpdate(({ npcs }) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.updateNPCBatch(npcs)
      }
    })

    // Single NPC State Broadcast
    socketClient.onNPCStateUpdate(({ npcId, npcState }) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.updateNPC(npcId, npcState)
      }
    })

    // Object State Broadcast
    socketClient.onObjectStateUpdate(({ objId, objState }) => {
      if (urbanSceneRef.current) {
        urbanSceneRef.current.updateObject(objId, objState)
      }
    })

    // Information Log Update
    socketClient.onInformationUpdate(({ informationLog }) => {
      setInformationLog(informationLog)
    })

    // Telemetry Update
    socketClient.onGameTelemetryUpdate(({ telemetry }) => {
      setTelemetry(telemetry)
      urbanSceneRef.current?.setMechanisms((telemetry as any)?.mechanisms)
    })

    // Interaction Result Notification
    socketClient.onInteractionResult(({ success, message }) => {
      if (!success) {
        sound.playError()
        console.warn('[Server Interaction Rejection]:', message)
      } else {
        sound.playSuccess()
      }
    })

    return () => {
      socketClient.removeGameListeners()
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // 2. INITIALIZE 3D URBAN SCENE WHEN VIEW === 'playing'
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'playing' || !threeContainerRef.current || !room || !spawnData) return

    const isRunner = localRole === 'runner'
    const initialLocalPos = isRunner ? spawnData.runnerSpawn : spawnData.saboteurSpawn
    const initialRemotePos = isRunner ? spawnData.saboteurSpawn : spawnData.runnerSpawn

    const localName = isRunner ? (room.host?.name || 'Runner') : (room.guest?.name || 'Saboteur')
    const remoteRole: PlayerRole = isRunner ? 'saboteur' : 'runner'
    const remoteName = isRunner ? (room.guest?.name || 'Saboteur') : (room.host?.name || 'Runner')

    const scene = new ThreeUrbanScene({
      container: threeContainerRef.current,
      localRole,
      localName,
      remoteRole,
      remoteName,
      initialLocalPos,
      initialRemotePos,
      initialWorldState: worldStateRef.current,
      onLocalMove: (packet: MovementPacket) => {
        socketClient.sendMovement(packet)
      }
    })

    urbanSceneRef.current = scene

    // Request initial information log
    socketClient.requestInformation()

    return () => {
      scene.destroy()
      urbanSceneRef.current = null
    }
  }, [view, room, spawnData])

  // ─────────────────────────────────────────────────────────────
  // 3. KEYBOARD & INPUT ENGINE LOOP
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code.toLowerCase()
      keysDown.current[code] = true

      // 'E' Key: Interact with nearest NPC or Interactive Object
      if (code === 'keye' && viewRef.current === 'playing' && nearestInteractable) {
        if (nearestInteractable.type === 'npc') {
          socketClient.interactWithNPC(nearestInteractable.id)
        } else if (nearestInteractable.type === 'object') {
          if (nearestInteractable.id === 'obj_phone' && localRole === 'runner') {
            setIsPhoneModalOpen(true)
          } else {
            const isRepair = nearestInteractable.prompt.includes('Repair & Neutralize')
            socketClient.performObjectAction(nearestInteractable.id, isRepair ? 'repair' : 'interact')
          }
        }
      }

      // 'I' Key: Open Information Binder
      if (code === 'keyi' && viewRef.current === 'playing') {
        setIsInfoLogOpen((prev) => !prev)
      }

      // Hotkeys 1 - 4: Quick trigger Tools / Abilities
      if (viewRef.current === 'playing' && !activeDialogue && !isPhoneModalOpen && !isInfoLogOpen) {
        const targetId = nearestInteractable?.id || ''
        if (code === 'digit1') {
          if (localRole === 'runner') socketClient.useRunnerTool('scan', targetId)
          else if (telemetry?.saboteurAbilities?.[0]) socketClient.useSaboteurAbility(telemetry.saboteurAbilities[0].id)
        } else if (code === 'digit2') {
          if (localRole === 'runner') socketClient.useRunnerTool('lock', targetId)
          else if (telemetry?.saboteurAbilities?.[1]) socketClient.useSaboteurAbility(telemetry.saboteurAbilities[1].id)
        } else if (code === 'digit3') {
          if (localRole === 'runner') socketClient.useRunnerTool('verify', targetId)
          else if (telemetry?.saboteurAbilities?.[2]) socketClient.useSaboteurAbility(telemetry.saboteurAbilities[2].id)
        } else if (code === 'digit4') {
          if (localRole === 'runner') socketClient.useRunnerTool('help', targetId)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code.toLowerCase()
      keysDown.current[code] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let animId = 0
    let lastTime = performance.now()

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      if (viewRef.current === 'playing' && urbanSceneRef.current) {
        const scene = urbanSceneRef.current

        // Don't move while dialogue or modal is open or match is paused
        const isInteracting = !!activeDialogue || isPhoneModalOpen || isInfoLogOpen || (matchState && matchState.phase !== 'ROUND_ACTIVE')
        if (!isInteracting) {
          const moveX =
            (keysDown.current['keyd'] || keysDown.current['arrowright'] ? 1 : 0) -
            (keysDown.current['keya'] || keysDown.current['arrowleft'] ? 1 : 0)
          const moveZ =
            (keysDown.current['keyw'] || keysDown.current['arrowup'] ? 1 : 0) -
            (keysDown.current['keys'] || keysDown.current['arrowdown'] ? 1 : 0)
          const sprint = !!keysDown.current['shiftleft'] || !!keysDown.current['shiftright']

          scene.handleLocalMovement(moveZ, moveX, sprint, delta)
        }

        setLocalCoords({
          x: scene.localPos.x,
          y: scene.localPos.y,
          z: scene.localPos.z
        })
        setIsLocalMoving(scene.isMoving)
        setIsLocalSprinting(scene.isSprinting)

        // Find nearest interactable NPC or Object (within 4.5 meters)
        let closest: {
          type: 'npc' | 'object'
          id: string
          name: string
          prompt: string
          dist: number
        } | null = null

        // 1. Check NPCs
        for (const [id, npcModel] of scene.npcModels) {
          const dist = scene.localPos.distanceTo(npcModel.group.position)
          if (dist < 4.5 && (!closest || dist < closest.dist)) {
            closest = {
              type: 'npc',
              id,
              name: npcModel.name,
              prompt: `Talk to ${npcModel.name} (${npcModel.roleTitle})`,
              dist
            }
          }
        }

        // 2. Check Interactive Objects
        for (const [id, objModel] of scene.objectModels) {
          const dist = scene.localPos.distanceTo(objModel.group.position)
          if (dist < 4.0 && (!closest || dist < closest.dist)) {
            let actionName = 'Inspect'
            if (id === 'obj_phone') actionName = localRole === 'runner' ? 'Dial 112 Dispatch' : 'Cannot use'
            else if (id === 'obj_cctv') actionName = localRole === 'runner' ? 'Review CCTV Footage' : 'Disable CCTV'
            else if (id === 'obj_firstaid') actionName = 'Pick up First-Aid Kit'
            else if (id === 'obj_signal') actionName = 'Toggle Signal Box'
            else if (id.startsWith('mech_')) actionName = scene.getMechanismPrompt(id) || 'Operate mechanism'
            else if (id === 'obj_infoboard') actionName = localRole === 'runner' ? 'Read Notice Board' : 'Plant False Lead'

            const isSab = (objModel as any)?.state?.sabotaged || ['jammed', 'disabled', 'corrupted', 'cut'].includes((objModel as any)?.state?.state)
            if (isSab && localRole === 'runner') {
              actionName = `🛡️ Repair & Neutralize Sabotage: ${objModel.name} (+15 Pts)`
            }

            closest = {
              type: 'object',
              id,
              name: objModel.name,
              prompt: isSab && localRole === 'runner' ? actionName : `${actionName} (${objModel.name})`,
              dist
            }
          }
        }

        setNearestInteractable(closest)
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      cancelAnimationFrame(animId)
    }
  }, [activeDialogue, isPhoneModalOpen, isInfoLogOpen, nearestInteractable, localRole, matchState])

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleCreateRoom = (name: string) => {
    setPlayerName(name)
    socketClient.createRoom(name)
  }

  const handleJoinRoom = (code: string, name: string) => {
    setPlayerName(name)
    socketClient.joinRoom(code, name)
  }

  const handleStartMatch = (chosenLevel?: number) => {
    socketClient.startMatch(chosenLevel || selectedLevel)
  }

  const handleLeaveRoom = () => {
    socketClient.leaveRoom()
    setRoom(null)
    setMatchState(null)
    setView('menu')
  }

  const handleSelectDialogueOption = (npcId: string, optionId: string) => {
    socketClient.selectDialogueOption(npcId, optionId)
  }

  const handleDispatchEmergency = (callDetails: { callerType: string; description: string; priority: string }) => {
    socketClient.performObjectAction('obj_phone', 'call_112')
    setIsPhoneModalOpen(false)
  }

  const remoteName = room ? (localRole === 'runner' ? (room.guest?.name || 'Saboteur') : (room.host?.name || 'Runner')) : ''
  const localPlayerId = socketClient.getSocket()?.id || ''

  useJuice({
    view,
    matchState,
    telemetry,
    localRole,
    localPlayerId,
    isMoving: isLocalMoving,
    isSprinting: isLocalSprinting,
    nearestPrompt: nearestInteractable?.prompt ?? null,
    verdictReveal,
    hasDialogue: !!activeDialogue,
    getScene: () => urbanSceneRef.current
  })

  return (
    <div className="cc-game-container">
      {/* 1. MAIN MENU SCREEN */}
      {view === 'menu' && (
        <MainMenu
          playerName={playerName}
          setPlayerName={setPlayerName}
          isConnected={isConnected}
          onCreateRoom={() => handleCreateRoom(playerName)}
          onJoinRoom={(code) => handleJoinRoom(code, playerName)}
          errorMessage={errorMessage}
        />
      )}

      {/* 2. LOBBY STAGING SCREEN */}
      {view === 'lobby' && room && (
        <LobbyRoom
          room={room}
          localRole={localRole}
          selectedLevel={room.selectedLevel || selectedLevel}
          onSelectLevel={(lvl) => {
            setSelectedLevel(lvl)
            socketClient.selectLobbyLevel(lvl)
          }}
          onToggleReady={(ready) => socketClient.togglePlayerReady(ready)}
          onAddBot={() => socketClient.addBotPlayer()}
          onRemoveBot={() => socketClient.removeBotPlayer()}
          onStartMatch={handleStartMatch}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {/* 3. ACTIVE 3D MULTIPLAYER GAMEPLAY */}
      {view === 'playing' && room && (
        <>
          {/* THREE.JS URBAN CANVAS */}
          <div ref={threeContainerRef} className="cc-three-viewport" />

          {/* GAMEPLAY OVERLAY HUD (Decluttered, Modern, Unified Directive Tracker) */}
          <GameOverlayHUD
            roomCode={room.code}
            localRole={localRole}
            localName={playerName}
            remoteName={remoteName}
            localPlayerId={localPlayerId}
            coordinates={localCoords}
            isSprinting={isLocalSprinting}
            isMoving={isLocalMoving}
            nearestPrompt={nearestInteractable?.prompt}
            telemetry={telemetry}
            matchState={matchState}
            onOpenInfoLog={() => setIsInfoLogOpen(true)}
            onOpenPhoneModal={() => setIsPhoneModalOpen(true)}
            onUseAbility={(abilityId) => socketClient.useSaboteurAbility(abilityId)}
            onUseRunnerTool={(tool, targetId) => socketClient.useRunnerTool(tool, targetId || nearestInteractable?.id || '')}
            onStartEscape={() => socketClient.startEscapeChannel()}
            onCancelEscape={() => socketClient.cancelEscapeChannel()}
            onLeaveMatch={handleLeaveRoom}
          />

          {/* DIALOGUE MODAL */}
          {activeDialogue && (
            <DialogueModalM2
              session={activeDialogue}
              statusMessage={statusMessage}
              sabotageEnergy={telemetry?.sabotageEnergy ?? 100}
              onSelectOption={(optionId) => handleSelectDialogueOption(activeDialogue.npcId, optionId)}
              onClose={() => setActiveDialogue(null)}
            />
          )}

          {/* EMERGENCY PHONE TERMINAL MODAL */}
          {isPhoneModalOpen && (
            <EmergencyPhoneModal
              onDispatch={() => handleDispatchEmergency({ callerType: 'Good Samaritan', description: 'Accident reported at Junction 48', priority: 'HIGH' })}
              onClose={() => setIsPhoneModalOpen(false)}
            />
          )}

          {/* INCIDENT INFORMATION & EVIDENCE LOG MODAL */}
          {isInfoLogOpen && (
            <InformationLogModal
              entries={informationLog}
              onClose={() => setIsInfoLogOpen(false)}
            />
          )}

          {/* MILESTONE 4: LEVEL INTRO BRIEFING MODAL */}
          {matchState && matchState.phase === 'LEVEL_INTRO' && (
            <LevelIntroModal
              matchState={matchState}
              localPlayerId={localPlayerId}
              localRole={localRole}
              isHost={localRole === 'runner' || (room && room.host?.id === localPlayerId)}
              onConfirmReady={() => socketClient.confirmRoundReady()}
              onForceStart={() => socketClient.forceStartRound()}
            />
          )}

          {/* MILESTONE 6: SEALED FINAL ACCUSATION MODAL */}
          {matchState && matchState.phase === 'ACCUSATION_PHASE' && (
            <AccusationModal
              role={localRole}
              timeRemainingSec={telemetry?.accusationTimeRemainingSec ?? matchState.timeRemainingSec ?? 45}
              availableEvidence={telemetry?.availableEvidence || []}
              availableDefenseNarratives={telemetry?.availableDefenseNarratives || []}
              hostName={room.host?.name || 'Player 1'}
              guestName={room.guest?.name || 'Player 2'}
              hostId={room.host?.id || ''}
              guestId={room.guest?.id || ''}
              localPlayerId={localPlayerId}
              onSubmitVerdict={(data) => socketClient.submitVerdict(data)}
            />
          )}

          {/* MILESTONE 6: VERDICT REVEAL MODAL */}
          {matchState && matchState.phase === 'VERDICT_REVEAL' && verdictReveal && (
            <VerdictRevealModal
              verdictData={verdictReveal}
              hostName={room.host?.name || 'Player 1'}
              guestName={room.guest?.name || 'Player 2'}
              hostId={room.host?.id || ''}
              guestId={room.guest?.id || ''}
              onContinue={() => {
                if (civicDebrief) {
                  setIsDebriefOpen(true)
                }
                socketClient.continueMatch()
              }}
            />
          )}

          {/* MILESTONE 6: CIVIC DEBRIEF MODAL */}
          {isDebriefOpen && civicDebrief && (
            <CivicDebriefModal
              debriefData={civicDebrief}
              onClose={() => setIsDebriefOpen(false)}
            />
          )}

          {/* MILESTONE 4: ROUND RESULTS MODAL */}
          {matchState && matchState.phase === 'ROUND_RESULTS' && (
            <RoundResultsModal
              matchState={matchState}
              localPlayerId={localPlayerId}
              onContinue={() => socketClient.continueMatch()}
            />
          )}

          {/* MILESTONE 4: ROLE SWITCH MODAL */}
          {matchState && matchState.phase === 'ROLE_SWITCH' && (
            <RoleSwitchModal
              matchState={matchState}
              localPlayerId={localPlayerId}
              isHost={room && room.host?.id === localPlayerId}
              onConfirmReady={() => socketClient.confirmRoundReady()}
              onForceStart={() => socketClient.forceStartRound()}
            />
          )}

          {/* MILESTONE 4: LEVEL SUMMARY MODAL */}
          {matchState && matchState.phase === 'LEVEL_RESULTS' && (
            <LevelSummaryModal
              matchState={matchState}
              localPlayerId={localPlayerId}
              isHost={localRole === 'runner' || (room && room.host?.id === localPlayerId)}
              onContinue={() => socketClient.continueMatch()}
              onChooseLevel={(lvl) => socketClient.chooseMatchLevel(lvl)}
            />
          )}

          {/* MILESTONE 4: FINAL RESULTS VERDICT MODAL */}
          {matchState && matchState.phase === 'FINAL_RESULTS' && (
            <FinalResultsModal
              matchState={matchState}
              localPlayerId={localPlayerId}
              onRematch={() => socketClient.requestRematch()}
              onReturnToLobby={() => {
                socketClient.leaveRoom()
                setView('menu')
                setMatchState(null)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
