import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.VISUAL_PORT || 4173);

/**
 * Nick's Playwright rule (2026-11-02): until Playwright bundles Chromium
 * >= 156.0.8078.73, Playwright may run ONLY against our own local builds
 * (localhost / 127.0.0.1 / file served by this config's webServer), never
 * against outside sites, and must set chromiumSandbox: true.
 *
 * Visual smoke against the static Pages build in `.output/public`.
 * Build first with `npm run build:pages`. This file does not rebuild.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: "line",
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    chromiumSandbox: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    launchOptions: {
      args: [
        "--disable-gpu",
        "--font-render-hinting=none",
        "--disable-skia-runtime-opts",
        "--disable-font-subpixel-positioning",
        "--force-color-profile=srgb",
      ],
    },
  },
  webServer: {
    command: "node scripts/static-pages.mjs",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
