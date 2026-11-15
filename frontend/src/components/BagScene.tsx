"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Float, Lightformer, OrbitControls, RoundedBox, Sparkles } from "@react-three/drei";
import { Water } from "three/examples/jsm/objects/Water.js";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ITEMS, type VaultItem } from "@/lib/data";
import { ARM_POINTS, ARM_R, FLOOD_BAG_POS, HAND_R, HEAD, HIPS, LEG, NECK, SHOULDER, SLEEVE_R, TORSO } from "@/lib/swimmer";

// Roll-top backpack body in local units (items in data.ts are placed against these)
const W = 1.2, H = 1.6, D = 0.6, T = 0.06;
const SCALE = 1.15; // whole bag
const NAVY = "#1b2c8c", NAVY_DARK = "#14206b", TEAL = "#12d6c3", WHITE = "#f6f8ff";
const BEADS = 30;
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
  flood: boolean; // water test: sea rises, bag floats flat on a swimmer who hugs it
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

// How wet the bag is (0..1). Module-level so the bucket (scene) and the bead layer (inside the bag) share it without re-rendering.
const wet = { v: 0 };

// tiny deterministic RNG so grain and bead positions are identical on every load
function lcg(seed: number) {
  const st = { s: seed };
  return () => (st.s = (st.s * 16807) % 2147483647) / 2147483647;
}

// Pebbled leather: soft dimples with light rims, tiled seamlessly. Used as colour + bump map.
function leatherTexture() {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d4d4d4";
  g.fillRect(0, 0, N, N);
  const rnd = lcg(7);
  for (let i = 0; i < 2400; i++) {
    const x = rnd() * N, y = rnd() * N, r = 2 + rnd() * 3.5, a = 0.18 + rnd() * 0.2;
    for (const ox of [0, -N, N]) for (const oy of [0, -N, N]) {
      const cx = x + ox, cy = y + oy;
      if (cx < -r || cx > N + r || cy < -r || cy > N + r) continue; // wrap copies only where visible
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.7, "rgba(0,0,0,0.04)");
      gr.addColorStop(1, "rgba(255,255,255,0.12)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
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
  const leather = useMemo(() => leatherTexture(), []);
  const beadMesh = useRef<THREE.InstancedMesh>(null!);
  const beadsReady = useRef(false);

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

    // intro drop/spin, blended with the flood pose: lying flat on the swimmer's chest (see lib/swimmer.ts)
    const fl = pose.f, bob = floodBob(t);
    root.current.rotation.order = "YXZ";
    root.current.position.set(FLOOD_BAG_POS[0] * fl, step(fall.current, 0, d, 60, 7) + (FLOOD_BAG_POS[1] + bob) * fl, FLOOD_BAG_POS[2] * fl);
    root.current.rotation.y = step(spin.current, 0, d, 28, 8) + (Math.PI / 2) * fl;
    root.current.rotation.x = (-Math.PI / 2) * fl;
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

    // water beads appear on the leather as the bucket pours, and stay until the next test
    if (!beadsReady.current) {
      beadsReady.current = true;
      const rnd = lcg(11), o = new THREE.Object3D();
      for (let i = 0; i < BEADS; i++) {
        let x = (rnd() - 0.5) * 1.0;
        if (x > -0.4 && x < -0.14) x += 0.3; // keep clear of the strap
        const r = 0.012 + rnd() * 0.022;
        o.position.set(x, -0.04 + rnd() * 0.78, D / 2 + T / 2 + r * 0.3);
        o.scale.set(r, r, r * 0.55);
        o.updateMatrix();
        beadMesh.current.setMatrixAt(i, o.matrix);
      }
      beadMesh.current.instanceMatrix.needsUpdate = true;
    }
    beadMesh.current.count = Math.round(wet.v * BEADS);

    sos.current.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.8;
    drop.current.emissiveIntensity = 0.35 + Math.sin(t * 2) * 0.25;
  });

  // leather: grain as colour + bump, mostly matte with a soft sheen
  const navy = <meshPhysicalMaterial color={NAVY} map={leather} bumpMap={leather} bumpScale={1.6} roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.5} />;
  const navyDark = <meshPhysicalMaterial color={NAVY_DARK} map={leather} bumpMap={leather} bumpScale={1.6} roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.45} />;
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

      <instancedMesh ref={beadMesh} args={[undefined, undefined, BEADS]}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshPhysicalMaterial color="#cfe8ff" transparent opacity={0.6} roughness={0.05} clearcoat={1} />
      </instancedMesh>

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

