# CivicClash — Production Deployment Guide

CivicClash is engineered as an authoritative, full-stack multiplayer 3D web game. It can be deployed as:
1. **A Single-Service Full-Stack Web App** (Recommended: serves both the React 3D frontend and Socket.IO backend on a single port).
2. **A Containerized Application** (Docker / Kubernetes / Cloud Run / AWS ECS).
3. **A Split Architecture** (Static CDN frontend on Vercel/Netlify/Cloudflare Pages + Backend on Railway/Render/Fly.io).

---

## 🚀 Option 1: Single-Service Cloud Deployment (Easiest & Recommended)

CivicClash's server (`server/server.js`) automatically serves the pre-built frontend from `/dist` and powers real-time Socket.IO multiplayer on the same port.

### Deployment Platforms:
- **Railway:** Connect GitHub repository. Railway detects `package.json`, runs `npm run build`, and starts with `npm start`. Set `PORT` (Railway provides this automatically).
- **Render (Web Service):**
  - **Environment:** Node
  - **Build Command:** `npm ci && npm run build`
  - **Start Command:** `npm start`
  - **Health Check Path:** `/health`
- **Fly.io:**
  - Run `fly launch` in the `CivicClash` folder (it will use the included `Dockerfile`).
  - Set `internal_port = 8788`.
- **Heroku:** Connect repo, configure Node buildpack, deploy branch.

---

## 🐳 Option 2: Docker Container Deployment

A multi-stage, production-ready `Dockerfile` and `.dockerignore` are included in the repository.

### 1. Build the Docker Image:
```bash
docker build -t civicclash:latest .
```

### 2. Run the Container:
```bash
docker run -d -p 8788:8788 --name civicclash --restart unless-stopped civicclash:latest
```

The application is now live at `http://localhost:8788` (health check at `http://localhost:8788/health`).

---

## ⚡ Option 3: Split Deployment (Vercel / Netlify Frontend + Cloud Backend)

If you wish to host the static 3D web client on Vercel or Netlify and the Socket.IO game server on a backend cloud (e.g. Railway or a VPS):

1. **Deploy Backend (`server/server.js`):**
   - Deploy `server/` to Railway, Render, or VPS.
   - Note your public backend URL (e.g. `https://civicclash-backend.up.railway.app`).

2. **Deploy Frontend:**
   - On Vercel / Netlify:
   - **Root Directory:** `CivicClash`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variable:**
     - Key: `VITE_SERVER_URL`
     - Value: `https://civicclash-backend.up.railway.app` (your backend URL)

---

## 🧪 Local Production Verification

To test the production build locally exactly as it will run in cloud deployment:

```bash
# 1. Build production bundle
npm run build

# 2. Run production server
npm start
```
Then visit `http://localhost:8788` in your browser.

---

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8788` | Port for the HTTP and Socket.IO server (cloud providers inject this automatically). |
| `NODE_ENV` | `production` | Node environment mode. |
| `VITE_SERVER_URL` | `window.location.origin` | Optional: Public URL of the backend if hosting frontend separately. |

---

## 🛡️ Architecture & Performance Notes for Web Deployment

- **Single Port Simplicity:** Frontend HTML, CSS, JavaScript, textures, and WebSocket frames run through the single authoritative server port, avoiding mixed-content HTTPS/WSS blocking.
- **Reverse Proxy Ready:** Configured to bind on `0.0.0.0` for clean Nginx, Cloudflare, Traefik, or AWS ALB reverse proxy forwarding.
- **Web-Optimized 3D Assets:** Three.js environments use lightweight procedural geometry with frustum culling, low draw calls, and dynamic shadow maps suitable for mobile, laptop, and desktop browsers.

