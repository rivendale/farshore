import { Button } from "@/components/ui/button";
import { NATIONS } from "@/game/data/catalog";
import { useGame } from "@/game/store";
import type { NationId } from "@/game/types";
import { asset } from "@/lib/asset";
import { Anchor, Compass, Flag, Sailboat } from "lucide-react";

const ICONS = {
  england: Flag,
  france: Compass,
  spain: Anchor,
  netherlands: Sailboat,
} as const;

export function TitleScreen() {
  const screen = useGame((s) => s.screen);
  const nationId = useGame((s) => s.nationId);
  const setScreen = useGame((s) => s.setScreen);
  const newGame = useGame((s) => s.newGame);
  const hasSave = Boolean(nationId);

  if (screen === "nation") {
    return (
      <div className="relative flex min-h-dvh flex-col bg-bg text-fg">
        <img
          src={asset("/game/scenes/title.jpg")}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/75 to-bg" />
        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))]">
          <p className="font-display text-sm tracking-[0.22em] text-accent uppercase">
            Choose a flag
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight tracking-tight">
            Whose charter?
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
            Four crowns, one New World. The rest is timber, rum, and nerve.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {(Object.keys(NATIONS) as NationId[]).map((id) => {
              const n = NATIONS[id];
              const Icon = ICONS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => newGame(id)}
                  className="rounded-[var(--radius-lg)] border border-border bg-surface/90 p-4 text-left shadow-[var(--shadow-panel)] transition-transform duration-150 active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-primary">
                      <Icon className="size-5" strokeWidth={1.6} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xl leading-tight">{n.name}</span>
                      <span className="mt-1 block text-sm italic text-accent">{n.motto}</span>
                      <span className="mt-2 block text-sm leading-relaxed text-muted">{n.blurb}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <Button variant="quiet" className="mt-6" onClick={() => setScreen("title")}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg text-fg">
      <img
        src={asset("/game/scenes/title.jpg")}
        alt="A colonial harbor at first light"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/35 to-bg" />
      <div className="relative z-10 mt-auto flex w-full flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
        <p className="font-display text-sm tracking-[0.28em] text-primary uppercase">
          A New World charter
        </p>
        <h1 className="mt-2 font-display text-[3.4rem] font-medium leading-[0.95] tracking-[-0.03em]">
          Farshore
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-fg/90">
          Found the colony. Feed the chains. Trade the seas. Win your freedom from the Crown.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={() => setScreen("nation")}>
            New charter
          </Button>
          {hasSave ? (
            <Button variant="ghost" size="lg" onClick={() => setScreen("play")}>
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
