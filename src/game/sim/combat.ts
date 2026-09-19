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

export function royalHost(day: number, colonies: number, kind: "raid" | "revolution") {
  if (kind === "raid") return 8 + Math.floor(day / 40) + colonies * 2;
  return 14 + Math.floor(day / 18) + colonies * 5;
}
