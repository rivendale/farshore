# Farshore

Mobile colony sim. Paragon Pioneers production chains on a New World chart, with Colonization’s Europe trade, native diplomacy, liberty bells, and a war of independence.

Touch-first, portrait. Land on Haven Isle, raise a hut, farm, and lumber camp, mill planks, build a wharf, and clear for Europe. Chart Kaneska, Iron Cape, and Cinder Cay. Pay the Crown, or don’t.

## Play

- Four nations (England, France, Spain, United Provinces)
- Tile placement, extract → refine chains, house upgrades
- One caravel: load, sail, sell under the tariff
- Native gifts, trade, and settlement rights
- Founding fathers, militia, raid or revolution
- Two endings: free republic, or a Governor’s Palace charter
- Local save; idle catch-up while you’re away

## Stack

React 19, TanStack Start, Zustand, Tailwind v4. Game state lives in `src/game/`; the island / chart / hold / crown views are in `src/components/game/`.

```bash
npm install
npm run dev
```

`npm run build` and `npm run typecheck` are the gates.

Private repo. Art under `public/game/` is generated for this project.
