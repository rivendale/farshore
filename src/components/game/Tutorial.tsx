import { Button } from "@/components/ui/button";
import { useGame } from "@/game/store";

const STEPS = [
  "Your people need a roof. Tap grass and raise a hut — this shore is yours now.",
  "They'll starve on timber. Put a farm on the grass.",
  "You need wood for everything. Put a lumber camp on the forest.",
  "Sawmill next. Planks unlock your dock and the rest of the chain.",
  "Raise a dock on the coast. That's how you reach Europe.",
  "Name a fortune — timber, cloth, rum. The island staffs it. Then tell your ship to run it to Europe.",
];

export function Tutorial() {
  const done = useGame((s) => s.tutorialDone);
  const step = useGame((s) => s.tutorialStep);
  const skip = useGame((s) => s.skipTutorial);
  if (done || step >= STEPS.length) return null;
  return (
    // On a sideways phone the Build panel takes the right side (Inspector), so the
    // tutorial card keeps to the space left of it rather than running underneath.
    <div className="pointer-events-none absolute inset-x-0 top-[5.6rem] z-20 px-3 short-landscape:pr-[calc(var(--side-panel-w)+var(--side-panel-right)+0.5rem)] short-landscape:pl-[max(0.75rem,env(safe-area-inset-left))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-[var(--radius-md)] border border-border bg-bg/85 p-3 backdrop-blur-sm">
        <p className="flex-1 text-sm leading-relaxed text-fg">{STEPS[step]}</p>
        <Button size="sm" variant="quiet" onClick={skip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
