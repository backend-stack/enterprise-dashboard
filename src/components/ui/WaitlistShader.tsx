"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;

    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity * 0.4);

    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(max(glow, 0.0), 2.0);

    // Fade via alpha only — multiplying color by glow muddies to grey
    // over the site's light paper background
    gl_FragColor = vec4(color, glow * 0.85);
  }
`;

function ShaderPlane({ color1, color2 }: { color1: string; color2: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  // The 2-unit plane scales to cover the whole viewport; the radial glow
  // fades out just past the screen edges
  const { viewport } = useThree();
  const scale = Math.max(viewport.width, viewport.height) * 0.8;

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) },
    }),
    [color1, color2]
  );

  useFrame((state) => {
    uniforms.time.value = state.clock.elapsedTime;
    uniforms.intensity.value =
      1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
  });

  return (
    <mesh ref={mesh} scale={[scale, scale, 1]}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function EnergyRing({
  radius,
  color,
  tilt = 1.1,
  speed = 1,
  baseOpacity = 0.3,
}: {
  radius: number;
  color: string;
  tilt?: number;
  speed?: number;
  baseOpacity?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  // Rings grow with the viewport so they hold their proportions full-screen
  const { viewport } = useThree();
  const ringScale = Math.min(viewport.width, viewport.height) / 3.5;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mesh.current) {
      // Tilted orbit wobble — reads as a slow 3D ring around the glow
      mesh.current.rotation.x = tilt + Math.sin(t * 0.4 * speed) * 0.15;
      mesh.current.rotation.y = Math.sin(t * 0.3 * speed) * 0.35;
      mesh.current.rotation.z = t * 0.25 * speed;
    }
    if (material.current) {
      material.current.opacity =
        baseOpacity + Math.sin(t * 2 * speed) * baseOpacity * 0.5;
    }
  });

  return (
    <mesh ref={mesh} scale={[ringScale, ringScale, 1]}>
      <ringGeometry args={[radius * 0.97, radius, 64]} />
      <meshBasicMaterial
        ref={material}
        color={color}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* Sky-toned energy field — the waitlist's centerpiece backdrop. Light blues
   pulled from the hero's sky video so it reads as one design language. */
export function WaitlistShader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 60 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <ShaderPlane color1="#9ecbec" color2="#e9f4fc" />
        <EnergyRing radius={1.45} color="#7fb8e2" tilt={1.15} speed={1} />
        <EnergyRing
          radius={1.8}
          color="#b5d8f0"
          tilt={0.85}
          speed={-0.7}
          baseOpacity={0.22}
        />
      </Canvas>
    </div>
  );
}
