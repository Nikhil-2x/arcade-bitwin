import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

/**
 * Two-player rooms for Circle of Allies.
 * The server only pairs players and relays their messages; the room creator's browser runs the game.
 * It also serves the built frontend (../frontend/dist) with an SPA fallback, so one process hosts everything.
 */

const PORT = Number(process.env.PORT ?? 8787)
const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '../frontend/dist')

// no 0/O or 1/I/L, so a code read out loud or off a screen can't be mistyped
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

/** @type {Map<string, { host: import('ws').WebSocket, guest: import('ws').WebSocket | null }>} */
const rooms = new Map()

function newCode() {
  for (;;) {
    let code = ''
    for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    if (!rooms.has(code)) return code
  }
}

const send = (ws, msg) => ws && ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg))

function leave(ws) {
  const code = ws.room
  if (!code) return
  ws.room = undefined
  const room = rooms.get(code)
  if (!room) return
  if (room.host === ws) {
    // the host owns the game: without it the room is gone
    rooms.delete(code)
    if (room.guest) {
      room.guest.room = undefined
      send(room.guest, { t: 'closed' })
    }
  } else if (room.guest === ws) {
    room.guest = null
    send(room.host, { t: 'peer-left' })
  }
}

function onMessage(ws, raw) {
  let msg
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  switch (msg.t) {
    case 'create': {
      leave(ws)
      const code = newCode()
      rooms.set(code, { host: ws, guest: null })
      ws.room = code
      send(ws, { t: 'created', code })
      break
    }
    case 'join': {
      leave(ws)
      const code = String(msg.code ?? '').toUpperCase().trim()
      const room = rooms.get(code)
      if (!room) return send(ws, { t: 'error', message: 'No room with that code.' })
      if (room.guest) return send(ws, { t: 'error', message: 'That room already has two players.' })
      room.guest = ws
      ws.room = code
      send(ws, { t: 'joined', code })
      send(room.host, { t: 'peer-joined' })
      break
    }
    case 'leave':
      leave(ws)
      break
    case 'relay': {
      const room = rooms.get(ws.room)
      if (!room) return
      send(room.host === ws ? room.guest : room.host, { t: 'relay', data: msg.data })
      break
    }
  }
}

// ── static frontend ──

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  // Health check endpoint for uptime monitors (e.g. UptimeRobot, Render keep-alive)
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/ping') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, HEAD, OPTIONS',
        'access-control-allow-headers': '*',
      })
      return res.end()
    }

    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
      'access-control-allow-origin': '*',
    })

    if (req.method === 'HEAD') {
      return res.end()
    }

    return res.end(
      JSON.stringify({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        rooms: rooms.size,
        connections: wss?.clients?.size ?? 0,
      })
    )
  }

  if (!existsSync(DIST)) {
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end('Circle of Allies room server. Build the frontend (npm run build in ../frontend) to serve it from here.')
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '')
  let file = join(DIST, path)
  // client-side routes (/menu, /play/1, ...) all get index.html
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html')
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  ws.alive = true
  ws.on('pong', () => (ws.alive = true))
  ws.on('message', (raw) => onMessage(ws, raw.toString()))
  ws.on('close', () => leave(ws))
})

// drop connections that stopped answering (closed laptop lids, dead wifi)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) {
      ws.terminate()
      continue
    }
    ws.alive = false
    ws.ping()
  }
}, 15000)

server.listen(PORT, () => console.log(`Circle of Allies server on http://localhost:${PORT} (rooms at ws://localhost:${PORT}/ws)`))
