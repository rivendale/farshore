import { expect, test as pwTest } from "@playwright/test";
import fs from "node:fs";
import { browserCommandLine, isDescendantPid } from "../scripts/launched-browser.mjs";
import { test } from "./fixtures";

/**
 * Nick's Playwright rule (2026-11-02): until Playwright bundles Chromium
 * >= 156.0.8078.73, tests may only hit local hosts and must use chromiumSandbox.
 *
 * The sandbox check reads the command line of the browser this test launched.
 * Checking the config object alone is not enough: Playwright ignores
 * chromiumSandbox when it sits directly under use instead of use.launchOptions.
 * Other Chrome processes on the machine are not part of the check.
 */
function parentPid(pid: number): number | null {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close < 0) return null;
    const ppid = Number(stat.slice(close + 2).trim().split(/\s+/)[1]);
    return Number.isInteger(ppid) ? ppid : null;
  } catch {
    return null;
  }
}

function playwrightBrowserCommandLines(): string[] {
  const root = process.pid;
  const lines: string[] = [];
  for (const entry of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    if (!isDescendantPid(pid, root, parentPid)) continue;
    try {
      const line = browserCommandLine(fs.readFileSync(`/proc/${pid}/cmdline`, "utf8"));
      if (line) lines.push(line);
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

    const failed = page.waitForEvent("requestfailed", {
      predicate: (request) => request.url().startsWith("https://example.com/"),
      timeout: 5_000,
    });

    const result = await page.evaluate(async () => {
      try {
        const res = await fetch("https://example.com/", { mode: "no-cors" });
        return { ok: true, type: res.type };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    });

    const request = await failed;
    expect(externalReached, "an external response should never arrive").toBe(false);
    expect(result.ok, "fetch to example.com must be blocked").toBe(false);
    // Fetch.failRequest(BlockedByClient) surfaces as this inspector error.
    // DNS, TLS, and offline failures use other net:: codes, so they do not pass.
    expect(
      request.failure()?.errorText,
      "the route guard must abort the request as blocked by the client",
    ).toBe("net::ERR_BLOCKED_BY_CLIENT.Inspector");
  });
});
