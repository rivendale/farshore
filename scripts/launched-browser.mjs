/**
 * Pick the browser Playwright itself launched out of a process list.
 * Other Chrome processes on the machine are ignored, so an unrelated
 * `--no-sandbox` browser cannot fail the sandbox check.
 */

export function browserCommandLine(cmdline) {
  const line = String(cmdline).replaceAll("\0", " ").trim();
  if (!/chrome|chromium|headless_shell/i.test(line)) return null;
  if (!line.includes("user-data-dir")) return null;
  return line;
}

/**
 * @param {number} pid
 * @param {number} rootPid
 * @param {(pid: number) => number | null | undefined} parentOf
 */
export function isDescendantPid(pid, rootPid, parentOf) {
  let current = pid;
  const seen = new Set();
  while (current !== rootPid) {
    if (!Number.isInteger(current) || current <= 1 || seen.has(current)) return false;
    seen.add(current);
    const parent = parentOf(current);
    if (!Number.isInteger(parent) || parent === current) return false;
    current = parent;
  }
  return true;
}

/**
 * @param {{ pid: number, cmdline: string }[]} processes
 * @param {number} rootPid
 * @param {(pid: number) => number | null | undefined} parentOf
 */
export function launchedBrowserCommandLines(processes, rootPid, parentOf) {
  const lines = [];
  for (const proc of processes) {
    if (!isDescendantPid(proc.pid, rootPid, parentOf)) continue;
    const line = browserCommandLine(proc.cmdline);
    if (line) lines.push(line);
  }
  return lines;
}
