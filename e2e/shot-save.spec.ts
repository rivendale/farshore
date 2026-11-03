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

async function plantSave(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: PLAYER_SAVE },
  );
}

async function readSave(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
}

/** HUD reads "Day N · Island". Shot mode boots at day 1. */
async function dayNumber(page: Page) {
  const text = await page.locator("header").innerText();
  const match = text.match(/Day (\d+)/);
  return match ? Number(match[1]) : 0;
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
  await plantSave(page);

  await page.goto("/?shot=world&seed=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByAltText("Nautical chart of the archipelago")).toBeVisible();
  await hideTab(page);

  const stored = await readSave(page);
  expect(stored, "shot mode must not replace the player's save").toBe(PLAYER_SAVE);
});

test("a game tick in shot mode leaves a pre-planted save untouched", async ({ page }) => {
  await plantSave(page);

  await page.goto("/?shot=world&seed=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByAltText("Nautical chart of the archipelago")).toBeVisible();
  expect(await dayNumber(page)).toBe(1);

  // Faster is 2x. A day is 1.15s, so the clock moves, and each day arms
  // scheduleSave (400ms). Pausing freezes that timer so the write lands
  // before we read, when persistence is still on.
  await page.getByRole("button", { name: "Faster", exact: true }).click();
  await expect.poll(() => dayNumber(page), { timeout: 10_000 }).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(1_000);

  const stored = await readSave(page);
  expect(stored, "a shot-mode tick must not replace the player's save").toBe(PLAYER_SAVE);
});

test("abandoning the colony in shot mode does not delete the save", async ({ page }) => {
  await plantSave(page);

  await page.goto("/?shot=world&seed=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByAltText("Nautical chart of the archipelago")).toBeVisible();

  await page.getByRole("button", { name: "King" }).click();
  await expect(page.getByRole("heading", { name: "Your independence" })).toBeVisible();
  await page.getByRole("button", { name: "Abandon your colony" }).click();
  await expect(page.getByRole("heading", { name: "Farshore" })).toBeVisible();

  const stored = await readSave(page);
  expect(stored, "shot mode must not delete the player's save").toBe(PLAYER_SAVE);
});
