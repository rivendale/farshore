import { expect, test, type Page } from "@playwright/test";

async function fontsReady(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          await Promise.all([
            document.fonts.load("500 16px Fraunces"),
            document.fonts.load("600 16px Fraunces"),
            document.fonts.load('400 16px "Source Sans 3"'),
            document.fonts.load('600 16px "Source Sans 3"'),
          ]);
          await document.fonts.ready;
          return (
            document.fonts.check("500 16px Fraunces") &&
            document.fonts.check('400 16px "Source Sans 3"')
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
}

async function imagesReady(page: Page) {
  await page.waitForFunction(() =>
    [...document.images].every((img) => img.complete && img.naturalWidth > 0),
  );
}

/** Ground paint sets the canvas bitmap size only after the textures have loaded. */
async function groundPainted(page: Page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas instanceof HTMLCanvasElement && canvas.width > 10 && canvas.height > 10;
  });
}

async function openShot(page: Page, shot: "island" | "world") {
  await page.goto(`/?shot=${shot}&seed=1`);
  await expect(page.getByText("Day 1 · Haven Isle")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveClass(/bg-primary/);
  await fontsReady(page);
  await imagesReady(page);
}

test("normal play is unchanged", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
  await expect(page.getByText("Day 1")).toHaveCount(0);
});

test("IslandView", async ({ page }) => {
  await openShot(page, "island");
  await groundPainted(page);
  await expect(page.getByText("Day 1 · Haven Isle")).toBeVisible();
  await expect(page).toHaveScreenshot("island-view.png");
});

test("WorldMap", async ({ page }) => {
  await openShot(page, "world");
  await expect(page.getByRole("img", { name: "Nautical chart of the archipelago" })).toBeVisible();
  await expect(page.getByText("Europe")).toBeVisible();
  await expect(page.getByText("Day 1 · Haven Isle")).toBeVisible();
  await expect(page).toHaveScreenshot("world-map.png");
});
