/**
 * Tests for the shared injector core, run against the compiled output.
 *
 * Run with `npm test` (which rebuilds dist/ first via `npm run build:node`).
 *
 * NOTE: the import below is `../dist/injector.js` (not `../../dist/...`):
 * this file lives at `test/injector.test.mjs`, one level below the repo
 * root, so a single `..` reaches `dist/`.
 */
import test from "node:test";
import assert from "node:assert";

import {
  apiErrorFrom,
  buildPayload,
  buildSession,
  login,
  randomUUID,
} from "../dist/injector.js";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXPECTED_KEYS = [
  "accessToken",
  "refreshToken",
  "userId",
  "name",
  "deviceId",
  "domainId",
  "organizationId",
  "appFlavour",
  "isUserLoggedIn",
  "aws-amplify-cacheCurSize",
  "errorLogs",
  "networkErrorLogs",
];

/** Mock fetch resolving to a canned JSON body. */
function mockFetch(body, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, json: async () => body });
}

test("buildSession returns the full 15-key shape", () => {
  const session = buildSession(
    {
      accessToken: "at",
      refreshToken: "rt",
      id: "user-1",
      name: "Jane",
      cognitoIdentityId: "cognito-1",
    },
    "device-1"
  );
  assert.equal(Object.keys(session).length, 15);
  for (const key of EXPECTED_KEYS) {
    assert.ok(key in session, `missing key: ${key}`);
  }
  assert.equal(session.accessToken, "at");
  assert.equal(session.refreshToken, "rt");
  assert.equal(session.userId, "user-1");
  assert.equal(session.name, "Jane");
  assert.equal(session.deviceId, "device-1");
  // Platform contract: the appFlavour value a signed-in session must carry.
  // Rebranding the UI must never touch it.
  assert.equal(session.appFlavour, "VMCProd");
});

test("buildSession uses nulls for missing fields", () => {
  const session = buildSession({}, "device-1");
  assert.equal(session.accessToken, null);
  assert.equal(session.userId, null);
  // Optional Cognito key is absent without an identity id.
  assert.equal(Object.keys(session).length, 14);
  assert.ok(
    !Object.keys(session).some((key) => key.startsWith("CognitoIdentityId-"))
  );
});

test("buildPayload filename format and js content markers", () => {
  const payload = buildPayload(
    {
      accessToken: "at",
      refreshToken: "rt",
      id: "user-1",
      name: "Jane Doe",
      rollNumber: "R123",
    },
    "device-1"
  );
  assert.equal(payload.ok, true);
  assert.match(payload.filename, /^aethel_inject_Jane_Doe_\d+\.js$/);
  assert.ok(payload.js.includes("localStorage.clear();"));
  assert.ok(payload.js.includes("localStorage.setItem("));
  assert.ok(payload.js.includes("studentweb.vidyamandir.com/learn"));
  // Branding of the generated snippet itself.
  assert.ok(payload.js.includes("// Aethel - VMC Injector."));
  assert.ok(
    payload.js.includes("console.log('Aethel - VMC Injector: session injected.');")
  );
});

test("apiErrorFrom: error/message branches", () => {
  assert.equal(apiErrorFrom({ error: "bad creds" }), "bad creds");
  assert.equal(apiErrorFrom({ message: "nope" }), "nope");
  assert.equal(apiErrorFrom({ errorMessage: "em" }), "em");
  assert.equal(apiErrorFrom({ error_description: "ed" }), "ed");
  assert.equal(apiErrorFrom({ error: "  spaced  " }), "spaced");
});

test("apiErrorFrom: errors-array branch", () => {
  assert.equal(apiErrorFrom({ errors: ["first", "second"] }), "first");
  assert.equal(apiErrorFrom({ errors: [42, " usable "] }), "usable");
  assert.equal(apiErrorFrom({ errors: [] }), null);
  assert.equal(apiErrorFrom({ errors: [42] }), null);
});

test("apiErrorFrom: non-object payloads return null", () => {
  assert.equal(apiErrorFrom(null), null);
  assert.equal(apiErrorFrom(undefined), null);
  assert.equal(apiErrorFrom("oops"), null);
  assert.equal(apiErrorFrom(42), null);
  assert.equal(apiErrorFrom({}), null);
  assert.equal(apiErrorFrom({ error: "   " }), null);
});

test("randomUUID matches the v4 format", () => {
  for (let i = 0; i < 10; i += 1) {
    assert.match(randomUUID(), UUID_V4);
  }
});

