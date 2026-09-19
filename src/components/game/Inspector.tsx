import { Button } from "@/components/ui/button";
import { GoodIcon } from "@/components/game/GoodIcon";
import {
  ART,
  BUILDING_BY_ID,
  BUILDINGS,
  TRIBES,
  goodName,
  isUnlocked,
  stockHas,
  tileAllows,
} from "@/game/data/catalog";
import {
  JOB_PROFESSION,
  joblessOn,
  professionName,
  residentsOn,
  workersOn,
  yieldMult,
} from "@/game/data/people";
import { useGame } from "@/game/store";
import type { BuildingId, GoodId, Stock } from "@/game/types";
import { Hammer, Trash2, X } from "lucide-react";

export function Inspector() {
  const sheet = useGame((s) => s.sheet);
  const close = useGame((s) => s.closeSheet);
  if (sheet === "none") return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.6rem] z-20 px-3">
      <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="font-display text-lg leading-none">
            {sheet === "build" ? "Raise a work" : sheet === "native" ? "A people already here" : "Plot"}
          </p>
          <button
            type="button"
            onClick={close}
            className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[42vh] overflow-y-auto px-3 pb-3 pt-2">
          {sheet === "build" ? <BuildList /> : null}
          {sheet === "tile" ? <TileDetail /> : null}
          {sheet === "native" ? <NativeDetail /> : null}
        </div>
      </div>
    </div>
  );
}

function CostRow({ cost }: { cost: Stock }) {
  const entries = Object.entries(cost).filter(([, v]) => v) as [GoodId, number][];
  if (!entries.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1">
          <GoodIcon id={k} className="size-4" />
          {v} {goodName(k)}
        </span>
      ))}
    </span>
  );
}

