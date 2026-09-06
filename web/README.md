# Mazer (web rebuild)

Mobile-first rebuild of Mazer as a single self-contained HTML page. No framework, no build dependencies beyond node.

**Play it:** https://claude.ai/code/artifact/4f85ce17-09de-4f3a-8456-70e7b5bbceec

## How the game works

A courier always takes the shortest route from **S** to **E**, visiting numbered stops in order. You spend a limited energy budget placing walls (1 energy) or clearing natural rocks (2–5 energy, shown on the puzzle chip) to force the courier onto the longest, most valuable route. Gold zones multiply every step inside them. A move that would trap the courier is rejected. Score = Σ (average zone multiplier × step length) × 100, exactly as in the original.

## Layout

- `src/engine.js` — deterministic core: seeded RNG, A* (8-way, no corner cutting), procedural generation, scoring, move validation and solution verification. Runs in node and the browser.
- `src/render.js` — 16-bit pixel-art renderer. All art is generated at runtime: 16×16 tiles painted into a pixel buffer (ground styles, dithered gold floors, autotiled cliffs and brick walls with 4-shade palette ramps per biome), sprites defined as string maps (crystal, chest, flag, courier walk cycle, sparkle), a 3×5 pixel font, and pixel-snapped zoom. No image files.
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

## Leaderboard

Entries are stored per seed as `scores/<seed>/entries/<playerId>` and carry the player's move list. Every client re-verifies each entry by replaying the moves against the regenerated maze, so tampered scores are dropped on read.

Adapters, in `src/app.js`:
- Claude artifact `db` capability (current hosting). Shared with everyone who can open the artifact.
- Local fallback (localStorage) when no database is available.

To host elsewhere, serve `dist/standalone.html`, set `window.MAZER_SHARE_URL` in `src/template.html`, and swap the db adapter for your own API.
