import { expect, test, type Page } from "@playwright/test";

/** The ground canvas starts blank. Wait until a paint has landed. */
async function groundPainted(page: Page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement) || canvas.width < 10) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const w = Math.min(canvas.width, 64);
    const h = Math.min(canvas.height, 64);
    const { data } = ctx.getImageData(0, 0, w, h);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  });
}

async function fontsReady(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          await document.fonts.ready;
          return (
            document.fonts.check('16px "Source Sans 3"') && document.fonts.check("16px Fraunces")
          );
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function imagesReady(page: Page) {
  await page.waitForFunction(() =>
    [...document.images].every((img) => img.complete && img.naturalWidth > 0),
  );
}

/**
 * Reach the screens the way a player does. No seed and no frozen clock yet:
 * the first run is expected to fail (missing baselines, or a moving picture).
 */
async function startEngland(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: /England/ }).click();
  await expect(page.getByText("Haven Isle").first()).toBeVisible();
}

test("IslandView", async ({ page }) => {
  await startEngland(page);
  await groundPainted(page);
  await fontsReady(page);
  await imagesReady(page);
  await expect(page).toHaveScreenshot("island-view.png");
});

test("WorldMap", async ({ page }) => {
  await startEngland(page);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("img", { name: "Nautical chart of the archipelago" })).toBeVisible();
  await fontsReady(page);
  await imagesReady(page);
  await expect(page).toHaveScreenshot("world-map.png");
});
