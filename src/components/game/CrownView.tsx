import { Button } from "@/components/ui/button";
import { FATHERS, libertyPercent, totalPop } from "@/game/data/catalog";
import { factionPops } from "@/game/sim/war";
import { useGame } from "@/game/store";

export function CrownView() {
  const state = useGame();
  const pct = libertyPercent(state);
  const pop = totalPop(state);
  const factions = factionPops(state);
  const housed = Math.max(1, factions.tory + factions.patriot + factions.unaligned);
  const war = state.war && !state.war.resolved ? state.war : null;
  const landingIsle = war ? state.islands.find((i) => i.id === war.islandId) : null;
  const warTitle =
    war?.kind === "native"
      ? "War party"
      : war?.kind === "revolution"
        ? "War of independence"
        : "Punitive raid";

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-bg px-4 pb-36 pt-24">
      <p className="font-display text-sm tracking-[0.18em] text-accent uppercase">The Crown</p>
      <h2 className="mt-1 font-display text-3xl">
        {state.independent ? "A free republic" : "Sons of Liberty"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Bells against bodies. When the people stand at fifty, you may declare. Then you must meet
        the host on the sand.
      </p>

      <div className="mt-5 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <div className="flex items-end justify-between">
          <span className="font-display text-4xl tabular">{pct}%</span>
          <span className="text-sm text-muted">tariff {state.taxRate}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          Pop {pop} · militia {state.militia} · on the beach {state.settlers} · idle hands{" "}
          {state.colonists.filter((c) => c.homeId && !c.jobId).length}
        </p>
        {state.rival?.claimed ? (
          <p className="mt-2 text-sm text-muted">
            {state.rival.name} rings {Math.round(state.rival.liberty)} bells. The expedition will
            notice.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <p className="font-display text-lg">The house split</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          A townhouse forks. Manors keep Tory gold and dull the bells. Patriot halls ring louder
          and stiffen the militia — Tories on the roofs become a fifth column when the host lands.
        </p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-bad" style={{ width: `${(factions.tory / housed) * 100}%` }} />
          <div
            className="h-full bg-muted/40"
            style={{ width: `${(factions.unaligned / housed) * 100}%` }}
          />
          <div
            className="h-full bg-good"
            style={{ width: `${(factions.patriot / housed) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Tories {factions.tory} · unaligned {factions.unaligned} · Patriots {factions.patriot}
        </p>
      </div>

      {war ? (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-bad/50 bg-surface p-4">
          <p className="font-display text-lg">{warTitle}</p>
          {war.landed ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Host {war.enemy} on the strand at {landingIsle?.name ?? "the isle"}. Committed{" "}
                {war.committed}/6. Time is stopped; {war.grace} days if you press play.
              </p>
              <Button className="mt-3" onClick={() => state.openLanding()}>
                Meet them on the beach
              </Button>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Enemy host {war.enemy} · landfall in {war.eta} days. Train militia in the barracks.
              They will ground on the sand, not roll a coin in the dark.
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <Button
          onClick={() => {
            const msg = state.declare();
            if (msg) {
              useGame.setState((s) => ({
                log: [
                  { id: `n-${s.day}`, day: s.day, text: msg, tone: "warn" as const },
                  ...s.log,
                ].slice(0, 40),
              }));
            }
          }}
          disabled={state.independent || state.declared}
        >
          Declare independence
        </Button>
        <Button variant="quiet" onClick={() => state.refuseTax()} disabled={state.independent}>
          Refuse the next tariff
        </Button>
      </div>

      <h3 className="mt-8 font-display text-xl">Founding voices</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {FATHERS.map((f) => {
          const have = state.fathers.includes(f.id);
          return (
            <li
              key={f.id}
              className={`rounded-[var(--radius-md)] border border-border p-3 ${have ? "bg-surface" : "bg-transparent opacity-70"}`}
            >
              <p className="text-sm font-medium">
                {f.name}
                <span className="ml-2 text-xs text-muted">{have ? "seated" : `at ${f.at}%`}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{f.blurb}</p>
            </li>
          );
        })}
      </ul>
      <Button variant="quiet" className="mt-8" onClick={() => state.abandon()}>
        Resign this charter
      </Button>
    </div>
  );
}
