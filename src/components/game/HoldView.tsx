import { Button } from "@/components/ui/button";
import { GOODS, goodName, totalStock } from "@/game/data/catalog";
import { useGame } from "@/game/store";
import type { GoodId } from "@/game/types";
import { GoodIcon } from "@/components/game/GoodIcon";

export function HoldView() {
  const ships = useGame((s) => s.ships);
  const gold = useGame((s) => s.gold);
  const tax = useGame((s) => s.taxRate);
  const prices = useGame((s) => s.prices);
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const loadShip = useGame((s) => s.loadShip);
  const unloadShip = useGame((s) => s.unloadShip);
  const sailEurope = useGame((s) => s.sailEurope);
  const sailHome = useGame((s) => s.sailHome);
  const sell = useGame((s) => s.sell);
  const buy = useGame((s) => s.buy);
  const recruit = useGame((s) => s.recruit);
  const buyMuskets = useGame((s) => s.buyMuskets);
  const ship = ships[0];
  const inEurope = ship.location === "europe";
  const atSea = ship.mission !== "idle";
  const docked = ship.location === island.id && ship.mission === "idle";

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-bg px-4 pb-28 pt-24">
      <p className="font-display text-sm tracking-[0.18em] text-accent uppercase">The hold</p>
      <h2 className="mt-1 font-display text-3xl">{ship.name}</h2>
      <p className="mt-2 text-sm text-muted">
        {atSea
          ? `At sea · ${ship.eta} days out`
          : inEurope
            ? "Lying in Europe"
            : `Docked at ${island.name}`}
        {` · ${totalStock(ship.cargo)}/${ship.cargoCap} cargo`}
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
            Treasury {gold}g · Crown tariff {tax}%
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button onClick={() => recruit()}>Recruit colonist · 70g</Button>
            <Button variant="ghost" onClick={() => buyMuskets()}>
              Buy musket · 28g
            </Button>
            <Button variant="ghost" onClick={() => buy("tools", 1)}>
              Buy tools · {Math.round(prices.tools * 1.35)}g
            </Button>
            <Button variant="ghost" onClick={() => buy("planks", 2)}>
              Buy planks
            </Button>
            <Button className="mt-1" onClick={() => sailHome()}>
              Sail for {island.name}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <Button disabled={atSea} onClick={() => sailEurope()}>
            Clear for Europe · 8 days
          </Button>
          <p className="text-sm text-muted">
            Load finished goods from the isle, sell them in Europe, and bring colonists home. The Crown
            takes a cut until you are free.
          </p>
        </div>
      )}
    </div>
  );
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
