export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
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
    --s4:16px; --s9:36px;
    --r:12px; --r-lg:16px;
    --shadow:0 1px 2px rgba(20,24,22,.05), 0 20px 44px -22px rgba(20,24,22,.32);
  }
  html{ -webkit-text-size-adjust:100%; }
  body{
    margin:0; min-height:100vh; color:var(--ink); display:flex; flex-direction:column;
    background:radial-gradient(1100px 560px at 8% -12%, #e8f2f0 0%, transparent 62%), var(--paper);
    font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased;
    padding:var(--s9) var(--s4) 40px;
  }
  .page{ flex:1 1 auto; width:100%; max-width:960px; margin:0 auto;
         display:flex; flex-direction:column; }

  .topbar{ display:flex; align-items:center; gap:14px; margin-bottom:var(--s9); }
  .mark{ width:46px; height:46px; flex:none; display:grid; place-items:center;
         border-radius:13px; color:var(--accent); background:var(--accent-soft);
         border:1px solid var(--accent-line); }
  .titles{ min-width:0; }
  h1{ margin:0; font-size:22px; font-weight:650; letter-spacing:-.018em; }
  .titles p{ margin:3px 0 0; color:var(--muted); font-size:14px; }

  .layout{ flex:1 1 auto; display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);
           gap:var(--s9); align-items:start; }
  .panel{ background:var(--surface); border:1px solid var(--line); border-radius:var(--r-lg);
          padding:28px; box-shadow:var(--shadow);
          display:flex; flex-direction:column; min-height:300px; }

  .field{ margin-bottom:var(--s4); }
  label{ display:block; margin-bottom:6px; font-size:13px; font-weight:600; color:var(--ink-2); }
  input{ width:100%; height:48px; padding:0 14px; color:var(--ink); background:#fdfdfc;
         border:1px solid var(--line-2); border-radius:10px; outline:none;
         font:16px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
         transition:border-color .16s, box-shadow .16s, background .16s; }
  input::placeholder{ color:#a8adaa; }
  input:hover{ border-color:#c7ccc6; }
  input:focus{ border-color:var(--accent); background:#fff; box-shadow:0 0 0 4px var(--accent-ring); }
  input.invalid{ border-color:var(--danger); box-shadow:0 0 0 4px rgba(161,58,34,.16); }

  .control{ position:relative; }
  .control input{ padding-right:50px; }
  .peek{ position:absolute; right:5px; top:50%; transform:translateY(-50%);
         width:40px; height:40px; display:grid; place-items:center; padding:0;
         border:0; border-radius:9px; background:none; color:var(--muted); cursor:pointer;
         transition:background .16s, color .16s; }
  .peek:hover{ background:var(--accent-soft); color:var(--accent); }
  .peek:focus-visible{ outline:2px solid var(--accent-2); outline-offset:1px; }

  .formmsg{ margin:0 0 var(--s4); padding:10px 12px; border-radius:10px; font-size:13.5px;
            color:var(--danger-ink); background:var(--danger-soft); border:1px solid var(--danger-line); }

  .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px;
        min-height:46px; padding:0 18px; border:1px solid transparent; border-radius:10px;
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
  #go{ width:100%; }

  .hidden{ display:none !important; }
  .enter{ animation:enter .42s cubic-bezier(.2,.75,.25,1) both; }
  @keyframes enter{ from{ opacity:0; transform:translateY(10px) scale(.99); } to{ opacity:1; transform:none; } }

  #status, #error{ margin-block:auto; }
  #status{ display:flex; flex-direction:column; align-items:center; gap:var(--s4);
           padding:24px 0; text-align:center; }
  .spinner{ width:38px; height:38px; border-radius:50%;
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

  .facts{ display:grid; grid-template-columns:1fr 1fr; margin:0 0 var(--s4);
          border:1px solid var(--line); border-radius:var(--r); overflow:hidden; }
  .facts>div{ padding:11px 14px; min-width:0; }
  .facts>div+div{ border-left:1px solid var(--line); }
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
  pre{ margin:0; padding:14px; max-height:300px; overflow:auto;
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

  .foot{ margin-top:var(--s9); padding-top:16px; border-top:1px solid var(--line);
         color:var(--muted); font-size:13px; }

  .sr{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden;
       clip:rect(0 0 0 0); white-space:nowrap; border:0; }

  @media (max-width:880px){
    .layout{ grid-template-columns:1fr; gap:28px; }
  }
  @media (max-width:520px){
    body{ padding:20px 14px 32px; }
    .panel{ padding:20px; min-height:0; }
    h1{ font-size:20px; }
    .facts{ grid-template-columns:1fr; }
    .facts>div+div{ border-left:0; border-top:1px solid var(--line); }
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

  <div class="layout">
    <main class="panel">
      <form id="form" novalidate>
        <p id="formMsg" class="formmsg hidden" role="alert">
          Enter both the roll number and the activation code.
        </p>
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

    <aside class="aside">
      <h2>How to use</h2>
      <ol class="steps">
        <li style="--i:0">Open <b>studentweb.vidyamandir.com</b> on the device you want signed in.</li>
        <li style="--i:1">Open the browser console. On desktop press <code>F12</code> and choose Console.</li>
        <li style="--i:2">Copy the snippet, paste it into the console, and press <code>Enter</code>.</li>
        <li style="--i:3">The tab reloads into <code>/learn</code>, already signed in.</li>
      </ol>
    </aside>
  </div>

  <footer class="foot">
    Runs only on this machine at 127.0.0.1. Credentials are used for this one request and never stored.
  </footer>
</div>
<p id="live" class="sr" aria-live="polite"></p>

<script>
  const $ = (id) => document.getElementById(id);
  const form = $('form'), status = $('status'), result = $('result'), error = $('error');
  const phrases = [
    'Contacting the VMC API',
    'Verifying your credentials',
    'Reading the student profile',
    'Composing the session',
    'Writing the injector snippet'
  ];
  const HL = /(\\/\\/[^\\n]*)|('(?:\\\\.|[^'\\\\])*')|\\b(localStorage\\.setItem|localStorage\\.clear|window\\.location\\.href|console\\.log)\\b/g;
  const COUNT = /localStorage\\.setItem/g;
  let js = '', filename = 'inject_session.js', timer = null, i = 0;

  function reveal(el) {
    el.classList.remove('hidden');
    el.classList.remove('enter');
    void el.offsetWidth;
    el.classList.add('enter');
  }
  function hide(el) { el.classList.add('hidden'); el.classList.remove('enter'); }
  function showFormMsg(on) { $('formMsg').classList.toggle('hidden', !on); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function highlight(code) {
    let out = '', last = 0, m;
    HL.lastIndex = 0;
    while ((m = HL.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c-com' : (m[2] ? 'c-str' : 'c-api');
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  }

  function startLoading() {
    hide(form); hide(result); hide(error); showFormMsg(false);
    reveal(status);
    i = 0;
    const tick = () => { $('log').innerHTML = '<b>&gt;</b> ' + phrases[i % phrases.length]; i++; };
    tick();
    timer = setInterval(tick, 950);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rollEl = $('roll'), codeEl = $('code');
    const roll = rollEl.value.trim(), code = codeEl.value.trim();
    rollEl.classList.toggle('invalid', !roll);
    codeEl.classList.toggle('invalid', !code);
    if (!roll || !code) {
      showFormMsg(true);
      (!roll ? rollEl : codeEl).focus();
      return;
    }
    startLoading();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll, code })
      });
      const data = await res.json();
      clearInterval(timer);
      if (!data.ok) { showError(data.error || 'Login failed.'); return; }
      js = data.js; filename = data.filename;
      $('jsOut').innerHTML = highlight(js);
      $('who').textContent = data.name || 'unknown';
      $('fRoll').textContent = data.roll || 'Not returned';
      $('fUser').textContent = data.userId || 'Not returned';
      $('fName').textContent = filename;
      const bytes = new TextEncoder().encode(js).length;
      const keys = (js.match(COUNT) || []).length;
      $('fMeta').textContent = keys + ' keys \\u00b7 ' +
        (bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB');
      hide(status);
      reveal(result);
    } catch (err) {
      clearInterval(timer);
      showError('Could not reach the local server. Check that it is still running.');
    }
  });

  ['roll', 'code'].forEach((id) => $(id).addEventListener('input', () => {
    $(id).classList.remove('invalid');
    showFormMsg(false);
  }));

  $('peek').addEventListener('click', () => {
    const inp = $('code'), btn = $('peek');
    const showing = inp.type === 'password';
    inp.type = showing ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(showing));
    btn.setAttribute('aria-label', showing ? 'Hide activation code' : 'Show activation code');
    $('icoShow').classList.toggle('hidden', showing);
    $('icoHide').classList.toggle('hidden', !showing);
    inp.focus();
  });

  function showError(msg) {
    hide(form); hide(status); hide(result);
    $('errText').textContent = msg;
    reveal(error);
  }

  $('copy').addEventListener('click', async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(js);
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = js; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      t.remove();
    }
    const b = $('copy'), old = b.textContent;
    b.textContent = ok ? 'Copied' : 'Copy failed';
    $('live').textContent = ok ? 'Snippet copied to clipboard.' : 'Copy failed. Select the code and copy it manually.';
    setTimeout(() => { b.textContent = old; }, 1600);
  });

  $('download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    $('live').textContent = filename + ' downloaded.';
  });

  $('again').addEventListener('click', reset);
  $('retry').addEventListener('click', reset);
  function reset() {
    $('roll').value = ''; $('code').value = '';
    $('roll').classList.remove('invalid'); $('code').classList.remove('invalid');
    $('code').type = 'password';
    $('peek').setAttribute('aria-pressed', 'false');
    $('peek').setAttribute('aria-label', 'Show activation code');
    $('icoShow').classList.remove('hidden'); $('icoHide').classList.add('hidden');
    showFormMsg(false);
    hide(result); hide(error); hide(status);
    reveal(form);
    $('roll').focus();
  }
</script>
</body>
</html>
`;
