import { test as base } from "@playwright/test";

function isAllowedUrl(raw: string): boolean {
  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("about:") ||
    raw.startsWith("file:")
  ) {
    return true;
  }
  try {
    const { hostname } = new URL(raw);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

/**
 * Nick's Playwright rule (2026-11-02): abort any request whose host is not local.
 * Holds until Playwright bundles Chromium >= 156.0.8078.73.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (isAllowedUrl(url)) return route.continue();
      return route.abort("blockedbyclient");
    });
    await use(context);
  },
});

export { expect } from "@playwright/test";
