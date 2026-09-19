import { Button } from "@/components/ui/button";
import { libertyPercent, totalPop } from "@/game/data/catalog";
import { useGame } from "@/game/store";

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
        src="/game/scenes/title.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/30 to-bg" />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-6 pb-10 pt-16">
        <p className="font-display text-sm tracking-[0.22em] text-accent uppercase">
          {republic ? "Independence" : "Charter eternal"}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          {republic ? "The Crown is a rumor." : "A palace on Farshore."}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          {republic
            ? "Militia held the strand. The expedition broke. The colony writes its own laws now."
            : "You stayed within the letter of the charter and built a capital the old country cannot ignore."}
        </p>
        <p className="mt-4 text-sm text-muted">
          Day {day} · {totalPop(state)} souls · liberty {libertyPercent(state)}%
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={() => setScreen("play")}>
            Keep playing
          </Button>
          <Button size="lg" variant="ghost" onClick={abandon}>
            New charter
          </Button>
        </div>
      </div>
    </div>
  );
}
