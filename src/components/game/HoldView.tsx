import { Button } from "@/components/ui/button";
import { GoodIcon } from "@/components/game/GoodIcon";
import { GOODS, ISLAND_META, goodName, totalStock } from "@/game/data/catalog";
import { PROFESSIONS, professionName } from "@/game/data/people";
import { useGame } from "@/game/store";
import type { GoodId, IslandId, RouteStop } from "@/game/types";

const PORTS: (IslandId | "europe")[] = ["haven", "kaneska", "iron", "cinder", "europe"];

function portName(at: IslandId | "europe") {
  return at === "europe" ? "Europe" : ISLAND_META[at].name;
}

export function HoldView() {
  const ships = useGame((s) => s.ships);
  const selectedId = useGame((s) => s.selectedShipId);
  const selectShip = useGame((s) => s.selectShip);
  const gold = useGame((s) => s.gold);
  const tax = useGame((s) => s.taxRate);
  const prices = useGame((s) => s.prices);
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const europeVisited = useGame((s) => s.europeVisited);
  const loadShip = useGame((s) => s.loadShip);
  const unloadShip = useGame((s) => s.unloadShip);
  const sailEurope = useGame((s) => s.sailEurope);
  const sailHome = useGame((s) => s.sailHome);
  const sell = useGame((s) => s.sell);
  const buy = useGame((s) => s.buy);
  const recruitProfession = useGame((s) => s.recruitProfession);
  const buyMuskets = useGame((s) => s.buyMuskets);
  const buyShip = useGame((s) => s.buyShip);
  const holdShip = useGame((s) => s.holdShip);
  const addRouteStop = useGame((s) => s.addRouteStop);
  const updateRouteStop = useGame((s) => s.updateRouteStop);
  const removeRouteStop = useGame((s) => s.removeRouteStop);
  const clearRoute = useGame((s) => s.clearRoute);

  const ship = ships.find((s) => s.id === selectedId) ?? ships[0];
  if (!ship) return null;
  const inEurope = ship.location === "europe";
  const atSea = ship.mission !== "idle";
  const docked = ship.location === island.id && ship.mission === "idle";

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-bg px-4 pb-28 pt-24">
      <p className="font-display text-sm tracking-[0.18em] text-accent uppercase">The ship</p>
      {ships.length > 1 ? (
        <div className="mt-2 flex gap-2">
          {ships.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectShip(s.id)}
              className={`h-10 rounded-full px-3 text-sm ${
                s.id === ship.id ? "bg-primary text-primary-fg" : "border border-border text-muted"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : null}
      <h2 className="mt-1 font-display text-3xl">{ship.name}</h2>
      <p className="mt-2 text-sm text-muted">
        {atSea
          ? `At sea · ${ship.eta} days out`
          : inEurope
            ? "Lying in Europe"
            : `Docked at ${portName(ship.location === "sea" ? island.id : (ship.location as IslandId | "europe"))}`}
        {` · ${totalStock(ship.cargo)}/${ship.cargoCap} cargo`}
        {ship.route?.length ? (ship.held ? " · route held" : " · on route") : ""}
      </p>

      <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-3">
        <p className="text-xs uppercase tracking-wider text-faint">Cargo</p>
        <div className="mt-2 flex flex-col gap-2">
          {GOODS.map((g) => {
            const n = ship.cargo[g.id] ?? 0;
            if (!n && !docked && !inEurope) return null;
            const store = island.storage[g.id] ?? 0;
            if (!n && store <= 0 && !inEurope) return null;
            return (
              <div key={g.id} className="flex items-center gap-2">
                <GoodIcon id={g.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{g.name}</p>
                  <p className="text-xs text-muted">
                    Hold {n}
                    {docked ? ` · isle ${store}` : ""}
                    {inEurope ? ` · ${prices[g.id]}g` : ""}
                  </p>
                </div>
                {docked ? (
                  <div className="flex gap-1">
                    <Mini onClick={() => loadShip(g.id, 1)}>+</Mini>
                    <Mini onClick={() => unloadShip(g.id, 1)}>-</Mini>
                  </div>
                ) : null}
                {inEurope && n > 0 ? (
                  <Mini onClick={() => sell(g.id as GoodId, n)}>Sell</Mini>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {inEurope ? (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-3">
          <p className="font-display text-lg">Europe</p>
          <p className="mt-1 text-sm text-muted">
            Treasury {gold}g · King tax {tax}%
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {PROFESSIONS.filter((p) =>
              ["laborer", "farmer", "lumberjack", "criminal", "artisan", "soldier", "statesman"].includes(
                p.id,
              ),
            ).map((p) => (
              <Button key={p.id} variant={p.id === "laborer" ? "primary" : "ghost"} onClick={() => recruitProfession(p.id)}>
                {professionName(p.id)} · {p.cost}g
              </Button>
            ))}
            <Button variant="ghost" onClick={() => buyMuskets()}>
              Buy musket · 28g
            </Button>
            <Button variant="ghost" onClick={() => buy("tools", 1)}>
              Buy tools · {Math.round(prices.tools * 1.35)}g
            </Button>
            <Button className="mt-1" onClick={() => sailHome()}>
              Sail for {island.name}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <Button disabled={atSea} onClick={() => sailEurope()}>
            Sail to Europe · 8 days
          </Button>
          <p className="text-sm text-muted">
            Load goods from the island, sell them in Europe, or set a looping route and let the ship
            work.
          </p>
        </div>
      )}

      <RouteEditor
        shipName={ship.name}
        route={ship.route}
        routeIndex={ship.routeIndex}
        held={ship.held}
        atSea={atSea}
        addRouteStop={addRouteStop}
        updateRouteStop={updateRouteStop}
        removeRouteStop={removeRouteStop}
        clearRoute={clearRoute}
        holdShip={holdShip}
      />

      <div className="mt-4">
        <Button
          variant="ghost"
          disabled={!europeVisited || ships.length >= 3 || gold < 200}
          onClick={() => buyShip()}
        >
          {ships.length >= 3
            ? "Fleet is full"
            : europeVisited
              ? `Buy a ship · 200g (${SHIP_LEFT[ships.length] ?? "Ship"})`
              : "Sail to Europe first to buy a second ship"}
        </Button>
      </div>
    </div>
  );
}

const SHIP_LEFT = ["Hope", "Packet", "Sloop"];

function RouteEditor({
  shipName,
  route,
  routeIndex,
  held,
  atSea,
  addRouteStop,
  updateRouteStop,
  removeRouteStop,
  clearRoute,
  holdShip,
}: {
  shipName: string;
  route: RouteStop[] | null;
  routeIndex: number;
  held: boolean;
  atSea: boolean;
  addRouteStop: (at: IslandId | "europe") => void;
  updateRouteStop: (index: number, patch: Partial<RouteStop>) => void;
  removeRouteStop: (index: number) => void;
  clearRoute: () => void;
  holdShip: (held: boolean) => void;
}) {
  const islands = useGame((s) => s.islands);
  return (
    <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg">Route</p>
        {route?.length ? (
          <button type="button" onClick={clearRoute} className="text-xs text-muted">
            Clear
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">
        {shipName} will load, sail, and sell while you tend the isle. Hold to keep her in port.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {(route ?? []).map((stop, i) => (
          <div
            key={`${stop.at}-${i}`}
            className={`rounded-[var(--radius-md)] border border-border p-3 ${
              i === routeIndex && !held ? "bg-bg-elevated" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {i + 1}. {portName(stop.at)}
                {i === routeIndex ? " · here" : ""}
              </p>
              <button type="button" className="text-xs text-muted" onClick={() => removeRouteStop(i)}>
                Remove
              </button>
            </div>
            {stop.at === "europe" ? (
              <label className="mt-2 flex h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={stop.sell}
                  onChange={(e) => updateRouteStop(i, { sell: e.target.checked })}
                />
                Sell the hold
              </label>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1">
                {GOODS.slice(0, 12).map((g) => {
                  const load = stop.load[g.id] ?? 0;
                  const unload = stop.unload[g.id] ?? 0;
                  const label = unload ? `↓${unload >= 99 ? "all" : unload}` : load ? `↑${load >= 99 ? "all" : load}` : "";
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => cycleGood(stop, g.id, (patch) => updateRouteStop(i, patch))}
                      className={`h-8 rounded-full px-2 text-xs ${
                        load || unload ? "bg-primary text-primary-fg" : "border border-border text-muted"
                      }`}
                    >
                      {g.name}
                      {label ? ` ${label}` : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PORTS.filter((p) => p === "europe" || islands.find((i) => i.id === p)?.discovered).map((p) => (
          <Button key={p} size="sm" variant="ghost" onClick={() => addRouteStop(p)}>
            + {portName(p)}
          </Button>
        ))}
      </div>
      {route?.length ? (
        <Button className="mt-3" variant={held ? "primary" : "ghost"} disabled={atSea && !held} onClick={() => holdShip(!held)}>
          {held ? "Release route" : "Hold in port"}
        </Button>
      ) : null}
    </div>
  );
}

function cycleGood(
  stop: RouteStop,
  id: GoodId,
  apply: (patch: Partial<RouteStop>) => void,
) {
  const load = { ...stop.load };
  const unload = { ...stop.unload };
  const hadLoad = (load[id] ?? 0) > 0;
  const hadUnload = (unload[id] ?? 0) > 0;
  delete load[id];
  delete unload[id];
  if (!hadLoad && !hadUnload) load[id] = 99;
  else if (hadLoad) unload[id] = 99;
  apply({ load, unload });
}

function Mini({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 min-w-9 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-2 text-sm"
    >
      {children}
    </button>
  );
}
