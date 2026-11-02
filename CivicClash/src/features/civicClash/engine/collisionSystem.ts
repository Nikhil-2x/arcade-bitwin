export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface DynamicEntityCollider {
  id: string
  x: number
  z: number
  radius: number
}

export class CollisionSystem {
  private obstacles: AABB[] = []
  private mapMinX: number = -40
  private mapMaxX: number = 40
  private mapMinZ: number = -40
  private mapMaxZ: number = 40
  public playerRadius: number = 0.55

  constructor(
    obstacles: AABB[] = [],
    bounds = { minX: -40, maxX: 40, minZ: -40, maxZ: 40 }
  ) {
    this.obstacles = obstacles
    this.mapMinX = bounds.minX
    this.mapMaxX = bounds.maxX
    this.mapMinZ = bounds.minZ
    this.mapMaxZ = bounds.maxZ
  }

  public setObstacles(obstacles: AABB[]) {
    this.obstacles = obstacles
  }

  public addObstacle(box: AABB) {
    this.obstacles.push(box)
  }

  public checkCollision(
    x: number,
    z: number,
    entities: DynamicEntityCollider[] = []
  ): boolean {
    // 1. Boundary check
    if (
      x - this.playerRadius < this.mapMinX ||
      x + this.playerRadius > this.mapMaxX ||
      z - this.playerRadius < this.mapMinZ ||
      z + this.playerRadius > this.mapMaxZ
    ) {
      return true
    }

    // 2. Obstacles AABB check
    for (const b of this.obstacles) {
      if (
        x + this.playerRadius > b.minX &&
        x - this.playerRadius < b.maxX &&
        z + this.playerRadius > b.minZ &&
        z - this.playerRadius < b.maxZ
      ) {
        return true
      }
    }

    // 3. Dynamic entities (Remote Player + NPCs)
    for (const ent of entities) {
      const dx = x - ent.x
      const dz = z - ent.z
      const minDist = this.playerRadius + ent.radius
      if (dx * dx + dz * dz < minDist * minDist) {
        return true
      }
    }

    return false
  }

  /**
   * Slide-along-wall and smooth capsule-capsule collision resolution
   * Attempts full movement, if blocked attempts X-slide, then Z-slide, or tangent slide.
   */
  public resolvePositionWithEntities(
    currentX: number,
    currentZ: number,
    deltaX: number,
    deltaZ: number,
    entities: DynamicEntityCollider[] = []
  ): { x: number; z: number } {
    const nextX = currentX + deltaX
    const nextZ = currentZ + deltaZ

    // 1. If clear path, move directly
    if (!this.checkCollision(nextX, nextZ, entities)) {
      return { x: nextX, z: nextZ }
    }

    // 2. Try axis sliding (X-only, Z-only)
    const canMoveX = !this.checkCollision(nextX, currentZ, entities)
    const canMoveZ = !this.checkCollision(currentX, nextZ, entities)

    if (canMoveX && !canMoveZ) {
      return { x: nextX, z: currentZ }
    } else if (canMoveZ && !canMoveX) {
      return { x: currentX, z: nextZ }
    }

    // 3. Tangent projection for dynamic entity collision
    for (const ent of entities) {
      const dx = nextX - ent.x
      const dz = nextZ - ent.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const minDist = this.playerRadius + ent.radius
      if (dist < minDist && dist > 0.001) {
        // Normal pointing from obstacle entity to player
        const nx = dx / dist
        const nz = dz / dist
        // Push outside the collision radius
        const pushX = ent.x + nx * minDist
        const pushZ = ent.z + nz * minDist
        if (!this.checkCollision(pushX, pushZ, [])) {
          return { x: pushX, z: pushZ }
        }
      }
    }

    // 4. Completely blocked
    return { x: currentX, z: currentZ }
  }

  public resolvePosition(
    currentX: number,
    currentZ: number,
    deltaX: number,
    deltaZ: number
  ): { x: number; z: number } {
    return this.resolvePositionWithEntities(currentX, currentZ, deltaX, deltaZ, [])
  }
}
