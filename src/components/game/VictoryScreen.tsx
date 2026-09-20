import { Button } from "@/components/ui/button";
import { libertyPercent, totalPop } from "@/game/data/catalog";
import { useGame } from "@/game/store";
import { asset } from "@/lib/asset";

export function VictoryScreen() {
  const ending = useGame((s) => s.ending);
  const day = useGame((s) => s.day);
  const abandon = useGame((s) => s.abandon);
  const setScreen = useGame((s) => s.setScreen);
  const state = useGame();
  const republic = ending === "republic";

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg text-fg">
      <img
        src={asset("/game/scenes/title.jpg")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/30 to-bg" />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-6 pb-10 pt-16">
        <p className="font-display text-sm tracking-[0.22em] text-accent uppercase">
          {republic ? "Your independence" : "Your palace"}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          {republic ? "These laws are yours now." : "You built a capital they cannot ignore."}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          {republic
            ? "You held the beach. The King's army broke. No one writes your books but you."
            : "You stayed loyal, raised the palace, and the old country has to say your name."}
        </p>
        <p className="mt-4 text-sm text-muted">
          Day {day} · {totalPop(state)} people · independence {libertyPercent(state)}%
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={() => setScreen("play")}>
            Keep playing
          </Button>
          <Button size="lg" variant="ghost" onClick={abandon}>
            New Game
          </Button>
        </div>
      </div>
    </div>
  );
}