// ---------- flood scene: ocean, sky, and a swimmer hugging the floating bag ----------
// f: 0..1 flood progress, shared by the bag, swimmer, ocean and camera (module-level: no re-renders)
const pose = { f: 0, on: false };
const SUN = new THREE.Vector3(-40, 14, -90);
const FLOOD_TARGET = new THREE.Vector3(0.8, 0.5, 0);
const FLOOD_CAM = new THREE.Vector3(3.2, 4.4, 12.5);
const SKIN = "#b98a62", SHIRT = "#f4a261", SHORTS = "#334155", HAIR = "#1c1714";

// Tileable ocean normal map built from integer-frequency sine waves (no texture download)
function waterNormals() {
  const N = 256, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!, img = g.createImageData(N, N), rnd = lcg(3);
  const waves = Array.from({ length: 12 }, () => ({ fx: 1 + Math.floor(rnd() * 9), fy: Math.floor(rnd() * 11) - 5, a: 0.4 + rnd(), p: rnd() * 6.283 }));
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let dx = 0, dy = 0;
      for (const w of waves) {
        const k = Math.cos((6.283 * (w.fx * x + w.fy * y)) / N + w.p) * w.a;
        dx += k * w.fx;
        dy += k * w.fy;
      }
      const nx = -dx * 0.05, ny = -dy * 0.05, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Ocean swells: Gerstner waves [dirX, dirZ, steepness, wavelength]. Shared by the GPU (surface) and the
// CPU (so the swimmer + bag ride exactly the same swell). Steepness sum < 1 keeps crests from folding.
const WAVES: [number, number, number, number][] = [
  [1.0, 0.3, 0.16, 26],
  [0.6, 1.0, 0.12, 15],
  [-0.4, 0.9, 0.1, 9],
  [0.9, -0.5, 0.07, 6],
];
const WAVE_AMP = 0.55;
const WAVE_SPEED = 0.7;
const waveHeight = (x: number, z: number, t: number) =>
  WAVES.reduce((y, [dx, dz, st, wl]) => {
    const l = Math.hypot(dx, dz), k = (2 * Math.PI) / wl;
    return y + (st / k) * Math.sin(k * ((dx / l) * x + (dz / l) * z - Math.sqrt(9.8 / k) * t));
  }, 0);
/** Vertical bob of the swimmer + bag (centre of the pair), identical for both every frame. */
const floodBob = (clock: number) => waveHeight(0.9, 0, clock * WAVE_SPEED) * WAVE_AMP;

const GERSTNER_GLSL = /* glsl */ `
  uniform float waveAmp;
  varying vec3 vWaveN;
  varying float vCrest;
  vec3 gerstner(vec4 w, vec2 p, inout vec3 tangent, inout vec3 binormal) {
    float k = 6.28318530718 / w.w, c = sqrt(9.8 / k), a = w.z / k;
    vec2 d = normalize(w.xy);
    float f = k * (dot(d, p) - c * time);
    tangent += vec3(-d.x * d.x * w.z * sin(f), d.x * w.z * cos(f), -d.x * d.y * w.z * sin(f));
    binormal += vec3(-d.x * d.y * w.z * sin(f), d.y * w.z * cos(f), -d.y * d.y * w.z * sin(f));
    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }
`;
const GERSTNER_MAIN = /* glsl */ `
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 tangent = vec3(1.0, 0.0, 0.0), binormal = vec3(0.0, 0.0, 1.0), disp = vec3(0.0);
  ${WAVES.map((w) => `disp += gerstner(vec4(${w.map((n) => n.toFixed(3)).join(", ")}), wp.xz, tangent, binormal);`).join("\n  ")}
  wp.xyz += disp * waveAmp;
  vWaveN = normalize(cross(mix(vec3(0.0, 0.0, 1.0), binormal, waveAmp), mix(vec3(1.0, 0.0, 0.0), tangent, waveAmp)));
  vCrest = disp.y;
  mirrorCoord = wp;
  worldPosition = wp;
  mirrorCoord = textureMatrix * mirrorCoord;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
`;

/** Big flat grid, very dense near the swimmer and sparse toward the horizon (fast and smooth). */
function oceanGeometry() {
  const g = new THREE.PlaneGeometry(2, 2, 256, 256), pos = g.attributes.position as THREE.BufferAttribute;
  const warp = (v: number) => Math.sign(v) * 700 * Math.abs(v) ** 2.2;
  for (let i = 0; i < pos.count; i++) pos.setXY(i, warp(pos.getX(i)), warp(pos.getY(i)));
  g.computeBoundingSphere();
  return g;
}

// ponytail: one ocean per page (only one canvas is mounted at a time); module cache keeps it out of React state
let ocean: Water | null = null;
function makeOcean() {
  const w = new Water(oceanGeometry(), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: waterNormals(),
    sunDirection: SUN.clone().normalize(),
    sunColor: 0xfff3dc,
    waterColor: 0x0a5aa8,
    distortionScale: 3,
    fog: true,
  });
  const m = w.material as THREE.ShaderMaterial;
  m.uniforms.waveAmp = { value: 0 };
  // vertex: real swells instead of a flat plane
  m.vertexShader = m.vertexShader
    .replace("#include <logdepthbuf_pars_vertex>", "#include <logdepthbuf_pars_vertex>\n" + GERSTNER_GLSL)
    .replace(/mirrorCoord = modelMatrix \* vec4\( position, 1\.0 \);[\s\S]*?gl_Position = projectionMatrix \* mvPosition;/, GERSTNER_MAIN);
  // fragment: light follows the swell slope, foam on crests, a little sunlit teal in the wave bodies
  m.fragmentShader = m.fragmentShader
    .replace("varying vec4 worldPosition;", "varying vec4 worldPosition;\nuniform float waveAmp;\nvarying vec3 vWaveN;\nvarying float vCrest;")
    .replace(
      "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );",
      "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) + vec3( vWaveN.x, 0.0, vWaveN.z ) * 2.5 );",
    )
    .replace(
      "gl_FragColor = vec4( outgoingLight, alpha );",
      `float h = clamp( vCrest / 1.6, 0.0, 1.0 );
       outgoingLight += vec3( 0.0, 0.07, 0.07 ) * smoothstep( 0.15, 0.8, h );
       float foam = smoothstep( 0.62, 0.98, h ) * smoothstep( 0.0, 0.7, noise.x + noise.z );
       outgoingLight = mix( outgoingLight, vec3( 0.9, 0.95, 1.0 ), foam * 0.35 * step( 0.001, waveAmp ) );
       gl_FragColor = vec4( outgoingLight, alpha );`,
    );
  w.visible = false;
  return w;
}
const getOcean = () => (ocean ??= makeOcean());

