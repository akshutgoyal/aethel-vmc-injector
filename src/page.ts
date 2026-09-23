export interface PageOptions {
  /**
   * `server` posts the credentials to the local Node API; `static` (the GitHub
   * Pages build) lets the browser call the VMC API directly.
   */
  mode: "server" | "static";
}

export function renderPage(options: PageOptions): string {
  const mode: PageOptions["mode"] = options.mode;
  const footer =
    mode === "static"
      ? "Hosted on GitHub Pages. The roll number and activation code go straight from this browser tab to the VMC API, are used for this one request, and are never stored."
      : "Runs only on this machine at 127.0.0.1. Credentials are used for this one request and never stored.";
  const notice =
    mode === "static"
      ? '<p class="note">This hosted copy calls the VMC API directly from your browser. Nothing is logged or stored.</p>'
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="vmc-mode" content="${mode}">
<title>VMC Session Injector</title>
<style>
  *,*::before,*::after{ box-sizing:border-box; }
  :root{
    --paper:#f4f5f2; --surface:#ffffff; --sunken:#f7f8f6;
    --ink:#16181a; --ink-2:#3a3e40; --muted:#5f6563;
    --line:#e5e7e2; --line-2:#d6dad4;
    --accent:#0e6f65; --accent-2:#0a564e; --accent-soft:#e7f2f0; --accent-line:#cfe4e0;
    --accent-ring:rgba(14,111,101,.22);
    --danger:#a13a22; --danger-ink:#7c2c18; --danger-soft:#fbeeea; --danger-line:#f1d8cf;
    --c-com:#98a09b; --c-str:#8a6a2f;
    --s4:16px;
    --pad:clamp(18px,2.4vw,28px);
    --gutter:clamp(16px,3vw,36px);
    --gap:clamp(24px,3.4vw,36px);
    --shell:110rem;                     /* widest the app shell ever gets */
    --panel-min:clamp(12.5rem,22vh,20rem);
    --code-max:clamp(13rem,40vh,26rem);
    --r:12px; --r-lg:16px;
    --shadow:0 1px 2px rgba(20,24,22,.05), 0 20px 44px -22px rgba(20,24,22,.32);
  }
  html{ -webkit-text-size-adjust:100%; }
  body{
    margin:0; min-height:100vh; min-height:100dvh; color:var(--ink);
    display:flex; flex-direction:column;
    background:radial-gradient(115vw 60vh at 8% -12%, #e8f2f0 0%, transparent 62%), var(--paper);
    font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased;
    padding:clamp(20px,4vh,36px) var(--gutter) clamp(24px,5vh,40px);
  }
  .page{ flex:1 1 auto; width:100%; max-width:var(--shell); margin:0 auto; min-width:0;
         display:flex; flex-direction:column; }
  /* Desktop: the page takes exactly 80% of the viewport width (still capped
     by --shell on ultra-wide screens); the body's side gutters are removed
     here so the percentage is exact. Below 70rem the gutters return and the
     page stays full width so phones and narrow windows keep every usable
     pixel. */
  @media (min-width:70rem){
    body{ padding-left:0; padding-right:0; }
    .page{ width:80%; }
  }
  .content{ width:100%; margin:auto; }

  .topbar{ display:flex; align-items:center; gap:14px; margin-bottom:var(--gap); }
  .mark{ width:clamp(2.5rem,3.4vw,3rem); height:clamp(2.5rem,3.4vw,3rem); flex:none;
         display:grid; place-items:center; border-radius:13px; color:var(--accent);
         background:var(--accent-soft); border:1px solid var(--accent-line); }
  .titles{ min-width:0; }
  h1{ margin:0; font-size:clamp(19px,1vw + 12px,22px); font-weight:650; letter-spacing:-.018em; }
  .titles p{ margin:3px 0 0; color:var(--muted); font-size:14px; }

  /* Two columns inside .content: the left column stacks the topbar over the
     panel, the right column is the aside. The track lists below are
     deliberately free of var()/math functions: a track list that fails to parse
     silently collapses the grid to a single column, and a var() that resolves
     to an unparseable value does the same. Keep them literal and step the
     sidebar width with the breakpoints underneath. */
  .layout{ display:grid; grid-template-columns:minmax(0,1fr) 14rem;
           gap:var(--gap); align-items:start; }
  .maincol{ min-width:0; display:flex; flex-direction:column; }
  .panel{ background:var(--surface); border:1px solid var(--line); border-radius:var(--r-lg);
          padding:var(--pad); box-shadow:var(--shadow); min-width:0;
          display:flex; flex-direction:column; min-height:var(--panel-min); }

  .fields{ display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));
           gap:var(--s4); margin-bottom:var(--s4); }
  .field{ min-width:0; }
  label{ display:block; margin-bottom:6px; font-size:13px; font-weight:600; color:var(--ink-2); }
  input{ width:100%; min-height:clamp(2.875rem,3.4vw,3.25rem); padding:.7rem .875rem;
         color:var(--ink); background:#fdfdfc;
         border:1px solid var(--line-2); border-radius:10px; outline:none;
         font:16px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;
         transition:border-color .16s, box-shadow .16s, background .16s; }
  input::placeholder{ color:#a8adaa; }
  input:hover{ border-color:#c7ccc6; }
  input:focus{ border-color:var(--accent); background:#fff; box-shadow:0 0 0 4px var(--accent-ring); }
  input.invalid{ border-color:var(--danger); box-shadow:0 0 0 4px rgba(161,58,34,.16); }

  .control{ position:relative; }
  .control input{ padding-right:clamp(3.25rem,4vw,3.5rem); }
  .peek{ position:absolute; right:.3rem; top:50%; transform:translateY(-50%);
         width:clamp(2.375rem,3vw,2.625rem); height:clamp(2.375rem,3vw,2.625rem);
         display:grid; place-items:center; padding:0;
         border:0; border-radius:9px; background:none; color:var(--muted); cursor:pointer;
         transition:background .16s, color .16s; }
  .peek:hover{ background:var(--accent-soft); color:var(--accent); }
  .peek:focus-visible{ outline:2px solid var(--accent-2); outline-offset:1px; }

  .formmsg{ margin:0 0 var(--s4); padding:10px 12px; border-radius:10px; font-size:13.5px;
            color:var(--danger-ink); background:var(--danger-soft); border:1px solid var(--danger-line); }

  .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px;
        min-height:clamp(2.875rem,3.4vw,3.125rem); padding:.6rem 1.1rem;
        border:1px solid transparent; border-radius:10px;
        font:600 15px system-ui,sans-serif; cursor:pointer; white-space:nowrap;
        transition:background .16s, border-color .16s, color .16s, transform .06s, box-shadow .16s; }
  .btn:active{ transform:translateY(1px); }
  .btn:focus-visible{ outline:2px solid var(--accent-2); outline-offset:2px; }
  .btn-primary{ background:var(--accent); color:#fff; box-shadow:0 10px 20px -12px rgba(14,111,101,.95); }
  .btn-primary:hover{ background:var(--accent-2); }
  .btn-ghost{ background:var(--surface); color:var(--ink-2); border-color:var(--line-2); }
  .btn-ghost:hover{ border-color:var(--accent); color:var(--accent); }
  .btn-text{ background:none; border-color:transparent; color:var(--muted); padding:0 8px; }
  .btn-text:hover{ color:var(--accent); }
  #go{ width:100%; max-width:22rem; }
  #form{ margin-block:0 auto; }

  .hidden{ display:none !important; }
  .enter{ animation:enter .42s cubic-bezier(.2,.75,.25,1) both; }
  @keyframes enter{ from{ opacity:0; transform:translateY(10px) scale(.99); } to{ opacity:1; transform:none; } }

  #status, #error{ margin-block:auto; }
  #status{ display:flex; flex-direction:column; align-items:center; gap:var(--s4);
           padding:24px 0; text-align:center; }
  .spinner{ width:clamp(2.25rem,3.6vw,2.75rem); height:clamp(2.25rem,3.6vw,2.75rem);
            border-radius:50%;
            background:conic-gradient(from 0turn, var(--accent-soft), var(--accent));
            -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 0);
            mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 0);
            animation:spin .9s linear infinite; }
  @keyframes spin{ to{ transform:rotate(1turn); } }
  .bar{ width:100%; height:3px; border-radius:3px; background:#eceee9; overflow:hidden; position:relative; }
  .bar::after{ content:""; position:absolute; inset:0; width:38%;
               background:linear-gradient(90deg,transparent,var(--accent),transparent);
               animation:scan 1.2s ease-in-out infinite; }
  @keyframes scan{ 0%{ transform:translateX(-100%); } 100%{ transform:translateX(260%); } }
  .log{ margin:0; color:var(--muted); font-size:13.5px; }
  .log b{ color:var(--accent); font-weight:600; }

  .banner{ display:flex; align-items:center; gap:10px; margin:0 0 var(--s4);
           font-size:15px; color:var(--ink-2); }
  .banner b{ color:var(--ink); }
  .tick{ width:22px; height:22px; flex:none; display:grid; place-items:center; border-radius:50%;
         background:var(--accent-soft); color:var(--accent); border:1px solid var(--accent-line);
         font-size:13px; font-weight:700; }

  .facts{ display:grid; grid-template-columns:repeat(auto-fit,minmax(min(12rem,100%),1fr));
          gap:1px; margin:0 0 var(--s4); background:var(--line);
          border:1px solid var(--line); border-radius:var(--r); overflow:hidden; }
  .facts>div{ padding:11px 14px; min-width:0; background:var(--surface); }
  .facts dt{ margin-bottom:2px; font-size:12px; color:var(--muted); }
  .facts dd{ margin:0; font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
             color:var(--ink); overflow-wrap:anywhere; }

  .codebox{ position:relative; border:1px solid var(--line); border-radius:var(--r);
            overflow:hidden; background:var(--sunken); }
  .codebox::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:26px;
                   pointer-events:none; background:linear-gradient(transparent, var(--sunken)); }
  .codebar{ display:flex; align-items:center; gap:9px; padding:10px 13px;
            border-bottom:1px solid var(--line); background:var(--surface); }
  .cdot{ width:9px; height:9px; flex:none; border-radius:50%; background:#d6dad4; }
  .filename{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
             color:var(--ink-2); font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace; }
  .cmeta{ margin-left:auto; flex:none; color:var(--muted);
          font:12px ui-monospace,SFMono-Regular,Menlo,monospace; }
  pre{ margin:0; padding:14px; max-height:var(--code-max); overflow:auto;
       font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--ink-2);
       white-space:pre-wrap; overflow-wrap:anywhere; }
  pre:focus-visible{ outline:2px solid var(--accent-2); outline-offset:-3px; }
  pre code{ background:none; border:0; padding:0; color:inherit; font:inherit; }
  .c-com{ color:var(--c-com); font-style:italic; }
  .c-str{ color:var(--c-str); }
  .c-api{ color:var(--accent-2); font-weight:600; }

  .actions{ display:flex; align-items:center; gap:10px; margin-top:var(--s4); flex-wrap:wrap; }
  .actions .spacer{ flex:1 1 auto; }

  #error{ display:grid; grid-template-columns:auto 1fr; gap:6px 12px; padding:14px 16px;
          background:var(--danger-soft); border:1px solid var(--danger-line); border-radius:var(--r); }
  .warn{ width:22px; height:22px; display:grid; place-items:center; border-radius:50%;
         background:#f3d9d0; color:var(--danger); font-size:13px; font-weight:700; }
  #error .msg{ margin:0; align-self:center; color:var(--danger-ink); font-size:14.5px; }
  #error .btn{ grid-column:2; justify-self:start; margin-top:6px; }

  .aside{ min-width:0; }
  .aside h2{ margin:0 0 14px; font-size:13px; font-weight:600; color:var(--muted); }
  .steps{ margin:0; padding:0; list-style:none; counter-reset:s; }
  .steps li{ counter-increment:s; position:relative; padding:0 0 16px 34px;
             color:var(--ink-2); font-size:14.5px; animation:enter .4s cubic-bezier(.2,.75,.25,1) both;
             animation-delay:calc(var(--i,0) * 55ms); }
  .steps li:last-child{ padding-bottom:0; }
  .steps li::before{ content:counter(s); position:absolute; left:0; top:1px; width:24px; height:24px;
                     display:grid; place-items:center; border-radius:50%; font-size:12px; font-weight:600;
                     color:var(--accent); background:var(--accent-soft); border:1px solid var(--accent-line); }
  .steps li::after{ content:""; position:absolute; left:11.5px; top:28px; bottom:2px; width:1px;
                    background:var(--line); }
  .steps li:last-child::after{ display:none; }
  .steps b{ color:var(--ink); font-weight:600; }
  code{ padding:1px 5px; border-radius:5px; background:var(--accent-soft); color:var(--accent-2);
        font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace; }
  .note{ margin:16px 0 0; padding-top:14px; border-top:1px solid var(--line);
         color:var(--muted); font-size:13.5px; }

  .foot{ margin-top:var(--gap); padding-top:16px; border-top:1px solid var(--line);
         color:var(--muted); font-size:13px; }

  .sr{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden;
       clip:rect(0 0 0 0); white-space:nowrap; border:0; }

  @media (min-width:70rem){
    .layout{ grid-template-columns:minmax(0,1fr) 18rem; }
  }
  @media (min-width:88rem){
    .layout{ grid-template-columns:minmax(0,1fr) 22rem; }
  }
  @media (max-width:44rem){
    .layout{ grid-template-columns:1fr; }
  }
  @media (max-width:34rem){
    #go{ max-width:none; }
    .panel{ min-height:0; }
    .actions .btn{ flex:1 1 auto; }
    .actions .spacer{ display:none; }
  }
  @media (prefers-reduced-motion: reduce){
    *,*::before,*::after{ animation-duration:.01ms !important; animation-iteration-count:1 !important;
                          transition-duration:.01ms !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="content">
   <div class="layout">
    <div class="maincol">
      <header class="topbar">
        <span class="mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l7 3v5c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6l7-3z"></path>
            <path d="M9.2 12.1l2 2 3.6-3.8"></path>
          </svg>
        </span>
        <div class="titles">
          <h1>VMC Session Injector</h1>
          <p>Sign in once, then inject that session into any device you open.</p>
        </div>
      </header>

      <main class="panel">
      <form id="form" novalidate>
        <p id="formMsg" class="formmsg hidden" role="alert">
          Enter both the roll number and the activation code.
        </p>
        <div class="fields">
          <div class="field">
            <label for="roll">Roll number</label>
            <input id="roll" name="roll" autocomplete="off" spellcheck="false" placeholder="09P26000591">
          </div>
          <div class="field">
            <label for="code">Activation code</label>
            <div class="control">
              <input id="code" name="code" type="password" autocomplete="off" placeholder="As issued with your roll number">
              <button id="peek" class="peek" type="button" aria-label="Show activation code" aria-pressed="false">
                <span id="icoShow" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"></path>
                    <circle cx="12" cy="12" r="2.6"></circle>
                  </svg>
                </span>
                <span id="icoHide" class="hidden" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3l18 18"></path>
                    <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9"></path>
                    <path d="M6.2 6.6C3.6 8.4 2 12 2 12s3.6 6 10 6c1.5 0 2.9-.3 4.2-.9"></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
        <button id="go" class="btn btn-primary" type="submit">Generate injector</button>
      </form>

      <section id="status" class="hidden" aria-live="polite" aria-busy="true">
        <div class="spinner" aria-hidden="true"></div>
        <p class="log" id="log"></p>
        <div class="bar" aria-hidden="true"></div>
      </section>

      <section id="result" class="hidden" aria-live="polite">
        <p class="banner">
          <span class="tick" aria-hidden="true">&#10003;</span>
          Session ready for <b id="who"></b>
        </p>
        <dl class="facts">
          <div><dt>Roll number</dt><dd id="fRoll"></dd></div>
          <div><dt>User ID</dt><dd id="fUser"></dd></div>
        </dl>
        <div class="codebox">
          <div class="codebar">
            <span class="cdot" aria-hidden="true"></span>
            <span class="filename" id="fName">inject_session.js</span>
            <span class="cmeta" id="fMeta"></span>
          </div>
          <pre tabindex="0" aria-label="Generated injector snippet"><code id="jsOut"></code></pre>
        </div>
        <div class="actions">
          <button id="copy" class="btn btn-primary" type="button">Copy snippet</button>
          <button id="download" class="btn btn-ghost" type="button">Download .js</button>
          <span class="spacer"></span>
          <button id="again" class="btn btn-text" type="button">New session</button>
        </div>
      </section>

      <section id="error" class="hidden" role="alert">
        <span class="warn" aria-hidden="true">!</span>
        <p class="msg" id="errText"></p>
        <button id="retry" class="btn btn-ghost" type="button">Try again</button>
      </section>
      </main>
    </div>

    <aside class="aside">
      <h2>How to use</h2>
      <ol class="steps">
        <li style="--i:0">Open <b>studentweb.vidyamandir.com</b> on the device you want signed in.</li>
        <li style="--i:1">Open the browser console. On desktop press <code>F12</code> and choose Console.</li>
        <li style="--i:2">Copy the snippet, paste it into the console, and press <code>Enter</code>.</li>
        <li style="--i:3">The tab reloads into <code>/learn</code>, already signed in.</li>
      </ol>
      ${notice}
    </aside>
  </div>
  </div>

  <footer class="foot">
    ${footer}
  </footer>
</div>
<p id="live" class="sr" aria-live="polite"></p>

<script type="module" src="./assets/client.js"></script>
</body>
</html>
`;
}
