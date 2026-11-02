export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Visual-smoke only. Normal play leaves this unset, so `uid` stays on Math.random. */
let pinnedRandom: (() => number) | null = null;

export function pinRandom(rand: (() => number) | null) {
  pinnedRandom = rand;
}

export function uid(prefix: string) {
  const rand = pinnedRandom ?? Math.random;
  return `${prefix}-${rand().toString(36).slice(2, 8)}`;
}
