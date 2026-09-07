# Mazer (web rebuild)

Mobile-first rebuild of Mazer as a single self-contained HTML page. No framework, no build dependencies beyond node.

**Play it:** https://mazer-game.fly.dev

## The premise

**The Ley Survey.** A spark of drawn power runs from the focus stone to the beacon, touching each anchor stone in turn. Current takes the path of least resistance, so it follows the easiest ground it can find. You are the surveyor: before you release it you chalk wards across the ground, which the current will not cross, and cut the iron seams that block it. You bank charge for how far the spark runs and how much charged ground it crosses. Run the line long, wind it through the veins, but never close the circuit off from the beacon.

## How the game works

The spark always takes the shortest route from the focus stone to the beacon, touching numbered anchor stones in order. It moves diagonally and slips between two blocks that only touch at a corner, so only edge-joined wards form a barrier. Press Release to watch it run, with a speed control. You spend a limited chalk budget warding tiles (1 chalk) or cutting iron seams (2–5 chalk, shown on the survey chip) to push the line onto the longest, most charged route. Charged ground multiplies every step taken on it. A move that would cut the beacon off is rejected. Charge = Σ (average ground multiplier × step length) × 100, the same scoring as the original game.

## Layout

- `src/engine.js` — deterministic core: seeded RNG, A* (8-way, no corner cutting), procedural generation, scoring, move validation and solution verification. Runs in node and the browser.
- `src/render.js` — HD-2D renderer, all art generated at runtime (no image files). 32px tiles painted into a pixel buffer: ground variants per biome, dithered gold zones, a worn dirt trail along the route, natural highland cliffs and chalked ward stones with chamfered corners (so diagonal gaps are visible while edge-joined blocks merge), an outline pass, soft cast shadows, procedurally painted focus stone / anchor stones / beacon and trees. A live layer draws the ley current, the spark, labels and effects. Post-processing: tilt-shift depth of field, bloom, warm/cool light grade, vignette, light rays and drifting particles (toggle in the menu).
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

### Fly.io (recommended, about $2/month or free under the hobby waiver)

`web/fly.toml` describes one shared-CPU machine that stops when idle, plus a 1GB volume for the database. Two ways to deploy:

- **From GitHub**: add a repository secret `FLY_API_TOKEN` (Settings → Secrets and variables → Actions). `.github/workflows/fly.yml` then creates the app and volume on first run and redeploys on every push that touches `web/`. Run it by hand from the Actions tab, where you can also type a different app name if `mazer-game` is taken. The run summary prints the live URL.
- **From your machine**: `brew install flyctl`, `fly auth login`, then `cd web && fly apps create mazer-game && fly volumes create mazer_data -r sjc -s 1 && fly deploy --ha=false`.

The site comes up at `https://<app-name>.fly.dev`, so `https://mazer-game.fly.dev` by default. Fly app names are globally unique; if that one is taken, pick another when you run the workflow (or pass `-a` to the CLI commands). Fly issues the TLS certificate and takes daily volume snapshots. Keep it at one machine: SQLite can't be shared.

Any other host works too (Railway, a VPS with Caddy, a Cloudflare tunnel) as long as it terminates TLS and gives the container a persistent disk at `/data`. Session tokens travel as bearer tokens, so TLS is required for a public deployment.

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
