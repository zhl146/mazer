/* Mazer engine — deterministic, dependency-free.
 * Works in the browser (globalThis.Mazer) and in node (module.exports).
 * Everything here must stay deterministic: the leaderboard verifies
 * submitted solutions by regenerating the maze from its seed and replaying moves.
 */
(function (root, factory) {
  const api = factory();
  root.Mazer = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ---------- seeded random ---------- */
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const s = cyrb128(String(seed));
    const rnd = sfc32(s[0], s[1], s[2], s[3]);
    for (let i = 0; i < 12; i++) rnd();
    const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const chance = (p) => rnd() < p;
    return { rnd, int, pick, chance };
  }

  /* ---------- grid helpers ---------- */
  const idx = (cols, x, y) => y * cols + x;
  const inBounds = (g, x, y) => x >= 0 && y >= 0 && x < g.cols && y < g.rows;

  /* ---------- A* (8-way, diagonals always allowed, octile heuristic) ----------
   * Two blocks that touch only at a corner do NOT stop the courier; he slips between them.
   * Only orthogonally joined blocks form a barrier. */
  const DIRS = [
    [0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1],
    [1, -1, Math.SQRT2], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];
  function octile(dx, dy) {
    dx = Math.abs(dx); dy = Math.abs(dy);
    return dx > dy ? dx + (Math.SQRT2 - 1) * dy : dy + (Math.SQRT2 - 1) * dx;
  }
  // Binary heap keyed on f, ties broken by insertion order (deterministic).
  function Heap() { this.a = []; this.n = 0; }
  Heap.prototype.push = function (f, node) {
    const a = this.a; a.push([f, this.n++, node]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (less(a[i], a[p])) { const t = a[i]; a[i] = a[p]; a[p] = t; i = p; } else break;
    }
  };
  Heap.prototype.pop = function () {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && less(a[l], a[m])) m = l;
        if (r < a.length && less(a[r], a[m])) m = r;
        if (m === i) break;
        const t = a[i]; a[i] = a[m]; a[m] = t; i = m;
      }
    }
    return top[2];
  };
  Heap.prototype.size = function () { return this.a.length; };
  function less(u, v) { return u[0] < v[0] || (u[0] === v[0] && u[1] < v[1]); }

  /** walls: Uint8Array (1 = blocked). Returns array of [x,y] or null. */
  function findPath(walls, cols, rows, sx, sy, ex, ey) {
    const n = cols * rows;
    const start = sy * cols + sx, goal = ey * cols + ex;
    if (walls[start] || walls[goal]) return null;
    const g = new Float64Array(n).fill(Infinity);
    const parent = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open = new Heap();
    g[start] = 0;
    open.push(octile(ex - sx, ey - sy), start);
    while (open.size()) {
      const cur = open.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) break;
      const cx = cur % cols, cy = (cur - cx) / cols;
      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (walls[ni] || closed[ni]) continue;
        const ng = g[cur] + DIRS[d][2];
        if (ng < g[ni] - 1e-9) {
          g[ni] = ng; parent[ni] = cur;
          open.push(ng + octile(ex - nx, ey - ny), ni);
        }
      }
    }
    if (!closed[goal]) return null;
    const path = [];
    for (let c = goal; c !== -1; c = parent[c]) path.push([c % cols, (c - (c % cols)) / cols]);
    path.reverse();
    return path;
  }

  /** Route through every waypoint in order. Returns {segments, ok}. */
  function routeWaypoints(walls, cols, rows, waypoints) {
    const segments = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i], b = waypoints[i + 1];
      const seg = findPath(walls, cols, rows, a[0], a[1], b[0], b[1]);
      if (!seg) return { segments, ok: false };
      segments.push(seg);
    }
    return { segments, ok: true };
  }

  /* ---------- scoring ---------- */
  const BASE_SCORE_MOD = 100;
  function scorePath(segments, scoreMod, cols) {
    let total = 0;
    for (const seg of segments) {
      for (let i = 1; i < seg.length; i++) {
        const [ax, ay] = seg[i - 1], [bx, by] = seg[i];
        const dist = ax !== bx && ay !== by ? Math.SQRT2 : 1;
        const avg = (scoreMod[idx(cols, ax, ay)] + scoreMod[idx(cols, bx, by)]) / 2;
        total += avg * dist;
      }
    }
    return Math.round(total * BASE_SCORE_MOD);
  }

  /* ---------- biomes & variety tables ---------- */
  const BIOMES = [
    { id: "meadow", groundStyle: "grass", flower: "#ff6b8a", name: "Meadow", ground: ["#7fb96a", "#8cc47a", "#74ad60"], zone: "#f2c94c", rock: "#6b6f64", rockTop: "#8e9287", stone: "#d8cfbb", stoneTop: "#f0e8d6", path: "#ff7a45", water: null },
    { id: "dunes", groundStyle: "sand", flower: "#ff6b3d", name: "Dunes", ground: ["#e0bf82", "#e6c890", "#d8b675"], zone: "#ff8e3c", rock: "#a5643a", rockTop: "#c98252", stone: "#efe7d0", stoneTop: "#fbf6ea", path: "#2f6fed" },
    { id: "tundra", groundStyle: "snow", flower: "#7fb7ff", name: "Tundra", ground: ["#c9d8e2", "#d5e1ea", "#bfcfdb"], zone: "#ffb347", rock: "#5d6b7a", rockTop: "#7f8e9d", stone: "#e9eef2", stoneTop: "#ffffff", path: "#e0407a" },
    { id: "ember", groundStyle: "ash", flower: "#ff9a3c", name: "Ember", ground: ["#4a3a3a", "#524040", "#423333"], zone: "#ff9a3c", rock: "#1f1717", rockTop: "#3a2b2b", stone: "#8d6b5a", stoneTop: "#b08a76", path: "#ffd54a" },
    { id: "abyss", groundStyle: "stone", flower: "#4fe3c1", name: "Abyss", ground: ["#233650", "#2a3f5c", "#1e2f47"], zone: "#4fe3c1", rock: "#0e1522", rockTop: "#1b2638", stone: "#6a86a8", stoneTop: "#8fa9c8", path: "#ff6fb1" },
    { id: "orchard", groundStyle: "grass", flower: "#ff4d6d", name: "Orchard", ground: ["#a7c957", "#b3d264", "#9bbf4d"], zone: "#f4a261", rock: "#5b4a3a", rockTop: "#7d6a55", stone: "#e9d8a6", stoneTop: "#f7ebc3", path: "#e63946" },
    { id: "marsh", groundStyle: "grass", flower: "#c8e55a", name: "Marsh", ground: ["#5c7f5a", "#668a63", "#547552"], zone: "#c8e55a", rock: "#3b4a3f", rockTop: "#57695b", stone: "#b7b39a", stoneTop: "#d4d0b8", path: "#ffb703" },
    { id: "lavender", groundStyle: "grass", flower: "#ffd166", name: "Lavender", ground: ["#b8a9d9", "#c4b6e2", "#ad9dd0"], zone: "#ffd166", rock: "#4b3f6b", rockTop: "#6a5b90", stone: "#efe9fb", stoneTop: "#ffffff", path: "#06d6a0" },
  ];
  const WALL_STYLES = ["clusters", "caves", "veins", "ruins", "scatter"];
  const ZONE_SHAPES = ["diamond", "disc", "ring", "cross"];

  /* ---------- generation ---------- */
  const DEFAULT_KNOBS = {
    minSize: 14, maxSize: 30,
    minActionPoints: 10,
    minRemovalCost: 2, maxRemovalCost: 5,
  };

  function generate(seed, overrides) {
    const K = Object.assign({}, DEFAULT_KNOBS, overrides || {});
    const R = makeRng(seed);

    const biome = R.pick(BIOMES);
    const wallStyle = R.pick(WALL_STYLES);
    const zoneShape = R.pick(ZONE_SHAPES);

    const d1 = R.int(K.minSize, K.maxSize), d2 = R.int(K.minSize, K.maxSize);
    // portrait-leaning: mobile screens are tall
    const cols = Math.min(d1, d2), rows = Math.max(d1, d2);
    const n = cols * rows;
    const size = Math.sqrt(n);

    const walls = new Uint8Array(n);      // current blockers
    const natural = new Uint8Array(n);    // was a natural blocker at generation
    const scoreMod = new Float32Array(n).fill(1);
    const protectedT = new Uint8Array(n);

    /* walls by style */
    const fillClusters = () => {
      const seeds = R.int(10, Math.max(12, Math.floor(n / 45)));
      for (let s = 0; s < seeds; s++) {
        const sx = R.int(0, cols - 1), sy = R.int(0, rows - 1);
        const decay = R.int(3, 10) / 10;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const dist = Math.hypot(x - sx, y - sy);
          if (R.rnd() < Math.exp(-decay * dist)) walls[idx(cols, x, y)] = 1;
        }
      }
    };
    const fillCaves = () => {
      const fill = R.int(38, 46) / 100;
      for (let i = 0; i < n; i++) walls[i] = R.chance(fill) ? 1 : 0;
      const iters = R.int(3, 5);
      for (let it = 0; it < iters; it++) {
        const next = new Uint8Array(n);
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; // open borders
            c += walls[idx(cols, nx, ny)];
          }
          next[idx(cols, x, y)] = c >= 5 ? 1 : c <= 2 ? 0 : walls[idx(cols, x, y)];
        }
        walls.set(next);
      }
    };
    const fillVeins = () => {
      const walkers = R.int(6, Math.max(8, Math.floor(n / 40)));
      for (let w = 0; w < walkers; w++) {
        let x = R.int(0, cols - 1), y = R.int(0, rows - 1);
        let dir = R.int(0, 3);
        const len = R.int(Math.floor(size), Math.floor(size * 2.2));
        for (let s = 0; s < len; s++) {
          walls[idx(cols, x, y)] = 1;
          if (R.chance(0.25)) dir = (dir + (R.chance(0.5) ? 1 : 3)) % 4;
          const [dx, dy] = DIRS[dir];
          x += dx; y += dy;
          if (x < 0 || y < 0 || x >= cols || y >= rows) { x = Math.max(0, Math.min(cols - 1, x)); y = Math.max(0, Math.min(rows - 1, y)); dir = (dir + 2) % 4; }
        }
      }
    };
    const fillRuins = () => {
      const rooms = R.int(4, Math.max(5, Math.floor(n / 60)));
      for (let r = 0; r < rooms; r++) {
        const w = R.int(3, Math.min(9, cols - 2)), h = R.int(3, Math.min(9, rows - 2));
        const x0 = R.int(0, cols - w), y0 = R.int(0, rows - h);
        for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) {
          const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
          if (edge && !R.chance(0.22)) walls[idx(cols, x, y)] = 1;
        }
      }
      // a few loose stones
      const loose = Math.floor(n * 0.03);
      for (let i = 0; i < loose; i++) walls[idx(cols, R.int(0, cols - 1), R.int(0, rows - 1))] = 1;
    };
    const fillScatter = () => {
      const density = R.int(14, 24) / 100;
      for (let i = 0; i < n; i++) walls[i] = R.chance(density) ? 1 : 0;
    };
    ({ clusters: fillClusters, caves: fillCaves, veins: fillVeins, ruins: fillRuins, scatter: fillScatter })[wallStyle]();

    /* waypoints: choose vertices on free tiles, route through them, carve where needed */
    const numVertices = Math.max(3, Math.floor((R.int(6, 10) / 10) * size));
    let numWaypoints = 0; // extra waypoints between start and end
    for (let i = 0; i < numVertices / 5; i++) if (R.chance(0.45)) numWaypoints++;
    numWaypoints = Math.min(numWaypoints, 4);

    const freeTile = () => {
      for (let tries = 0; tries < 5000; tries++) {
        const x = R.int(0, cols - 1), y = R.int(0, rows - 1);
        const i = idx(cols, x, y);
        if (!walls[i] && !protectedT[i]) return [x, y];
      }
      return null;
    };
    const vertices = [];
    for (let i = 0; i < numVertices; i++) {
      const p = freeTile();
      if (p) vertices.push(p);
    }
    // spread start and end apart: start = first vertex, end = farthest vertex from it
    let farI = 1, farD = -1;
    for (let i = 1; i < vertices.length; i++) {
      const d = Math.hypot(vertices[i][0] - vertices[0][0], vertices[i][1] - vertices[0][1]);
      if (d > farD) { farD = d; farI = i; }
    }
    const endV = vertices.splice(farI, 1)[0];
    vertices.push(endV);

    // route through obstacles; carve a straight corridor when blocked
    const empty = new Uint8Array(n);
    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i], b = vertices[i + 1];
      let seg = findPath(walls, cols, rows, a[0], a[1], b[0], b[1]);
      if (!seg) {
        seg = findPath(empty, cols, rows, a[0], a[1], b[0], b[1]);
        for (const [x, y] of seg) walls[idx(cols, x, y)] = 0;
      }
      for (const [x, y] of seg) protectedT[idx(cols, x, y)] = 1;
    }
    // pick waypoints: start, end, plus a few interior vertices
    const interior = vertices.slice(1, -1);
    while (interior.length > numWaypoints) interior.splice(R.int(0, interior.length - 1), 1);
    const waypoints = [vertices[0]].concat(interior, [vertices[vertices.length - 1]]);
    for (const [x, y] of waypoints) walls[idx(cols, x, y)] = 0;

    // mark natural
    natural.set(walls);

    /* score zones */
    const numZones = R.int(1, Math.max(2, Math.floor(n / 220)));
    const zones = [];
    for (let z = 0; z < numZones; z++) {
      const cx = R.int(1, cols - 2), cy = R.int(1, rows - 2);
      const radius = R.int(2, 5);
      const power = 7 - radius; // small zones are hot, big zones are mild (as in the original)
      zones.push({ x: cx, y: cy, r: radius, power, shape: zoneShape });
      for (let y = cy - radius; y <= cy + radius; y++) for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const dx = x - cx, dy = y - cy;
        let inside;
        switch (zoneShape) {
          case "disc": inside = dx * dx + dy * dy <= radius * radius + 0.5; break;
          case "ring": { const d = Math.sqrt(dx * dx + dy * dy); inside = d <= radius + 0.5 && d >= Math.max(0, radius - 1.6); break; }
          case "cross": inside = Math.abs(dx) <= 1 || Math.abs(dy) <= 1; break;
          default: inside = Math.abs(dx) + Math.abs(dy) <= radius;
        }
        if (inside) scoreMod[idx(cols, x, y)] += power;
      }
    }

    const maxActionPoints = K.minActionPoints + Math.round((R.int(5, 15) / 10) * size);
    const removalCost = R.int(K.minRemovalCost, K.maxRemovalCost);

    const route = routeWaypoints(walls, cols, rows, waypoints);
    const baseScore = scorePath(route.segments, scoreMod, cols);

    return {
      seed: String(seed), cols, rows, biome, wallStyle, zoneShape,
      walls, natural, scoreMod, zones, waypoints,
      maxActionPoints, removalCost, baseScore,
      baseSegments: route.segments,
    };
  }

  /* ---------- play state ---------- */
  function isWaypoint(game, x, y) {
    return game.waypoints.some((w) => w[0] === x && w[1] === y);
  }
  /** Cost of toggling tile (x,y) given current walls. */
  function toggleCost(game, walls, x, y) {
    const i = idx(game.cols, x, y);
    if (game.natural[i]) return walls[i] ? game.removalCost : -game.removalCost;
    return walls[i] ? -1 : 1;
  }
  /** Try a toggle. Returns {ok, reason, walls, ap, segments, score}. */
  function tryToggle(game, walls, ap, x, y) {
    if (!inBounds(game, x, y)) return { ok: false, reason: "out of bounds" };
    if (isWaypoint(game, x, y)) return { ok: false, reason: "waypoint" };
    const cost = toggleCost(game, walls, x, y);
    if (ap - cost < 0) return { ok: false, reason: "energy" };
    const next = new Uint8Array(walls);
    const i = idx(game.cols, x, y);
    next[i] = next[i] ? 0 : 1;
    const route = routeWaypoints(next, game.cols, game.rows, game.waypoints);
    if (!route.ok) return { ok: false, reason: "blocked" };
    return { ok: true, walls: next, ap: ap - cost, segments: route.segments, score: scorePath(route.segments, game.scoreMod, game.cols) };
  }
  /** Diff of current walls against natural state → list of [x,y]. */
  function diffMoves(game, walls) {
    const out = [];
    for (let i = 0; i < walls.length; i++) if (walls[i] !== game.natural[i]) out.push([i % game.cols, (i - (i % game.cols)) / game.cols]);
    return out;
  }
  /** Verify a submitted solution: returns {ok, score, ap} (score = 0 when invalid). */
  function verifySolution(game, moves) {
    if (!Array.isArray(moves)) return { ok: false, score: 0 };
    const walls = new Uint8Array(game.natural);
    let ap = game.maxActionPoints;
    const seen = new Set();
    for (const m of moves) {
      if (!Array.isArray(m) || m.length !== 2) return { ok: false, score: 0 };
      const x = m[0] | 0, y = m[1] | 0;
      const key = x + "," + y;
      if (seen.has(key) || !inBounds(game, x, y) || isWaypoint(game, x, y)) return { ok: false, score: 0 };
      seen.add(key);
      ap -= toggleCost(game, walls, x, y);
      if (ap < 0) return { ok: false, score: 0 };
      const i = idx(game.cols, x, y);
      walls[i] = walls[i] ? 0 : 1;
    }
    const route = routeWaypoints(walls, game.cols, game.rows, game.waypoints);
    if (!route.ok) return { ok: false, score: 0 };
    return { ok: true, score: scorePath(route.segments, game.scoreMod, game.cols), ap };
  }

  /* ---------- seeds ---------- */
  const WORDS_A = ["amber", "brisk", "cobalt", "dusky", "ember", "frost", "gilded", "hollow", "ivory", "jade", "keen", "lunar", "mossy", "nimble", "opal", "pale", "quiet", "rusty", "silver", "tidal", "umber", "velvet", "wild", "young", "zesty"];
  const WORDS_B = ["fox", "heron", "otter", "lynx", "raven", "badger", "moth", "crane", "wolf", "newt", "ibis", "hare", "stoat", "finch", "koi", "yak", "gecko", "bison", "owl", "eel"];
  const WORDS_C = ["path", "gate", "ridge", "hollow", "vale", "marsh", "spire", "grove", "delta", "bluff", "reach", "wick", "ford", "cairn", "glen"];
  function randomSeed(rand) {
    const r = rand || Math.random;
    const p = (a) => a[Math.floor(r() * a.length)];
    return p(WORDS_A) + "-" + p(WORDS_B) + "-" + p(WORDS_C);
  }
  function dailySeed(date) {
    const d = date || new Date();
    const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, "0"), dd = String(d.getUTCDate()).padStart(2, "0");
    return "daily-" + y + "-" + m + "-" + dd;
  }
  function sanitizeSeed(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_\-.~:@+]/g, "").slice(0, 60);
  }

  return {
    makeRng, findPath, routeWaypoints, scorePath, generate, tryToggle, toggleCost, isWaypoint,
    diffMoves, verifySolution, randomSeed, dailySeed, sanitizeSeed, BIOMES, WALL_STYLES, ZONE_SHAPES, idx,
  };
});
