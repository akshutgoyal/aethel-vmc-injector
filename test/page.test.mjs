/**
 * Branding and hardening guard for the HTML shell.
 *
 * Run with `npm test` (which rebuilds dist/ first via `npm run build:node`).
 *
 * `page.ts` compiles to CommonJS in `dist/`, the same module
 * `scripts/build-pages.mjs` uses, so this asserts against the exact markup
 * GitHub Pages will serve. It exists so a future rename cannot silently
 * leave the tab title, the `<h1>` or the meta tags behind.
 */
import test from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { BRAND, renderPage } = require(path.join(root, "dist", "page.js"));

const MODES = ["server", "static"];

test("BRAND is the product name used across the app", () => {
  assert.equal(BRAND, "Aethel - VMC Injector");
});

test("renderPage carries the brand in the title, the h1 and the description", () => {
  for (const mode of MODES) {
    const html = renderPage({ mode });
    assert.ok(html.includes(`<title>${BRAND}</title>`), `title missing (${mode})`);
    assert.ok(html.includes(`<h1>${BRAND}</h1>`), `h1 missing (${mode})`);
    assert.ok(
      html.includes(`content="${BRAND} turns a VMC roll number`),
      `meta description missing (${mode})`
    );
  }
});

test("renderPage has no stale branding left", () => {
  for (const mode of MODES) {
    const html = renderPage({ mode });
    assert.ok(!html.includes("VMC Session Injector"), `stale name in ${mode}`);
    assert.ok(!html.includes("inject_session"), `stale filename in ${mode}`);
  }
});

test("renderPage keeps the CSP meta, the mode switch and the theme bootstrap", () => {
  for (const mode of MODES) {
    const html = renderPage({ mode });
    assert.ok(html.includes('http-equiv="Content-Security-Policy"'), mode);
    assert.ok(html.includes("default-src 'self'"), mode);
    assert.ok(html.includes(`<meta name="vmc-mode" content="${mode}">`), mode);
    assert.ok(html.includes("./assets/client.js"), mode);
    // The no-flash pre-hydration script reads the stored theme before paint.
    assert.ok(html.includes("localStorage.getItem('vmc-theme')"), mode);
  }
});
