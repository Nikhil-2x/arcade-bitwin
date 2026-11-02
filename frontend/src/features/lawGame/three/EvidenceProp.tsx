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
    case 'cable':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.018 + i * 0.026, 0]} rotation={[Math.PI / 2, 0, i * 0.5]} castShadow>
              <torusGeometry args={[0.1 - i * 0.008, 0.014, 8, 24]} />
              {std('#23262c', { roughness: 0.6 })}
            </mesh>
          ))}
          <mesh position={[0.135, 0.02, 0.02]} rotation={[0, 0.3, Math.PI / 2]}>
            <cylinderGeometry args={[0.009, 0.009, 0.09, 8]} />
            {std('#d98a4a', { metalness: 0.9, roughness: 0.25, emissive: '#5a2c10' })}
          </mesh>
        </group>
      )
    case 'cutters':
      return (
        <group rotation={[0, 0.7, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} rotation={[0, s * 0.14, 0]}>
              <mesh position={[0, 0.014, 0.16]} castShadow>
                <boxGeometry args={[0.022, 0.016, 0.32]} />
                {std('#b3261e', { roughness: 0.5 })}
              </mesh>
              <mesh position={[0, 0.014, -0.05]} castShadow>
                <boxGeometry args={[0.03, 0.02, 0.12]} />
                {std('#6d7278', { metalness: 0.85, roughness: 0.35 })}
              </mesh>
            </group>
          ))}
        </group>
      )
    case 'pass':
      return (
        <group rotation={[0, -0.25, 0]}>
          <mesh position={[0, 0.003, 0]} castShadow>
            <boxGeometry args={[0.13, 0.004, 0.08]} />
            {std('#f0d48a', { roughness: 0.9 })}
          </mesh>
          <mesh position={[0.02, 0.0055, 0.012]}>
            <boxGeometry args={[0.07, 0.001, 0.018]} />
            {std('#3a3a44', { roughness: 0.95 })}
          </mesh>
        </group>
      )
    case 'tiffin':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.038 + i * 0.07, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.066, 20]} />
              {std('#aeb5bd', { metalness: 0.85, roughness: 0.32 })}
            </mesh>
          ))}
          <mesh position={[0, 0.235, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.045, 0.006, 8, 18, Math.PI]} />
            {std('#7d848c', { metalness: 0.8, roughness: 0.4 })}
          </mesh>
        </group>
      )
    case 'sack':
      return (
        <group>
          <mesh position={[0, 0.12, 0]} scale={[0.2, 0.13, 0.17]} castShadow>
            <icosahedronGeometry args={[1, 1]} />
            {std('#8a7248', { roughness: 1 })}
          </mesh>
          <mesh position={[0.02, 0.27, 0]}>
            <cylinderGeometry args={[0.022, 0.06, 0.07, 8]} />
            {std('#6e5a38', { roughness: 1 })}
          </mesh>
          {[[0.15, 0.1, 0.09], [-0.12, 0.08, 0.13], [0.03, 0.05, 0.17]].map(([x, y, z]) => (
            <mesh key={x} position={[x, y, z]} scale={[1, 0.98, 1]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              {std('#f4efe1', { roughness: 0.75 })}
            </mesh>
          ))}
        </group>
      )
    case 'trowel':
      return (
        <group rotation={[0, 0.8, 0]}>
          <mesh position={[0, 0.012, -0.08]} scale={[0.055, 0.008, 0.11]} castShadow>
            <sphereGeometry args={[1, 12, 8]} />
            {std('#9aa3ad', { metalness: 0.85, roughness: 0.4 })}
          </mesh>
          <mesh position={[0.005, 0.02, -0.11]} scale={[0.04, 0.008, 0.06]}>
            <sphereGeometry args={[1, 10, 8]} />
            {std('#4a3b26', { roughness: 1 })}
          </mesh>
          <mesh position={[0, 0.02, 0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.021, 0.14, 10]} />
            {std('#2f7d4f')}
          </mesh>
        </group>
      )
    case 'padlock':
      return (
        <group rotation={[0, 0.4, 0]}>
          <mesh position={[0, 0.022, 0]} castShadow>
            <boxGeometry args={[0.075, 0.044, 0.05]} />
            {std('#c9a24a', { metalness: 0.8, roughness: 0.35 })}
          </mesh>
          {/* The shackle, cut through and bent aside. */}
          <mesh position={[0.012, 0.052, 0]} rotation={[0, 0, 0.5]}>
            <torusGeometry args={[0.027, 0.0065, 8, 18, Math.PI * 0.72]} />
            {std('#c7ccd2', { metalness: 0.9, roughness: 0.25 })}
          </mesh>
          <mesh position={[-0.02, 0.0225, 0.0255]}>
            <boxGeometry args={[0.014, 0.014, 0.002]} />
            {std('#2f7d4f')}
          </mesh>
        </group>
      )
    case 'sunscreen':
      return (
        <group rotation={[0, -0.6, Math.PI / 2 - 0.02]} position={[0, 0.033, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.022, 0.13, 14]} />
            {std('#f4a02e', { roughness: 0.45 })}
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.03, 12]} />
            {std('#f2efe6')}
          </mesh>
        </group>
      )
    case 'flipflop':
      return (
        <group rotation={[0, 0.7, 0]}>
          <mesh position={[0, 0.007, 0]} scale={[0.05, 0.007, 0.105]} castShadow>
            <sphereGeometry args={[1, 14, 8]} />
            {std('#f08fb0', { roughness: 0.8 })}
          </mesh>
          <mesh position={[0, 0.024, -0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 0.5]}>
            <torusGeometry args={[0.032, 0.005, 6, 14, Math.PI]} />
            {std('#d94e7f')}
          </mesh>
        </group>
      )
    case 'cash':
      return (
        <group rotation={[0, 0.35, 0]}>
          {[
            [-0.085, 0.016, -0.03, 0.05],
            [0.085, 0.016, 0.02, -0.08],
            [0, 0.048, -0.004, 0.14],
          ].map(([x, y, z, turn]) => (
            <group key={turn} position={[x, y, z]} rotation={[0, turn, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.158, 0.03, 0.074]} />
                {std('#8e7ab5', { roughness: 0.92 })}
              </mesh>
              <mesh>
                <boxGeometry args={[0.036, 0.033, 0.077]} />
                {std('#f0e6c8', { roughness: 0.85 })}
              </mesh>
            </group>
          ))}
        </group>
      )
    case 'chequebook':
      return (
        <group rotation={[0, 0.5, 0]}>
          <mesh position={[0, 0.006, 0]} castShadow>
            <boxGeometry args={[0.2, 0.012, 0.085]} />
            {std('#1f4f7a', { roughness: 0.8 })}
          </mesh>
          <mesh position={[0.022, 0.0132, 0]}>
            <boxGeometry args={[0.15, 0.0015, 0.07]} />
            {std('#e6ecd8', { roughness: 0.95 })}
          </mesh>
          <mesh position={[0.03, 0.0145, 0.012]}>
            <boxGeometry args={[0.08, 0.0008, 0.005]} />
            {std('#28324a')}
          </mesh>
        </group>
      )
    case 'passbook':
      return (
        <group rotation={[0, -0.7, 0]}>
          {[0, 1].map((i) => (
            <mesh key={i} position={[i * 0.018, 0.008 + i * 0.016, i * -0.012]} rotation={[0, i * 0.4, 0]} castShadow>
              <boxGeometry args={[0.105, 0.015, 0.145]} />
              {std(i ? '#2f7d5b' : '#8c2f39', { roughness: 0.7 })}
            </mesh>
          ))}
        </group>
      )
    case 'pendrive':
      return (
        <group rotation={[0, 1.1, 0]}>
          <mesh position={[0, 0.009, 0]} castShadow>
            <boxGeometry args={[0.022, 0.016, 0.062]} />
            {std('#1c1f26', { roughness: 0.4 })}
          </mesh>
          <mesh position={[0, 0.009, 0.041]}>
            <boxGeometry args={[0.014, 0.0055, 0.022]} />
            {std('#c7ccd2', { metalness: 0.9, roughness: 0.25 })}
          </mesh>
          <mesh position={[0, 0.0175, -0.016]}>
            <boxGeometry args={[0.009, 0.001, 0.009]} />
            {std('#ef5a48', { emissive: '#7a1d12' })}
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
