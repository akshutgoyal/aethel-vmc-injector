/**
 * Shared VMC session core.
 *
 * This file has no Node-only imports, so the same logic runs in two places
 * without being duplicated:
 *
 *   * the local Node server (`src/server.ts`, `npm start`)
 *   * the browser bundle shipped to GitHub Pages (`src/client.ts`)
 *
 * Both targets therefore produce a byte-for-byte identical injector snippet.
 */

export const LOGIN_URL =
  "https://api-v2-6-0.eapp.vidyamandir.com/mysa/connectorg/organizations/1/login";

export const STUDENT_WEB_URL = "https://studentweb.vidyamandir.com/learn";

export const COGNITO_POOL = "ap-south-1:f8400cd8-91ae-4054-b187-33a0744e64dd";
export const AMPLIFY_APP_ID = "37f56b77a1294ff3b241db019ba8e958";
export const DOMAIN_ID = "e_3";
export const ORGANIZATION_ID = "1";
export const APP_FLAVOUR = "VMCProd";

export interface UserData {
  accessToken?: string;
  refreshToken?: string;
  id?: string;
  userId?: string;
  name?: string;
  rollNumber?: string;
  cognitoIdentityId?: string;
  [key: string]: unknown;
}

export type Session = Record<string, string | null>;

/** Shape returned to the UI once a login succeeds. */
export interface InjectorPayload {
  ok: true;
  name: string;
  roll: string;
  userId: string;
  js: string;
  filename: string;
}

/** Shape returned to the UI when a login cannot be completed. */
export interface LoginFailure {
  ok: false;
  error: string;
}

export type LoginResult = InjectorPayload | LoginFailure;

export interface LoginOptions {
  /** Override the HTTP client (used by tests and by the local server). */
  fetchImpl?: typeof fetch | undefined;
  /** Reuse a caller-supplied device id instead of generating one. */
  deviceId?: string | undefined;
  /** Sent from Node, where fetch is allowed to set a User-Agent. */
  userAgent?: string | undefined;
  timeoutMs?: number | undefined;
}

/**
 * `crypto.randomUUID()` with a fallback, because browsers only expose it in a
 * secure context and some runtimes omit it entirely.
 *
 * The parameter type is structural so the same code type-checks under the Node
 * lib and the DOM lib without importing either.
 */
interface RandomSource {
  randomUUID?: (() => string) | undefined;
  getRandomValues?: ((array: Uint8Array) => Uint8Array) | undefined;
}

