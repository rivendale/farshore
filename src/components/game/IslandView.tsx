import { ART, BUILDING_BY_ID, TILE_ART } from "@/game/data/catalog";
import { useGame } from "@/game/store";
import { useCallback, useEffect, useRef, useState } from "react";

const TILE = 72;

export function IslandView() {
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const selected = useGame((s) => s.selectedTile);
  const selectTile = useGame((s) => s.selectTile);
  const rival = useGame((s) => s.rival);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState({ x: 0, y: 0, z: 1 });
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

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const z = Math.min(w / (island.width * TILE + 24), h / (island.height * TILE + 24), 1.15);
    setCam({
      x: (w - island.width * TILE * z) / 2,
      y: (h - island.height * TILE * z) / 2,
      z: Math.max(0.62, z),
    });
  }, [island.width, island.height]);

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
    const px = (e.clientX - rect.left - cam.x) / cam.z;
    const py = (e.clientY - rect.top - cam.y) / cam.z;
    const x = Math.floor(px / TILE);
    const y = Math.floor(py / TILE);
    if (x >= 0 && y >= 0 && x < island.width && y < island.height) selectTile(x, y);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const nextZ = Math.min(1.8, Math.max(0.55, cam.z * (e.deltaY > 0 ? 0.92 : 1.08)));
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
    const nextZ = Math.min(1.8, Math.max(0.55, drag.current.z * (dist / Math.max(1, drag.current.dist))));
    setCam((c) => ({ ...c, z: nextZ }));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) drag.current.pinching = false;
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-water"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          width: island.width * TILE,
          height: island.height * TILE,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`,
        }}
      >
        {island.tiles.map((t) => {
          const b = island.buildings.find((bb) => bb.x === t.x && bb.y === t.y);
          const native = island.native && island.native.x === t.x && island.native.y === t.y;
          const sel = selected?.x === t.x && selected?.y === t.y;
          const forestTree = t.terrain === "forest" && !b && !native;
          return (
            <div
              key={`${t.x}-${t.y}`}
              className="absolute"
              style={{
                left: t.x * TILE,
                top: t.y * TILE,
                width: TILE,
                height: TILE,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${TILE_ART[t.terrain]})`,
                  backgroundSize: "cover",
                }}
              />
              {forestTree ? (
                <img
                  src={ART.tree}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-[8%] object-contain"
                />
              ) : null}
              {native ? (
                <img
                  src={ART.village}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-[4%] object-contain drop-shadow-sm"
                />
              ) : null}
              {b ? (
                <>
                  <img
                    src={ART[b.type]}
                    alt=""
                    draggable={false}
                    className={`pointer-events-none absolute inset-[4%] object-contain drop-shadow-sm ${b.idle ? "opacity-70" : ""}`}
                  />
                  {b.idle ? (
                    <span className="pointer-events-none absolute right-1 top-1 size-2 rounded-full bg-warn" />
                  ) : null}
                </>
              ) : null}
              {sel ? (
                <div className="pointer-events-none absolute inset-[3px] rounded-[6px] ring-2 ring-primary/90" />
              ) : null}
            </div>
          );
        })}
      </div>
      {!island.owned ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(90%,20rem)] -translate-x-1/2 rounded-[var(--radius-md)] border border-border bg-bg/80 px-3 py-2 text-center text-sm text-fg backdrop-blur-sm">
          {rival?.claimed && rival.islandId === island.id
            ? `${rival.name} flies here. You cannot plant a charter on this cape.`
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
