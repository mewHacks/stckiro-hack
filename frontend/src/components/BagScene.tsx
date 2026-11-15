"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Float, Lightformer, OrbitControls, RoundedBox, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ITEMS, type VaultItem } from "@/lib/data";

// Roll-top backpack body in local units (items in data.ts are placed against these)
const W = 1.2, H = 1.6, D = 0.6, T = 0.06;
const SCALE = 1.15; // whole bag
const NAVY = "#1b2c8c", NAVY_DARK = "#14206b", TEAL = "#12d6c3", WHITE = "#f6f8ff";
const TAP = 6; // px: more movement = drag, not tap

type Id = VaultItem["id"];
export type BagSceneProps = {
  open: boolean;
  selected: Id | null;
  onToggle: () => void;
  onSelect: (id: Id | null) => void;
  onSos?: () => void;
  battery: number; // 0-100, beacon cell charge
  swapping: boolean; // battery cell is ejected for a swap
};

// ---------- springs: overshoot + settle reads far livelier than lerp ----------
type Spring = { x: number; v: number };
const sp = (x: number): Spring => ({ x, v: 0 });
function step(s: Spring, target: number, dt: number, k = 170, c = 14) {
  s.v += (k * (target - s.x) - c * s.v) * dt;
  s.x += s.v * dt;
  return s.x;
}

// ---------- shapes ----------
// padded shoulder straps curving off the back panel
const STRAPS = [-0.3, 0.3].map(
  (x) =>
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, H / 2 - 0.12, -D / 2 - 0.02),
        new THREE.Vector3(x * 1.1, 0.35, -D / 2 - 0.17),
        new THREE.Vector3(x * 1.2, -0.35, -D / 2 - 0.17),
        new THREE.Vector3(x * 1.3, -H / 2 + 0.15, -D / 2 - 0.03),
      ]),
      40,
      0.05,
      12,
    ),
);
// brand water drop (from the logo)
const DROP = new THREE.Shape().moveTo(0, 0.22);
DROP.bezierCurveTo(0.03, 0.15, 0.13, 0.06, 0.13, -0.04);
DROP.absarc(0, -0.04, 0.13, 0, Math.PI, true);
DROP.bezierCurveTo(-0.13, 0.06, -0.03, 0.15, 0, 0.22);
const DROP_EXTRUDE = { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 4 };

// ---------- textures (generated, no files) ----------
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, cw: number, ch: number) => void) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  draw(c.getContext("2d")!, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function itemTexture(it: VaultItem) {
  const [w, h] = it.size;
  return canvasTexture(w, h, (g, cw, ch) => {
    g.fillStyle = it.bg;
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = it.fg;
    g.textAlign = "center";
    g.font = "900 34px Nunito, sans-serif";
    g.fillText(it.sub, cw / 2, ch * 0.32);
    g.globalAlpha = 0.35; // fake text lines
    for (let i = 0; i < 3; i++) g.fillRect(cw * 0.18, ch * (0.5 + i * 0.1), cw * (0.64 - i * 0.12), Math.max(5, ch * 0.025));
    g.globalAlpha = 1;
    g.lineWidth = 6;
    g.strokeStyle = it.fg;
    g.strokeRect(8, 8, cw - 16, ch - 16);
  });
}

function qrTexture() {
  return canvasTexture(1, 1, (g, s) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, s, s);
    g.fillStyle = NAVY_DARK;
    const n = 11, c = s / (n + 2);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
        if (finder || (x * 7 + y * 13 + x * y) % 3 === 0) g.fillRect((x + 1) * c, (y + 1) * c, c, c);
      }
  });
}

