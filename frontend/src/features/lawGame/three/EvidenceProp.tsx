import type { ThreeElements } from '@react-three/fiber'
import type { EvidenceKind } from '../types.ts'

const std = (color: string, extra?: { roughness?: number; metalness?: number; emissive?: string }) => (
  <meshStandardMaterial color={color} roughness={extra?.roughness ?? 0.7} metalness={extra?.metalness ?? 0} emissive={extra?.emissive} />
)

/** Small stand-ins for each kind of evidence, resting on the y = 0 plane of their group. */
function Shape({ kind }: { kind: EvidenceKind }) {
  switch (kind) {
    case 'envelope':
      return (
        <group>
          <mesh position={[0, 0.006, 0]} rotation={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.2, 0.012, 0.13]} />
            {std('#e9dfc4')}
          </mesh>
          <mesh position={[0.03, 0.015, 0.01]}>
            <cylinderGeometry args={[0.026, 0.026, 0.008, 16]} />
            {std('#a3231c')}
          </mesh>
        </group>
      )
    case 'phone':
      return (
        <group rotation={[0, -0.5, 0]}>
          <mesh position={[0, 0.005, 0]} castShadow>
            <boxGeometry args={[0.075, 0.01, 0.15]} />
            {std('#15171c', { roughness: 0.25, metalness: 0.4 })}
          </mesh>
          <mesh position={[0, 0.0105, 0]}>
            <boxGeometry args={[0.066, 0.001, 0.136]} />
            {std('#2c6fb0', { roughness: 0.2, emissive: '#1b4673' })}
          </mesh>
        </group>
      )
    case 'key':
      return (
        <group rotation={[0, 0.9, 0]}>
          <mesh position={[0, 0.006, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.022, 0.006, 8, 20]} />
            {std('#c9a24a', { metalness: 0.8, roughness: 0.3 })}
          </mesh>
          <mesh position={[0.06, 0.005, 0]} castShadow>
            <boxGeometry args={[0.07, 0.007, 0.009]} />
            {std('#c9a24a', { metalness: 0.8, roughness: 0.3 })}
          </mesh>
          <mesh position={[-0.05, 0.003, 0.02]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.06, 0.003, 0.004]} />
            {std('#3f8a4a')}
          </mesh>
        </group>
      )
    case 'printout':
      return (
        <group>
          <mesh position={[0, 0.07, 0]} rotation={[0.4, 0.3, 0.2]} castShadow>
            <icosahedronGeometry args={[0.07, 0]} />
            {std('#f1efe6', { roughness: 0.95 })}
          </mesh>
        </group>
      )
    case 'bottle':
      return (
        <group>
          <mesh position={[0, 0.11, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.22, 20]} />
            {std('#9aa3ad', { metalness: 0.85, roughness: 0.3 })}
          </mesh>
          <mesh position={[0, 0.235, 0]}>
            <cylinderGeometry args={[0.022, 0.03, 0.03, 16]} />
            {std('#2d5fa8')}
          </mesh>
        </group>
      )
    case 'receipt':
      return (
        <mesh position={[0, 0.003, 0]} rotation={[0, 0.2, 0]}>
          <boxGeometry args={[0.05, 0.004, 0.14]} />
          {std('#f4f0e2', { roughness: 0.95 })}
        </mesh>
      )
  }
}

interface Props extends Omit<ThreeElements['group'], 'id'> {
  evidenceId: string
  kind: EvidenceKind
  /** Draw a soft glow so the item is easy to see while being carried. */
  ghost?: boolean
}

export function EvidenceProp({ evidenceId, kind, ghost, ...rest }: Props) {
  return (
    <group {...rest} userData={{ evidenceId }}>
      <Shape kind={kind} />
      {/* A forgiving target for the crosshair: the items are small. */}
      <mesh position={[0, 0.08, 0]} userData={{ evidenceId }} visible={false}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      {ghost && (
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshBasicMaterial color="#ffb547" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