function BuildList() {
  const state = useGame();
  const island = state.islands.find((i) => i.id === state.selectedIslandId)!;
  const tile = state.selectedTile;
  const place = useGame((s) => s.place);
  if (!tile) return <p className="px-1 text-sm text-muted">Tap a plot.</p>;
  const here = island.tiles.find((t) => t.x === tile.x && t.y === tile.y);
  if (!here || here.terrain === "water") {
    return <p className="px-1 text-sm text-muted">Open water. Build a wharf on the strand.</p>;
  }
  const list = BUILDINGS.filter((d) => !d.upgradeFrom).filter((d) => {
    if (!isUnlocked(d, state)) return false;
    return tileAllows(d, island, tile.x, tile.y);
  });
  if (!list.length) {
    return (
      <p className="px-1 text-sm text-muted">
        Nothing fits this ground yet. Farms want grass, camps want forest, mines want hills, wharves
        want the coast.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {list.map((d) => {
        const can = stockHas(island.storage, d.cost);
        return (
          <button
            key={d.id}
            type="button"
            disabled={!can || !island.owned}
            onClick={() => place(d.id)}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-2 text-left disabled:opacity-40"
          >
            <img src={ART[d.id]} alt="" className="size-12 object-contain" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{d.name}</span>
              <span className="block text-xs leading-snug text-muted">{d.blurb}</span>
              <CostRow cost={d.cost} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TileDetail() {
  const state = useGame();
  const island = state.islands.find((i) => i.id === state.selectedIslandId)!;
  const tile = state.selectedTile;
  const upgrade = useGame((s) => s.upgrade);
  const demolish = useGame((s) => s.demolish);
  const assignJob = useGame((s) => s.assignJob);
  const unassignJob = useGame((s) => s.unassignJob);
  if (!tile) return null;
  const b = island.buildings.find((bb) => bb.x === tile.x && bb.y === tile.y);
  if (!b) return <p className="text-sm text-muted">Empty plot.</p>;
  const def = BUILDING_BY_ID[b.type];
  const next = (
    { hut: "cottage", cottage: "townhouse", townhouse: "manor", manor: "patriot" } as Partial<
      Record<BuildingId, BuildingId>
    >
  )[b.type];
  const nextDef = next ? BUILDING_BY_ID[next] : null;
  const crew = workersOn(state, b.id);
  const residents = residentsOn(state, b.id);
  const want = JOB_PROFESSION[b.type];
  const pool = joblessOn(state, island.id);
  const housed = state.colonists.filter((c) => c.islandId === island.id && c.homeId).length;

  return (
    <div>
      <div className="flex items-center gap-3">
        <img src={ART[b.type]} alt="" className="size-16 object-contain" />
        <div>
          <p className="font-display text-xl leading-tight">{def.name}</p>
          <p className="text-sm text-muted">
            {def.workers > 0
              ? b.idle
                ? `Idle — ${crew.length}/${def.workers} hands`
                : `Working · ${crew.length}/${def.workers}`
              : def.category === "house"
                ? `${residents.length}/${def.popCap} souls`
                : "Standing"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{def.blurb}</p>
      {want ? (
        <p className="mt-1 text-xs text-faint">Wants a {professionName(want)} for the fat yield.</p>
      ) : null}
      {Object.entries(def.produces).some(([, v]) => v) ? (
        <p className="mt-2 text-sm">
          Makes{" "}
          {Object.entries(def.produces)
            .filter(([, v]) => v)
            .map(([k, v]) => `${v} ${goodName(k as GoodId)}`)
            .join(", ")}
          /day
        </p>
      ) : null}
      {Object.keys(def.consumes).length ? (
        <p className="mt-1 text-sm text-muted">
          Needs{" "}
          {Object.entries(def.consumes)
            .filter(([, v]) => v)
            .map(([k, v]) => `${v} ${goodName(k as GoodId)}`)
            .join(", ")}
        </p>
      ) : null}

      {def.category === "house" && residents.length ? (
        <ul className="mt-3 flex flex-col gap-1">
          {residents.map((c) => (
            <li key={c.id} className="flex h-10 items-center justify-between text-sm">
              <span>
                {c.name}
                <span className="text-muted"> · {professionName(c.profession)}</span>
              </span>
              <span className="text-xs text-faint">{c.jobId ? "at work" : "idle"}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {def.workers > 0 ? (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-faint">Hands</p>
          {crew.length ? (
            <ul className="mt-1 flex flex-col gap-1">
              {crew.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm">
                    {c.name}
                    <span className="text-muted">
                      {" "}
                      · {professionName(c.profession)}
                      {yieldMult(c.profession, b.type) >= 1.5 ? " · master" : ""}
                      {c.profession === "laborer" && c.trainDays > 0
                        ? ` · learning ${c.trainDays}/12`
                        : ""}
                    </span>
                  </span>
                  <Button size="sm" variant="quiet" onClick={() => unassignJob(c.id)}>
                    Pull off
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {housed ? "No one on this work." : "Raise a hut first. Hands need a roof."}
            </p>
          )}
          {crew.length < def.workers && pool.length ? (
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-xs text-faint">Idle on this isle</p>
              {pool.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => assignJob(c.id)}
                  className="flex h-10 items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-left text-sm"
                >
                  <span>
                    {c.name}
                    <span className="text-muted"> · {professionName(c.profession)}</span>
                  </span>
                  <span className="text-xs text-accent">Assign</span>
                </button>
              ))}
            </div>
          ) : null}
          {crew.length < def.workers && !pool.length && housed ? (
            <p className="mt-2 text-sm text-muted">
              Every housed soul is already at work. Pull someone off another plot.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        {nextDef && isUnlocked(nextDef, state) ? (
          <Button size="sm" onClick={() => upgrade()}>
            <Hammer className="size-4" />
            {nextDef.name}
          </Button>
        ) : null}
        <Button size="sm" variant="quiet" onClick={() => demolish()}>
          <Trash2 className="size-4" />
          Tear down
        </Button>
      </div>
      {nextDef ? <CostRow cost={nextDef.cost} /> : null}
    </div>
  );
}

function NativeDetail() {
  const state = useGame();
  const island = state.islands.find((i) => i.id === state.selectedIslandId)!;
  const native = island.native;
  const gift = useGame((s) => s.nativeGift);
  const trade = useGame((s) => s.nativeTrade);
  const settle = useGame((s) => s.nativeSettle);
  if (!native) return <p className="text-sm text-muted">No one keeps this plot.</p>;
  const tribe = TRIBES[native.tribeId];
  return (
    <div>
      <div className="flex items-center gap-3">
        <img src={ART.village} alt="" className="size-16 object-contain" />
        <div>
          <p className="font-display text-xl leading-tight">{native.name}</p>
          <p className="text-sm text-muted">Relations {native.relation}</p>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{tribe.blurb}</p>
      <p className="mt-2 text-sm">
        They seek {goodName(tribe.wants)} and offer {goodName(tribe.offers)}.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Button size="sm" variant="ghost" onClick={() => gift()}>
          Gift 25 gold
        </Button>
        <Button size="sm" variant="ghost" onClick={() => trade()}>
          Trade 2 {goodName(tribe.wants)}
        </Button>
        {!island.owned ? (
          <Button size="sm" onClick={() => settle()}>
            Ask settlement rights · 80g
          </Button>
        ) : null}
      </div>
    </div>
  );
}
