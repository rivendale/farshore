import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";
import type { IslandId } from "@/game/types";
import { Anchor, Lock } from "lucide-react";

const SPOTS: { id: IslandId; top: string; left: string }[] = [
  { id: "haven", top: "58%", left: "28%" },
  { id: "kaneska", top: "32%", left: "62%" },
  { id: "iron", top: "22%", left: "24%" },
  { id: "cinder", top: "70%", left: "68%" },
];

export function WorldMap() {
  const islands = useGame((s) => s.islands);
  const selected = useGame((s) => s.selectedIslandId);
  const ships = useGame((s) => s.ships);
  const selectIsland = useGame((s) => s.selectIsland);
  const explore = useGame((s) => s.explore);
  const transferTo = useGame((s) => s.transferTo);
  const ship = ships.find((s) => s.mission === "idle") ?? ships[0];
  const homeDock = islands.some((i) => i.owned && i.buildings.some((b) => b.type === "dock"));

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      <img
        src="/game/scenes/chart.jpg"
        alt="Nautical chart of the archipelago"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-transparent to-bg/70" />
      {SPOTS.map((spot) => {
        const isle = islands.find((i) => i.id === spot.id)!;
        const known = isle.discovered;
        const here = ship?.location === isle.id;
        return (
          <button
            key={isle.id}
            type="button"
            style={{ top: spot.top, left: spot.left }}
            onClick={() => (known ? selectIsland(isle.id) : undefined)}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
          >
            <span
              className={`flex size-11 items-center justify-center rounded-full border ${
                selected === isle.id
                  ? "border-primary bg-primary text-primary-fg"
                  : known
                    ? "border-border-strong bg-surface/90 text-fg"
                    : "border-border bg-bg/70 text-muted"
              }`}
            >
              {known ? <Anchor className="size-4" strokeWidth={1.7} /> : <Lock className="size-4" />}
            </span>
            <span className="mt-1 block min-w-[7rem] font-display text-sm text-fg drop-shadow">
              {known ? isle.name : "Uncharted"}
              {here ? " · ship" : ""}
            </span>
          </button>
        );
      })}
      <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg rounded-[var(--radius-lg)] border border-border bg-bg/85 p-4 backdrop-blur-sm">
          {SPOTS.map((spot) => {
            const isle = islands.find((i) => i.id === spot.id)!;
            if (isle.discovered) return null;
            return (
              <div key={isle.id} className="mb-3 last:mb-0">
                <p className="font-display text-lg leading-tight">{isle.name}</p>
                <p className="mt-1 text-sm text-muted">{isle.blurb}</p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => explore(isle.id)}
                  disabled={!ship || ship.mission !== "idle" || !homeDock}
                >
                  {homeDock ? "Send caravel" : "Need a wharf first"}
                </Button>
              </div>
            );
          })}
          {islands.every((i) => i.discovered) ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">All four shores are charted. Sail between them.</p>
              <div className="flex flex-wrap gap-2">
                {islands
                  .filter((i) => i.id !== ship?.location)
                  .map((i) => (
                    <Button key={i.id} size="sm" variant="ghost" onClick={() => transferTo(i.id)}>
                      Sail to {i.name}
                    </Button>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
