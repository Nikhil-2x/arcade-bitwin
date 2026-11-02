export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

export function checkOverlap(box1: Box, box2: Box): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  )
}

/**
 * Slide-along-wall movement resolution
 */
export function resolveMovement(
  currentX: number,
  currentY: number,
  deltaX: number,
  deltaY: number,
  playerRadius: number,
  mapWidth: number,
  mapHeight: number,
  obstacles: Box[]
): { x: number; y: number } {
  let newX = currentX + deltaX
  let newY = currentY + deltaY

  // Bounds clamp
  newX = clamp(newX, playerRadius, mapWidth - playerRadius)
  newY = clamp(newY, playerRadius, mapHeight - playerRadius)

  // Test X movement separately for wall sliding
  const playerBoxX: Box = {
    x: newX - playerRadius,
    y: currentY - playerRadius,
    width: playerRadius * 2,
    height: playerRadius * 2
  }

  let collideX = false
  for (const obs of obstacles) {
    if (checkOverlap(playerBoxX, obs)) {
      collideX = true
      break
    }
  }
  if (collideX) {
    newX = currentX // cancel X movement, allow Y sliding
  }

  // Test Y movement separately
  const playerBoxY: Box = {
    x: newX - playerRadius,
    y: newY - playerRadius,
    width: playerRadius * 2,
    height: playerRadius * 2
  }

  let collideY = false
  for (const obs of obstacles) {
    if (checkOverlap(playerBoxY, obs)) {
      collideY = true
      break
    }
  }
  if (collideY) {
    newY = currentY // cancel Y movement
  }

  return { x: newX, y: newY }
}

/**
 * Line-of-sight check (simplified raycast against obstacles)
 */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: Box[]
): boolean {
  const dist = distance(x1, y1, x2, y2)
  if (dist < 1) return true
  const steps = Math.floor(dist / 15)
  const dx = (x2 - x1) / steps
  const dy = (y2 - y1) / steps

  for (let i = 1; i < steps; i++) {
    const testX = x1 + dx * i
    const testY = y1 + dy * i
    const ptBox: Box = { x: testX - 4, y: testY - 4, width: 8, height: 8 }
    for (const obs of obstacles) {
      if (checkOverlap(ptBox, obs)) {
        return false // blocked by obstacle
      }
    }
  }

  return true
}

