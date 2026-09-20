import { Button } from "@/components/ui/button";
import { GoodIcon } from "@/components/game/GoodIcon";
import { CHAINS, CHAIN_BY_ID, MAX_ORDERS, chainHint } from "@/game/data/chains";
import { useGame } from "@/game/store";
import { X } from "lucide-react";

export function FortuneBar() {
  const sheet = useGame((s) => s.sheet);
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  if (!island.owned) return null;
  if (sheet === "orders") return <FortuneSheet />;
  if (sheet !== "none") return null;
  return <FortuneStrip />;
}

function FortuneStrip() {
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const openOrders = useGame((s) => s.openOrders);
  const orders = island.orders ?? [];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.6rem] z-20 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-bg/85 px-3 py-2 backdrop-blur-sm">
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">Grain</span>
        {orders.map((id) => {
          const c = CHAIN_BY_ID[id];
          return (
            <span
              key={id}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs text-primary-fg"
            >
              <GoodIcon id={c.exports[0]} className="size-3.5" />
              {c.name}
            </span>
          );
        })}
        <button
          type="button"
          onClick={openOrders}
          className="ml-auto shrink-0 h-9 rounded-full px-3 text-sm text-accent"
        >
          {orders.length ? "Fortunes" : "Name a fortune"}
        </button>
      </div>
    </div>
  );
}

function FortuneSheet() {
  const island = useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
  const close = useGame((s) => s.closeSheet);
  const toggleOrder = useGame((s) => s.toggleOrder);
  const setShipOrder = useGame((s) => s.setShipOrder);
  const orders = island.orders ?? [];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.6rem] z-20 px-3">
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="font-display text-lg leading-none">Your fortunes</p>
          <button
            type="button"
            onClick={close}
            className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="px-4 pt-2 text-sm leading-relaxed text-muted">
          Name up to {MAX_ORDERS}. Grain feeds itself. You pick the rest — the island staffs it.
        </p>
        <div className="max-h-[42vh] overflow-y-auto px-3 pb-3 pt-2">
          <div className="flex flex-col gap-2">
            {CHAINS.map((c) => {
              const on = orders.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`rounded-[var(--radius-md)] border p-3 ${
                    on ? "border-primary bg-bg-elevated" : "border-border bg-bg-elevated"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const msg = toggleOrder(c.id);
                      if (msg) {
                        useGame.setState((s) => ({
                          log: [
                            { id: `n-${s.day}`, day: s.day, text: msg, tone: "warn" as const },
                            ...s.log,
                          ].slice(0, 40),
                        }));
                      }
                    }}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span className="mt-0.5 flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2">
                      <GoodIcon id={c.exports[0]} className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-display text-lg leading-tight">{c.name}</span>
                        {on ? (
                          <span className="text-xs uppercase tracking-wider text-accent">Yours</span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-muted">{c.blurb}</span>
                      <span className="mt-1 block text-xs text-faint">{chainHint(island, c.id)}</span>
                    </span>
                  </button>
                  {on ? (
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        const msg = setShipOrder(c.id, island.id);
                        if (msg) {
                          useGame.setState((s) => ({
                            log: [
                              { id: `n-${s.day}`, day: s.day, text: msg, tone: "warn" as const },
                              ...s.log,
                            ].slice(0, 40),
                          }));
                        } else {
                          useGame.getState().setView("hold");
                        }
                      }}
                    >
                      Run {c.name.toLowerCase()} to Europe
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


