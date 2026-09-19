#!/usr/bin/env node
/**
 * GitHub Pages is static. TanStack Start + Nitro's github_pages preset does not
 * emit a usable HTML shell (empty `index`, then a rolldown SSR crash). After
 * the client bundle lands, write index.html + 404.html that boot the SPA.
 */
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = "/farshore/";
const SRC_CANDIDATES = ["dist/client", ".output/public"];
const DEST = ".output/public";

function pick(files, prefix, suffix) {
  return files.find((f) => f.startsWith(prefix) && f.endsWith(suffix));
}

async function assetsDir(root) {
  try {
    const files = await readdir(join(root, "assets"));
    const js = pick(files, "index-", ".js");
    if (!js) return null;
    return { root, js, css: pick(files, "styles-", ".css") };
  } catch {
    return null;
  }
}

function shell({ js, css }) {
  const cssLink = css
    ? `  <link rel="stylesheet" href="${BASE}assets/${css}">\n`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0c1210">
  <meta name="description" content="Found the colony. Establish the supply chains. Trade with Europe. Win independence.">
  <title>Farshore</title>
  <link rel="icon" type="image/svg+xml" href="${BASE}favicon.svg">
${cssLink}  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;500;600&display=swap">
</head>
<body>
  <script type="module" src="${BASE}assets/${js}"></script>
</body>
</html>
`;
}

const found = [];
for (const dir of SRC_CANDIDATES) {
  const hit = await assetsDir(dir);
  if (hit) found.push(hit);
}
if (!found.length) {
  throw new Error("pages-shell: no client bundle in dist/client or .output/public");
}
const src = found[0];
const html = shell(src);

if (src.root !== DEST) {
  await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });
  await cp(src.root, DEST, { recursive: true });
}

await writeFile(join(DEST, "index.html"), html);
await writeFile(join(DEST, "404.html"), html);
await writeFile(join(DEST, ".nojekyll"), "");
console.log(`pages-shell: wrote ${DEST}/index.html → ${BASE}assets/${src.js}`);