export function randomUUID(): string {
  const webCrypto: RandomSource | undefined = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10

  const hex: string[] = [];
  for (const byte of bytes) hex.push(byte.toString(16).padStart(2, "0"));
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function buildSession(userData: UserData, deviceId: string): Session {
  const userId = userData.id ?? userData.userId ?? null;

  const session: Session = {
    accessToken: userData.accessToken ?? null,
    refreshToken: userData.refreshToken ?? "",
    userId: userId === null ? null : String(userId),
    name: userData.name ?? "",
    deviceId,
    domainId: DOMAIN_ID,
    organizationId: ORGANIZATION_ID,
    appFlavour: APP_FLAVOUR,
    isUserLoggedIn: "true",
    "aws-amplify-cacheCurSize": "239",
    errorLogs: "[]",
    networkErrorLogs: "[]",
  };

  if (userData.cognitoIdentityId !== undefined) {
    session[`CognitoIdentityId-${COGNITO_POOL}`] = String(userData.cognitoIdentityId);
  }

  const cacheKey = `aws-amplify-cacheAWSPinpoint_${AMPLIFY_APP_ID}`;
  const now = Date.now();
  session[cacheKey] = JSON.stringify({
    key: cacheKey,
    data: randomUUID(),
    timestamp: now,
    visitedTime: now,
    priority: 1,
    expires: now + 3153600000000,
    type: "string",
    byteSize: 239,
  });

  session["persist:viewer"] = JSON.stringify({
    toolbarGroup: '"toolbarGroup-Annotate"',
    lastPickedToolForGroup: '{"":"Pan"}',
    lastPickedToolGroup: "{}",
    _persist: '{"version":-1,"rehydrated":true}',
  });

  return session;
}

export function generateInjector(session: Session): string {
  const lines = [
    "// VMC session injector. Paste into the browser console and press Enter.",
    "localStorage.clear();",
  ];

  for (const [key, value] of Object.entries(session)) {
    if (value === null) continue;
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
    lines.push(`localStorage.setItem('${key}', '${escaped}');`);
  }

  lines.push(
    `window.location.href = '${STUDENT_WEB_URL}';`,
    "console.log('VMC session injected.');"
  );

  return lines.join("\n");
}

/** Turn a successful API response into the payload the UI renders. */
export function buildPayload(
  userData: UserData,
  deviceId: string,
  fallbackRoll = ""
): InjectorPayload {
  const name = (userData.name ?? "").trim() || "user";
  const roll = String(userData.rollNumber ?? "").trim() || fallbackRoll;

  return {
    ok: true,
    name,
    roll,
    userId: String(userData.id ?? userData.userId ?? ""),
    js: generateInjector(buildSession(userData, deviceId)),
    filename: `inject_session_${name.replace(/ /g, "_")}_${Math.floor(Date.now() / 1000)}.js`,
  };
}

/**
 * The VMC API answers with HTTP 200 even when it refuses the credentials and
 * puts the reason in the body, so the body always has to be inspected.
 */
export function apiErrorFrom(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  for (const key of ["error", "message", "errorMessage", "error_description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const errors = record["errors"];
  if (Array.isArray(errors)) {
    const first = errors.find((entry) => typeof entry === "string");
    if (typeof first === "string" && first.trim()) return first.trim();
  }

  return null;
}

function describe(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return "the request timed out";
    }
    if (err.message) return err.message;
  }
  return String(err ?? "unknown error");
}

function timeoutSignal(ms: number): AbortSignal | null {
  if (typeof AbortSignal === "undefined") return null;
  if (typeof AbortSignal.timeout !== "function") return null;
  return AbortSignal.timeout(ms);
}

/**
 * Exchange a roll number plus activation code for tokens and build the injector
 * snippet. Works identically in Node and in the browser: the VMC endpoint
 * replies with `access-control-allow-origin: *`, so no proxy is needed.
 */
export async function login(
  roll: string,
  code: string,
  options: LoginOptions = {}
): Promise<LoginResult> {
  const doFetch = options.fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") {
    return { ok: false, error: "This runtime has no fetch implementation." };
  }

  const loginValue = String(roll ?? "").trim();
  const passwordValue = String(code ?? "").trim();
  if (!loginValue || !passwordValue) {
    return { ok: false, error: "Roll number and activation code are required." };
  }

  const deviceId = options.deviceId ?? randomUUID();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.userAgent) headers["User-Agent"] = options.userAgent;

  const signal = timeoutSignal(options.timeoutMs ?? 15_000);

  let response: Response;
  try {
    const init: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify({
        loginValue,
        passwordValue,
        deviceId,
        identityType: "ROLLNUMBER",
      }),
    };
    if (signal) init.signal = signal;
    response = await doFetch(LOGIN_URL, init);
  } catch (err) {
    return { ok: false, error: `Could not reach the VMC API: ${describe(err)}` };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const apiError = apiErrorFrom(payload);

  if (!response.ok) {
    return {
      ok: false,
      error:
        apiError ??
        `Login failed (HTTP ${response.status}). Check the roll number and activation code.`,
    };
  }

  const data = (payload ?? {}) as UserData;
  if (!data.accessToken) {
    return { ok: false, error: apiError ?? "Login failed - no access token was returned." };
  }

  return buildPayload(data, deviceId, loginValue);
}

