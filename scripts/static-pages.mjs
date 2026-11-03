#!/usr/bin/env node
/**
 * Serves the GitHub Pages build for the visual smoke.
 * No extra dependency. Query strings are ignored. Missing files are 404.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const ROOT = resolve(".output/public");
const PORT = Number(process.env.VISUAL_PORT || 4173);
const HOST = "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function fileFor(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\/+/, "");
  if (!rel || rel.includes("\0")) return null;
  const full = resolve(join(ROOT, rel));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  const full = fileFor(req.url || "/");
  if (!full) {
    res.writeHead(400);
    res.end("bad path");
    return;
  }
  try {
    const body = await readFile(full);
    const type = TYPES[extname(full)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`static-pages: http://${HOST}:${PORT} from ${ROOT}`);
});
