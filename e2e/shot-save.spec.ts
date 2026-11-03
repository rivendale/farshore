import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * `?shot=` boots a still frame for the visual smoke. That frame replaces the
 * in-memory game, and hiding the tab must not write it over a player's save.
 */
const SAVE_KEY = "farshore.save.v1";
const PLAYER_SAVE = JSON.stringify({
  saveMarker: "existing-player-save",
  version: 6,
  nationId: "spain",
  seed: 424242,
  day: 77,
  screen: "play",
});

async function hideTab(page: Page) {
  await page.evaluate(() => {
    const hidden = () => "hidden";
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get: hidden,
    });
    Object.defineProperty(Document.prototype, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
  });
}

test("hiding a normal visit still writes the save", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Farshore" })).toBeVisible();
  await hideTab(page);
  const stored = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(stored, "a normal visit still persists when the tab hides").toBeTruthy();
  const parsed = JSON.parse(stored ?? "");
  expect(parsed.screen).toBe("title");
  expect(parsed.saveMarker).toBeUndefined();
});

test("a seeded existing save survives a shot-mode visit", async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: PLAYER_SAVE },
  );

  await page.goto("/?shot=world&seed=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByAltText("Nautical chart of the archipelago")).toBeVisible();
  await hideTab(page);

  const stored = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(stored, "shot mode must not replace the player's save").toBe(PLAYER_SAVE);
});
