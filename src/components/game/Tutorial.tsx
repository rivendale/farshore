import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";

const STEPS = [
  "Tap a grass plot and raise a Pioneer Hut. Your landing party needs a roof.",
  "Place a Farm on grassland. Hungry pioneers will not last.",
  "Put a Lumber Camp on forest. Axes first, palaces later.",
  "Build a Sawmill. Planks unlock the wharf and every civic work.",
  "Raise a Wharf on the coast, load goods, and clear for Europe.",
];

export function Tutorial() {
  const done = useGame((s) => s.tutorialDone);
  const step = useGame((s) => s.tutorialStep);
  const skip = useGame((s) => s.skipTutorial);
  if (done || step >= STEPS.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[5.6rem] z-20 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-[var(--radius-md)] border border-border bg-bg/85 p-3 backdrop-blur-sm">
        <p className="flex-1 text-sm leading-relaxed text-fg">{STEPS[step]}</p>
        <Button size="sm" variant="quiet" onClick={skip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
