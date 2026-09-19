# Farshore

Mobile colony sim. Paragon Pioneers production chains on a New World chart, with Colonization’s Europe trade, native diplomacy, liberty bells, and a war of independence.

Play it: [rivendale.github.io/farshore](https://rivendale.github.io/farshore/)

Touch-first, portrait. Land on Haven Isle, raise a hut, farm, and lumber camp, mill planks, build a wharf, and clear for Europe. Chart Kaneska, Iron Cape, and Cinder Cay. Pay the Crown, or don’t.

## Play

- Four nations (England, France, Spain, United Provinces)
- Tile placement, extract → refine chains, house upgrades
- Colonists with jobs: laborer, farmer, lumberjack, miner, artisan, soldier, statesman, petty criminal. School and on-the-job training.
- One to three caravels: load by hand, or set a looping route (Haven cane → distillery → Europe)
- Native gifts, trade, settlement, teachers, hidden veins, and raids if you chop too close
- A rival flag (Spain’s San Isidro, or Fort Orange if you fly Spain) that can take Iron Cape, dump ore in Europe, and row a company onto your beach. Sail there and raid their cape.
- Townhouse fork: Merchant Manor (Tory gold) or Patriot Hall (bells). The split is a real choice.
- Hosts land on the beach. A stockade cuts the host. Soldiers in a barracks walk onto the sand. Send companies, then stand and fight.
- Founding fathers, militia, punitive raid or revolution
- Two endings: free republic, or a Governor’s Palace charter
- Local save; idle catch-up while you’re away

## Stack

React 19, TanStack Start, Zustand, Tailwind v4. Game state lives in `src/game/`; the island / chart / hold / crown views are in `src/components/game/`.

```bash
npm install
npm run dev
```

`npm run build` and `npm run typecheck` are the gates. `npm run build:pages` emits a static GitHub Pages build.

Public repo. Art under `public/game/` is generated for this project.
