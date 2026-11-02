import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beachGround } from './beachGround.ts'
import { HAZE, SUN_DIRECTION } from './beachLayout.ts'

const VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform sampler2D uHeights;
  uniform vec4 uBounds;
  uniform vec3 uSun;
  uniform vec3 uHaze;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float ripples(vec2 p) {
    float t = uTime;
    return noise(p * 0.55 + vec2(t * 0.22, t * 0.13)) * 0.6
         + noise(p * 1.4 - vec2(t * 0.31, -t * 0.2)) * 0.28
         + noise(p * 3.6 + vec2(-t * 0.5, t * 0.44)) * 0.12;
  }

  void main() {
    vec2 uv = (vWorld.xz - uBounds.xy) / uBounds.zw;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    float ground = mix(-3.0, texture2D(uHeights, uv).r * 6.0 - 3.0, inside);
    float depth = -ground;

    vec3 toEye = cameraPosition - vWorld;
    float distance = length(toEye);
    vec3 view = toEye / distance;

    // Ripples calm down with distance, or they shimmer into noise near the horizon.
    float strength = 0.34 * clamp(70.0 / distance, 0.08, 1.0);
    float e = 0.18;
    float h = ripples(vWorld.xz);
    vec3 normal = normalize(vec3((h - ripples(vWorld.xz + vec2(e, 0.0))) * strength / e, 1.0, (h - ripples(vWorld.xz + vec2(0.0, e))) * strength / e));

    vec3 shallow = vec3(0.26, 0.74, 0.70);
    vec3 deep = vec3(0.03, 0.34, 0.50);
    vec3 color = mix(shallow, deep, smoothstep(0.1, 2.8, depth));

    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 4.0);
    color = mix(color, vec3(0.70, 0.87, 0.97), fresnel * 0.7);

    vec3 halfway = normalize(uSun + view);
    float glint = pow(max(dot(normal, halfway), 0.0), 420.0);
    color += vec3(1.0, 0.96, 0.84) * glint * 0.9;

    // Foam: bands that creep up the shore and break apart.
    float surge = sin(uTime * 0.7 + vWorld.x * 0.11 + vWorld.z * 0.07) * 0.09;
    float line = smoothstep(0.16, 0.0, abs(depth - 0.1 - surge * 0.6));
    float lace = smoothstep(0.38, 0.7, noise(vWorld.xz * 3.1 + vec2(uTime * 0.25, -uTime * 0.18)));
    float foam = line * lace * inside;
    color = mix(color, vec3(0.97, 0.99, 0.98), foam * 0.85);

    // Clear enough over the shallows for the scan's own lagoon to show through.
    float alpha = mix(0.42, 0.97, smoothstep(0.1, 2.3, depth));
    alpha = max(alpha, foam * 0.85);
    alpha = max(alpha, fresnel * 0.8);
    alpha *= smoothstep(-0.04, 0.03, depth);

    float haze = 1.0 - exp(-pow(distance / 900.0, 2.0));
    color = mix(color, uHaze, haze);

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

const SEA_RADIUS = 1400

/** The sea, cut into the scan's shoreline by the height of the ground under each pixel. */
export function Water() {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => {
    const ground = beachGround()
    return {
      uTime: { value: 0 },
      uHeights: { value: ground.heightTexture() },
      uBounds: { value: new THREE.Vector4(...ground.bounds) },
      uSun: { value: new THREE.Vector3(...SUN_DIRECTION).normalize() },
      uHaze: { value: new THREE.Color(HAZE).convertSRGBToLinear() },
    }
  }, [])

  useFrame((_, dt) => {
    if (material.current) material.current.uniforms.uTime.value += Math.min(dt, 0.1)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <circleGeometry args={[SEA_RADIUS, 64]} />
      <shaderMaterial ref={material} vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
