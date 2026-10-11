import { ART, BUILDING_BY_ID, PERSON_ART, SMOKE_BUILDINGS, TILE_ART } from "@/game/data/catalog";
import { GoodIcon } from "@/components/game/GoodIcon";
import { useGame } from "@/game/store";
import type { BuildingId, GoodId, ProfessionId } from "@/game/types";
import { useCallback, useEffect, useRef, useState } from "react";


function primaryGood(type: BuildingId): GoodId | null {
  const out = BUILDING_BY_ID[type]?.produces ?? {};
  const hit = (Object.entries(out) as [GoodId, number][]).find(([, v]) => v);
  return hit ? hit[0] : null;
}

/**
 * The island, drawn as a painted isometric diorama (Nick's pick, look A, 2026-10-11).
 *
 * The game grid is unchanged: tile (x, y) is drawn as a 2:1 diamond whose centre is
 * `iso(x, y)`. The ground (terrain textures, sand under the beaches, a shallow-water glow
 * and the surf line) is painted once per island onto one canvas; everything that stands
 * on a tile (trees, buildings, colonists, the ship, markers) is a sprite above it, ordered
 * front to back by x + y. A tap is turned back into a tile by inverting the projection.
 */
const TW = 128;
const TH = 64;
/** Room above the top row for the tallest sprites, and around the island for the surf. */
const PAD_TOP = 96;
const PAD = 48;
/** A tile must stay at least this wide on screen to tap; below it, the map pans instead. */
const MIN_TILE_PX = 56;
/** Screen space the HUD (top) and the fortune bar (bottom) cover over this view, px. */
const OVERLAY_TOP = 88;
const OVERLAY_BOTTOM = 64;

function iso(x: number, y: number, n: number) {
  return { cx: PAD + ((x - y + (n - 1)) * TW) / 2 + TW / 2, cy: PAD_TOP + ((x + y) * TH) / 2 + TH / 2 };
}

function worldSize(w: number, h: number) {
  const n = Math.max(w, h);
  return { n, width: n * TW + PAD * 2, height: n * TH + PAD_TOP + PAD };
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  const hw = (TW / 2) * scale;
  const hh = (TH / 2) * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Paint the island's ground onto `canvas`, at most 1.5x density to stay light on a phone. */
async function paintGround(
  canvas: HTMLCanvasElement,
  island: { width: number; height: number; tiles: { x: number; y: number; terrain: string }[] },
  isCurrent: () => boolean,
) {
  const { n, width, height } = worldSize(island.width, island.height);
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const kinds = ["sand", "grass", "forest", "hills"] as const;
  const imgs = await Promise.all(kinds.map((k) => loadImage(TILE_ART[k]).catch(() => null)));
  // A newer paint (another island, changed terrain) may have started while the textures
  // loaded: only the latest may touch the canvas, or two paints stack their translucent
  // layers or one leaves the other island's ground behind.
  if (!isCurrent()) return;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const pattern: Record<string, CanvasPattern | string> = {};
  kinds.forEach((k, i) => {
    const img = imgs[i];
    pattern[k] = (img && ctx.createPattern(img, "repeat")) || "#7a9a5a";
  });

  const land = island.tiles.filter((t) => t.terrain !== "water");
  const at = new Map(island.tiles.map((t) => [`${t.x},${t.y}`, t.terrain]));
  const coastal = (x: number, y: number) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (at.get(`${x + dx},${y + dy}`) ?? "water") === "water");

  const jitter = (x: number, y: number) => {
    const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const r = h - Math.floor(h);
    const r2 = (r * 7.31) % 1;
    return { s: (r - 0.5) * 0.36, dx: (r2 - 0.5) * 22, dy: (r - 0.5) * 9 };
  };

  // A reusable layer: a soft-edged mask of some tiles, filled with a colour or texture.
  const layer = document.createElement("canvas");
  layer.width = canvas.width;
  layer.height = canvas.height;
  const lc = layer.getContext("2d");
  if (!lc) return;
  const soft = (
    tiles: { x: number; y: number }[],
    scale: number,
    blur: number,
    fill: CanvasPattern | string,
    cut?: { scale: number; blur: number },
  ) => {
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, layer.width, layer.height);
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.globalCompositeOperation = "source-over";
    lc.filter = `blur(${blur}px)`;
    lc.fillStyle = "#fff";
    for (const t of tiles) {
      const { cx, cy } = iso(t.x, t.y, n);
      // Coastal tiles get a per-tile wobble in size and position, so the outline reads
      // as a natural coast rather than the grid's diamond. Deterministic per tile.
      const j = coastal(t.x, t.y) ? jitter(t.x, t.y) : { s: 0, dx: 0, dy: 0 };
      diamond(lc, cx + j.dx, cy + j.dy, scale + j.s);
      lc.fill();
    }
    if (cut) {
      // Punch out the inside, leaving a ring (the surf line).
      lc.globalCompositeOperation = "destination-out";
      lc.filter = `blur(${cut.blur}px)`;
      for (const t of tiles) { const { cx, cy } = iso(t.x, t.y, n); diamond(lc, cx, cy, cut.scale); lc.fill(); }
    }
    lc.filter = "none";
    lc.globalCompositeOperation = "source-in";
    lc.fillStyle = fill;
    lc.fillRect(0, 0, width, height);
    lc.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  };

  // 1. Shallows: a wide turquoise band that fades into the deep sea.
  soft(land, 1.9, 22, "rgba(110, 214, 206, 0.55)");
  soft(land, 1.5, 12, "rgba(150, 230, 214, 0.45)");
  // 2. Surf: a soft white ring just off the beach.
  soft(land, 1.42, 4, "rgba(250, 252, 248, 0.85)", { scale: 1.3, blur: 4 });
  // 3. Beach: sand under every land tile, feathered, so the shoreline is a curve of
  //    sand rather than the grid's staircase.
  soft(land, 1.26, 9, pattern.sand);

  // 4. The ground itself, one layer per terrain, each a soft-edged mask of its tiles
  //    filled with its texture. Neighbouring terrains blend over a few pixels instead of
  //    meeting at the grid's hard diamonds, which is what makes the island read as painted.
  for (const kind of ["grass", "forest", "hills"] as const) {
    const tiles = land.filter((t) => t.terrain === kind);
    if (tiles.length) soft(tiles, 1.12, 7, pattern[kind]);
  }

  // Sand tiles inland of the beach (the beach itself is painted above).
  soft(land.filter((t) => t.terrain === "sand" && !coastal(t.x, t.y)), 1.1, 6, pattern.sand);
}

