import { CrownView } from "@/components/game/CrownView";
import { HUD } from "@/components/game/HUD";
import { HoldView } from "@/components/game/HoldView";
import { Inspector } from "@/components/game/Inspector";
import { IslandView } from "@/components/game/IslandView";
import { TitleScreen } from "@/components/game/TitleScreen";
import { Tutorial } from "@/components/game/Tutorial";
import { VictoryScreen } from "@/components/game/VictoryScreen";
import { WorldMap } from "@/components/game/WorldMap";
import { DAY_SECONDS } from "@/game/data/catalog";
import { writeSave } from "@/game/persist";
import { useGame } from "@/game/store";
import { useEffect } from "react";

export function FarshoreApp() {
  const screen = useGame((s) => s.screen);
  const view = useGame((s) => s.view);
  const hydrate = useGame((s) => s.hydrate);
  const tick = useGame((s) => s.tickDay);
  const catchUp = useGame((s) => s.catchUp);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { speed, screen: sc } = useGame.getState();
      if (sc === "play" && speed > 0) {
        acc += dt * speed;
        while (acc >= DAY_SECONDS) {
          acc -= DAY_SECONDS;
          tick();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") writeSave(useGame.getState());
      else catchUp();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [catchUp]);

  if (screen === "title" || screen === "nation") return <TitleScreen />;
  if (screen === "victory") return <VictoryScreen />;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 bottom-[3.6rem] overflow-hidden">
        {view === "island" ? <IslandView /> : null}
        {view === "world" ? <WorldMap /> : null}
        {view === "hold" ? <HoldView /> : null}
        {view === "crown" ? <CrownView /> : null}
      </div>
      <HUD />
      {view === "island" ? (
        <>
          <Tutorial />
          <Inspector />
        </>
      ) : null}
    </div>
  );
}
