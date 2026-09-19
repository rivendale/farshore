export function resolveBattle(playerPower: number, enemyPower: number, seed: number) {
  const jitter = ((seed % 17) - 8) / 40;
  const p = Math.max(1, playerPower * (1 + jitter));
  const e = Math.max(1, enemyPower);
  const ratio = p / (p + e);
  const won = ratio >= 0.48;
  const playerLosses = Math.max(1, Math.round((1 - ratio) * 6));
  const enemyLosses = Math.max(1, Math.round(ratio * enemyPower * 0.4));
  return { won, playerLosses, enemyLosses, ratio };
}

export function royalHost(day: number, colonies: number, kind: "raid" | "revolution", rivalLiberty = 0) {
  const rival = Math.floor(rivalLiberty / 12);
  if (kind === "raid") return 8 + Math.floor(day / 40) + colonies * 2 + Math.floor(rival / 2);
  return 14 + Math.floor(day / 18) + colonies * 5 + rival;
}

export function rivalHost(stage: number, liberty: number) {
  return 6 + Math.max(0, stage) * 2 + Math.floor(Math.max(0, liberty) / 10);
}
