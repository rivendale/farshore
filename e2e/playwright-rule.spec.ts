import { expect, test as pwTest } from "@playwright/test";
import { expect as fixtureExpect, test } from "./fixtures";
import fs from "node:fs";

/**
 * Nick's Playwright rule (2026-11-02): until Playwright bundles Chromium
 * >= 156.0.8078.73, tests may only hit local hosts and must use chromiumSandbox.
 *
 * The sandbox check reads the launched browser process command line. Checking
 * the config object alone is not enough: Playwright ignores chromiumSandbox
 * when it sits directly under use instead of use.launchOptions.
 */
function playwrightBrowserCommandLines(): string[] {
  const lines: string[] = [];
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const raw = fs.readFileSync(`/proc/${entry}/cmdline`, "utf8");
      if (!raw.includes("playwright") && !raw.includes("headless_shell")) {
        // Playwright profiles use playwright_* user-data-dir; also match chrome/chromium.
        if (!/chrome|chromium|headless_shell/i.test(raw)) continue;
        if (!raw.includes("user-data-dir")) continue;
      }
      const line = raw.replace(/\0/g, " ").trim();
      if (/chrome|chromium|headless_shell/i.test(line) && line.includes("user-data-dir")) {
        lines.push(line);
      }
    } catch {
      // process may have exited
    }
  }
  return lines;
}

pwTest.describe("Playwright sandbox launch", () => {
  pwTest("launched browser command line has no --no-sandbox", async ({ page }) => {
    await page.goto("about:blank");
    const commandLines = playwrightBrowserCommandLines();
    expect(commandLines.length, "expected a live Playwright browser process").toBeGreaterThan(0);
    for (const commandLine of commandLines) {
      expect(
        commandLine,
        "Playwright must launch Chrome without --no-sandbox",
      ).not.toMatch(/(?:^|\s)--no-sandbox(?:\s|$)/);
    }
  });
});

test.describe("Playwright local-only rule", () => {
  test("blocks requests to non-local hosts", async ({ page }) => {
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
    fixtureExpect(result.ok, "fetch to example.com must be blocked").toBe(false);
  });
});
