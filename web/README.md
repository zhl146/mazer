# Mazer (web rebuild)

Mobile-first rebuild of Mazer as a single self-contained HTML page. No framework, no build dependencies beyond node.

**Play it:** https://claude.ai/code/artifact/4f85ce17-09de-4f3a-8456-70e7b5bbceec

## How the game works

A courier always takes the shortest route from the cottage to the tower, visiting numbered wells in order. He can move diagonally and slips between two blocks that only touch at a corner; only edge-joined walls form a barrier. Press Walk to watch him go, with a speed control. You spend a limited energy budget placing walls (1 energy) or clearing natural rocks (2–5 energy, shown on the puzzle chip) to force the courier onto the longest, most valuable route. Gold zones multiply every step inside them. A move that would trap the courier is rejected. Score = Σ (average zone multiplier × step length) × 100, exactly as in the original.

## Layout

- `src/engine.js` — deterministic core: seeded RNG, A* (8-way, no corner cutting), procedural generation, scoring, move validation and solution verification. Runs in node and the browser.
- `src/render.js` — HD-2D renderer, all art generated at runtime (no image files). 32px tiles painted into a pixel buffer: ground variants per biome, dithered gold zones, a worn dirt trail along the route, cobbled cliffs and wooden palisades with chamfered corners (so diagonal gaps are visible while edge-joined blocks merge), an outline pass, soft cast shadows, procedurally painted cottage / wells / tower and trees. A live layer draws the courier, labels and effects. Post-processing: tilt-shift depth of field, bloom, warm/cool light grade, vignette, light rays and drifting particles (toggle in the menu).
- `src/app.js` — UI, touch/pan/pinch input, persistence, sharing, leaderboard adapters.
- `src/styles.css`, `src/template.html` — chrome.
- `build.js` — concatenates everything into `dist/index.html` (artifact fragment) and `dist/standalone.html` (full document for any static host).
- `test/engine.test.js` — determinism + validity checks across 300 seeds.

```
node web/build.js
node web/test/engine.test.js
```

## Variety

Every seed picks a biome (8 palettes), a wall style (clusters, caves, veins, ruins, scatter), a score-zone shape (diamond, disc, ring, cross), board size, energy budget and rock cost.

Seeds: `daily-YYYY-MM-DD` (UTC) is the shared daily puzzle; the menu also makes random word seeds, and any typed seed works. `?seed=...` in the URL loads a seed directly when hosted standalone.

## Running it (accounts + global leaderboard)

`server.js` is a zero-dependency Node server (node >= 22.13, uses the built-in `node:sqlite`). It serves the game and a small JSON API with username/password accounts. Every submitted score is re-verified on the server by regenerating the maze from its seed and replaying the moves, so a modified client can't post a fake score.

```
cd web
npm start                 # builds, then serves http://localhost:8080
PORT=3000 MAZER_DATA=/var/mazer node server.js
```

Or with Docker (the SQLite file lives in the `/data` volume):

```
docker build -t mazer web
docker run -p 8080:8080 -v mazer-data:/data mazer
```

Put it behind HTTPS (Caddy, nginx, Fly.io, Railway, Render, a Cloudflare tunnel, anything that terminates TLS). Session tokens travel as bearer tokens, so TLS is required for a public deployment.

### API

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| POST | `/api/register` | `{username, password}` | username 3–16 `[A-Za-z0-9_]`, password >= 8 chars. Returns `{token, username}`. |
| POST | `/api/login` | `{username, password}` | Returns `{token, username}`. |
| POST | `/api/logout` | | Bearer token. |
| GET | `/api/me` | | Bearer token → `{user}`. |
| GET | `/api/scores?seed=` | | Top 100 for the seed, plus `me` (your rank) when logged in. |
| POST | `/api/scores` | `{seed, moves}` | Bearer token. Verified server-side; keeps your best per seed. Returns `{score, best, improved, rank, total}`. |
| GET | `/api/solution?seed=&username=` | | A player's move list. Today's daily is withheld until tomorrow. |

Passwords are hashed with scrypt (random 16-byte salt). Sessions last 60 days and are stored hashed. Register and login are rate-limited per IP.

### Two builds

`node build.js` produces:

- `dist/standalone.html` — what the server serves. Talks to `/api`; Submit asks you to log in or create an account.
- `dist/index.html` — the Claude artifact fragment. Artifacts can't make network requests, so this build keeps scores on the device only. It's a shareable demo of the game, not the leaderboard.

To host the page on a different origin from the API, set `CORS_ORIGIN` on the server and change `api` in `build.js`.