function Ocean() {
  useFrame((s) => {
    const w = getOcean(), f = pose.f;
    w.visible = f > 0.01;
    if (!w.visible) return;
    w.rotation.x = -Math.PI / 2;
    w.position.y = -1.6 * (1 - f); // the sea rises
    const u = (w.material as THREE.ShaderMaterial).uniforms;
    u.time.value = s.clock.elapsedTime * WAVE_SPEED; // clock-based so the CPU bob matches the GPU swell exactly
    u.size.value = 2;
    u.waveAmp.value = WAVE_AMP * f;
  });
  return <primitive object={getOcean()} />;
}

function cloudTexture() {
  return canvasTexture(2.2, 1, (g, w, h) => {
    const rnd = lcg(5);
    for (let i = 0; i < 22; i++) {
      const x = w * (0.15 + rnd() * 0.7), y = h * (0.45 + rnd() * 0.3), r = h * (0.18 + rnd() * 0.25);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,0.9)");
      gr.addColorStop(0.6, "rgba(255,255,255,0.45)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  });
}
const CLOUDS: { p: [number, number, number]; s: [number, number, number] }[] = [
  { p: [-120, 38, -260], s: [150, 68, 1] },
  { p: [40, 52, -300], s: [190, 80, 1] },
  { p: [170, 34, -240], s: [130, 58, 1] },
  { p: [-30, 26, -200], s: [110, 46, 1] },
  { p: [110, 64, -340], s: [220, 90, 1] },
  { p: [-200, 58, -320], s: [180, 76, 1] },
];

const HORIZON = "#5f9fe8";
// Hand-tuned sky: deep blue overhead → pale blue horizon, warm sun glow. Water mirrors it, so it sets the sea's colour too.
const SKY_SHADER = {
  uniforms: {
    top: { value: new THREE.Color("#1559c4") },
    horizon: { value: new THREE.Color(HORIZON) },
    bottom: { value: new THREE.Color("#0a3f78") },
    sunDir: { value: SUN.clone().normalize() },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir;
    varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.5)) : mix(horizon, bottom, pow(-h, 0.35));
      float s = max(dot(normalize(vDir), sunDir), 0.0);
      c += vec3(1.0, 0.92, 0.75) * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
};

function SkyAndClouds() {
  const g = useRef<THREE.Group>(null!);
  const tex = useMemo(() => cloudTexture(), []);
  useFrame(() => {
    g.current.visible = pose.f > 0.02;
  });
  return (
    <group ref={g} visible={false}>
      <mesh>
        <sphereGeometry args={[1800, 48, 24]} />
        <shaderMaterial args={[SKY_SHADER]} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {CLOUDS.map((c, i) => (
        <sprite key={i} position={c.p} scale={c.s}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0.55} fog={false} />
        </sprite>
      ))}
    </group>
  );
}

// Arms: tube along the checked centre-line, sleeve over the first stretch, hands clasped on top of the bag
const ARMS = [1, -1].map((side) => {
  const curve = new THREE.CatmullRomCurve3(ARM_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z * side)), false, "centripetal");
  return {
    side,
    skin: new THREE.TubeGeometry(curve, 72, ARM_R, 16),
    sleeve: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(600).slice(0, 222)), 28, SLEEVE_R, 16),
    hand: curve.getPoint(1).toArray() as [number, number, number],
  };
});
const Y = new THREE.Vector3(0, 1, 0);
// face direction is −y (down at the water); chin points toward +x
const onHead = (x: number, y: number, z: number, r: number) =>
  new THREE.Vector3(x, y, z).normalize().multiplyScalar(r).add(new THREE.Vector3(...HEAD.pos)).toArray() as [number, number, number];
