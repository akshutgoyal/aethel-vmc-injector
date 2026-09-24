/**
 * Local Node server.
 *
 * Talks to the VMC API from this machine and serves the same browser bundle
 * that GitHub Pages hosts, so both deployments share one code path.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { login, type LoginFailureReason } from "./injector.js";
import { BRAND, renderPage } from "./page.js";

const DEFAULT_PORT = 8765;

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
const MAX_BODY = 1_000_000;

// Browsers cannot set a User-Agent, but Node's fetch can.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ASSETS_DIR = path.resolve(__dirname, "..", "public", "assets");
const CLIENT_SCRIPT = path.join(ASSETS_DIR, "client.js");
const PAGE = renderPage({ mode: "server" });

const ASSET_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
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

// Versioned-style static assets that are safe to cache for an hour;
// everything else served from here keeps no-store (including .map files).
const CACHEABLE_ASSET_EXTS = new Set([".js", ".css", ".svg", ".ico"]);

function assetCacheControl(ext: string): string {
  return CACHEABLE_ASSET_EXTS.has(ext) ? "public, max-age=3600" : "no-store";
}

function send(res: http.ServerResponse, status: number, type: string, body: string): void {
  const buf = Buffer.from(body, "utf8");
  res.writeHead(
    status,
    baseHeaders({
      "Content-Type": type,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    })
  );
  res.end(buf);
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  send(res, status, "application/json; charset=utf-8", JSON.stringify(payload));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function serveAsset(rawUrl: string, res: http.ServerResponse): Promise<void> {
  const name = path.basename(decodeURIComponent(rawUrl.split("?")[0] ?? ""));
  const file = path.join(ASSETS_DIR, name);
  try {
    const body = await readFile(file);
    const ext = path.extname(name);
    res.writeHead(
      200,
      baseHeaders({
        "Content-Type": ASSET_TYPES[ext] ?? "application/octet-stream",
        "Content-Length": String(body.length),
        "Cache-Control": assetCacheControl(ext),
      })
    );
    res.end(body);
  } catch {
    send(res, 404, "text/plain; charset=utf-8", "Not found");
  }
}

// The browser client parses {ok:false} regardless of status, so these codes are
// for logs and proxies. Derived from the failure reason, never from the message.
const FAILURE_STATUS: Record<LoginFailureReason, number> = {
  unreachable: 502,
  timeout: 502,
  unsupported: 500,
  "invalid-input": 400,
  api: 401,
  "no-token": 401,
};

async function handleLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let payload: { roll?: unknown; code?: unknown };
  try {
    payload = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendJson(res, 400, { ok: false, error: "Malformed request." });
    return;
  }

  const roll = String(payload.roll ?? "").trim();
  const code = String(payload.code ?? "").trim();
  if (!roll || !code) {
    sendJson(res, 400, { ok: false, error: "Roll number and activation code are required." });
    return;
  }

  const result = await login(roll, code, { fetchImpl: fetch, userAgent: USER_AGENT });
  if (result.ok) {
    sendJson(res, 200, result);
    return;
  }
  sendJson(res, FAILURE_STATUS[result.reason], result);
}

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? "/";

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    send(res, 200, "text/html; charset=utf-8", PAGE);
    return;
  }

  if (req.method === "GET" && url.startsWith("/assets/")) {
    await serveAsset(url, res);
    return;
  }

  if (req.method === "POST" && url === "/api/login") {
    await handleLogin(req, res);
    return;
  }

  send(res, 404, "text/plain; charset=utf-8", "Not found");
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err: unknown) => {
    console.error(err);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: "Internal error." });
    } else {
      res.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`${BRAND} running at http://${HOST}:${PORT}`);
  if (!existsSync(CLIENT_SCRIPT)) {
    console.warn("warning: browser bundle missing. Run `npm run build` first.");
  }
  console.log("Press Ctrl+C to stop.");
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

