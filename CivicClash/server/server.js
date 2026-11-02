import { createServer } from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'socket.io'
import { GameManager } from './gameManager.js'
import { registerStrategyHandlers } from './loadout.js'   // PATCH-C
import { BotManager } from './botBrain.js'                // PATCH-C
import { resolveMovement, LEVEL_1_OBSTACLES, LEVEL_1_BOUNDS, getLevelObstacles } from './spatialCollision.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.resolve(__dirname, '../dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

const PORT = parseInt(process.env.PORT, 10) || 8788

const httpServer = createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    })
    return res.end()
  }

  // Health check endpoint for cloud hosting / Docker
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), time: Date.now() }))
  }

  // Production static file serving if dist directory exists
  if (fs.existsSync(DIST_DIR)) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    let filePath = path.join(DIST_DIR, decodeURIComponent(parsedUrl.pathname))

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html')
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000'
      })
      return fs.createReadStream(filePath).pipe(res)
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
  res.end('Civic Clash Socket.IO Server Active (Run `npm run build` to serve production web frontend)')
})

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// In-memory room store
const rooms = new Map()
// Active room game managers
const gameManagers = new Map()

// Helper: 5-character alphanumeric room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function calculateDistance(p1, p2) {
  if (!p1 || !p2) return 9999
  const dx = (p1.x || 0) - (p2.x || 0)
  const dz = (p1.z || 0) - (p2.z || 0)
  return Math.sqrt(dx * dx + dz * dz)
}

function broadcastTelemetry(code, gm) {
  const roomSockets = io.sockets.adapter.rooms.get(code)
  if (!roomSockets) {
    io.to(code).emit('game:telemetry:update', { telemetry: gm.getTelemetry() })
    return
  }
  for (const sId of roomSockets) {
    const s = io.sockets.sockets.get(sId)
    if (s && s.data.role) {
      s.emit('game:telemetry:update', {
        telemetry: gm.getTelemetryForPlayer(s.id, s.data.role)
      })
    } else if (s) {
      s.emit('game:telemetry:update', { telemetry: gm.getTelemetry() })
    }
  }
}