// ---------- document / item that pops out ----------
function Item({ it, index, open, selected, onPick }: { it: VaultItem; index: number; open: boolean; selected: boolean; onPick: () => void }) {
  const g = useRef<THREE.Group>(null!);
  const map = useMemo(() => itemTexture(it), [it]);
  const [w, h, t] = it.size;
  const closedY = H / 2 - 0.08 - h / 2;
  const sx = useRef(sp(it.x)), sy = useRef(sp(closedY)), sz = useRef(sp(it.z)), ss = useRef(sp(1));
  const changed = useRef({ open, at: -10 });

  useFrame((s, dt) => {
    const d = Math.min(dt, 1 / 30), now = s.clock.elapsedTime;
    if (changed.current.open !== open) changed.current = { open, at: now };
    // stagger: pop out one by one after the lid lifts; tuck back in reverse
    const delay = open ? 0.18 + index * 0.06 : (ITEMS.length - 1 - index) * 0.03;
    const isOpen = now - changed.current.at > delay ? open : !open;

    const ty = selected ? H / 2 + 0.4 : isOpen ? H / 2 + 0.28 - h / 2 : closedY;
    const o = g.current;
    o.position.set(
      step(sx.current, selected ? 0 : it.x, d, 120, 13),
      step(sy.current, ty, d, 200, 13),
      step(sz.current, selected ? D / 2 + 0.6 : it.z, d, 120, 13),
    );
    o.scale.setScalar(step(ss.current, selected ? 1.3 : 1, d, 220, 14));
    o.rotation.z = THREE.MathUtils.clamp(sy.current.v * 0.04, -0.25, 0.25); // wobble while flying
    o.rotation.y = selected ? Math.sin(now * 1.4) * 0.22 : THREE.MathUtils.damp(o.rotation.y, 0, 6, d);
  });

  return (
    <group
      ref={g}
      position={[it.x, closedY, it.z]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!open) return; // let the tap fall through to the bag
        e.stopPropagation();
        if (e.delta < TAP) onPick();
      }}
    >
      <RoundedBox args={[w, h, t]} radius={Math.min(0.02, t / 2.5)} smoothness={3}>
        <meshStandardMaterial color={it.bg} roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0, t / 2 + 0.002]}>
        <planeGeometry args={[w * 0.96, h * 0.96]} />
        <meshStandardMaterial map={map} roughness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- water droplets that burst out when the bag opens ----------
const N_DROPS = 26;
function Splash({ open }: { open: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const sim = useRef<{ parts: { p: THREE.Vector3; v: THREE.Vector3; life: number }[]; dummy: THREE.Object3D } | null>(null);
  const prev = useRef(open);

  useFrame((_, dt) => {
    sim.current ??= {
      parts: Array.from({ length: N_DROPS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 })),
      dummy: new THREE.Object3D(),
    };
    const { parts, dummy } = sim.current;
    const d = Math.min(dt, 1 / 30);
    if (prev.current !== open) {
      prev.current = open;
      if (open)
        for (const p of parts) {
          p.p.set((Math.random() - 0.5) * W, H / 2 + 0.05, (Math.random() - 0.5) * D);
          p.v.set((Math.random() - 0.5) * 3, 2.2 + Math.random() * 2.2, (Math.random() - 0.3) * 2);
          p.life = 0.8 + Math.random() * 0.4;
        }
    }
    parts.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= d;
        p.v.y -= 9 * d;
        p.p.addScaledVector(p.v, d);
      }
      dummy.position.copy(p.p);
      dummy.scale.setScalar(Math.max(p.life, 0) * 0.05);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N_DROPS]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshPhysicalMaterial color={TEAL} emissive={TEAL} emissiveIntensity={0.5} roughness={0.05} clearcoat={1} />
    </instancedMesh>
  );
}