/** Capsule between two points: centre, rotation, and shaft length (capsule length excludes the end caps). */
const capsule = (a: [number, number, number], b: [number, number, number], r: number) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
  return { pos: va.clone().add(vb).multiplyScalar(0.5).toArray() as [number, number, number], quat: new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize()), len: Math.max(d.length() - 2 * r, 0.01) };
};

function Swimmer() {
  const skin = <meshPhysicalMaterial color={SKIN} roughness={0.5} sheen={0.4} sheenColor="#ffd9c0" clearcoat={0.15} />;
  const shirt = <meshStandardMaterial color={SHIRT} roughness={0.75} />;
  const shorts = <meshStandardMaterial color={SHORTS} roughness={0.8} />;
  const dark = <meshStandardMaterial color="#1b1410" roughness={0.3} />;
  const neck = capsule(NECK.from, HEAD.pos, NECK.r);
  return (
    <group>
      <RoundedBox args={TORSO.size} position={TORSO.pos} radius={0.26} smoothness={5}>{shirt}</RoundedBox>
      <RoundedBox args={HIPS.size} position={HIPS.pos} radius={0.24} smoothness={5}>{shorts}</RoundedBox>
      {[1, -1].map((s) => {
        const from: [number, number, number] = [LEG.from[0], LEG.from[1], LEG.from[2] * s], to: [number, number, number] = [LEG.to[0], LEG.to[1], LEG.to[2] * s];
        const leg = capsule(from, to, LEG.r), dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize();
        const kneeShort = capsule(from, new THREE.Vector3(...from).addScaledVector(dir, 0.75).toArray() as [number, number, number], LEG.r + 0.04);
        return (
          <group key={s}>
            <mesh position={[SHOULDER.pos[0], SHOULDER.pos[1], SHOULDER.pos[2] * s]}>
              <sphereGeometry args={[SHOULDER.r, 24, 16]} />
              {shirt}
            </mesh>
            <mesh position={leg.pos} quaternion={leg.quat}>
              <capsuleGeometry args={[LEG.r, leg.len, 8, 16]} />
              {skin}
            </mesh>
            <mesh position={kneeShort.pos} quaternion={kneeShort.quat}>
              <capsuleGeometry args={[LEG.r + 0.04, kneeShort.len, 8, 16]} />
              {shorts}
            </mesh>
            {/* face-down: eyes and nose point at the water */}
            <mesh position={onHead(-0.3, -0.9, 0.33 * s, 0.405)}>
              <sphereGeometry args={[0.042, 16, 12]} />
              {dark}
            </mesh>
            <mesh position={onHead(0.05, 0.1, s, 0.4)}>
              <sphereGeometry args={[0.09, 16, 12]} />
              {skin}
            </mesh>
          </group>
        );
      })}
      {ARMS.map((a) => (
        <group key={a.side}>
          <mesh geometry={a.skin}>{skin}</mesh>
          <mesh geometry={a.sleeve}>{shirt}</mesh>
          <mesh position={a.hand}>
            <sphereGeometry args={[HAND_R, 20, 16]} />
            {skin}
          </mesh>
        </group>
      ))}
      <mesh position={neck.pos} quaternion={neck.quat}>
        <capsuleGeometry args={[NECK.r, neck.len, 8, 16]} />
        {skin}
      </mesh>
      <mesh position={HEAD.pos}>
        <sphereGeometry args={[HEAD.r, 40, 28]} />
        {skin}
      </mesh>
      {/* hair covers the top/back of the head (facing up while the face is down) */}
      <mesh position={HEAD.pos} rotation-z={-0.25}>
        <sphereGeometry args={[HEAD.r + 0.025, 40, 20, 0, Math.PI * 2, 0, 1.95]} />
        <meshStandardMaterial color={HAIR} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={onHead(0.06, -1, 0, 0.43)}>
        <sphereGeometry args={[0.06, 16, 12]} />
        {skin}
      </mesh>
      <mesh position={onHead(0.42, -0.88, 0, 0.405)} scale={[0.03, 0.02, 0.1]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#7a3b33" roughness={0.5} />
      </mesh>
    </group>
  );
}

// soft foam rings spreading from the swimmer
function Ripples() {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    const f = pose.f;
    g.current.visible = f > 0.3;
    g.current.position.y = 0.03 + floodBob(s.clock.elapsedTime) * f;
    g.current.children.forEach((m, i) => {
      const k = ((s.clock.elapsedTime * 0.35 + i / 3) % 1);
      m.scale.set(1 + k * 1.6, 1 + k * 1.6, 1);
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k) * f;
    });
  });
  return (
    <group ref={g} position={[0.4, 0.03, 0]} rotation-x={-Math.PI / 2} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} scale={[1, 1, 1]}>
          <ringGeometry args={[2.6, 2.7, 64]} />
          <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function FloodScene({ flood }: { flood: boolean }) {
  const human = useRef<THREE.Group>(null!);
  const fs = useRef(sp(0));
  useFrame((s, dt) => {
    pose.on = flood;
    pose.f = Math.max(step(fs.current, flood ? 1 : 0, Math.min(dt, 1 / 30), 40, 13), 0); // critically damped: no overshoot into the bag
    wet.v = pose.f;
    const f = pose.f, g = human.current;
    g.visible = f > 0.01;
    g.scale.setScalar(Math.max(f, 0.001));
    g.position.y = -0.6 * (1 - f) + floodBob(s.clock.elapsedTime) * f; // same swell as the bag
  });
  return (
    <>
      <SkyAndClouds />
      <Ocean />
      <Ripples />
      <group ref={human} visible={false}>
        <Swimmer />
      </group>
    </>
  );
}

