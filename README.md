# 🎬 Velvet Cinema

A retro **Y2K velvet-cinema** movie & TV streaming site. Browse and search films
and shows, then step into a darkened theater — red velvet curtains part, a
film-leader countdown rolls, and the feature plays behind grain, vignette and a
projector flicker. Hit fullscreen and it strips away to a clean picture.

- **Front-end:** a pure **static site** (`web/`) — no build step, no framework.
  Plain HTML/CSS/JS + a single vendored library (`hls.js`). Host it anywhere.
- **Back-end:** **[CinePro Core](https://github.com/cinepro-org/core)** (`cinepro/`),
  vendored here so you can upload and host it yourself. It resolves the actual
  streams and proxies them for the browser.
- **Metadata:** browsing/search/posters come from **[TMDB](https://www.themoviedb.org/)**
  (called directly from the browser, since this is a static site).
- Fully **responsive / mobile-friendly** and tuned for **low-end devices**
  (GPU-only effects, an auto-reducing effects mode, small images, tiny DOM).

```
.
├── web/        ← the website you host (static files)
└── cinepro/    ← CinePro Core, the streaming backend you host
```

---

## Quick start (5 minutes)

### 0. Get a TMDB API key (free)
Create an account at TMDB → **Settings → API** → request a **v3 API Key**.
You'll use the same key in two places below.

### 1. Run the backend — CinePro Core
Requires **Node.js 20+**.

```bash
cd cinepro
npm install
cp .env.example .env
#   then edit .env and set:  TMDB_API_KEY=xxxxxxxx
npm run dev          # dev server on http://localhost:3000
#   (production: `npm run build && npm start`, or use the included Dockerfile)
```

Leave it running. Sources are fetched from `http://localhost:3000`.

### 2. Configure the front-end
Open **`web/config.js`** and set three things:

```js
TMDB_API_KEY: "your_tmdb_key_here",   // same key as the backend
CINEPRO_BASE: "http://localhost:3000", // where CinePro is running (no trailing slash)
MOCK: false,                           // turn OFF demo mode to go live
```

### 3. Serve the front-end
It's just static files — any static server works:

```bash
cd web
python3 -m http.server 8080
# open http://localhost:8080
```

That's it. Browse a title → **Enter the Theater** → enjoy.

---

## Demo mode (no key, no backend)

Want to see the look and feel first? `web/config.js` ships with **`MOCK: true`**.
In this mode the site runs entirely on bundled demo data and a public sample
video — **no TMDB key and no running CinePro required**. Just serve `web/` and
open it. Set `MOCK: false` when you're ready to go live.

---

## Hosting for real

- **Front-end (`web/`)** is static — drop it on any static host (Netlify, Vercel,
  GitHub Pages, Cloudflare Pages, nginx, an S3 bucket, …). Edit `config.js`
  before (or after) uploading.
- **Back-end (`cinepro/`)** is a Node service. Run it with `npm start`, the
  included `Dockerfile`/`compose.yml`, or a platform preset (`render.yaml`,
  `vercel.json`, `wrangler.json` are included by CinePro). Point `CINEPRO_BASE`
  in `config.js` at its public URL, e.g. `https://cinepro.yourdomain.tld`.
- Because the browser calls CinePro cross-origin, make sure CinePro's
  **`CORS_ORIGIN`** allows your site (it defaults to `*`, which just works; lock
  it to your domain for a public deployment).

### About the trimmed CinePro config
`cinepro/.env.example` has been trimmed to just what matters: **`TMDB_API_KEY`**
(the only required var) plus `HOST`, `PORT`, and `CORS_ORIGIN`. Everything else
(Redis, Stremio, MCP, debug flags) is optional and left commented out — CinePro
defaults to an in-memory cache and needs no extra services.

---

## Cinema effects & performance

The theater effects (curtains, film-leader countdown, grain, vignette, flicker,
dust) are all **transform/opacity** animations, so they stay smooth on weak
hardware. There's an effects switch in the top bar (also on the theater bar):

| Level | What you get |
|-------|--------------|
| **FULL** | Everything, all the atmosphere. |
| **LITE** | Static grain, no flicker/dust, faster curtains. |
| **OFF**  | No overlays, curtains snap, countdown skipped. |

The site **auto-selects LITE** on low-memory / low-core devices and honors the OS
**"reduce motion"** setting. Your choice is remembered in the browser.

---

## Configuration reference (`web/config.js`)

| Key | Meaning |
|-----|---------|
| `TMDB_API_KEY` | TMDB v3 API key (used for browse/search/metadata). Visible client-side — expected for a static site. |
| `CINEPRO_BASE` | Base URL of your CinePro Core instance. No trailing slash. |
| `MOCK` | `true` = demo data + sample stream (no key/backend needed). `false` = live. |
| `SITE_NAME` / `SITE_TAGLINE` | Branding in the marquee. |
| `POSTER_SIZE` / `BACKDROP_SIZE` / `STILL_SIZE` | TMDB image sizes (kept small for speed). |
| `TMDB_LANG` | TMDB language, e.g. `en-US`. |

---

## How it fits together

```
Browser (web/)
   │  browse / search / posters ───────────────►  TMDB API
   │  "play movie 550"  ───────────────────────►  CinePro Core (cinepro/)
   │                                                   │ resolves + proxies
   │  ◄──────── { sources[], subtitles[] } ────────────┘
   └─ hls.js plays the (already-proxied) HLS stream in the theater
```

CinePro returns stream URLs **already wrapped** as its own `/v1/proxy?...` paths,
so the browser never talks to sketchy upstreams directly and CORS/headers are
handled for you.

---

## Notes & limits

- **Subtitles:** `.vtt` is used directly and `.srt` is converted in-browser.
  `.ass`/`.ssa` (styled) subs are skipped — they're heavy to render client-side.
- **Availability** of any given title depends entirely on what CinePro's sources
  can find; some titles may return no playable source ("the reel jammed").
- CinePro is intended for **personal / home use** — see `cinepro/README.md` and
  its license.

Built with [CinePro](https://github.com/cinepro-org/core),
[TMDB](https://www.themoviedb.org/), and [hls.js](https://github.com/video-dev/hls.js).