// ---------- the roll-top backpack ----------
function Bag({ open, selected, onToggle, onSelect, onSos, battery, swapping }: BagSceneProps) {
  const root = useRef<THREE.Group>(null!);
  const lid = useRef<THREE.Group>(null!);
  const roll = useRef<THREE.Group>(null!);
  const pocket = useRef<THREE.Group>(null!);
  const cell = useRef<THREE.Group>(null!);
  const fill = useRef<THREE.Mesh>(null!);
  const fillMat = useRef<THREE.MeshStandardMaterial>(null!);
  const led = useRef<THREE.MeshStandardMaterial>(null!);
  const pocketS = useRef(sp(0)), cellS = useRef(sp(0)), level = useRef(sp(battery));
  const sos = useRef<THREE.MeshStandardMaterial>(null!);
  const drop = useRef<THREE.MeshPhysicalMaterial>(null!);
  const qr = useMemo(() => qrTexture(), []);

  const lidS = useRef(sp(0)), fall = useRef(sp(3.2)), spin = useRef(sp(-Math.PI * 1.5)), squash = useRef(sp(1));
  const prevOpen = useRef(open);
  const OPEN_ANGLE = -2.4;

  useFrame((s, dt) => {
    const d = Math.min(dt, 1 / 30), t = s.clock.elapsedTime;
    if (prevOpen.current !== open) {
      prevOpen.current = open;
      squash.current.v = -2.6; // squash on every open/close
    }

    // roll-top: flips back while the roll spins and unrolls; on close it slams and bounces
    const l = lidS.current;
    step(l, open ? OPEN_ANGLE : 0, d, 95, 9);
    if (l.x > 0) {
      l.x = 0;
      l.v *= -0.35;
    }
    lid.current.rotation.x = l.x;
    roll.current.rotation.x = l.x * 2.2;
    const unroll = 1 - (l.x / OPEN_ANGLE) * 0.55;
    roll.current.scale.set(1, unroll, unroll);

    // intro: drop in from above while spinning
    root.current.position.y = step(fall.current, 0, d, 60, 7);
    root.current.rotation.y = step(spin.current, 0, d, 28, 8);
    const sq = step(squash.current, 1, d, 260, 10);
    const wide = 1 + (1 - sq) * 0.6;
    root.current.scale.set(SCALE * wide, SCALE * sq, SCALE * wide);

    // beacon pocket: flips open (hinged at its bottom edge) when the beacon is selected
    pocket.current.rotation.x = step(pocketS.current, selected === "beacon" ? 1.5 : 0, d, 110, 11);
    // battery cell slides out toward the viewer during a swap, then back in
    cell.current.position.z = step(cellS.current, swapping ? 0.55 : 0, d, 140, 12);
    cell.current.position.y = -0.58 + (swapping ? 0.06 : 0);
    const lv = step(level.current, battery, d, 90, 16);
    const frac = THREE.MathUtils.clamp(lv / 100, 0.001, 1);
    fill.current.scale.x = frac;
    fill.current.position.x = -0.19 * (1 - frac);
    const c = lv > 50 ? "#22c55e" : lv > 20 ? "#f59e0b" : "#ef4444";
    fillMat.current.color.set(c);
    fillMat.current.emissive.set(c);
    led.current.color.set(c);
    led.current.emissive.set(c);
    led.current.emissiveIntensity = swapping ? 0.1 : 1.6 + Math.sin(t * 5) * 1.2;

    sos.current.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.8;
    drop.current.emissiveIntensity = 0.35 + Math.sin(t * 2) * 0.25;
  });

  const navy = <meshPhysicalMaterial color={NAVY} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} />;
  const navyDark = <meshPhysicalMaterial color={NAVY_DARK} roughness={0.4} clearcoat={0.8} clearcoatRoughness={0.25} />;
  const white = <meshPhysicalMaterial color={WHITE} roughness={0.35} clearcoat={0.6} />;
  const zip = <meshStandardMaterial color="#0b1530" roughness={0.6} />;
  const pointer = (on: boolean) => () => (document.body.style.cursor = on ? "pointer" : "");
  const front = D / 2 + T / 2; // outer face of the front wall

  return (
    <group
      ref={root}
      position={[0, 3.2, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta >= TAP) return;
        if (selected) onSelect(null);
        else onToggle();
      }}
      onPointerOver={pointer(true)}
      onPointerOut={pointer(false)}
    >
      {/* open-top body: bottom + 4 walls so the contents are visible */}
      <RoundedBox args={[W, T, D]} position={[0, -H / 2, 0]} radius={0.03}>{navy}</RoundedBox>
      <RoundedBox args={[W, H, T]} position={[0, 0, D / 2]} radius={0.03}>{navy}</RoundedBox>
      <RoundedBox args={[W, H, T]} position={[0, 0, -D / 2]} radius={0.03}>{navy}</RoundedBox>
      <RoundedBox args={[T, H, D]} position={[-W / 2, 0, 0]} radius={0.03}>{navy}</RoundedBox>
      <RoundedBox args={[T, H, D]} position={[W / 2, 0, 0]} radius={0.03}>{navy}</RoundedBox>
      <mesh position={[0, -H / 2 + T / 2 + 0.002, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W - T, D - T]} />
        <meshStandardMaterial color="#c7d7ff" />
      </mesh>

      {/* back padding, shoulder straps, grab loop */}
      <RoundedBox args={[W * 0.8, H * 0.7, 0.05]} position={[0, 0, -D / 2 - 0.045]} radius={0.02}>{navyDark}</RoundedBox>
      {STRAPS.map((g, i) => (
        <mesh key={i} geometry={g}>{navyDark}</mesh>
      ))}
      <mesh position={[0, H / 2 - 0.1, -D / 2 - 0.05]} rotation-x={-0.5}>
        <torusGeometry args={[0.12, 0.025, 10, 24, Math.PI]} />
        {navyDark}
      </mesh>

      {/* beacon module built into the front of the pack: chip board + swappable battery.
          Sits on a recessed plate and is hidden behind the pocket until the beacon is selected. */}
      <group position={[0, 0, D / 2 + T / 2 + 0.02]}>
        <RoundedBox args={[W * 0.8, 0.56, 0.02]} position={[0, -0.42, 0]} radius={0.01}><meshStandardMaterial color="#0a1236" roughness={0.7} /></RoundedBox>
        {/* PCB */}
        <RoundedBox args={[0.7, 0.3, 0.024]} position={[0, -0.3, 0.02]} radius={0.01}><meshStandardMaterial color="#0e8f7e" roughness={0.5} /></RoundedBox>
        <RoundedBox args={[0.17, 0.17, 0.03]} position={[-0.2, -0.3, 0.045]} radius={0.01}><meshStandardMaterial color="#111827" roughness={0.4} /></RoundedBox>
        <RoundedBox args={[0.11, 0.11, 0.02]} position={[0.03, -0.33, 0.04]} radius={0.01}><meshStandardMaterial color="#1f2937" roughness={0.4} /></RoundedBox>
        {[-0.12, -0.04, 0.04, 0.12].map((x) => (
          <RoundedBox key={x} args={[0.04, 0.025, 0.01]} position={[x, -0.2, 0.036]} radius={0.004}><meshStandardMaterial color="#f5d27a" metalness={0.8} roughness={0.3} /></RoundedBox>
        ))}
        <mesh position={[0.28, -0.3, 0.05]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.2, -0.22, 0.045]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial ref={led} color="#22c55e" emissive="#22c55e" />
        </mesh>
        {/* battery tray + cell */}
        <RoundedBox args={[0.52, 0.2, 0.03]} position={[0, -0.58, 0.01]} radius={0.01}><meshStandardMaterial color="#05091f" roughness={0.8} /></RoundedBox>
        <group ref={cell} position={[0, -0.58, 0]}>
          <RoundedBox args={[0.46, 0.15, 0.07]} position={[0, 0, 0.05]} radius={0.02}><meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} /></RoundedBox>
          <RoundedBox args={[0.03, 0.06, 0.04]} position={[0.245, 0, 0.05]} radius={0.01}><meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} /></RoundedBox>
          <mesh position={[0, 0, 0.087]}>
            <planeGeometry args={[0.4, 0.09]} />
            <meshStandardMaterial color="#0b1530" />
          </mesh>
          <mesh ref={fill} position={[0, 0, 0.089]}>
            <planeGeometry args={[0.38, 0.07]} />
            <meshStandardMaterial ref={fillMat} color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>

      {/* front zip pocket with the brand drop: hinged at the bottom, flips down to reveal the module */}
      <group ref={pocket} position={[0, -0.73, D / 2 + T / 2]}>
        <RoundedBox args={[W * 0.86, 0.62, 0.14]} position={[0, 0.31, 0.04]} radius={0.06} smoothness={4}>{navy}</RoundedBox>
        <RoundedBox args={[W * 0.7, 0.022, 0.012]} position={[0, 0.53, 0.115]} radius={0.005}>{zip}</RoundedBox>
        <RoundedBox args={[0.035, 0.1, 0.02]} position={[W * 0.35 + 0.02, 0.48, 0.12]} radius={0.008}>{white}</RoundedBox>
        <mesh position={[0, 0.26, 0.115]} scale={0.6}>
          <extrudeGeometry args={[DROP, DROP_EXTRUDE]} />
          <meshPhysicalMaterial ref={drop} color={TEAL} emissive={TEAL} roughness={0.15} clearcoat={1} />
        </mesh>
      </group>

      {/* lower half of the front compression strap */}
      <RoundedBox args={[0.09, 0.42, 0.02]} position={[-0.28, 0.21, front + 0.012]} radius={0.008}>{navyDark}</RoundedBox>

      {/* side pockets with elastic band */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (W / 2 + 0.08), -0.4, 0]}>
          <RoundedBox args={[0.16, 0.7, D * 0.8]} radius={0.07} smoothness={4}>{navy}</RoundedBox>
          <RoundedBox args={[0.17, 0.035, D * 0.8 + 0.005]} position={[0, 0.31, 0]} radius={0.015}>{white}</RoundedBox>
        </group>
      ))}
      {/* QR/NFC tag on left pocket */}
      <mesh position={[-(W / 2 + 0.08), -0.45, D * 0.4 + 0.003]}>
        <planeGeometry args={[0.13, 0.13]} />
        <meshStandardMaterial map={qr} />
      </mesh>
      {/* SOS button on right pocket */}
      <group position={[W / 2 + 0.08, -0.45, D * 0.4]} rotation-x={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 32]} />
          {white}
        </mesh>
        <mesh
          position={[0, 0.02, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (!onSos || e.delta >= TAP) return;
            e.stopPropagation();
            onSos();
          }}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.035, 32]} />
          <meshStandardMaterial ref={sos} color="#ef4444" emissive="#ef4444" />
        </mesh>
      </group>

      {ITEMS.filter((it) => it.id !== "beacon").map((it, i) => (
        <Item key={it.id} it={it} index={i} open={open} selected={selected === it.id} onPick={() => onSelect(selected === it.id ? null : it.id)} />
      ))}
      <Splash open={open} />

      {/* roll-top closure, hinged at the back-top edge */}
      <group ref={lid} position={[0, H / 2, -D / 2]}>
        <group position={[0, 0.03, D / 2]}>
          <RoundedBox args={[W + 0.03, 0.06, D + 0.03]} radius={0.03}>{navyDark}</RoundedBox>
          {/* the roll: spins + shrinks as it unrolls */}
          <group ref={roll} position={[0, 0.1, D / 2 - 0.12]}>
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.14, 0.14, W + 0.06, 32]} />
              {navyDark}
            </mesh>
            {/* seams so the spin is visible */}
            <RoundedBox args={[W + 0.07, 0.012, 0.03]} position={[0, 0.14, 0]} radius={0.005}>{navy}</RoundedBox>
            <RoundedBox args={[W + 0.07, 0.03, 0.012]} position={[0, 0, 0.14]} radius={0.005}>{navy}</RoundedBox>
          </group>
          {/* upper half of the compression strap + buckle */}
          <RoundedBox args={[0.1, 0.42, 0.025]} position={[-0.28, -0.14, D / 2 + 0.05]} radius={0.008}>{navyDark}</RoundedBox>
          <RoundedBox args={[0.16, 0.1, 0.035]} position={[-0.28, -0.37, D / 2 + 0.06]} radius={0.015}>{white}</RoundedBox>
          <RoundedBox args={[0.09, 0.03, 0.02]} position={[-0.28, -0.37, D / 2 + 0.08]} radius={0.008}>{zip}</RoundedBox>
        </group>
      </group>
    </group>
  );
}

