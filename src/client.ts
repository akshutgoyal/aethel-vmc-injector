/**
 * Browser UI for the VMC session injector.
 *
 * The same compiled file is served by the local Node server and by GitHub
 * Pages. The only difference between the two deployments is the transport:
 *
 *   * `vmc-mode=server` (local Node server): the credentials are POSTed to
 *     `/api/login`, which talks to the VMC API from Node.
 *   * `vmc-mode=static` (GitHub Pages): the browser calls the VMC API itself,
 *     which the API permits through `access-control-allow-origin: *`.
 */

import { login, type LoginResult } from "./injector.js";

type Mode = "server" | "static";

const MODE: Mode =
  document.querySelector('meta[name="vmc-mode"]')?.getAttribute("content") === "static"
    ? "static"
    : "server";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as unknown as T;
}

const form = el<HTMLFormElement>("form");
const rollInput = el<HTMLInputElement>("roll");
const codeInput = el<HTMLInputElement>("code");
const peekBtn = el<HTMLButtonElement>("peek");
const icoShow = el<HTMLElement>("icoShow");
const icoHide = el<HTMLElement>("icoHide");
const formMsg = el<HTMLElement>("formMsg");
const statusBox = el<HTMLElement>("status");
const resultBox = el<HTMLElement>("result");
const errorBox = el<HTMLElement>("error");
const logLine = el<HTMLElement>("log");
const errText = el<HTMLElement>("errText");
const copyBtn = el<HTMLButtonElement>("copy");
const downloadBtn = el<HTMLButtonElement>("download");
const liveRegion = el<HTMLElement>("live");
const jsOut = el<HTMLElement>("jsOut");

const phrases = [
  "Contacting the VMC API",
  "Verifying your credentials",
  "Reading the student profile",
  "Composing the session",
  "Writing the injector snippet",
];

const HL =
  /(\/\/[^\n]*)|('(?:\\.|[^'\\])*')|\b(localStorage\.setItem|localStorage\.clear|window\.location\.href|console\.log)\b/g;
const COUNT = /localStorage\.setItem/g;

let js = "";
let filename = "inject_session.js";
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;

async function request(roll: string, code: string): Promise<LoginResult> {
  if (MODE === "static") return login(roll, code);

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roll, code }),
  });
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Unexpected response from the local server." };
  }

  const parsed = data as Record<string, unknown>;
  if (parsed["ok"] === true) {
    return {
      ok: true,
      name: String(parsed["name"] ?? ""),
      roll: String(parsed["roll"] ?? ""),
      userId: String(parsed["userId"] ?? ""),
      js: String(parsed["js"] ?? ""),
      filename: String(parsed["filename"] ?? "inject_session.js"),
    };
  }
  return { ok: false, error: String(parsed["error"] ?? "Login failed.") };
}

function reveal(node: HTMLElement): void {
  node.classList.remove("hidden");
  node.classList.remove("enter");
  void node.offsetWidth;
  node.classList.add("enter");
}

function hide(node: HTMLElement): void {
  node.classList.add("hidden");
  node.classList.remove("enter");
}

function showFormMsg(on: boolean): void {
  formMsg.classList.toggle("hidden", !on);
}

function showError(message: string): void {
  hide(form);
  hide(statusBox);
  hide(resultBox);
  errText.textContent = message;
  reveal(errorBox);
  liveRegion.textContent = message;
}

function setLine(text: string): void {
  liveRegion.textContent = text;
}

function esc(value: unknown): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char] ?? char);
}

function highlight(code: string): string {
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;
  HL.lastIndex = 0;
  while ((match = HL.exec(code)) !== null) {
    out += esc(code.slice(last, match.index));
    const cls = match[1] ? "c-com" : match[2] ? "c-str" : "c-api";
    out += '<span class="' + cls + '">' + esc(match[0]) + "</span>";
    last = match.index + match[0].length;
  }
  return out + esc(code.slice(last));
}

function startLoading(): void {
  hide(form);
  hide(resultBox);
  hide(errorBox);
  showFormMsg(false);
  reveal(statusBox);
  step = 0;
  const tick = (): void => {
    logLine.innerHTML =
      "<b>&gt;</b> " + (phrases[step % phrases.length] ?? phrases[0] ?? "");
    step += 1;
  };
  tick();
  timer = setInterval(tick, 950);
}

function stopLoading(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const roll = rollInput.value.trim();
  const code = codeInput.value.trim();
  rollInput.classList.toggle("invalid", !roll);
  codeInput.classList.toggle("invalid", !code);
  if (!roll || !code) {
    showFormMsg(true);
    (!roll ? rollInput : codeInput).focus();
    return;
  }

  startLoading();
  try {
    const data = await request(roll, code);
    stopLoading();

    if (!data.ok) {
      showError(data.error);
      return;
    }

    js = data.js;
    filename = data.filename;
    jsOut.innerHTML = highlight(js);
    el<HTMLElement>("who").textContent = data.name || "unknown";
    el<HTMLElement>("fRoll").textContent = data.roll || "Not returned";
    el<HTMLElement>("fUser").textContent = data.userId || "Not returned";
    el<HTMLElement>("fName").textContent = filename;

    const bytes = new TextEncoder().encode(js).length;
    const keys = (js.match(COUNT) ?? []).length;
    el<HTMLElement>("fMeta").textContent =
      keys + " keys \u00b7 " + (bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(1) + " KB");

    hide(statusBox);
    reveal(resultBox);
    setLine("Session ready for " + (data.name || "user") + ".");
  } catch (err) {
    stopLoading();
    console.error(err);
    showError(
      MODE === "static"
        ? "Could not reach the VMC API. Check your connection and try again."
        : "Could not reach the local server. Check that it is still running."
    );
  }
});

for (const id of ["roll", "code"]) {
  const input = el<HTMLInputElement>(id);
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    showFormMsg(false);
  });
}

peekBtn.addEventListener("click", () => {
  const showing = codeInput.type === "password";
  codeInput.type = showing ? "text" : "password";
  peekBtn.setAttribute("aria-pressed", String(showing));
  peekBtn.setAttribute("aria-label", showing ? "Hide activation code" : "Show activation code");
  icoShow.classList.toggle("hidden", showing);
  icoHide.classList.toggle("hidden", !showing);
  codeInput.focus();
});

copyBtn.addEventListener("click", async () => {
  let ok = true;
  try {
    await navigator.clipboard.writeText(js);
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = js;
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    scratch.remove();
  }
  const previous = copyBtn.textContent;
  copyBtn.textContent = ok ? "Copied" : "Copy failed";
  setLine(ok ? "Snippet copied to clipboard." : "Copy failed. Select the code and copy it manually.");
  setTimeout(() => {
    copyBtn.textContent = previous;
  }, 1600);
});

downloadBtn.addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([js], { type: "text/javascript" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setLine(filename + " downloaded.");
});

function reset(): void {
  rollInput.value = "";
  codeInput.value = "";
  rollInput.classList.remove("invalid");
  codeInput.classList.remove("invalid");
  codeInput.type = "password";
  peekBtn.setAttribute("aria-pressed", "false");
  peekBtn.setAttribute("aria-label", "Show activation code");
  icoShow.classList.remove("hidden");
  icoHide.classList.add("hidden");
  showFormMsg(false);
  hide(resultBox);
  hide(errorBox);
  hide(statusBox);
  reveal(form);
  rollInput.focus();
}

el<HTMLButtonElement>("again").addEventListener("click", reset);
el<HTMLButtonElement>("retry").addEventListener("click", reset);
