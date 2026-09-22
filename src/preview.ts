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

const HOST = process.env["HOST"] ?? "127.0.0.1";
const PORT = Number(process.env["PORT"] ?? 8766);
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

function resolveTarget(rawUrl: string): string | null {
  const raw = rawUrl.split("?")[0] ?? "/";
  const rel = decodeURIComponent(raw).replace(/^\/+/, "");
  const candidate = path.resolve(ROOT, rel || "index.html");
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) return null;
  return candidate;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  const target = resolveTarget(req.url ?? "/");
  if (!target) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  for (const candidate of [target, path.join(target, "index.html")]) {
    try {
      const body = await readFile(candidate);
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(candidate)] ?? "application/octet-stream",
        "Content-Length": String(body.length),
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : body);
      return;
    } catch {
      // try the next candidate
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal error");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Previewing the GitHub Pages build at http://${HOST}:${PORT}`);
  console.log(`Serving ${ROOT}`);
});