export function IslandView() {
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const selected = useGame((s) => s.selectedTile);
  const selectTile = useGame((s) => s.selectTile);
  const rival = useGame((s) => s.rival);
  const war = useGame((s) => s.war);
  const colonists = useGame((s) => s.colonists);
  const ships = useGame((s) => s.ships);
  const speed = useGame((s) => s.speed);
  const live = speed > 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 });
  const world = worldSize(island.width, island.height);
  const drag = useRef({
    active: false,
    moved: false,
    x: 0,
    y: 0,
    cx: 0,
    cy: 0,
    pinching: false,
    dist: 0,
    z: 1,
  });

  // Repaint the ground when the island or its terrain changes (not on every tick).
  const terrainKey = island.tiles.map((t) => t.terrain[0]).join("");
  useEffect(() => {
    const c = groundRef.current;
    let current = true;
    if (c) void paintGround(c, island, () => current);
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [island.id, terrainKey]);

  // The land's own bounds in world pixels (water tiles are just ocean), so the camera
  // frames the island rather than the whole grid.
  const landBox = (() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const tt of island.tiles) {
      if (tt.terrain === "water") continue;
      const { cx, cy } = iso(tt.x, tt.y, world.n);
      x0 = Math.min(x0, cx - TW / 2); x1 = Math.max(x1, cx + TW / 2);
      y0 = Math.min(y0, cy - TH / 2 - TW * 0.7); y1 = Math.max(y1, cy + TH / 2);
    }
    return Number.isFinite(x0) ? { x0: x0 - 24, y0: y0 - 8, x1: x1 + 24, y1: y1 + 24 } : { x0: 0, y0: 0, x1: world.width, y1: world.height };
  })();
  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    // The HUD bar sits over the top of this view and the fortune bar over its foot:
    // frame the island in the space between them.
    const top = OVERLAY_TOP;
    const h = Math.max(120, el.clientHeight - OVERLAY_TOP - OVERLAY_BOTTOM);
    const bw = landBox.x1 - landBox.x0;
    const bh = landBox.y1 - landBox.y0;
    const fitZ = Math.min(w / bw, h / bh, 1.6);
    // Never shrink a tile below a tappable size: a narrow phone pans the island instead.
    const z = Math.max(fitZ, MIN_TILE_PX / TW);
    setCam({ x: (w - bw * z) / 2 - landBox.x0 * z, y: top + (h - bh * z) / 2 - landBox.y0 * z, z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.width, world.height, landBox.x0, landBox.y0, landBox.x1, landBox.y1]);

  useEffect(() => {
    fit();
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, island.id]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current.active = true;
    drag.current.moved = false;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    drag.current.cx = cam.x;
    drag.current.cy = cam.y;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active || drag.current.pinching) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 8) drag.current.moved = true;
    setCam((c) => ({ ...c, x: drag.current.cx + dx, y: drag.current.cy + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.moved) return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Screen -> world -> tile: the inverse of iso().
    const px = (e.clientX - rect.left - cam.x) / cam.z - PAD - TW / 2;
    const py = (e.clientY - rect.top - cam.y) / cam.z - PAD_TOP - TH / 2;
    const a = px / (TW / 2) - (world.n - 1);
    const b = py / (TH / 2);
    const x = Math.round((a + b) / 2);
    const y = Math.round((b - a) / 2);
    if (x >= 0 && y >= 0 && x < island.width && y < island.height) selectTile(x, y);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const nextZ = Math.min(1.8, Math.max(MIN_TILE_PX / TW * 0.8, cam.z * (e.deltaY > 0 ? 0.92 : 1.08)));
    const k = nextZ / cam.z;
    setCam({ x: mx - (mx - cam.x) * k, y: my - (my - cam.y) * k, z: nextZ });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      drag.current.pinching = true;
      drag.current.active = false;
      const [a, b] = [e.touches[0], e.touches[1]];
      drag.current.dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      drag.current.z = cam.z;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.pinching || e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const nextZ = Math.min(1.8, Math.max(MIN_TILE_PX / TW * 0.8, drag.current.z * (dist / Math.max(1, drag.current.dist))));
    setCam((c) => ({ ...c, z: nextZ }));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) drag.current.pinching = false;
  };

  const SPRITE = TW * 0.94;
  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-water"
      // The open sea: the painted ocean texture, moving with the island as it pans.
      style={{ backgroundImage: `url(${TILE_ART.water})`, backgroundSize: `${256 * cam.z}px`, backgroundPosition: `${cam.x}px ${cam.y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {live ? <div className="water-gleam" /> : null}
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          width: world.width,
          height: world.height,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`,
        }}
      >
        <canvas ref={groundRef} className="pointer-events-none absolute left-0 top-0" style={{ width: world.width, height: world.height }} />
        {island.tiles.map((t) => {
          if (t.terrain === "water") return null;
          const { cx, cy } = iso(t.x, t.y, world.n);
          const b = island.buildings.find((bb) => bb.x === t.x && bb.y === t.y);
          const native = island.native && island.native.x === t.x && island.native.y === t.y;
          const sel = selected?.x === t.x && selected?.y === t.y;
          const forestTree = t.terrain === "forest" && !b && !native;
          const landing =
            war?.landed &&
            !war.resolved &&
            war.islandId === island.id &&
            war.x === t.x &&
            war.y === t.y;
          const faction = b ? (b.type === "townhouse" || b.type === "manor" ? "tory" : b.type === "patriot" ? "patriot" : null) : null;
          const worker =
            b && BUILDING_BY_ID[b.type].workers > 0
              ? colonists.find((c) => c.jobId === b.id && c.islandId === island.id)
              : null;
          const made = b && !b.idle ? primaryGood(b.type) : null;
          const docked =
            b?.type === "dock" &&
            ships.some((s) => s.location === island.id && s.mission === "idle");
          const delay = `${((t.x * 7 + t.y * 13) % 10) * 0.22}s`;
          // A sprite box whose bottom centre stands a little below the tile's centre.
          const box = (w: number, lift = 0.18): React.CSSProperties => ({
            left: cx - w / 2,
            top: cy + TH * lift - w,
            width: w,
            height: w,
          });
          return (
            <div key={`${t.x}-${t.y}`} className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 10 + t.x + t.y }}>
              {sel ? (
                <svg className="absolute" style={{ left: cx - TW / 2, top: cy - TH / 2, width: TW, height: TH }} viewBox={`0 0 ${TW} ${TH}`}>
                  <polygon points={`${TW / 2},3 ${TW - 4},${TH / 2} ${TW / 2},${TH - 3} 4,${TH / 2}`} fill="color-mix(in oklab, var(--color-primary) 18%, transparent)" stroke="var(--color-primary)" strokeWidth="3" />
                </svg>
              ) : null}
              {forestTree ? (
                <>
                  {/* Two trees per forest tile, the mix varying by tile so the wood is not a grid of clones. */}
                  <img src={(t.x + t.y) % 3 === 0 ? ART.treeBroadleaf : ART.treePine} alt="" draggable={false} className="absolute max-w-none object-contain" style={{ ...box(TW * 0.62, -0.05), left: cx - TW * 0.42 }} />
                  <img src={(t.x * 2 + t.y) % 3 === 1 ? ART.tree : (t.x + t.y) % 2 ? ART.treePine : ART.treeBroadleaf} alt="" draggable={false} className="absolute max-w-none object-contain" style={{ ...box(TW * 0.7, 0.22), left: cx - TW * 0.05 }} />
                </>
              ) : null}
              {t.terrain === "hills" && !b && !native ? (
                <img src={ART.rockOutcrop} alt="" draggable={false} className="absolute max-w-none object-contain" style={box(TW * 0.62, 0.05)} />
              ) : null}
              {native ? (
                <img src={ART.village} alt="" draggable={false} className="absolute max-w-none object-contain drop-shadow-sm" style={box(SPRITE)} />
              ) : null}
              {b ? (
                <>
                  <img
                    src={ART[b.type]}
                    alt=""
                    draggable={false}
                    className={`absolute max-w-none object-contain drop-shadow-sm ${b.idle ? "opacity-70" : ""}`}
                    style={box(SPRITE)}
                  />
                  {b.idle ? (
                    <span className="absolute size-3 rounded-full bg-warn ring-2 ring-bg/60" style={{ left: cx + TW * 0.28, top: cy - SPRITE * 0.7 }} />
                  ) : faction === "tory" ? (
                    <span className="absolute size-3 rounded-full bg-bad ring-2 ring-bg/60" style={{ left: cx + TW * 0.28, top: cy - SPRITE * 0.7 }} />
                  ) : faction === "patriot" ? (
                    <span className="absolute size-3 rounded-full bg-good ring-2 ring-bg/60" style={{ left: cx + TW * 0.28, top: cy - SPRITE * 0.7 }} />
                  ) : null}
                  {live && !b.idle && SMOKE_BUILDINGS.has(b.type) ? (
                    <span className="absolute" style={{ ...box(SPRITE) }}>
                      <span className="smoke-puff" style={{ animationDelay: delay }} />
                    </span>
                  ) : null}
                  {live && made ? (
                    <span className="absolute" style={{ ...box(SPRITE) }}>
                      <span className="goods-float" style={{ animationDelay: delay }}>
                        <GoodIcon id={made} className="size-4" />
                      </span>
                    </span>
                  ) : null}
                  {worker ? (
                    <img
                      src={PERSON_ART[worker.profession as ProfessionId] ?? ART.laborer}
                      alt=""
                      draggable={false}
                      className="absolute max-w-none object-contain drop-shadow-sm"
                      style={{ ...box(TW * 0.4, 0.42), left: cx + TW * 0.12 }}
                    />
                  ) : null}
                  {docked ? (
                    <img
                      src={ART.sloop}
                      alt=""
                      draggable={false}
                      className={`absolute max-w-none object-contain drop-shadow-sm ${live ? "sloop-bob" : ""}`}
                      style={{ ...box(TW * 0.7, 0.9), left: cx + TW * 0.05 }}
                    />
                  ) : null}
                </>
              ) : null}
              {landing ? (
                <div
                  className="absolute flex flex-col items-center justify-center rounded-full bg-bad/90 text-fg shadow-[var(--shadow-panel)]"
                  style={{ left: cx - 30, top: cy - 52, width: 60, height: 60 }}
                >
                  <span className="font-display text-lg leading-none tabular">{war.enemy}</span>
                  <span className="text-[9px] uppercase tracking-wider">host</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="island-vignette" />
      {!island.owned ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(90%,20rem)] -translate-x-1/2 rounded-[var(--radius-md)] border border-border bg-bg/80 px-3 py-2 text-center text-sm text-fg backdrop-blur-sm">
          {rival?.claimed && rival.islandId === island.id
            ? war?.landed && war.islandId === island.id
              ? `${rival.name} — enemy on their beach. Send militia.`
              : `${rival.name} flies here. Sail a ship, then raid from a plot or the map.`
            : island.native
              ? `${island.native.name} keep this shore. Trade or seek settlement rights.`
              : "Unclaimed land. Land a ship to settle."}
        </div>
      ) : null}
    </div>
  );
}

export function BuildingCaption({ type }: { type: keyof typeof BUILDING_BY_ID }) {
  return BUILDING_BY_ID[type].name;
}
