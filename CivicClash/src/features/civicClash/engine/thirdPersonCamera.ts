import * as THREE from 'three'

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0)

  // Camera Orbit parameters
  public yaw: number = 0 // Horizontal rotation in radians
  public pitch: number = 0.25 // Vertical angle in radians
  public distance: number = 6.5 // Distance behind character
  public heightOffset: number = 1.6 // Look-at height

  private isDragging: boolean = false
  private prevMouseX: number = 0
  private prevMouseY: number = 0

  private domElement: HTMLElement

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement

    this.setupMouseListeners()
  }

  private setupMouseListeners() {
    const onMouseDown = (e: MouseEvent) => {
      // Allow orbit on right-click or left-click drag
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true
        this.prevMouseX = e.clientX
        this.prevMouseY = e.clientY
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return

      const deltaX = e.clientX - this.prevMouseX
      const deltaY = e.clientY - this.prevMouseY

      this.prevMouseX = e.clientX
      this.prevMouseY = e.clientY

      const sensitivity = 0.005
      this.yaw -= deltaX * sensitivity
      this.pitch += deltaY * sensitivity

      // Clamp vertical pitch (-20° to +65°)
      this.pitch = Math.max(-0.35, Math.min(1.15, this.pitch))
    }

    const onMouseUp = () => {
      this.isDragging = false
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const onWheel = (e: WheelEvent) => {
      this.distance += e.deltaY * 0.005
      this.distance = Math.max(3.5, Math.min(12, this.distance))
    }

    this.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    this.domElement.addEventListener('contextmenu', onContextMenu)
    this.domElement.addEventListener('wheel', onWheel)
  }

  public update(targetPos: THREE.Vector3) {
    this.target.copy(targetPos)

    // Calculate camera position in sphere orbit around target
    const horizontalDist = this.distance * Math.cos(this.pitch)
    const verticalDist = this.distance * Math.sin(this.pitch)

    const offsetX = Math.sin(this.yaw) * horizontalDist
    const offsetZ = Math.cos(this.yaw) * horizontalDist

    this.camera.position.set(
      this.target.x + offsetX,
      this.target.y + this.heightOffset + verticalDist,
      this.target.z + offsetZ
    )

    this.camera.lookAt(
      this.target.x,
      this.target.y + this.heightOffset * 0.8,
      this.target.z
    )
  }

  /**
   * Computes camera forward vector projected onto ground plane (XZ)
   */
  public getForwardVector(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
    return forward.normalize()
  }

  /**
   * Computes camera right vector projected onto ground plane (XZ)
   */
  public getRightVector(): THREE.Vector3 {
    const right = new THREE.Vector3(1, 0, 0)
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
    return right.normalize()
  }
}

