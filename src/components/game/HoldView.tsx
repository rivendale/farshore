import { Button } from "@/components/ui/button";
import { GoodIcon } from "@/components/game/GoodIcon";
import { GOODS, ISLAND_META, totalStock } from "@/game/data/catalog";
import { CHAINS, CHAIN_BY_ID } from "@/game/data/chains";
import { PROFESSIONS, professionName } from "@/game/data/people";
import { useGame } from "@/game/store";
import type { ChainId, IslandId } from "@/game/types";

function portName(at: IslandId | "europe" | "sea") {
  if (at === "europe") return "Europe";
  if (at === "sea") return "the sea";
  return ISLAND_META[at].name;
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
  const sailEurope = useGame((s) => s.sailEurope);
  const sailHome = useGame((s) => s.sailHome);
  const recruitProfession = useGame((s) => s.recruitProfession);
  const buyMuskets = useGame((s) => s.buyMuskets);
  const buy = useGame((s) => s.buy);
  const buyShip = useGame((s) => s.buyShip);
  const holdShip = useGame((s) => s.holdShip);
  const setShipOrder = useGame((s) => s.setShipOrder);
  const clearShipOrder = useGame((s) => s.clearShipOrder);
  const sell = useGame((s) => s.sell);

  const ship = ships.find((s) => s.id === selectedId) ?? ships[0];
  if (!ship) return null;
  const inEurope = ship.location === "europe";
  const atSea = ship.mission !== "idle";
  const order = ship.order;
  const orderDef = order ? CHAIN_BY_ID[order.chain] : null;

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
            : `Docked at ${portName(ship.location)}`}
        {` · ${totalStock(ship.cargo)}/${ship.cargoCap} cargo`}
      </p>

      {orderDef ? (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="font-display text-lg">Your order</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {ship.held
              ? `${ship.name} holds in port. The ${orderDef.name.toLowerCase()} loop waits.`
              : `${ship.name} runs ${orderDef.name.toLowerCase()} from ${portName(order!.home)} to Europe. You named it; she works the sea.`}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant={ship.held ? "primary" : "ghost"} disabled={atSea && !ship.held} onClick={() => holdShip(!ship.held)}>
              {ship.held ? "Release her" : "Hold in port"}
            </Button>
            <Button variant="quiet" onClick={() => clearShipOrder()}>
              Cancel the loop
            </Button>
          </div>
        </div>
      ) : (
        <OrderPicker
          atSea={atSea}
          inEurope={inEurope}
          islandId={island.id}
          islandName={island.name}
          orders={island.orders ?? []}
          setShipOrder={setShipOrder}
          sailEurope={sailEurope}
        />
      )}

      <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-3">
        <p className="text-xs uppercase tracking-wider text-faint">Hold</p>
        <div className="mt-2 flex flex-col gap-2">
          {GOODS.map((g) => {
            const n = ship.cargo[g.id] ?? 0;
            if (!n) return null;
            return (
              <div key={g.id} className="flex items-center gap-2">
                <GoodIcon id={g.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{g.name}</p>
                  <p className="text-xs text-muted">
                    {n} in the hold
                    {inEurope ? ` · ${prices[g.id]}g` : ""}
                  </p>
                </div>
                {inEurope ? (
                  <Mini onClick={() => sell(g.id, n)}>Sell</Mini>
                ) : null}
              </div>
            );
          })}
          {!GOODS.some((g) => ship.cargo[g.id]) ? (
            <p className="text-sm text-muted">Empty hold. Name a fortune and she fills herself.</p>
          ) : null}
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
      ) : null}

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

function OrderPicker({
  atSea,
  inEurope,
  islandId,
  islandName,
  orders,
  setShipOrder,
  sailEurope,
}: {
  atSea: boolean;
  inEurope: boolean;
  islandId: IslandId;
  islandName: string;
  orders: ChainId[];
  setShipOrder: (chain: ChainId, home?: IslandId) => string | null;
  sailEurope: () => string | null;
}) {
  const islands = useGame((s) => s.islands);
  const owned = islands.filter((i) => i.owned);
  const chains = orders.length ? orders : CHAINS.map((c) => c.id);

  return (
    <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <p className="font-display text-lg">Give her an order</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Pick a fortune. She loads it, sells it in Europe, and comes back. You tend the isle.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {chains.map((id) => {
          const c = CHAIN_BY_ID[id];
          const home = orders.includes(id)
            ? islandId
            : (owned.find((i) => i.orders.includes(id))?.id ?? islandId);
          return (
            <Button
              key={id}
              disabled={atSea || inEurope}
              onClick={() => {
                const msg = setShipOrder(id, home);
                if (msg) {
                  useGame.setState((s) => ({
                    log: [
                      { id: `n-${s.day}`, day: s.day, text: msg, tone: "warn" as const },
                      ...s.log,
                    ].slice(0, 40),
                  }));
                }
              }}
            >
              Run {c.name.toLowerCase()}
              {home !== islandId ? ` from ${ISLAND_META[home].name}` : ` from ${islandName}`}
            </Button>
          );
        })}
      </div>
      {!inEurope ? (
        <Button className="mt-3" variant="ghost" disabled={atSea} onClick={() => sailEurope()}>
          Sail to Europe once · 8 days
        </Button>
      ) : null}
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