test("login: success returns the injector payload", async () => {
  const result = await login("R123", "CODE", {
    deviceId: "device-1",
    fetchImpl: mockFetch({
      accessToken: "at",
      refreshToken: "rt",
      id: "user-1",
      name: "Jane",
      rollNumber: "R123",
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.name, "Jane");
  assert.equal(result.roll, "R123");
  assert.equal(result.userId, "user-1");
  assert.ok(result.js.includes("localStorage.setItem("));
  assert.match(result.filename, /^aethel_inject_Jane_\d+\.js$/);
});

test("login: HTTP-200-with-error body surfaces the API message", async () => {
  const result = await login("R123", "CODE", {
    fetchImpl: mockFetch({ error: "No user is found." }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "No user is found.");
});

test("login: HTTP 500 returns a generic failure", async () => {
  const result = await login("R123", "CODE", {
    fetchImpl: mockFetch({}, { ok: false, status: 500 }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("HTTP 500"));
});

test("login: network throw surfaces a reachability error", async () => {
  const result = await login("R123", "CODE", {
    fetchImpl: async () => {
      throw new Error("boom");
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("Could not reach the VMC API"));
  assert.ok(result.error.includes("boom"));
});

test("login: timeout error is reported as a timeout", async () => {
  const timeout = new Error("The operation was aborted.");
  timeout.name = "TimeoutError";
  const result = await login("R123", "CODE", {
    fetchImpl: async () => {
      throw timeout;
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("timed out"));
});

test("login: empty inputs are rejected without calling fetch", async () => {
  const cases = [["", "CODE"], ["R123", ""], ["   ", "CODE"], ["R123", "  "]];
  for (const [roll, code] of cases) {
    let called = false;
    const result = await login(roll, code, {
      fetchImpl: async () => {
        called = true;
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "Roll number and activation code are required.");
    assert.equal(called, false);
  }
});

test("login: token-less 200 returns a no-token failure", async () => {
  const result = await login("R123", "CODE", {
    fetchImpl: mockFetch({ name: "Jane" }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.error.includes("no access token"));
});

test("login: failures carry a machine-readable reason", async () => {
  const timeout = new Error("The operation was aborted.");
  timeout.name = "TimeoutError";

  const cases = [
    { name: "empty inputs", args: ["", ""], impl: mockFetch({}), want: "invalid-input" },
    {
      name: "network throw",
      args: ["R", "C"],
      impl: async () => {
        throw new Error("boom");
      },
      want: "unreachable",
    },
    {
      name: "timeout",
      args: ["R", "C"],
      impl: async () => {
        throw timeout;
      },
      want: "timeout",
    },
    {
      name: "HTTP 500",
      args: ["R", "C"],
      impl: mockFetch({}, { ok: false, status: 500 }),
      want: "api",
    },
    {
      name: "refused credentials (200 + error body)",
      args: ["R", "C"],
      impl: mockFetch({ error: "No user is found." }),
      want: "api",
    },
    { name: "no token", args: ["R", "C"], impl: mockFetch({ name: "x" }), want: "no-token" },
  ];

  for (const c of cases) {
    const result = await login(c.args[0], c.args[1], { fetchImpl: c.impl });
    assert.equal(result.ok, false, c.name);
    assert.equal(result.reason, c.want, c.name);
  }
});

/**
 * Regression: the guard used to be cleared in the `finally` of the fetch itself,
 * so the timeout stopped covering the body read. On the AbortSignal.timeout path
 * that is harmless (its timer cannot be cancelled), which is why this forces the
 * AbortController fallback — the only branch that had a timer to clear.
 */
test("login: the timeout still applies while the body is being read", async () => {
  const nativeTimeout = AbortSignal.timeout;
  try {
    AbortSignal.timeout = undefined;

    const result = await Promise.race([
      login("R123", "CODE", {
        timeoutMs: 60,
        fetchImpl: async (_url, init) => ({
          ok: true,
          status: 200,
          // Headers land immediately; the body stalls until the signal aborts.
          json: () =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener("abort", () => reject(init.signal.reason));
            }),
        }),
      }),
      new Promise((_resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("login() never settled: the body timeout did not fire")),
          2000
        );
        timer.unref();
      }),
    ]);

    assert.equal(result.ok, false);
    assert.equal(result.reason, "timeout");
    assert.ok(result.error.includes("timed out"), result.error);
  } finally {
    AbortSignal.timeout = nativeTimeout;
  }
});