// Glide the camera to a wide sea view when the flood starts, and back when it ends; free orbit afterwards.
// Time-based (not per-frame) so it completes in 1.6s on any device.
type Pose = { p: THREE.Vector3; t: THREE.Vector3 };
function FloodCamera() {
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const st = useRef<{ on: boolean; at: number; from: Pose | null; saved: Pose | null; done: boolean }>({ on: false, at: 0, from: null, saved: null, done: true });
  useFrame(({ camera, clock, size }) => {
    if (!controls) return;
    const s = st.current, now = clock.elapsedTime;
    if (pose.on !== s.on) {
      s.on = pose.on;
      s.at = now;
      s.done = false;
      s.from = { p: camera.position.clone(), t: controls.target.clone() };
      if (pose.on) s.saved = { p: s.from.p.clone(), t: s.from.t.clone() };
    }
    if (s.done || !s.from) return;
    const k = Math.min((now - s.at) / 1.6, 1), e = k * k * (3 - 2 * k);
    let goal: Pose | null = s.saved;
    if (s.on) {
      const widen = Math.max(1, 1.3 / (size.width / size.height)); // portrait screens back off further
      goal = { p: FLOOD_CAM.clone().sub(FLOOD_TARGET).multiplyScalar(widen).add(FLOOD_TARGET), t: FLOOD_TARGET };
    }
    if (!goal) return;
    camera.position.lerpVectors(s.from.p, goal.p, e);
    controls.target.lerpVectors(s.from.t, goal.t, e);
    if (k >= 1) s.done = true;
  });
  return null;
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
  const idle = !props.open && !props.selected && !props.flood;
  return (
    <Canvas
      camera={{ position: [0, 1.6, 5.4], fov: 34, far: 4000 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <FitCamera />
      <FaceFront on={props.selected === "beacon"} />
      <FloodCamera />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.7} />
      {/* ponytail: Lightformers instead of an HDR file — no network fetch, works offline at the venue */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#9dbdff" position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
      <Float speed={1.6} rotationIntensity={props.flood ? 0 : 0.08} floatIntensity={props.flood ? 0 : idle ? 0.5 : 0.15}>
        <Bag {...props} />
      </Float>
      <fog attach="fog" args={[HORIZON, 80, 600]} />
      <FloodScene flood={props.flood} />
      <group visible={!props.flood}>
        <Sparkles count={45} scale={[7, 4, 4]} position={[0, 0.8, 0]} size={3} speed={0.35} opacity={0.8} color="#ffffff" />
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        target={[0, 0.35, 0]}
        minDistance={3.2}
        maxDistance={22}
        minPolarAngle={0.45}
        maxPolarAngle={1.6}
        autoRotate={idle}
        autoRotateSpeed={1.2}
      />
    </Canvas>
  );
}
