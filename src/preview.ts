/**
 * Static file server for the GitHub Pages build in `public/`.
 *
 *   npm run preview  ->  http://127.0.0.1:8766
 *
 * Handy for checking the exact bytes that GitHub Pages will serve.
 */

import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { BRAND } from "./page.js";

const DEFAULT_PORT = 8766;

function resolvePort(): number {
  const parsed = Number(process.env["PORT"] ?? DEFAULT_PORT);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(
      `warning: invalid PORT ${JSON.stringify(process.env["PORT"] ?? "")}, falling back to ${DEFAULT_PORT}.`
    );
    return DEFAULT_PORT;
  }
  return parsed;
}

const HOST = process.env["HOST"] ?? "127.0.0.1";
const PORT = resolvePort();
const ROOT = path.resolve(__dirname, "..", "public");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

/** Merge the shared security headers with per-response headers. */
function baseHeaders(extra: Record<string, string>): Record<string, string> {
  return { ...SECURITY_HEADERS, ...extra };
}

// Long-cacheable static assets; everything else (.html, .json, .map, …)
// keeps no-store.
const CACHEABLE_EXTS = new Set([".js", ".css", ".svg", ".ico", ".txt"]);

function cacheControlFor(ext: string): string {
  return CACHEABLE_EXTS.has(ext) ? "public, max-age=3600" : "no-store";
}

function resolveTarget(rawUrl: string): string | null {
  const raw = rawUrl.split("?")[0] ?? "/";
  const rel = decodeURIComponent(raw).replace(/^\/+/, "");
  const candidate = path.resolve(ROOT, rel || "index.html");
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) return null;
  return candidate;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, baseHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    res.end("Method not allowed");
    return;
  }

  const target = resolveTarget(req.url ?? "/");
  if (!target) {
    res.writeHead(400, baseHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    res.end("Bad request");
    return;
  }

  for (const candidate of [target, path.join(target, "index.html")]) {
    try {
      const body = await readFile(candidate);
      const ext = path.extname(candidate);
      res.writeHead(
        200,
        baseHeaders({
          "Content-Type": TYPES[ext] ?? "application/octet-stream",
          "Content-Length": String(body.length),
          "Cache-Control": cacheControlFor(ext),
        })
      );
      res.end(req.method === "HEAD" ? undefined : body);
      return;
    } catch {
      // try the next candidate
    }
  }

  res.writeHead(404, baseHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
  res.end("Not found");
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, baseHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    res.end("Internal error");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Previewing the ${BRAND} GitHub Pages build at http://${HOST}:${PORT}`);
  console.log(`Serving ${ROOT}`);
});
