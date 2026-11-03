import { expect, test } from "./fixtures";
import config from "../playwright.config";

/**
 * Nick's Playwright rule (2026-11-02): until Playwright bundles Chromium
 * >= 156.0.8078.73, tests may only hit local hosts and must use chromiumSandbox.
 */
test.describe("Playwright local-only rule", () => {
  test("chromiumSandbox is enabled", () => {
    expect(config.use?.chromiumSandbox).toBe(true);
  });

  test("blocks requests to non-local hosts", async ({ page }) => {
    // Local base must load so the page context is real.
    await page.goto("/", { waitUntil: "domcontentloaded" });

    let externalReached = false;
    page.on("response", (response) => {
      try {
        const host = new URL(response.url()).hostname;
        if (host === "example.com") externalReached = true;
      } catch {
        // ignore
      }
    });

    const result = await page.evaluate(async () => {
      try {
        const res = await fetch("https://example.com/", { mode: "no-cors" });
        return { ok: true, type: res.type };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    });

    expect(externalReached, "an external response should never arrive").toBe(false);
    expect(result.ok, "fetch to example.com must be blocked").toBe(false);
  });
});
