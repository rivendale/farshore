import assert from "node:assert/strict";
import { test } from "node:test";
import {
  browserCommandLine,
  isDescendantPid,
  launchedBrowserCommandLines,
} from "./launched-browser.mjs";

const parentOf = (pid) =>
  ({
    20: 10,
    10: 2,
    21: 20,
    99: 5,
  })[pid] ?? null;

test("browserCommandLine keeps a chrome main process and drops the rest", () => {
  const launched = browserCommandLine(
    "google-chrome\0--user-data-dir=/tmp/playwright_chromiumdev_profile-abc\0--disable-gpu",
  );
  assert.match(launched, /playwright_chromiumdev_profile-abc/);
  assert.equal(browserCommandLine("node\0playwright\0test"), null);
  assert.equal(
    browserCommandLine("chrome\0--type=renderer\0--no-sandbox"),
    null,
  );
});

test("an unrelated --no-sandbox Chrome is not the launched browser", () => {
  const lines = launchedBrowserCommandLines(
    [
      {
        pid: 20,
        cmdline:
          "google-chrome\0--user-data-dir=/tmp/playwright_chromiumdev_profile-abc\0--disable-gpu",
      },
      {
        pid: 99,
        cmdline:
          "google-chrome\0--no-sandbox\0--user-data-dir=/home/user/.config/google-chrome",
      },
    ],
    2,
    parentOf,
  );
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /(?:^|\s)--no-sandbox(?:\s|$)/);
});

test("a launched browser that passed --no-sandbox is still visible", () => {
  const lines = launchedBrowserCommandLines(
    [
      {
        pid: 20,
        cmdline:
          "chrome\0--no-sandbox\0--user-data-dir=/tmp/playwright_chromiumdev_profile-abc",
      },
    ],
    2,
    parentOf,
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0], /(?:^|\s)--no-sandbox(?:\s|$)/);
});

test("isDescendantPid stops at init and does not loop", () => {
  assert.equal(isDescendantPid(20, 2, parentOf), true);
  assert.equal(isDescendantPid(99, 2, parentOf), false);
  assert.equal(isDescendantPid(2, 2, parentOf), true);
  assert.equal(
    isDescendantPid(7, 2, () => 7),
    false,
  );
});
