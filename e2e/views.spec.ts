import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Visual smoke for IslandView and WorldMap.
 * It talks to the static Pages build only. It does not read SKILL.md or AGENTS.md.
 *
 * Seed matches `mulberry32` in src/game/sim/rng.ts.
 * The page clock is frozen, the viewport is fixed, and the island canvas
 * must report `data-ground="ready"` before a shot is taken.
 */
const SEED = 1;
const CLOCK = new Date("2026-01-01T00:00:00.000Z");

function installSeed(seed: number) {
  let a = seed >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map(async (img) => {
        if (img.complete && img.naturalWidth > 0) return;
        await img.decode().catch(() => undefined);
      }),
    );
  });
}

async function boot(page: Page, shot: "island" | "world") {
  await page.clock.install({ time: CLOCK });
  await page.addInitScript(installSeed, SEED);
  await page.goto(`/?shot=${shot}&seed=${SEED}`, { waitUntil: "domcontentloaded" });
}

test("IslandView", async ({ page }) => {
  await boot(page, "island");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    if (canvas.dataset.ground !== "ready") return false;
    if (canvas.width < 64 || canvas.height < 64) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const x = Math.floor(canvas.width / 2);
    const y = Math.floor(canvas.height / 2);
    const sample = ctx.getImageData(x, y, 1, 1).data;
    return sample[3] > 0;
  });
  await settle(page);
  await expect(page).toHaveScreenshot("island-view.png");
});

test("WorldMap", async ({ page }) => {
  await boot(page, "world");
  const chart = page.getByAltText("Nautical chart of the archipelago");
  await expect(chart).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("world-map.png");
});
