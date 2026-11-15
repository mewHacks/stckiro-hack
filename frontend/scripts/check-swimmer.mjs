// Verifies the flood-demo swimmer never intersects the backpack.
// Run: node scripts/check-swimmer.mjs   (from frontend/; Node ≥ 23 runs the .ts import natively)
import * as THREE from "three";
import { ARM_POINTS, ARM_R, BAG_PARTS, BAG_SCALE, FLOOD_BAG_POS, HAND_R, HEAD, HIPS, LEG, NECK, SHOULDER, SLEEVE_R, TORSO, bagToWorld } from "../src/lib/swimmer.ts";

// 1. bagToWorld must match the exact three.js transform BagScene applies
const o = new THREE.Object3D();
o.rotation.order = "YXZ";
o.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
o.scale.setScalar(BAG_SCALE);
o.position.set(...FLOOD_BAG_POS);
o.updateMatrix();
for (const p of [[1, 2, 3], [-0.5, 0.3, 0.9], [0.63, -0.83, 0.48]]) {
  const a = new THREE.Vector3(...p).applyMatrix4(o.matrix).toArray();
  const b = bagToWorld(p);
  if (a.some((v, i) => Math.abs(v - b[i]) > 1e-9)) throw new Error(`bagToWorld mismatch for ${p}: ${a} vs ${b}`);
}

// 2. world AABBs of every bag part
const boxes = Object.entries(BAG_PARTS).map(([name, [mn, mx]]) => {
  const a = bagToWorld(mn), b = bagToWorld(mx);
  return { name, min: a.map((v, i) => Math.min(v, b[i])), max: a.map((v, i) => Math.max(v, b[i])) };
});
const pointGap = (p, b) => Math.hypot(...p.map((v, i) => Math.max(b.min[i] - v, 0, v - b.max[i])));
const boxGap = (c, size, b) => Math.max(...c.map((v, i) => Math.max(b.min[i] - (v + size[i] / 2), v - size[i] / 2 - b.max[i])));

let worst = { gap: Infinity, what: "" };
const record = (gap, what) => gap < worst.gap && (worst = { gap, what });

for (const side of [1, -1]) {
  const curve = new THREE.CatmullRomCurve3(ARM_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z * side)), false, "centripetal");
  const pts = curve.getPoints(600);
  pts.forEach((p, i) => {
    const r = i < pts.length * 0.37 ? SLEEVE_R : ARM_R; // sleeve covers the first stretch
    for (const b of boxes) record(pointGap(p.toArray(), b) - r, `arm(${side}) vs ${b.name}`);
  });
  const hand = curve.getPoint(1).toArray();
  for (const b of boxes) record(pointGap(hand, b) - HAND_R, `hand(${side}) vs ${b.name}`);
  const sh = [SHOULDER.pos[0], SHOULDER.pos[1], SHOULDER.pos[2] * side];
  for (const b of boxes) record(pointGap(sh, b) - SHOULDER.r, `shoulder(${side}) vs ${b.name}`);
}
// neck + legs sampled along their axes
const along = (a, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => a.map((v, k) => v + ((b[k] - v) * i) / n));
for (const b of boxes) {
  for (const p of along(NECK.from, HEAD.pos)) record(pointGap(p, b) - NECK.r, `neck vs ${b.name}`);
  for (const side of [1, -1])
    for (const p of along([LEG.from[0], LEG.from[1], LEG.from[2] * side], [LEG.to[0], LEG.to[1], LEG.to[2] * side])) record(pointGap(p, b) - LEG.r, `leg(${side}) vs ${b.name}`);
}
for (const b of boxes) {
  record(pointGap(HEAD.pos, b) - HEAD.r, `head vs ${b.name}`);
  record(boxGap(TORSO.pos, TORSO.size, b), `torso vs ${b.name}`);
  record(boxGap(HIPS.pos, HIPS.size, b), `hips vs ${b.name}`);
}

console.log(`closest approach: ${worst.gap.toFixed(3)} (${worst.what})`);
if (worst.gap <= 0) {
  console.error("FAIL: swimmer intersects the bag");
  process.exit(1);
}
console.log("OK: no part of the swimmer passes through the bag");
