import type { GoodId } from "@/game/types";
import { asset } from "@/lib/asset";

export function GoodIcon({ id, className = "size-8" }: { id: GoodId | "gold"; className?: string }) {
  return (
    <img
      src={asset(`/game/icons/${id}.png`)}
      alt=""
      draggable={false}
      className={`${className} shrink-0 object-contain`}
    />
  );
}