import { createGame } from "@/game/sim/create";
import { mulberry32, pinRandom } from "@/game/sim/rng";
import type { GameState, PlayView } from "@/game/types";

/** Fixed clock for `?shot=`. Normal play never reads this. */
export const SHOT_NOW = Date.parse("2026-01-01T00:00:00.000Z");

export type ShotBoot = {
  view: Extract<PlayView, "island" | "world">;
  seed: number;
};

/**
 * `?shot=island&seed=1` or `?shot=world&seed=1`.
 * Missing or any other `shot` value means normal play.
 */
export function readShot(search: string): ShotBoot | null {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const shot = q.get("shot");
  if (shot !== "island" && shot !== "world") return null;
  const raw = Number(q.get("seed") ?? "1");
  const seed = Number.isFinite(raw) ? raw >>> 0 : 1;
  return { view: shot, seed };
}

/**
 * Paused England game. Seeded map, seeded ids, clock stuck at SHOT_NOW,
 * speed 0 so the day loop and the island animations stay still.
 * Does not read or write the save.
 */
export function bootShot(shot: ShotBoot): GameState {
  pinRandom(mulberry32(shot.seed));
  Date.now = () => SHOT_NOW;
  const game = createGame("england", shot.seed, SHOT_NOW);
  game.speed = 0;
  game.view = shot.view;
  game.sheet = "none";
  game.selectedTile = null;
  game.tutorialDone = true;
  return game;
}
