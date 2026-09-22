/**
 * Assemble the GitHub Pages build in `public/`.
 *
 * `npm run build:web` has already emitted the shared browser bundle into
 * `public/assets`; this script adds the static shell (index.html) and the
 * `.nojekyll` marker that tells GitHub Pages not to run Jekyll over the output.
 */

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { renderPage } = require(path.join(root, "dist", "page.js"));

const outDir = path.join(root, "public");
mkdirSync(path.join(outDir, "assets"), { recursive: true });

writeFileSync(path.join(outDir, "index.html"), renderPage({ mode: "static" }), "utf8");
writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");

console.log("GitHub Pages build written to public/");
