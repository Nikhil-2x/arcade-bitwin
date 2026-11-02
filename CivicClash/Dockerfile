# Multi-stage Dockerfile for CivicClash Web Multiplayer Game

# ── Stage 1: Build Frontend Assets ──
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Compile TypeScript & Build Vite Production Bundle
RUN npm run build

# ── Stage 2: Lean Production Server ──
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8788

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend assets and server runtime from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# Expose game port
EXPOSE 8788

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start authoritative game server (serves frontend + Socket.IO on single port)
CMD ["node", "server/server.js"]