// PATCH-C: server-side bot players (before this, a lobby bot never acted)
const botManagers = new WeakMap()
const BOT_LEVELS = new Set(['easy', 'normal', 'hard'])
function botManagerFor(gm, room) {
  const hasBot = Object.keys(gm.playerRoles || {}).some((id) => String(id).startsWith('bot_'))
  if (!hasBot) return null
  let mgr = botManagers.get(gm)
  if (!mgr) {
    mgr = new BotManager(gm, {})
    botManagers.set(gm, mgr)
  }
  mgr.setDifficulty(BOT_LEVELS.has(room?.botDifficulty) ? room.botDifficulty : 'normal')
  return mgr
}

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`)

  // PATCH-C: loadout draft + runner tools
  registerStrategyHandlers({ io, socket, gameManagers, rooms, broadcastTelemetry })

  // PATCH-C: bot difficulty chosen by the host in the lobby
  socket.on('lobby:bot:difficulty', ({ level }) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room || room.host?.id !== socket.id || !BOT_LEVELS.has(level)) return
    room.botDifficulty = level
    socket.emit('lobby:bot:difficulty:set', { level })
  })

  // 1. Create Room (Host = Runner initially)
  socket.on('create-room', ({ playerName }) => {
    let code = generateRoomCode()
    while (rooms.has(code)) {
      code = generateRoomCode()
    }

    const hostPlayer = {
      id: socket.id,
      name: playerName || 'Host Runner',
      role: 'runner',
      ready: false,
      transform: { x: -8, y: 0, z: 12, yaw: 0 }
    }

    const newRoom = {
      code,
      host: hostPlayer,
      guest: null,
      maxPlayers: 2,
      status: 'waiting',
      selectedLevel: 1,
      createdAt: Date.now()
    }

    rooms.set(code, newRoom)
    socket.join(code)
    socket.data.roomCode = code
    socket.data.role = 'runner'

    console.log(`[Room Created] Code: ${code} by ${hostPlayer.name} (${socket.id})`)

    socket.emit('room-created', {
      code,
      player: hostPlayer,
      room: newRoom
    })
  })

  // 2. Join Room (Guest = Saboteur initially)
  socket.on('join-room', ({ code, playerName }) => {
    const formattedCode = (code || '').trim().toUpperCase()
    const room = rooms.get(formattedCode)

    if (!room) {
      return socket.emit('join-error', { message: `Room ${formattedCode} not found.` })
    }

    if (room.guest !== null) {
      return socket.emit('join-error', { message: `Room ${formattedCode} is already full (max 2 players).` })
    }

    if (room.status === 'in_game') {
      return socket.emit('join-error', { message: `Game already in progress in room ${formattedCode}.` })
    }

    const guestPlayer = {
      id: socket.id,
      name: playerName || 'Guest Saboteur',
      role: 'saboteur',
      ready: false,
      transform: { x: 8, y: 0, z: -12, yaw: Math.PI }
    }

    room.guest = guestPlayer
    socket.join(formattedCode)
    socket.data.roomCode = formattedCode
    socket.data.role = 'saboteur'

    console.log(`[Player Joined] ${guestPlayer.name} joined room ${formattedCode}`)

    socket.emit('room-joined', {
      code: formattedCode,
      player: guestPlayer,
      room
    })

    socket.to(formattedCode).emit('peer-joined', {
      guest: guestPlayer,
      room
    })
  })

  // 2b. Player Ready Check (Lobby Readiness)
  socket.on('match:player:ready', ({ ready }) => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room) return

    if (room.host?.id === socket.id) {
      room.host.ready = ready
    } else if (room.guest?.id === socket.id) {
      room.guest.ready = ready
    }

    const gm = gameManagers.get(code)
    if (gm) {
      gm.setPlayerReady(socket.id, ready)
      io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })
    }

    io.to(code).emit('lobby:ready:update', {
      hostReady: room.host?.ready || false,
      guestReady: room.guest?.ready || false,
      room
    })
  })

  // 2b. Lobby Host Level Selection
  socket.on('lobby:level:select', ({ level }) => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.host?.id !== socket.id) return
    const chosenLevel = Math.max(1, Math.min(3, parseInt(level, 10) || 1))
    room.selectedLevel = chosenLevel
    console.log(`[Lobby] Host selected Level ${chosenLevel} for room ${code}`)
    io.to(code).emit('lobby:level:updated', { selectedLevel: chosenLevel, room })
  })

  // 2c. Add AI Bot Opponent to Lobby
  socket.on('lobby:bot:add', () => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room || room.guest) return

    room.guest = {
      id: 'bot_saboteur',
      name: 'Inspector_Bot (AI)',
      role: 'saboteur',
      ready: true,
      transform: { x: 8, y: 0, z: -12, yaw: Math.PI }
    }
    console.log(`[Lobby] Host added AI Bot opponent in room ${code}`)
    io.to(code).emit('lobby:ready:update', {
      hostReady: room.host?.ready || false,
      guestReady: true,
      room
    })
    io.to(code).emit('peer-joined', { guest: room.guest, room })
  })

  // 2d. Remove AI Bot Opponent
  socket.on('lobby:bot:remove', () => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room || !room.guest || !room.guest.id.startsWith('bot_')) return

    room.guest = null
    console.log(`[Lobby] Host removed AI Bot opponent in room ${code}`)
    io.to(code).emit('lobby:ready:update', {
      hostReady: room.host?.ready || false,
      guestReady: false,
      room
    })
    io.to(code).emit('peer-left', { message: 'AI Bot was removed.' })
  })

  // 3. Start Match (Initialize Milestone 4 Match State)
  socket.on('start-match', (data) => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room) return
    if (!room.host) return

    // Solo / Practice mode: Auto-assign AI Bot opponent if player 2 hasn't joined
    if (!room.guest) {
      room.guest = {
        id: 'bot_saboteur',
        name: 'Dev_Bot (AI Saboteur)',
        role: 'saboteur',
        ready: true,
        transform: { x: 8, y: 0, z: -12, yaw: Math.PI }
      }
      console.log(`[Lobby] Auto-spawned AI Bot opponent for room ${code}`)
    }

    const chosenLevel = (data && data.startingLevel) || room.selectedLevel || 1

    // Auto-confirm ready status on match start invocation
    room.host.ready = true
    room.guest.ready = true

    room.status = 'in_game'
    room.selectedLevel = chosenLevel

    // Instantiate authoritative GameManager for room with Match State
    let gm = gameManagers.get(code)
    if (!gm) {
      gm = new GameManager(code)
      gameManagers.set(code, gm)
    }
    gm.initMatch(room.host, room.guest, chosenLevel)

    const spawnData = {
      runnerSpawn: { x: -8, y: 0, z: 12, yaw: 0 },
      saboteurSpawn: { x: 8, y: 0, z: -12, yaw: Math.PI }
    }

    console.log(`[Match Started] Room: ${code} at Level ${chosenLevel}`)
    io.to(code).emit('match-started', {
      room,
      spawnData,
      matchState: gm.getMatchState(),
      worldState: {
        npcs: gm.npcs,
        objects: gm.objects,
        informationLog: gm.informationLog,
        telemetry: gm.getTelemetry()
      }
    })
  })

  // 3a. Host Selects Any Level Between Matches / At Level Results
  socket.on('match:choose-level', ({ level }) => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    const gm = gameManagers.get(code)
    if (!room || !gm || room.host?.id !== socket.id) return

    const targetLevel = Math.max(1, Math.min(3, parseInt(level, 10) || 1))
    gm.currentLevel = targetLevel
    gm.currentRound = 1
    gm.phase = 'LEVEL_INTRO'
    gm.resetRoundState()
    room.selectedLevel = targetLevel

    console.log(`[Match] Host transitioned room ${code} to Level ${targetLevel}`)
    io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })
    io.to(code).emit('match:level:changed', {
      level: targetLevel,
      matchState: gm.getMatchState(),
      worldState: {
        npcs: gm.npcs,
        objects: gm.objects,
        informationLog: gm.informationLog,
        telemetry: gm.getTelemetry()
      }
    })
  })

  // 3b. Round Ready Check (Level Intro / Role Switch confirmation)
  socket.on('match:round:ready', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm) return

    const room = rooms.get(code)
    if (room?.guest?.id && String(room.guest.id).startsWith('bot_')) {
      gm.readyStatus[room.guest.id] = true
    }
    if (room?.host?.id && String(room.host.id).startsWith('bot_')) {
      gm.readyStatus[room.host.id] = true
    }

    const { allReady, readyStatus } = gm.setPlayerReady(socket.id, true)
    io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })

    if (allReady) {
      // Both confirmed ready -> Start Active Round!
      gm.phase = 'ROUND_ACTIVE'
      if (room) {
        // Reset player spawn positions based on current roles
        for (const pid in gm.playerRoles) {
          const role = gm.playerRoles[pid]
          const target = pid === room.host?.id ? room.host : room.guest
          if (target) {
            target.role = role
            target.transform = role === 'runner'
              ? { x: -8, y: 0, z: 12, yaw: 0 }
              : { x: 8, y: 0, z: -12, yaw: Math.PI }
          }
        }
      }

      const roomSockets = io.sockets.adapter.rooms.get(code)
      if (roomSockets) {
        for (const sId of roomSockets) {
          const s = io.sockets.sockets.get(sId)
          if (s) {
            s.data.role = gm.playerRoles[s.id] || s.data.role
            s.emit('match:round:start', {
              currentLevel: gm.currentLevel,
              currentRound: gm.currentRound,
              assignedRole: s.data.role,
              matchState: gm.getMatchState(),
              telemetry: gm.getTelemetryForPlayer(s.id, s.data.role),
              worldState: {
                npcs: gm.npcs,
                objects: gm.objects,
                informationLog: gm.informationLog
              }
            })
          }
        }
      } else {
        io.to(code).emit('match:round:start', {
          currentLevel: gm.currentLevel,
          currentRound: gm.currentRound,
          matchState: gm.getMatchState(),
          telemetry: gm.getTelemetry(),
          worldState: {
            npcs: gm.npcs,
            objects: gm.objects,
            informationLog: gm.informationLog
          }
        })
      }
      io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })
    }
  })

  // 3c. Host Force-Starts Active Round (Bypasses waiting)
  socket.on('match:round:force-start', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    const room = rooms.get(code)
    if (!gm || !room) return

    for (const pid in gm.readyStatus) {
      gm.readyStatus[pid] = true
    }
    gm.phase = 'ROUND_ACTIVE'

    for (const pid in gm.playerRoles) {
      const role = gm.playerRoles[pid]
      const target = pid === room.host?.id ? room.host : room.guest
      if (target) {
        target.role = role
        target.transform = role === 'runner'
          ? { x: -8, y: 0, z: 12, yaw: 0 }
          : { x: 8, y: 0, z: -12, yaw: Math.PI }
      }
    }

    const roomSockets = io.sockets.adapter.rooms.get(code)
    if (roomSockets) {
      for (const sId of roomSockets) {
        const s = io.sockets.sockets.get(sId)
        if (s) {
          s.data.role = gm.playerRoles[s.id] || s.data.role
          s.emit('match:round:start', {
            currentLevel: gm.currentLevel,
            currentRound: gm.currentRound,
            assignedRole: s.data.role,
            matchState: gm.getMatchState(),
            telemetry: gm.getTelemetryForPlayer(s.id, s.data.role),
            worldState: {
              npcs: gm.npcs,
              objects: gm.objects,
              informationLog: gm.informationLog
            }
          })
        }
      }
    } else {
      io.to(code).emit('match:round:start', {
        currentLevel: gm.currentLevel,
        currentRound: gm.currentRound,
        matchState: gm.getMatchState(),
        telemetry: gm.getTelemetry(),
        worldState: {
          npcs: gm.npcs,
          objects: gm.objects,
          informationLog: gm.informationLog
        }
      })
    }
    io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })
  })

  // 3c. Match Continue (From Round Results or Level Results)
  socket.on('match:continue', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm) return

    const { allReady } = gm.setPlayerReady(socket.id, true)
    io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })

    if (allReady) {
      const nextStep = gm.advanceMatchFlow()
      const room = rooms.get(code)

      // Keep socket and room roles synchronized with authoritative GameManager
      for (const [sId, s] of io.of('/').sockets) {
        if (s.data.roomCode === code && gm.playerRoles[sId]) {
          s.data.role = gm.playerRoles[sId]
        }
      }
      if (room) {
        if (room.host) room.host.role = gm.playerRoles[room.host.id]
        if (room.guest) room.guest.role = gm.playerRoles[room.guest.id]
      }

      if (nextStep?.type === 'ROLE_SWITCH') {
        io.to(code).emit('match:role:switch', {
          currentLevel: gm.currentLevel,
          currentRound: gm.currentRound,
          playerRoles: gm.playerRoles,
          matchState: gm.getMatchState()
        })
      } else if (nextStep?.type === 'LEVEL_RESULTS') {
        io.to(code).emit('match:level:results', {
          summary: nextStep.summary,
          nextLevel: nextStep.nextLevel,
          matchState: gm.getMatchState()
        })
      } else if (nextStep?.type === 'LEVEL_INTRO') {
        io.to(code).emit('match:state:update', {
          matchState: gm.getMatchState()
        })
      } else if (nextStep?.type === 'FINAL_RESULTS') {
        io.to(code).emit('match:final:results', {
          finalResult: nextStep.finalResult,
          matchState: gm.getMatchState()
        })
      }
    }
  })

  // 3d. Final Accusation Verdict Submission
  socket.on('verdict:submit', ({ suspectId, selectedEvidenceIds, counterNarrativeId }) => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm || gm.phase !== 'ACCUSATION_PHASE') return

    const res = gm.submitVerdict(socket.id, socket.data.role, {
      suspectId,
      selectedEvidenceIds,
      counterNarrativeId
    })

    socket.emit('verdict:submitted', { success: true })

    if (res.allSubmitted) {
      const reveal = gm.evaluateAccusationAndReveal()
      io.to(code).emit('match:verdict:reveal', {
        verdictReveal: reveal,
        matchState: gm.getMatchState()
      })
      broadcastTelemetry(code, gm)
    }
  })

  // 3c-ii. Debug / Fast-forward to Accusation Phase
  socket.on('match:force:accusation', () => {
    const code = socket.data.roomCode
    if (!code) return
    const gm = gameManagers.get(code)
    if (gm && gm.phase === 'ROUND_ACTIVE') {
      gm.startAccusationPhase('MANUAL_TRIGGER')
      io.to(code).emit('match:state:update', {
        matchState: gm.getMatchState()
      })
      broadcastTelemetry(code, gm)
    }
  })

  // 3d. Rematch Request
  socket.on('match:rematch:request', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm) return

    const { rematchTriggered } = gm.voteRematch(socket.id)
    io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })

    if (rematchTriggered) {
      const room = rooms.get(code)
      if (room) {
        if (room.host) room.host.role = 'runner'
        if (room.guest) room.guest.role = 'saboteur'
      }
      for (const [sId, s] of io.of('/').sockets) {
        if (s.data.roomCode === code && gm.playerRoles[sId]) {
          s.data.role = gm.playerRoles[sId]
        }
      }
      io.to(code).emit('match:rematch:start', {
        matchState: gm.getMatchState(),
        telemetry: gm.getTelemetry(),
        worldState: {
          npcs: gm.npcs,
          objects: gm.objects,
          informationLog: gm.informationLog
        }
      })
    }
  })

  // 4. Synchronize Real-Time 3D Movement with Dynamic Collision
  socket.on('player-move', (movePacket) => {
    if (!movePacket) return
    if (movePacket.position) {
      movePacket.x = movePacket.position.x
      movePacket.y = movePacket.position.y || 0
      movePacket.z = movePacket.position.z
    }
    const code = socket.data.roomCode
    if (!code) return

    const room = rooms.get(code)
    const gm = gameManagers.get(code)
    if (!room) return

    const localPlayer = room.host?.id === socket.id ? room.host : room.guest
    const peerPlayer = room.host?.id === socket.id ? room.guest : room.host

    if (localPlayer) {
      // 1. Authoritative Spatial Movement Validation (Anti-Wall Penetration & Map Bounds)
      const curPos = localPlayer.transform || movePacket
      const levelObstacles = getLevelObstacles(gm?.currentLevel || 1).concat(gm?.getDynamicObstacles?.() || [])
      const resolved = resolveMovement(curPos, movePacket, 0.55, levelObstacles, LEVEL_1_BOUNDS)
      if (resolved.modified) {
        movePacket.x = resolved.x
        movePacket.z = resolved.z
        socket.emit('player-position-corrected', {
          x: resolved.x,
          y: 0,
          z: resolved.z,
          yaw: movePacket.yaw,
          reason: 'OBSTACLE_COLLISION'
        })
      }

      // 3. Dynamic Player Collision Check: Cannot overlap or walk through each other
      if (peerPlayer && peerPlayer.transform) {
        const dist = calculateDistance(movePacket, peerPlayer.transform)
        if (dist < 0.95) {
          const dx = movePacket.x - peerPlayer.transform.x
          const dz = movePacket.z - peerPlayer.transform.z
          const len = Math.max(0.01, Math.sqrt(dx * dx + dz * dz))
          movePacket.x = peerPlayer.transform.x + (dx / len) * 1.1
          movePacket.z = peerPlayer.transform.z + (dz / len) * 1.1
        }
      }

      // 4. Check if Runner approaches escaping Saboteur
      if (gm && gm.escapeProgress.isEscaping && socket.data.role === 'runner') {
        const saboteurPos = peerPlayer?.transform
        if (saboteurPos && calculateDistance(movePacket, saboteurPos) < 3.2) {
          gm.cancelEscapeChannel('Runner approached')
          broadcastTelemetry(code, gm)
        }
      }

      // 5. Runner approaches accident zone: complete scene safety task only via explicit interaction
      // (Removed proximity auto-completion — player must use 'E' to interact with accident scene)
      // if (gm && socket.data.role === 'runner' && calculateDistance(movePacket, { x: 0, y: 0, z: 2.2 }) <= 5.5) {
      //   gm.completeTask('t_r_safety', 'runner')
      // }

      localPlayer.transform = { x: movePacket.x, y: movePacket.y, z: movePacket.z, yaw: movePacket.yaw }
      gm?.onPlayerMoved?.(socket.id, movePacket.x, movePacket.z)
    }

    // Milestone 6: Hide secret role in peer-moved packets
    socket.to(code).emit('peer-moved', {
      id: socket.id,
      role: 'citizen',
      ...movePacket
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. NPC INTERACTION & DIALOGUE
  // ─────────────────────────────────────────────────────────────
  socket.on('npc:interact', ({ npcId }) => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm) return

    const room = rooms.get(code)
    const player = room?.host?.id === socket.id ? room.host : room?.guest
    const npc = gm.npcs[npcId]

    if (!player || !npc) return

    const dist = calculateDistance(player.transform, npc.position)
    if (dist > 4.5) {
      return socket.emit('interaction:result', {
        success: false,
        message: 'Too far away to interact with ' + npc.name
      })
    }

    const dx = player.transform.x - npc.position.x
    const dz = player.transform.z - npc.position.z
    npc.facingYaw = Math.atan2(dx, dz)

    const session = gm.getDialogueSession(npcId, socket.data.role, socket.id)
    if (!session) {
      return socket.emit('interaction:result', {
        success: false,
        message: 'NPC is currently unavailable.'
      })
    }

    socket.emit('npc:dialogue:session', session)

    io.to(code).emit('npc:state:update', {
      npcId,
      npcState: npc
    })
  })

  socket.on('npc:dialogue:select', ({ npcId, optionId }) => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm) return

    // Milestone 5: 1-second dialogue submission rate limiter
    const now = Date.now()
    if (socket.data.lastDialogueTime && now - socket.data.lastDialogueTime < 1000) {
      return socket.emit('interaction:result', {
        success: false,
        message: 'Please wait before speaking again (cooldown active).'
      })
    }
    socket.data.lastDialogueTime = now

    const result = gm.handleDialogueChoice(npcId, optionId, socket.data.role, socket.id)
    if (!result.success) {
      return socket.emit('interaction:result', { success: false, message: result.message })
    }

    socket.emit('dialogue:result', {
      npcId,
      statusMessage: result.statusMessage,
      npcState: result.npcState,
      physicalReaction: result.physicalReaction,
      npcResponseText: result.npcResponseText,
      learningTip: result.learningTip,
      clueUnlocked: result.clueUnlocked,
      pointsAwarded: result.pointsAwarded,
      outcome: result.outcome,
      effects: result.effects,
      updatedSession: result.updatedSession
    })

    broadcastTelemetry(code, gm)

    io.to(code).emit('npc:state:update', {
      npcId,
      npcState: result.npcState
    })

    io.to(code).emit('npc:reaction:trigger', {
      npcId,
      reaction: result.physicalReaction
    })

    io.to(code).emit('information:update', {
      informationLog: gm.informationLog
    })

    broadcastTelemetry(code, gm)

    io.to(code).emit('match:state:update', {
      matchState: gm.getMatchState()
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 6. SABOTEUR ABILITIES & COOLDOWNS
  // ─────────────────────────────────────────────────────────────
  socket.on('saboteur:ability:use', ({ abilityId }) => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm || socket.data.role !== 'saboteur') {
      return socket.emit('interaction:result', { success: false, message: 'Unauthorized role action' })
    }

    const res = gm.handleSaboteurAbility(abilityId)
    socket.emit('interaction:result', {
      success: res.success,
      message: res.message
    })

    if (res.success) {
      if (abilityId === 'sab_distract') {
        io.to(code).emit('environment:noise:trigger', { position: { x: 8, y: 0, z: 2 } })
      }
      io.to(code).emit('information:update', {
        informationLog: gm.informationLog
      })
      broadcastTelemetry(code, gm)
      io.to(code).emit('match:state:update', {
        matchState: gm.getMatchState()
      })
    }
  })

  // ─────────────────────────────────────────────────────────────
  // 7. ESCAPE MECHANIC
  // ─────────────────────────────────────────────────────────────
  socket.on('escape:channel:start', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm || socket.data.role !== 'saboteur' || gm.phase !== 'ROUND_ACTIVE') return

    const room = rooms.get(code)
    const saboteur = room?.guest?.id === socket.id ? room.guest : room?.host
    if (!saboteur || !saboteur.transform) return

    const res = gm.startEscapeChannel(saboteur.transform, socket.id)
    socket.emit('interaction:result', { success: res.success, message: res.message })

    if (res.success) {
      broadcastTelemetry(code, gm)
    }
  })

  socket.on('escape:channel:cancel', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (gm && gm.cancelEscapeChannel('Cancelled by player')) {
      broadcastTelemetry(code, gm)
    }
  })

  // ─────────────────────────────────────────────────────────────
  // 8. OBJECT INTERACTIONS
  // ─────────────────────────────────────────────────────────────
  socket.on('object:action', ({ objId, actionType }) => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (!gm) return

    const room = rooms.get(code)
    const player = room?.host?.id === socket.id ? room.host : room?.guest
    const obj = gm.objects[objId]

    if (!player || !obj) return

    const dist = calculateDistance(player.transform, obj.position)
    if (dist > 4.5) {
      return socket.emit('interaction:result', {
        success: false,
        message: 'Too far away to interact with ' + obj.name
      })
    }

    const currentRole = gm.playerRoles[socket.id] || socket.data.role
    const res = gm.handleObjectAction(objId, actionType, currentRole)

    socket.emit('interaction:result', {
      success: res.success,
      message: res.message
    })

    if (res.success) {
      if (res.environmentalState) {
        io.to(code).emit('environment:update', {
          environmentalState: res.environmentalState
        })
      }

      io.to(code).emit('object:state:update', {
        objId,
        objState: res.objState
      })

      io.to(code).emit('information:update', {
        informationLog: gm.informationLog
      })

      broadcastTelemetry(code, gm)

      io.to(code).emit('match:state:update', {
        matchState: gm.getMatchState()
      })
    }
  })

  // 9. Information Log sync
  socket.on('information:request', () => {
    const code = socket.data.roomCode
    const gm = gameManagers.get(code)
    if (gm) {
      socket.emit('information:update', {
        informationLog: gm.informationLog
      })
      socket.emit('game:telemetry:update', {
        telemetry: socket.data.role
          ? gm.getTelemetryForPlayer(socket.id, socket.data.role)
          : gm.getTelemetry()
      })
      socket.emit('match:state:update', {
        matchState: gm.getMatchState()
      })
    }
  })

  // 10. Leave / Disconnect
  const handleLeave = () => {
    const code = socket.data.roomCode
    if (!code) return
    const room = rooms.get(code)
    const gm = gameManagers.get(code)

    console.log(`[Player Left / Disconnect] ${socket.id} in room ${code}`)

    if (gm && gm.phase === 'ROUND_ACTIVE') {
      gm.handlePlayerDisconnect(socket.id)
      io.to(code).emit('match:state:update', { matchState: gm.getMatchState() })
      io.to(code).emit('match:paused', {
        reason: gm.pauseReason,
        pauseRemainingSec: gm.pauseRemainingSec
      })
      return
    }

    if (room) {
      if (room.host?.id === socket.id) {
        socket.to(code).emit('room-closed', { message: 'Host disconnected. Room closed.' })
        rooms.delete(code)
        if (gm) {
          gm.destroy()
          gameManagers.delete(code)
        }
      } else if (room.guest?.id === socket.id) {
        room.guest = null
        room.status = 'waiting'
        socket.to(code).emit('peer-left', { message: 'Guest disconnected from room.' })
      }
    }
  }

  socket.on('leave-room', handleLeave)
  socket.on('disconnect', handleLeave)
})

// Periodic authoritative tick loop for active games
setInterval(() => {
  for (const [code, gm] of gameManagers) {
    const prevPhase = gm.phase
    gm.tick()

    // PATCH-C: drive bot seats (draft before the round, act during it, sealed verdict after)
    const botMgr = botManagerFor(gm, rooms.get(code))
    if (botMgr) {
      if (gm.phase !== 'ROUND_ACTIVE' && gm.phase !== 'ACCUSATION_PHASE' && gm.phase !== 'VERDICT_REVEAL') botMgr.draft()
      const bres = botMgr.tick()
      if (bres.allSubmitted && gm.phase === 'ACCUSATION_PHASE') {
        const reveal = gm.evaluateAccusationAndReveal()
        io.to(code).emit('match:verdict:reveal', { verdictReveal: reveal, matchState: gm.getMatchState() })
      }
    }

    // If round ended during tick (e.g. time ran out or escape finished)
    if (prevPhase === 'ROUND_ACTIVE' && gm.phase === 'ROUND_RESULTS') {
      const lastResult = gm.roundResults[gm.roundResults.length - 1]
      io.to(code).emit('match:round:end', {
        roundResult: lastResult,
        matchState: gm.getMatchState()
      })
    }

    // Broadcast synchronized match state and batch updates
    io.to(code).emit('match:state:update', {
      matchState: gm.getMatchState()
    })

    io.to(code).emit('npc:batch:update', {
      npcs: gm.npcs
    })

    // Milestone 6: Broadcast telemetry per-role to prevent data leakage.
    // Each socket receives only its own private telemetry.
    const roomSockets = io.sockets.adapter.rooms.get(code)
    if (roomSockets) {
      for (const sId of roomSockets) {
        const s = io.sockets.sockets.get(sId)
        if (s && s.data.role) {
          s.emit('game:telemetry:update', {
            telemetry: gm.getTelemetryForPlayer(s.id, s.data.role)
          })
        }
      }
    }

    const cctv = gm.objects.obj_cctv
    if (cctv && cctv.state === 'disabled') {
      io.to(code).emit('object:state:update', {
        objId: 'obj_cctv',
        objState: cctv
      })
    }
  }
}, 1000)

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Civic Clash Server] Port ${PORT} already active; attaching to running server instance.`)
  } else {
    console.error('[Civic Clash Server Error]', err)
  }
})

if (!httpServer.listening) {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Civic Clash Server] running on http://0.0.0.0:${PORT} (PORT=${PORT})`)
  })
}

export { httpServer, io, PORT, rooms, gameManagers }
