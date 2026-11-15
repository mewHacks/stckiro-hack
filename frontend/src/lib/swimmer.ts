// Geometry for the flood demo: the backpack floats flat on a swimmer's chest while they hug it.
// Pure numbers (no three.js) so scripts/check-swimmer.mjs can prove no part of the swimmer passes through the bag.

export type V3 = [number, number, number];

export const BAG_SCALE = 1.15;
/** Bag centre while floating (world). */
export const FLOOD_BAG_POS: V3 = [0.2, 0.38, 0];

/**
 * Bag-local point → world for the flood pose (Euler order YXZ, y = +90°, x = −90°):
 * the bag lies front-up with its roll-top pointing toward −x (the swimmer's head).
 */
export const bagToWorld = ([x, y, z]: V3): V3 => [
  -y * BAG_SCALE + FLOOD_BAG_POS[0],
  z * BAG_SCALE + FLOOD_BAG_POS[1],
  -x * BAG_SCALE + FLOOD_BAG_POS[2],
];

/** Generous bag-local bounding boxes of every bag part: [min, max]. */
export const BAG_PARTS: Record<string, [V3, V3]> = {
  body: [[-0.63, -0.83, -0.33], [0.63, 0.83, 0.33]],
  frontPocket: [[-0.52, -0.73, 0.33], [0.52, -0.11, 0.48]],
  leftPocket: [[-0.77, -0.75, -0.24], [-0.6, -0.05, 0.24]],
  rightPocket: [[0.6, -0.75, -0.24], [0.77, -0.05, 0.24]],
  frontStrap: [[-0.36, 0, 0.33], [-0.2, 0.9, 0.42]],
  backPadding: [[-0.48, -0.56, -0.42], [0.48, 0.56, -0.33]],
  shoulderStraps: [[-0.45, -0.8, -0.52], [0.45, 0.7, -0.3]],
  grabLoop: [[-0.15, 0.55, -0.45], [0.15, 0.85, -0.3]],
  rollTop: [[-0.66, 0.8, -0.33], [0.66, 1.12, 0.36]],
  lidStrap: [[-0.34, 0.4, 0.33], [-0.22, 0.9, 0.42]],
};

// Swimmer lies face-down ON the bag (human → backpack → sea), head toward −x over the roll-top end,
// arms reaching forward to hold the roll-top, legs trailing down into the water. Water surface at y = 0.
export const TORSO = { pos: [0.15, 1.25, 0] as V3, size: [2.3, 0.6, 1.9] as V3 }; // rounded box, rests above the pockets
export const HIPS = { pos: [1.75, 1.05, 0] as V3, size: [0.9, 0.55, 1.5] as V3 };
export const HEAD = { pos: [-1.8, 0.7, 0] as V3, r: 0.42 };
export const NECK = { from: [-0.95, 1.2, 0] as V3, r: 0.17 }; // neck runs from the torso end to the head
export const SHOULDER = { pos: [-0.85, 1.2, 0.95] as V3, r: 0.26 }; // mirror z for the other side
export const LEG = { from: [2.05, 1.0, 0.4] as V3, to: [3.9, -0.1, 0.42] as V3, r: 0.19 }; // mirror z; slopes into the water

/** Arm centre-line for the +z side (mirror z for −z): shoulder → alongside the bag → hands holding the roll-top. */
export const ARM_POINTS: V3[] = [
  [-0.85, 1.2, 0.95],
  [-1.15, 1.05, 0.95],
  [-1.4, 0.85, 0.85],
  [-1.28, 0.68, 0.45],
];
export const ARM_R = 0.13;
export const SLEEVE_R = 0.17;
export const HAND_R = 0.16;
