/**
 * Seeded PRNG. Every simulation on this site is reproducible.
 *
 * Why this matters pedagogically: if a student can re-run the exact
 * sequence that bankrupted them, the loss stops looking like bad luck
 * and starts looking like arithmetic.
 */

export type Rng = () => number;

/** Hash a string seed into a 32-bit integer (xmur3). */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/**
 * mulberry32 — small, fast, statistically fine for Monte Carlo at the
 * scale we run (<= 10^7 draws). Period 2^32.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: string | number): Rng {
  return mulberry32(typeof seed === "string" ? hashSeed(seed) : seed >>> 0);
}

/** Uniform integer in [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Pick one element uniformly. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}

/** In-place Fisher-Yates. The only correct shuffle; everything else has bias. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Standard normal via Box-Muller. Used for analytic overlays on histograms. */
export function gaussian(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Human-friendly random seed, e.g. "oak-vivid-3817". */
const WORDS = [
  "oak", "vivid", "ember", "slate", "lagoon", "thistle", "amber", "felt",
  "ruin", "edge", "drift", "tilt", "comp", "shoe", "pit", "rail",
];
export function randomSeed(): string {
  const r = Math.random;
  return `${WORDS[Math.floor(r() * WORDS.length)]}-${
    WORDS[Math.floor(r() * WORDS.length)]
  }-${Math.floor(r() * 9000) + 1000}`;
}
