# VMC Session Injector

Turns a VMC roll number + activation code into a JavaScript snippet that writes a
signed-in session into `localStorage`. Paste the snippet into the browser console
on any device and that device lands on `studentweb.vidyamandir.com/learn` already
signed in.

Two deployments share one codebase:

| Target | How the login request is made | Where it runs |
| --- | --- | --- |
| **Local (Node)** | `node:http` server calls the VMC API from your machine | `http://127.0.0.1:8765` |
| **GitHub Pages** | the browser calls the VMC API itself (CORS allows it) | `https://<user>.github.io/vmc-weblogin/` |

Both render the same HTML, the same CSS and the same compiled client bundle, so
the generated snippet is identical no matter where you run it.

## How it works

```
src/injector.ts   shared core: session shape, snippet writer, API call, error mapping
src/client.ts     browser UI: form, spinner, snippet viewer, copy/download (ESM)
src/page.ts       renderPage({ mode }) -> the HTML shell, CSS and markup
src/server.ts     Node server: /  /assets/*  /api/login
src/preview.ts    static file server for the Pages build (npm run preview)
scripts/build-pages.mjs  writes public/index.html from renderPage({ mode: "static" })
```

`injector.ts` imports nothing from Node, and the relative imports use explicit
`.js` extensions, so a single file compiles to CommonJS for the server and to
native ES modules for the browser. Nothing is duplicated and there is no bundler:
TypeScript is the only devDependency.

The mode switch is a `<meta name="vmc-mode" content="server|static">` tag. The
client reads it and picks the transport:

* `server` → `POST /api/login` on the local Node server.
* `static` → `login()` from `./injector.js` directly, straight to the VMC API.

## Local use (Node)

```bash
npm install
npm run build        # dist/ (Node) + public/ (browser bundle and static shell)
npm start            # http://127.0.0.1:8765
```

`npm run dev` builds and starts in one step. `HOST` and `PORT` environment
variables override the defaults (both default to loopback on purpose).

The server only binds `127.0.0.1` and only serves four things:

| Route | Purpose |
| --- | --- |
| `GET /` | the app shell |
| `GET /assets/*` | the compiled browser bundle |
| `POST /api/login` | exchanges roll number + code for the snippet |
| everything else | `404` |

## Previewing the GitHub Pages build

```bash
npm run preview      # builds, then serves public/ on http://127.0.0.1:8766
```

This serves the exact bytes GitHub Pages will host, including the
`vmc-mode=static` shell.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` publishes on every push to `main`:

1. Settings → Pages → **Source: GitHub Actions** (one-time).
2. Push to `main`, or run the workflow manually.

The workflow typechecks, builds, sanity-checks `public/`, uploads it as the Pages
artifact and deploys it. All paths in the shell are relative (`./assets/...`), so
the site works from the `/vmc-weblogin/` subpath without extra configuration.

> GitHub Pages serves static files only and cannot run `src/server.ts`, which is
> why the hosted copy calls the VMC API from the browser. That endpoint answers
> with `access-control-allow-origin: *` and allows the `Content-Type` header, so
> the request is permitted without a proxy. If the API ever drops CORS, the
> hosted mode would need a proxy (Cloudflare Worker, Vercel function, …) while
> the local Node mode would keep working untouched.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | `build:node` + `build:web` + `build:pages` |
| `npm run build:node` | `tsc -p tsconfig.json` → `dist/` |
| `npm run build:web` | `tsc -p tsconfig.web.json` → `public/assets/` |
| `npm run build:pages` | writes `public/index.html` and `public/.nojekyll` |
| `npm start` | runs the compiled local server |
| `npm run dev` | build + start |
| `npm run preview` | build + static server for `public/` |
| `npm run typecheck` | typechecks the Node and the browser projects |
| `npm run clean` | deletes `dist/` and `public/` |

## Notes on the API

`POST https://api-v2-6-0.eapp.vidyamandir.com/mysa/connectorg/organizations/1/login`

```json
{ "loginValue": "<roll number>", "passwordValue": "<activation code>",
  "deviceId": "<uuid v4>", "identityType": "ROLLNUMBER" }
```

The API answers **HTTP 200 for refused credentials**, putting the reason in the
body (`{"error":"No user is found with provided credentials. Please check and try
again."}`). Both transports therefore inspect the body and surface that message
instead of reporting a generic failure.

The `deviceId` is a fresh UUID per request and is written into the snippet, which
is what makes the injected session look like a device the platform has already
seen.

## Generated snippet

The snippet clears `localStorage` and then writes 15 keys — `accessToken`,
`refreshToken`, `userId`, `name`, `deviceId`, `domainId`, `organizationId`,
`appFlavour`, `isUserLoggedIn`, the Amplify/Pinpoint cache entries, the
`persist:viewer` toolbar state and, when the API returns one, the
`CognitoIdentityId-<pool>` key — followed by a redirect to
`studentweb.vidyamandir.com/learn`.

## Privacy

* Nothing is stored, logged or sent anywhere except to the VMC API: the snippet
  is built in memory and returned to the browser tab.
* Local mode keeps the credential exchange on your machine (`127.0.0.1`).
* Hosted mode sends the credentials from the tab to the VMC API. Anyone who can
  reach the URL can use the form, but no credential ever touches the host: the
  page is static.
