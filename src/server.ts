import { randomUUID } from "node:crypto";
import http from "node:http";
import { buildSession, generateInjector, LOGIN_URL, type UserData } from "./injector";
import { PAGE } from "./page";

const HOST = "127.0.0.1";
const PORT = 8765;
const MAX_BODY = 1_000_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function send(res: http.ServerResponse, status: number, type: string, body: string): void {
  const buf = Buffer.from(body, "utf8");
  res.writeHead(status, { "Content-Type": type, "Content-Length": String(buf.length) });
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

  const deviceId = randomUUID();

  let response: Response;
  try {
    response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({
        loginValue: roll,
        passwordValue: code,
        deviceId,
        identityType: "ROLLNUMBER",
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 502, { ok: false, error: `Could not reach the VMC API: ${message}` });
    return;
  }

  if (response.status !== 200) {
    sendJson(res, 200, {
      ok: false,
      error: `Login failed (HTTP ${response.status}). Check the roll number and activation code.`,
    });
    return;
  }

  const data = (await response.json()) as UserData;
  if (!data.accessToken) {
    sendJson(res, 200, { ok: false, error: "Login failed - no access token returned." });
    return;
  }

  const name = data.name ?? "user";
  const js = generateInjector(buildSession(data, deviceId));
  const stamp = Math.floor(Date.now() / 1000);

  sendJson(res, 200, {
    ok: true,
    name,
    roll: data.rollNumber ?? roll,
    userId: data.id ?? data.userId ?? "",
    js,
    filename: `inject_session_${(name || "user").replace(/ /g, "_")}_${stamp}.js`,
  });
}

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? "/";

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    send(res, 200, "text/html; charset=utf-8", PAGE);
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
  console.log(`VMC Session Injector running at http://${HOST}:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