// Swing the camera around to face the front pocket while the beacon is selected
function FaceFront({ on }: { on: boolean }) {
  useFrame(({ camera }, dt) => {
    if (!on) return;
    const r = Math.hypot(camera.position.x, camera.position.z);
    const x = THREE.MathUtils.damp(camera.position.x, 0, 4, Math.min(dt, 1 / 30));
    camera.position.x = x;
    camera.position.z = Math.sqrt(Math.max(r * r - x * x, 0));
  });
  return null;
}

// Keep the bag as big as the viewport allows: portrait screens back the camera off to fit the width.
function FitCamera() {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const dist = Math.max(5.4, 3.9 / (size.width / size.height)); // backpack is tall, so height sets the floor
    get().camera.position.setLength(dist);
  }, [get, size]);
  return null;
}

export default function BagScene(props: BagSceneProps) {
  const idle = !props.open && !props.selected;
  return (
    <Canvas
      camera={{ position: [0, 1.6, 5.4], fov: 34 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <FitCamera />
      <FaceFront on={props.selected === "beacon"} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.7} />
      {/* ponytail: Lightformers instead of an HDR file — no network fetch, works offline at the venue */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#9dbdff" position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
      <Float speed={1.6} rotationIntensity={0.08} floatIntensity={idle ? 0.5 : 0.15}>
        <Bag {...props} />
      </Float>
      <Sparkles count={45} scale={[7, 4, 4]} position={[0, 0.8, 0]} size={3} speed={0.35} opacity={0.8} color="#ffffff" />
      <OrbitControls
        enablePan={false}
        enableDamping
        target={[0, 0.35, 0]}
        minDistance={3.2}
        maxDistance={14}
        minPolarAngle={0.45}
        maxPolarAngle={1.6}
        autoRotate={idle}
        autoRotateSpeed={1.2}
      />
    </Canvas>
  );
}
