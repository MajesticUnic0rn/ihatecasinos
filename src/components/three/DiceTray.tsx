"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";

/**
 * Dice get REAL physics, unlike the roulette wheel.
 *
 * The difference is pedagogical, not technical. Roulette's outcome is a
 * draw from a distribution we want to control and audit, so we animate
 * to a seeded result. Craps is about the 36 outcomes of two cubes — the
 * tumbling IS the lesson, and Rapier is deterministic on a fixed
 * timestep, so the same throw reproduces exactly.
 */

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
};

function makeFaceTexture(n: number): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#fdfcf8";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#031926";
  ctx.lineWidth = 7;
  ctx.strokeRect(3.5, 3.5, S - 7, S - 7);

  ctx.fillStyle = n === 1 ? "#d4420f" : "#031926";
  const off = S * 0.26;
  for (const [x, y] of PIP_LAYOUT[n]) {
    ctx.beginPath();
    ctx.arc(S / 2 + x * off, S / 2 + y * off, S * 0.095, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** BoxGeometry face order is +X, −X, +Y, −Y, +Z, −Z. Opposites sum to 7. */
const FACE_ORDER = [1, 6, 2, 5, 3, 4];

/** Local axis for each face value, used to read which number ended up up. */
const FACE_NORMALS: [number, THREE.Vector3][] = [
  [1, new THREE.Vector3(1, 0, 0)],
  [6, new THREE.Vector3(-1, 0, 0)],
  [2, new THREE.Vector3(0, 1, 0)],
  [5, new THREE.Vector3(0, -1, 0)],
  [3, new THREE.Vector3(0, 0, 1)],
  [4, new THREE.Vector3(0, 0, -1)],
];

function readTopFace(body: RapierRigidBody): number {
  const r = body.rotation();
  const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
  let best = 1;
  let bestDot = -Infinity;
  for (const [value, axis] of FACE_NORMALS) {
    const world = axis.clone().applyQuaternion(q);
    if (world.y > bestDot) {
      bestDot = world.y;
      best = value;
    }
  }
  return best;
}

function Die({
  index,
  bodyRef,
}: {
  index: number;
  bodyRef: React.RefObject<RapierRigidBody | null>;
}) {
  const materials = React.useMemo(
    () =>
      FACE_ORDER.map(
        (n) =>
          new THREE.MeshStandardMaterial({
            map: makeFaceTexture(n),
            roughness: 0.42,
            metalness: 0.02,
          }),
      ),
    [],
  );

  React.useEffect(() => {
    return () => {
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    };
  }, [materials]);

  return (
    <RigidBody
      ref={bodyRef}
      colliders="cuboid"
      position={[index === 0 ? -0.9 : 0.9, 3.2, 0]}
      restitution={0.35}
      friction={0.75}
      linearDamping={0.35}
      angularDamping={0.4}
      mass={1}
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </RigidBody>
  );
}

function Tray({
  rollId,
  onResult,
}: {
  rollId: number;
  onResult: (a: number, b: number) => void;
}) {
  const a = React.useRef<RapierRigidBody>(null);
  const b = React.useRef<RapierRigidBody>(null);
  const settling = React.useRef(false);
  const stillFrames = React.useRef(0);

  React.useEffect(() => {
    if (rollId === 0) return;
    const bodies = [a.current, b.current];
    bodies.forEach((body, i) => {
      if (!body) return;
      body.setTranslation({ x: i === 0 ? -1.1 : 1.1, y: 3.2, z: 2.4 }, true);
      body.setRotation(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          ),
        ),
        true,
      );
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      // Throw toward the back wall so they bounce — a real craps throw
      // must hit the far wall, which is exactly what makes it fair.
      body.applyImpulse({ x: (Math.random() - 0.5) * 2.2, y: 1.0, z: -5.6 }, true);
      body.applyTorqueImpulse(
        {
          x: (Math.random() - 0.5) * 0.9,
          y: (Math.random() - 0.5) * 0.9,
          z: (Math.random() - 0.5) * 0.9,
        },
        true,
      );
    });
    settling.current = true;
    stillFrames.current = 0;
  }, [rollId]);

  useFrame(() => {
    if (!settling.current || !a.current || !b.current) return;
    const speed = (body: RapierRigidBody) => {
      const l = body.linvel();
      const w = body.angvel();
      return (
        Math.hypot(l.x, l.y, l.z) + Math.hypot(w.x, w.y, w.z)
      );
    };
    if (speed(a.current) < 0.12 && speed(b.current) < 0.12) {
      stillFrames.current++;
      // Require a run of still frames — a die balanced mid-bounce can
      // read near-zero for a single frame and give a false result.
      if (stillFrames.current > 14) {
        settling.current = false;
        onResult(readTopFace(a.current), readTopFace(b.current));
      }
    } else {
      stillFrames.current = 0;
    }
  });

  const WALL = 3.9;

  return (
    <>
      {/* floor */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[WALL, 0.5, WALL]} position={[0, -0.5, 0]} friction={0.9} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[WALL * 2, WALL * 2]} />
          <meshStandardMaterial color="#1b4d3a" roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* walls */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[WALL, 2, 0.5]} position={[0, 2, -WALL]} restitution={0.6} />
        <CuboidCollider args={[WALL, 2, 0.5]} position={[0, 2, WALL]} restitution={0.6} />
        <CuboidCollider args={[0.5, 2, WALL]} position={[-WALL, 2, 0]} restitution={0.6} />
        <CuboidCollider args={[0.5, 2, WALL]} position={[WALL, 2, 0]} restitution={0.6} />
        <CuboidCollider args={[WALL, 0.5, WALL]} position={[0, 7, 0]} />
      </RigidBody>

      {/* the back wall you must hit */}
      <mesh position={[0, 1, -WALL]} receiveShadow>
        <boxGeometry args={[WALL * 2, 2, 0.3]} />
        <meshStandardMaterial color="#14332a" roughness={0.85} />
      </mesh>

      <Die index={0} bodyRef={a} />
      <Die index={1} bodyRef={b} />
    </>
  );
}

export default function DiceTray({
  rollId,
  onResult,
  className,
}: {
  rollId: number;
  onResult: (a: number, b: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ position: [0, 9.2, 8.2], fov: 42 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0d1a22"]} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[4, 10, 5]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 6, -4]} intensity={0.45} color="#6e61ff" />
        <Physics gravity={[0, -19.6, 0]} timeStep={1 / 60}>
          <Tray rollId={rollId} onResult={onResult} />
        </Physics>
      </Canvas>
    </div>
  );
}
