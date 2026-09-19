import { Button } from "@/components/ui/button";
import { ISLAND_META } from "@/game/data/catalog";
import { useGame } from "@/game/store";
import type { IslandId } from "@/game/types";
import { asset } from "@/lib/asset";
import { Anchor, Flag, Lock } from "lucide-react";

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
  const selectedShipId = useGame((s) => s.selectedShipId);
  const selectIsland = useGame((s) => s.selectIsland);
  const selectShip = useGame((s) => s.selectShip);
  const explore = useGame((s) => s.explore);
  const transferTo = useGame((s) => s.transferTo);
  const ship = ships.find((s) => s.id === selectedShipId) ?? ships[0];
  const rival = useGame((s) => s.rival);
  const militia = useGame((s) => s.militia);
  const war = useGame((s) => s.war);
  const homeDock = islands.some((i) => i.owned && i.buildings.some((b) => b.type === "dock"));

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      <img
        src={asset("/game/scenes/chart.jpg")}
        alt="Nautical chart of the archipelago"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-transparent to-bg/70" />
      {SPOTS.map((spot) => {
        const isle = islands.find((i) => i.id === spot.id)!;
        const known = isle.discovered;
        const here = ships.filter((s) => s.location === isle.id);
        const taken = Boolean(rival?.claimed && rival.islandId === isle.id);
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
                  : taken
                    ? "border-bad bg-bg/80 text-bad"
                    : known
                      ? "border-border-strong bg-surface/90 text-fg"
                      : "border-border bg-bg/70 text-muted"
              }`}
            >
              {taken ? (
                <Flag className="size-4" strokeWidth={1.7} />
              ) : known ? (
                <Anchor className="size-4" strokeWidth={1.7} />
              ) : (
                <Lock className="size-4" />
              )}
            </span>
            <span className="mt-1 block min-w-[7rem] font-display text-sm text-fg drop-shadow">
              {known ? isle.name : "Unknown"}
              {taken ? ` · ${rival!.name}` : here.length ? ` · ${here.map((s) => s.name).join(", ")}` : ""}
            </span>
          </button>
        );
      })}
      {ships.some((s) => s.location === "europe" || s.location === "sea") ||
      (rival?.claimed && (rival.shipAt === "sea-out" || rival.shipAt === "sea-home" || rival.shipAt === "europe")) ? (
        <p className="absolute left-1/2 top-6 w-[min(90%,20rem)] -translate-x-1/2 text-center text-sm text-fg drop-shadow">
          {[
            ...ships
              .filter((s) => s.location === "europe" || s.location === "sea")
              .map((s) =>
                s.location === "europe" ? `${s.name} in Europe` : `${s.name} at sea · ${s.eta}d`,
              ),
            rival?.claimed && rival.shipAt === "europe"
              ? `${rival.shipName} in Europe`
              : rival?.claimed && (rival.shipAt === "sea-out" || rival.shipAt === "sea-home")
                ? `${rival.shipName} at sea · ${rival.shipEta}d`
                : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg rounded-[var(--radius-lg)] border border-border bg-bg/85 p-4 backdrop-blur-sm">
          {rival?.claimed ? (
            <div className="mb-3">
              <p className="text-sm text-muted">
                {rival.name} holds {ISLAND_META[rival.islandId].name}. Their {rival.shipName} will
                undercut you in Europe.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (ship?.location === rival.islandId && ship.mission === "idle") {
                    const msg = useGame.getState().raidRival();
                    if (msg) {
                      useGame.setState((s) => ({
                        log: [
                          { id: `n-${s.day}`, day: s.day, text: msg, tone: "warn" as const },
                          ...s.log,
                        ].slice(0, 40),
                      }));
                    }
                  } else if (ship) {
                    transferTo(rival.islandId);
                  }
                }}
                disabled={
                  !ship ||
                  ship.mission !== "idle" ||
                  (ship.location === rival.islandId && (militia < 1 || Boolean(war)))
                }
              >
                {ship?.location === rival.islandId && ship.mission === "idle"
                  ? `Raid ${rival.name}`
                  : `Sail to ${ISLAND_META[rival.islandId].name}`}
              </Button>
            </div>
          ) : null}
          {ships.length > 1 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {ships.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectShip(s.id)}
                  className={`h-10 rounded-full px-3 text-sm ${
                    s.id === ship?.id ? "bg-primary text-primary-fg" : "border border-border text-muted"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}
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
                  {homeDock ? `Send ${ship?.name ?? "ship"}` : "Need a dock first"}
                </Button>
              </div>
            );
          })}
          {islands.every((i) => i.discovered) ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">
                All four islands are found. {ship?.name ?? "The ship"} sails on your order.
              </p>
              <div className="flex flex-wrap gap-2">
                {islands
                  .filter((i) => i.id !== ship?.location)
                  .map((i) => (
                    <Button key={i.id} size="sm" variant="ghost" onClick={() => transferTo(i.id)}>
                      Sail to {ISLAND_META[i.id].name}
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
