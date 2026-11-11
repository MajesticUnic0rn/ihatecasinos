"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { colorOf, wheel, type Variant } from "@/lib/games/roulette";

/**
 * The wheel is ANIMATED, not simulated.
 *
 * A rigid-body roulette sim is slow, fragile, and — more importantly —
 * philosophically wrong for this site. The outcome comes from a seeded
 * PRNG so it is reproducible and auditable; the 3D is a presentation
 * layer that drives the ball to a result the math already chose. That
 * also frees the Worker to run a million spins while you watch one.
 */

const POCKET_COLORS: Record<string, string> = {
  red: "#c8252c",
  black: "#15212b",
  green: "#1f7a4d",
};

const OUTER = 4.1;
const POCKET_OUTER = 3.55;
const POCKET_INNER = 2.5;

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Pockets({ variant }: { variant: Variant }) {
  const pockets = wheel(variant);
  const seg = (Math.PI * 2) / pockets.length;

  return (
    <group>
      {pockets.map((label, i) => {
        const start = i * seg;
        const mid = start + seg / 2;
        const color = POCKET_COLORS[colorOf(label)];
        const r = (POCKET_INNER + POCKET_OUTER) / 2;

        return (
          <group key={`${label}-${i}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry
                args={[POCKET_INNER, POCKET_OUTER, 24, 1, start, seg]}
              />
              <meshStandardMaterial
                color={color}
                roughness={0.65}
                metalness={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* fret — the metal divider between pockets */}
            <mesh
              position={[
                Math.cos(start) * r,
                0.12,
                -Math.sin(start) * r,
              ]}
              rotation={[0, start, 0]}
            >
              <boxGeometry args={[POCKET_OUTER - POCKET_INNER, 0.22, 0.045]} />
              <meshStandardMaterial
                color="#d9c89a"
                metalness={0.85}
                roughness={0.3}
              />
            </mesh>

            <Text
              position={[Math.cos(mid) * r, 0.1, -Math.sin(mid) * r]}
              rotation={[-Math.PI / 2, 0, mid - Math.PI / 2]}
              fontSize={0.34}
              color="#f1f6f1"
              anchorX="center"
              anchorY="middle"
              fontWeight={700}
            >
              {label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function WheelBody({
  variant,
  targetIndex,
  spinId,
  onSettled,
  duration = 5.2,
}: {
  variant: Variant;
  targetIndex: number | null;
  spinId: number;
  onSettled?: () => void;
  duration?: number;
}) {
  const wheelRef = React.useRef<THREE.Group>(null);
  const ballRef = React.useRef<THREE.Mesh>(null);

  const pockets = wheel(variant);
  const seg = (Math.PI * 2) / pockets.length;

  const start = React.useRef<number | null>(null);
  const settled = React.useRef(false);
  const restAngle = React.useRef(0);

  React.useEffect(() => {
    if (targetIndex === null) return;
    start.current = null;
    settled.current = false;
  }, [spinId, targetIndex]);

  useFrame((state, delta) => {
    const w = wheelRef.current;
    const ball = ballRef.current;
    if (!w || !ball) return;

    // Idle: the wheel always turns. Casinos never stop it either.
    if (targetIndex === null || settled.current) {
      w.rotation.y += delta * 0.18;
      if (targetIndex !== null && settled.current) {
        const a = restAngle.current + w.rotation.y;
        ball.position.set(
          Math.cos(a) * ((POCKET_INNER + POCKET_OUTER) / 2),
          0.26,
          -Math.sin(a) * ((POCKET_INNER + POCKET_OUTER) / 2),
        );
      } else {
        ball.position.set(Math.cos(state.clock.elapsedTime) * 3.9, 0.3, -Math.sin(state.clock.elapsedTime) * 3.9);
      }
      return;
    }

    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / duration);
    const e = easeOutQuart(t);

    // Wheel: 6 full turns, decelerating.
    w.rotation.y = e * Math.PI * 2 * 6;

    // Ball angle is defined RELATIVE to the wheel, so at t=1 it sits
    // exactly in the target pocket no matter where the wheel stopped.
    const targetAngle = targetIndex * seg + seg / 2;
    const rel = targetAngle + (1 - e) * Math.PI * 2 * 14;
    restAngle.current = targetAngle;

    const world = w.rotation.y + rel;
    const radius = THREE.MathUtils.lerp(
      3.95,
      (POCKET_INNER + POCKET_OUTER) / 2,
      easeInOutCubic(Math.max(0, (t - 0.45) / 0.55)),
    );

    // A couple of hops as it drops off the track.
    const dropPhase = Math.max(0, (t - 0.6) / 0.4);
    const bounce = dropPhase > 0 ? Math.abs(Math.sin(dropPhase * Math.PI * 3)) * (1 - dropPhase) * 0.5 : 0;
    const y = THREE.MathUtils.lerp(0.42, 0.26, dropPhase) + bounce;

    ball.position.set(Math.cos(world) * radius, y, -Math.sin(world) * radius);

    if (t >= 1 && !settled.current) {
      settled.current = true;
      onSettled?.();
    }
  });

  return (
    <group>
      {/* outer bowl */}
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <cylinderGeometry args={[OUTER + 0.5, OUTER + 0.75, 0.5, 64]} />
        <meshStandardMaterial color="#2a1a12" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[OUTER, OUTER, 0.12, 64]} />
        <meshStandardMaterial color="#3b2419" roughness={0.6} />
      </mesh>

      <group ref={wheelRef}>
        <Pockets variant={variant} />
        {/* turret */}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[POCKET_INNER - 0.35, POCKET_INNER - 0.02, 0.46, 48]} />
          <meshStandardMaterial color="#5d4632" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.5, POCKET_INNER - 0.35, 0.3, 48]} />
          <meshStandardMaterial color="#d9c89a" metalness={0.85} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <coneGeometry args={[0.5, 0.8, 32]} />
          <meshStandardMaterial color="#d9c89a" metalness={0.9} roughness={0.22} />
        </mesh>
      </group>

      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color="#fdfcf8" roughness={0.18} metalness={0.05} />
      </mesh>
    </group>
  );
}

export interface RouletteWheelProps {
  variant: Variant;
  /** Index into the physical wheel order. null = idle. */
  targetIndex: number | null;
  /** Bump to re-trigger a spin for the same pocket. */
  spinId: number;
  onSettled?: () => void;
  className?: string;
}

export default function RouletteWheel({
  variant,
  targetIndex,
  spinId,
  onSettled,
  className,
}: RouletteWheelProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 10.2, 9.4], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0d1a22"]} />
        <fog attach="fog" args={["#0d1a22", 18, 32]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 9, 4]} intensity={1.5} castShadow />
        <directionalLight position={[-6, 4, -5]} intensity={0.5} color="#6e61ff" />
        <pointLight position={[0, 4, 0]} intensity={18} color="#ffa352" distance={14} />
        <WheelBody
          variant={variant}
          targetIndex={targetIndex}
          spinId={spinId}
          onSettled={onSettled}
        />
      </Canvas>
    </div>
  );
}
