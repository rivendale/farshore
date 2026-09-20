import { ISLAND_META, MAP_SIZE, TRIBES } from "@/game/data/catalog";
import type { Island, IslandId, NativeState, Terrain, Tile } from "@/game/types";
import { mulberry32 } from "@/game/sim/rng";

type Profile = {
  forest: number;
  hills: number;
  radius: number;
};

const PROFILES: Record<IslandId, Profile> = {
  haven: { forest: 0.42, hills: 0.78, radius: 3.55 },
  kaneska: { forest: 0.28, hills: 0.88, radius: 3.4 },
  iron: { forest: 0.55, hills: 0.48, radius: 3.35 },
  cinder: { forest: 0.5, hills: 0.92, radius: 3.25 },
};

function noise2(rng: () => number, size: number) {
  const grid: number[][] = [];
  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) grid[y][x] = rng();
  }
  return (x: number, y: number) => grid[y]?.[x] ?? 0;
}

export function generateIsland(id: IslandId, seed: number, nativeRel: number): Island {
  const size = MAP_SIZE;
  const rng = mulberry32(seed + id.length * 97);
  const n = noise2(rng, size);
  const p = PROFILES[id];
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2 + 0.15;
  const tiles: Tile[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy * 0.92);
      const wobble = (n(x, y) - 0.5) * 0.7;
      let terrain: Terrain = "water";
      if (dist < p.radius + wobble) {
        const v = n(x, y);
        if (dist > p.radius - 0.85) terrain = "sand";
        else if (v > p.hills) terrain = "hills";
        else if (v > p.forest) terrain = "forest";
        else terrain = "grass";
      }
      tiles.push({ x, y, terrain });
    }
  }

  // Guarantee a usable starting pocket on Haven
  if (id === "haven") {
    const force: { x: number; y: number; terrain: Terrain }[] = [
      { x: 4, y: 4, terrain: "grass" },
      { x: 5, y: 4, terrain: "grass" },
      { x: 3, y: 4, terrain: "forest" },
      { x: 4, y: 3, terrain: "forest" },
      { x: 5, y: 5, terrain: "grass" },
      { x: 3, y: 5, terrain: "hills" },
      { x: 6, y: 4, terrain: "sand" },
      { x: 7, y: 4, terrain: "water" },
    ];
    for (const f of force) {
      const t = tiles.find((c) => c.x === f.x && c.y === f.y);
      if (t) t.terrain = f.terrain;
    }
  }

  let native: NativeState | null = null;
  if (id === "kaneska" || id === "cinder") {
    const land = tiles.filter((t) => t.terrain === "grass" || t.terrain === "forest");
    const pick = land[Math.floor(rng() * land.length)] ?? { x: 4, y: 4 };
    const tribeId = id === "kaneska" ? "river" : "cane";
    native = {
      tribeId,
      name: TRIBES[tribeId].name,
      relation: Math.max(0, Math.min(100, 48 + nativeRel)),
      x: pick.x,
      y: pick.y,
      lastGiftDay: -20,
      taught: false,
      mapGiven: false,
      lastRaidDay: -40,
      vein: null,
    };
    const nt = tiles.find((t) => t.x === pick.x && t.y === pick.y);
    if (nt) nt.terrain = "grass";
    const cand = tiles.filter(
      (t) =>
        (t.terrain === "grass" || t.terrain === "forest") && !(t.x === pick.x && t.y === pick.y),
    );
    const vein = cand[Math.floor(rng() * cand.length)];
    if (vein) native.vein = { x: vein.x, y: vein.y };
  }

  const meta = ISLAND_META[id];
  return {
    id,
    name: meta.name,
    blurb: meta.blurb,
    climate: meta.climate,
    discovered: id === "haven",
    owned: id === "haven",
    width: size,
    height: size,
    tiles,
    buildings: [],
    storage: id === "haven" ? { food: 60, lumber: 28, planks: 6 } : {},
    storageCap: 70,
    native,
    orders: [],
  };
}

export function generateArchipelago(seed: number, nativeRel: number): Island[] {
  return (["haven", "kaneska", "iron", "cinder"] as IslandId[]).map((id, i) =>
    generateIsland(id, seed + i * 131, nativeRel),
  );
}
