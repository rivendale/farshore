import { Button } from "@/components/ui/button";
import { FATHERS, libertyPercent, totalPop } from "@/game/data/catalog";
import { factionPops, warLabel } from "@/game/sim/war";
import { useGame } from "@/game/store";

export function CrownView() {
  const state = useGame();
  const pct = libertyPercent(state);
  const pop = totalPop(state);
  const factions = factionPops(state);
  const housed = Math.max(1, factions.tory + factions.patriot + factions.unaligned);
  const war = state.war && !state.war.resolved ? state.war : null;
  const landingIsle = war ? state.islands.find((i) => i.id === war.islandId) : null;
  const warTitle = war ? warLabel(war.kind, war.landed) : "";

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-bg px-4 pb-36 pt-24">
      <p className="font-display text-sm tracking-[0.18em] text-accent uppercase">The King</p>
      <h2 className="mt-1 font-display text-3xl">
        {state.independent ? "Your republic" : "Your independence"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Get your people to 50%, then declare — and meet the King on the beach. Or stay loyal and
        raise a palace with your name on it.
      </p>

      <div className="mt-5 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <div className="flex items-end justify-between">
          <span className="font-display text-4xl tabular">{pct}%</span>
          <span className="text-sm text-muted">tax {state.taxRate}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          Pop {pop} · militia {state.militia} · waiting for homes {state.settlers} · idle{" "}
          {state.colonists.filter((c) => c.homeId && !c.jobId).length}
        </p>
        {state.rival?.claimed ? (
          <p className="mt-2 text-sm text-muted">
            {state.rival.name} is at {Math.round(state.rival.liberty)}% independence. The King will
            notice.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <p className="font-display text-lg">Loyalists and patriots</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          A townhouse can go two ways. Manors stay loyal to the King and pay more tax. Patriot halls
          raise independence — but loyalists on the roofs turn against you when the army lands.
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
          Loyalists {factions.tory} · unaligned {factions.unaligned} · Patriots {factions.patriot}
        </p>
      </div>

      {war ? (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-bad/50 bg-surface p-4">
          <p className="font-display text-lg">{warTitle}</p>
          {war.landed ? (
            <>
              <p className="mt-1 text-sm text-muted">
                {war.kind === "campaign" ? "Your companies" : "Enemy"} {war.enemy} on the beach at{" "}
                {landingIsle?.name ?? "the island"}. Sent {war.committed}/6
                {war.marched ? ` · ${war.marched} marched` : ""}. Time is stopped; {war.grace} days if
                you press play.
              </p>
              <Button className="mt-3" onClick={() => state.openLanding()}>
                {war.kind === "campaign" ? "Meet them on their beach" : "Meet them on the beach"}
              </Button>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Enemy {war.enemy} · lands in {war.eta} days. A stockade on the beach cuts the attack.
              Soldiers in a barracks walk onto the sand.
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
          Refuse the next tax
        </Button>
      </div>

      <h3 className="mt-8 font-display text-xl">Founders</h3>
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
        Abandon your colony
      </Button>
    </div>
  );
}
