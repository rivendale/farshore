#!/usr/bin/env node
/**
 * Serve the static Pages build (`.output/public`) for the visual smoke.
 * No extra dependency: Node's http module only.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const root = normalize(join(process.cwd(), ".output", "public"));
const port = Number(process.env.VISUAL_PORT || 4173);
const host = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function insideRoot(file) {
  const abs = normalize(file);
  return abs === root || abs.startsWith(root + sep);
}

async function sendFile(res, file) {
  const body = await readFile(file);
  const type = types[extname(file)] || "application/octet-stream";
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = normalize(join(root, pathname));
    if (!insideRoot(file)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      await sendFile(res, file);
    } catch (err) {
      if (err?.code !== "ENOENT") throw err;
      await sendFile(res, join(root, "index.html"));
    }
  } catch {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, host, () => {
  console.log(`serve-pages: http://${host}:${port}`);
});
