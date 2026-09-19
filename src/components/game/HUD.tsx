import { GoodIcon } from "@/components/game/GoodIcon";
import { GOODS, libertyPercent, totalPop, totalStock } from "@/game/data/catalog";
import { idleHands } from "@/game/data/people";
import { useGame } from "@/game/store";
import type { PlayView, WarState } from "@/game/types";
import { Anchor, Crown, Map, Pause, Play, Mountain } from "lucide-react";
import { useState } from "react";

const NAV: { id: PlayView; label: string; icon: typeof Map }[] = [
  { id: "island", label: "Island", icon: Mountain },
  { id: "world", label: "Map", icon: Map },
  { id: "hold", label: "Ship", icon: Anchor },
  { id: "crown", label: "King", icon: Crown },
];

function warBanner(war: WarState) {
  const who =
    war.kind === "native"
      ? "War party"
      : war.kind === "revolution"
        ? "Royal expedition"
        : war.kind === "campaign"
          ? "Cape raid"
          : war.kind === "rival"
            ? "Rival host"
            : "Punitive raid";
  if (war.landed) return `${who} on the beach · tap`;
  return `${who} · ${war.eta}d`;
}

export function HUD() {
  const gold = useGame((s) => s.gold);
  const day = useGame((s) => s.day);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const state = useGame();
  const pop = totalPop(state);
  const pct = libertyPercent(state);
  const idle = idleHands(state, island.id);
  const food = island.storage.food ?? 0;
  const lumber = island.storage.lumber ?? 0;
  const planks = island.storage.planks ?? 0;
  const [stores, setStores] = useState(false);
  const war = state.war && !state.war.resolved ? state.war : null;

  return (
    <>
      <header className="safe-t pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-2">
        <div
          className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-bg/80 px-3 py-2 backdrop-blur-sm"
          onClick={() => setStores((v) => !v)}
          role="button"
          tabIndex={0}
        >
          <Chip icon="gold" value={gold} />
          <Chip icon="food" value={Math.floor(food)} />
          <Chip icon="lumber" value={Math.floor(lumber)} />
          <Chip icon="planks" value={Math.floor(planks)} />
          <div
            className="ml-auto flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <SpeedBtn active={speed === 0} onClick={() => setSpeed(0)} label="Pause">
              <Pause className="size-3.5" />
            </SpeedBtn>
            <SpeedBtn active={speed === 1} onClick={() => setSpeed(1)} label="Play">
              <Play className="size-3.5" />
            </SpeedBtn>
            <SpeedBtn active={speed === 2} onClick={() => setSpeed(2)} label="Faster">
              2x
            </SpeedBtn>
          </div>
        </div>
        {stores ? (
          <div className="pointer-events-auto mx-auto mt-2 grid max-w-lg grid-cols-3 gap-2 rounded-[var(--radius-lg)] border border-border bg-bg/90 p-3 backdrop-blur-sm">
            {GOODS.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1.5 text-sm tabular">
                <GoodIcon id={g.id} className="size-5" />
                {Math.floor(island.storage[g.id] ?? 0)}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mx-auto mt-2 flex max-w-lg justify-between px-1 text-xs text-muted">
          <span className="tabular">
            Day {day} · {island.name}
          </span>
          <span className="tabular">
            {pop} people{idle ? ` · ${idle} idle` : ""} · {pct}% free ·{" "}
            {totalStock(island.storage)}/{island.storageCap}
          </span>
        </div>
        {state.log[0] ? (
          <p className="mx-auto mt-1 max-w-lg truncate px-1 text-center text-[11px] text-faint">
            {state.log[0].text}
          </p>
        ) : null}
      </header>

      {war ? (
        <div className="pointer-events-none absolute inset-x-0 top-[5.8rem] z-20 flex justify-center px-4">
          <button
            type="button"
            className="pointer-events-auto h-10 rounded-full border border-bad/50 bg-bg/90 px-4 text-xs text-fg shadow-[var(--shadow-panel)]"
            onClick={() => {
              if (war.landed) state.openLanding();
              else setView("crown");
            }}
          >
            {warBanner(war)}
          </button>
        </div>
      ) : null}

      <nav className="safe-b absolute inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 px-2 pt-1 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg">
          {NAV.map((n) => {
            const Icon = n.icon;
            const on = view === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setView(n.id)}
                className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${on ? "text-primary" : "text-muted"}`}
              >
                <Icon className="size-5" strokeWidth={1.7} />
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function Chip({ icon, value }: { icon: "gold" | "food" | "lumber" | "planks"; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm tabular">
      <GoodIcon id={icon} className="size-5" />
      {Math.floor(value)}
    </span>
  );
}

function SpeedBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] text-[11px] ${
        active ? "bg-primary text-primary-fg" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}
