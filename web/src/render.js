/* Mazer renderer — HD-2D village style, generated at runtime (no image files).
 * 32px tiles, warm dark outlines on everything, a worn dirt trail for the route, procedurally painted
 * buildings and trees, natural highland cliffs and wooden palisades, plus post-processing (tilt-shift depth
 * of field, bloom, light grade, vignette, light rays, drifting particles). */
(function (root) {
  "use strict";
  const T = 32;       // pixels per tile
  const H = 8;        // block height in pixels
  const PAD = 40;     // world padding (room for the tower roof and canopies)
  const CH = 12;      // chamfer on convex corners: shows the diagonal gap the spark slips through
  const INK = [30, 23, 16];

  /* ---------- colour helpers ---------- */
  function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(c, t, p) { return [Math.round(c[0] + (t[0] - c[0]) * p), Math.round(c[1] + (t[1] - c[1]) * p), Math.round(c[2] + (t[2] - c[2]) * p)]; }
  function shade(c, amt) { return amt < 0 ? mix(c, [24, 18, 14], -amt) : mix(c, [255, 250, 232], amt); }
  function ramp5(hex) { const c = hexToRgb(hex); return [shade(c, -0.6), shade(c, -0.3), c, shade(c, 0.2), shade(c, 0.45)]; }
  const rgba = (hex, a) => { const c = hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const lerp = (a, b, t) => a + (b - a) * t;
  function vnoise(x, y, sc) { // smooth value noise on world coords
    const gx = Math.floor(x / sc), gy = Math.floor(y / sc), fx = x / sc - gx, fy = y / sc - gy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(hash2(gx, gy), hash2(gx + 1, gy), u), lerp(hash2(gx, gy + 1), hash2(gx + 1, gy + 1), u), v);
  }
  function worley(wx, wy, cell) { // nearest two jittered cell seeds → irregular flagstones
    const cx = Math.floor(wx / cell), cy = Math.floor(wy / cell);
    let d1 = 1e9, d2 = 1e9, id = 0, sx1 = 0, sy1 = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const sx = (gx + 0.15 + hash2(gx * 3 + 11, gy * 7 + 5) * 0.7) * cell, sy = (gy + 0.15 + hash2(gy * 5 + 3, gx * 11 + 9) * 0.7) * cell;
      const d = Math.hypot(wx + 0.5 - sx, wy + 0.5 - sy);
      if (d < d1) { d2 = d1; d1 = d; id = gx * 7919 + gy * 104729; sx1 = sx; sy1 = sy; } else if (d < d2) d2 = d;
    }
    return { d1, d2, id, sx: sx1, sy: sy1 };
  }

  /* ---------- sprite buffer & painters ---------- */
  function Sprite(w, h) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); }
  Sprite.prototype.set = function (x, y, col) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col; };
  Sprite.prototype.get = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.c[y * this.w + x] : null; };
  Sprite.prototype.rect = function (x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col); };
  Sprite.prototype.disc = function (cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, col);
    }
  };
  Sprite.prototype.line = function (x0, y0, x1, y1, col) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { this.set(x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  Sprite.prototype.outline = function (ink) { // inner outline: filled pixels touching emptiness
    const out = this.c.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!this.c[y * this.w + x]) continue;
      if (!this.get(x - 1, y) || !this.get(x + 1, y) || !this.get(x, y - 1) || !this.get(x, y + 1)) out[y * this.w + x] = ink;
    }
    this.c = out; return this;
  };
  Sprite.prototype.toCanvas = function () {
    const cv = document.createElement("canvas"); cv.width = this.w; cv.height = this.h;
    const img = new ImageData(this.w, this.h);
    for (let i = 0; i < this.c.length; i++) { const c = this.c[i]; if (!c) continue; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    cv.getContext("2d").putImageData(img, 0, 0); return cv;
  };
  function fromRows(rows, pal, flip) {
    const sp = new Sprite(rows[0].length, rows.length);
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[0].length; x++) { const ch = rows[y][x]; if (ch !== ".") sp.set(flip ? sp.w - 1 - x : x, y, hexToRgb(pal[ch])); }
    return sp;
  }

  // The spark: a mote of drawn power running the line. Two frames so it breathes.
  const SPARK_PAL = { k: "#0a2030", c: "#3fbcd8", W: "#eafcff" };
  const ART = {
    sparkA: { pal: SPARK_PAL, rows: [
      "...........", ".....k.....", "....kck....", "...kcWck...", "..kcWWWck..", ".kcWWWWWck.", "..kcWWWck..", "...kcWck...", "....kck....", ".....k.....", "..........."] },
    sparkB: { pal: SPARK_PAL, rows: [
      "...........", "...........", ".....k.....", "....kck....", "...kcWck...", "..kcWWWck..", "...kcWck...", "....kck....", ".....k.....", "...........", "..........."] },
    sparkle: { pal: { w: "#ffffff", W: "#cdf6ff" }, rows: ["...w...", "...w...", "...W...", "wwWWWww", "...W...", "...w...", "...w..."] },
  };

  const TREE_PALS = {
    round: { dark: [31, 84, 46], mid: [58, 128, 62], light: [120, 190, 90], trunk: [92, 60, 34], trunkL: [130, 88, 52] },
    autumn: { dark: [130, 60, 30], mid: [200, 100, 40], light: [240, 170, 80], trunk: [82, 52, 30], trunkL: [120, 80, 48] },
    crimson: { dark: [120, 34, 40], mid: [190, 62, 60], light: [235, 120, 100], trunk: [82, 52, 30], trunkL: [120, 80, 48] },
    pine: { dark: [22, 63, 44], mid: [38, 98, 64], light: [96, 160, 110], trunk: [70, 46, 28], trunkL: [100, 70, 44] },
  };
  function paintTree(kind, seed) {
    const P = TREE_PALS[kind] || TREE_PALS.round, sp = new Sprite(30, 40);
    const r = (i) => hash2(seed * 7 + i, seed * 13 + kind.length);
    if (kind === "pine") {
      for (let tier = 0; tier < 3; tier++) {
        const y0 = 2 + tier * 9, y1 = y0 + 13;
        for (let y = y0; y < y1; y++) { const hw = 2 + (y - y0) * 0.9 + (hash2(y, seed) < 0.3 ? 1 : 0); for (let x = Math.round(15 - hw); x <= Math.round(15 + hw); x++) sp.set(x, y, x < 14 ? P.light : x > 16 ? P.dark : P.mid); }
      }
      sp.rect(13, 29, 5, 9, P.trunk); sp.rect(13, 29, 2, 9, P.trunkL);
    } else {
      const blobs = [[15, 15, 12, 10], [8, 19, 8, 7], [22, 19, 8, 7], [15, 8, 8, 6], [11, 12, 6, 5], [19, 11, 6, 5]];
      for (const [cx, cy, rx, ry] of blobs) sp.disc(cx + Math.round(r(cx) * 2 - 1), cy, rx, ry, P.mid);
      for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) {
        if (!sp.get(x, y)) continue;
        const h = hash2(x + seed * 31, y + seed * 17);
        if (y > 18 && h < 0.75) sp.set(x, y, P.dark); else if (y > 13 && h < 0.35) sp.set(x, y, P.dark);
        else if (y < 12 && x < 18 && h < 0.5) sp.set(x, y, P.light);
        else if (h < 0.12) sp.set(x, y, P.dark); else if (h > 0.9) sp.set(x, y, P.light);
      }
      sp.disc(10, 8, 3, 2, P.light); sp.disc(17, 6, 2, 1.5, P.light);
      sp.rect(13, 26, 5, 12, P.trunk); sp.rect(13, 26, 2, 12, P.trunkL); sp.rect(11, 36, 9, 2, P.trunk);
    }
    return sp.outline(INK);
  }
  function paintDead(seed) {
    const sp = new Sprite(30, 40), c = [74, 58, 46], l = [104, 84, 66];
    sp.rect(13, 20, 5, 18, c); sp.rect(13, 20, 2, 18, l);
    for (const [x1, y1] of [[4, 6], [26, 4], [8, 14], [23, 12], [15, 2]]) { sp.line(15, 22, x1, y1, c); sp.line(16, 22, x1 + 1, y1, c); }
    return sp.outline(INK);
  }
  function paintCactus() {
    const sp = new Sprite(30, 40), c = [52, 140, 84], l = [120, 200, 130];
    sp.rect(12, 8, 7, 30, c); sp.rect(12, 8, 2, 30, l); sp.disc(15.5, 8, 3.5, 3, c);
    sp.rect(4, 14, 5, 12, c); sp.rect(4, 24, 9, 4, c); sp.disc(6.5, 14, 2.5, 2, c);
    sp.rect(22, 10, 5, 14, c); sp.rect(18, 22, 9, 4, c); sp.disc(24.5, 10, 2.5, 2, c);
    return sp.outline(INK);
  }
  function paintShard() {
    const sp = new Sprite(30, 40), d = [31, 110, 136], m = [63, 184, 216], l = [184, 244, 255];
    const tri = (cx, top, base, hw) => { for (let y = top; y <= base; y++) { const w = hw * (y - top) / (base - top); for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) sp.set(x, y, x < cx ? l : x > cx ? d : m); } };
    tri(15, 6, 36, 6); tri(7, 16, 36, 4); tri(23, 14, 36, 4);
    return sp.outline(INK);
  }
  const GRANITE = { D: [96, 92, 88], M: [150, 146, 140], L: [198, 194, 188], G: [150, 238, 255] };
  function graniteAt(x, y, hw, left, right) { // shaded column pixel: lit on the left, dark on the right
    const hv = hash2(x * 3 + 7, y * 5 + 3);
    if (x < left + 2) return GRANITE.L;
    if (x > right - 2) return GRANITE.D;
    return hv < 0.14 ? GRANITE.D : hv > 0.87 ? GRANITE.L : GRANITE.M;
  }
  // Start of the line: a trilithon, two uprights under a lintel, with a cut ring that still holds light.
  function paintFocus() {
    const sp = new Sprite(36, 40);
    const slab = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) sp.set(x, y, graniteAt(x, y, 0, x0, x0 + w - 1)); };
    slab(4, 15, 9, 24); slab(23, 15, 9, 24);
    slab(1, 4, 34, 12);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 36; x++) {
      if (!sp.get(x, y)) continue;
      const d = Math.hypot(x - 18, y - 10);
      if (d > 2.4 && d < 4.2) sp.set(x, y, GRANITE.G);
    }
    return sp.outline(INK);
  }
  // Each waypoint: a leaning standing stone with a cut rune.
  function paintMenhir() {
    const sp = new Sprite(28, 40);
    for (let y = 6; y < 38; y++) {
      const t = (y - 6) / 32, hw = 3.8 + t * 3.0, lean = (1 - t) * 1.4;
      const l = Math.round(14 - hw + lean), r = Math.round(14 + hw + lean);
      for (let x = l; x <= r; x++) sp.set(x, y, graniteAt(x, y, hw, l, r));
    }
    for (let y = 0; y < 40; y++) for (let x = 0; x < 28; x++) {
      if (!sp.get(x, y)) continue;
      const d = Math.hypot(x - 14, y - 21);
      if (d > 2.0 && d < 3.5) sp.set(x, y, GRANITE.G);
    }
    for (let x = 7; x < 22; x++) { const h = 1 + Math.floor(hash2(x, 91) * 2); for (let j = 0; j < h; j++) sp.set(x, 38 - j, j === 0 ? GRANITE.D : GRANITE.M); }
    return sp.outline(INK);
  }
  // End of the line: a stacked cairn carrying a lit crystal.
  function paintBeacon() {
    const sp = new Sprite(26, 60), C = [120, 230, 255], W = [235, 252, 255];
    for (let y = 58; y > 17; y -= 5) {
      const t = (y - 17) / 41, hw = 4.0 + t * 5.4;
      const l = Math.round(13 - hw), r = Math.round(13 + hw);
      for (let j = 0; j < 5 && y - j > 16; j++) for (let x = l; x <= r; x++) sp.set(x, y - j, j === 0 ? GRANITE.D : graniteAt(x, y - j, hw, l, r));
    }
    for (let y = 2; y < 17; y++) {
      const w = y < 9 ? (y - 1) * 0.62 : (16 - y) * 0.78;
      for (let x = Math.round(13 - w); x <= Math.round(13 + w); x++) sp.set(x, y, x < 13 ? W : C);
    }
    return sp.outline(INK);
  }
  function paintGround(style, R, F, seed) {
    const sp = new Sprite(T, T);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const h = hash2(x + seed * 53, y + seed * 97); sp.set(x, y, h < 0.09 ? R[1] : h < 0.15 ? R[3] : R[2]); }
    const r = (i) => hash2(seed * 11 + i, seed * 5 + i * 3);
    const at = (i) => [2 + Math.floor(r(i) * 27), 2 + Math.floor(r(i + 50) * 26)];
    switch (style) {
      case "sand":
        for (let i = 0; i < 3; i++) { const [x, y] = at(i); for (let k = 0; k < 10; k++) sp.set(x + k, y + Math.round(Math.sin(k * 0.8 + i) * 1.2), R[3]); }
        if (r(9) < 0.3) { const [x, y] = at(9); sp.rect(x, y, 3, 2, [150, 145, 140]); sp.rect(x, y + 1, 3, 1, [90, 85, 80]); }
        break;
      case "snow":
        for (let i = 0; i < 4; i++) { const [x, y] = at(i); sp.set(x, y, [255, 255, 255]); }
        if (r(9) < 0.25) { const [x, y] = at(9); sp.rect(x, y, 3, 2, [150, 145, 140]); sp.rect(x, y + 1, 3, 1, [90, 85, 80]); }
        break;
      case "ash":
        for (let i = 0; i < 2; i++) { const [x, y] = at(i); sp.line(x, y, x + 6 + Math.floor(r(i + 7) * 8), y + Math.floor(r(i + 8) * 6) - 3, R[0]); }
        if (r(9) < 0.3) { const [x, y] = at(9); sp.rect(x, y, 2, 2, [255, 120, 60]); }
        break;
      case "stone":
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const ox = i * 16 + Math.floor(r(i + j * 2) * 2), oy = j * 16 + Math.floor(r(i + j * 2 + 10) * 2);
          sp.rect(ox, oy, 16, 1, R[0]); sp.rect(ox, oy, 1, 16, R[0]); sp.rect(ox + 1, oy + 1, 14, 1, R[3]); sp.rect(ox + 1, oy + 1, 1, 14, R[3]);
        }
        break;
      default: // grass
        for (let i = 0; i < 2 + Math.floor(r(1) * 3); i++) {
          const [x, y] = at(i);
          for (let k = 0; k < 3; k++) { const hh = 2 + Math.floor(r(i * 3 + k) * 2); sp.rect(x + k * 2, y - hh, 1, hh + 1, k === 1 ? R[1] : R[3]); sp.set(x + k * 2, y - hh, R[3]); }
        }
        if (r(20) < 0.22) { const [x, y] = at(20); sp.set(x - 1, y, F); sp.set(x + 1, y, F); sp.set(x, y - 1, F); sp.set(x, y + 1, F); sp.set(x, y, [255, 240, 200]); }
        if (r(21) < 0.12) { const [x, y] = at(21); sp.rect(x, y, 3, 2, [150, 145, 140]); sp.rect(x, y + 1, 3, 1, [90, 85, 80]); sp.set(x, y, [190, 186, 180]); }
        if (r(22) < 0.3) sp.disc(at(22)[0], at(22)[1], 4, 2.5, R[1]);
    }
    return sp;
  }

  /* ---------- pixel text ---------- */
  const FONT = {
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"], "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"], "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "001", "001"],
    "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"], "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"],
    "x": ["000", "101", "010", "101", "000"],
  };
  function pixelText(plot, text, x, y, scale, color, outline) {
    let cx = x;
    for (const ch of String(text)) { const g = FONT[ch]; if (!g) { cx += 2 * scale; continue; } if (outline) plot(cx - scale, y - scale, 5 * scale, 7 * scale, outline); cx += 4 * scale; }
    cx = x;
    for (const ch of String(text)) { const g = FONT[ch]; if (!g) { cx += 2 * scale; continue; } for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r][q] === "1") plot(cx + q * scale, y + r * scale, scale, scale, color); cx += 4 * scale; }
  }
  const textWidth = (text, scale) => [...String(text)].reduce((w, ch) => w + (FONT[ch] ? 4 : 2) * scale, 0) - scale;

  /* ---------- biome palettes + atmosphere ---------- */
  const ATMOS = {
    grass: { top: "#ffe9c4", bot: "#b9c8ff", dust: "#ffe27a", ray: "#fff1c8", trees: ["round", "round", "autumn", "crimson"] },
    sand: { top: "#fff0cf", bot: "#e3b98f", dust: "#ffd9a0", ray: "#fff6dc", trees: ["cactus"] },
    snow: { top: "#eaf3ff", bot: "#a9b9e8", dust: "#ffffff", ray: "#e6f0ff", trees: ["pine"] },
    ash: { top: "#ffb48a", bot: "#6d5a8a", dust: "#ff7a2a", ray: "#ffc9a0", trees: ["dead"] },
    stone: { top: "#b9d6ff", bot: "#5a6aa8", dust: "#7ff0ff", ray: "#c8e6ff", trees: ["shard"] },
  };
  const CHANNEL = [[26, 38, 54], [40, 58, 78]], GROOVE = [[92, 196, 226], [150, 232, 250]];
  function palette(b) {
    const style = b.groundStyle || "grass";
    const rockBase = shade(hexToRgb(b.rock), 0.28);
    return { ground: ramp5(b.ground[0]), rock: [shade(rockBase, -0.55), shade(rockBase, -0.25), rockBase, shade(rockBase, 0.18), shade(rockBase, 0.42)], ward: ramp5("#b9b5ad"), zone: hexToRgb(b.zone), zoneHex: b.zone, zoneLight: shade(hexToRgb(b.zone), 0.5), flower: hexToRgb(b.flower || b.path), path: b.path, style, atmos: ATMOS[style] || ATMOS.grass };
  }

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    let game = null, walls = null, segments = [];
    let cache = null, cacheDirty = true, pal = null;
    let view = { scale: 1, ox: 0, oy: 0 };
    let dpr = 1, cssW = 0, cssH = 0;
    const effects = [];
    let hover = null, errorUntil = 0, reduced = false, fx = true, sparkIdx = 0;
    let pathPx = [], rowOverlays = [];
    const hasFilter = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;
    const sprites = {
      sparkA: fromRows(ART.sparkA.rows, ART.sparkA.pal).toCanvas(),
      sparkB: fromRows(ART.sparkB.rows, ART.sparkB.pal).toCanvas(),
      sparkle: fromRows(ART.sparkle.rows, ART.sparkle.pal).toCanvas(),
    };
    let props = null; // per-biome painted sprites
    const scene = document.createElement("canvas"), sctx = scene.getContext("2d");
    const low = document.createElement("canvas"), lctx = low.getContext("2d");
    const low2 = document.createElement("canvas"), l2ctx = low2.getContext("2d");
    const glow = document.createElement("canvas"), gctx = glow.getContext("2d");
    const glow2 = document.createElement("canvas"), g2ctx = glow2.getContext("2d");
    const grade = document.createElement("canvas"), grctx = grade.getContext("2d");
    const LOW = 4;
    let particles = [], gradeStyle = null;

    const worldW = () => game.cols * T + PAD * 2, worldH = () => game.rows * T + PAD * 2;

    function resize(w, h, ratio) {
      cssW = w; cssH = h; dpr = ratio;
      const W = Math.round(w * ratio), Hh = Math.round(h * ratio);
      canvas.width = W; canvas.height = Hh; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      scene.width = W; scene.height = Hh;
      low.width = low2.width = glow.width = glow2.width = Math.max(1, Math.ceil(W / LOW)); low.height = low2.height = glow.height = glow2.height = Math.max(1, Math.ceil(Hh / LOW));
      grade.width = W; grade.height = Hh; gradeStyle = null;
      particles = [];
      const n = Math.round((cssW * cssH) / 14000);
      for (let i = 0; i < n; i++) particles.push({ x: Math.random() * cssW, y: Math.random() * cssH, r: 1 + Math.random() * 2.2, s: 4 + Math.random() * 10, p: Math.random() * Math.PI * 2, a: 0.25 + Math.random() * 0.45 });
    }
    function buildProps() {
      const A = pal.atmos;
      props = {
        trees: A.trees.map((k, i) => (k === "dead" ? paintDead(i) : k === "cactus" ? paintCactus() : k === "shard" ? paintShard() : paintTree(k, i + 1))),
        focus: paintFocus(), beacon: paintBeacon(), menhir: paintMenhir(),
        ground: Array.from({ length: 10 }, (_, i) => paintGround(pal.style, pal.ground, pal.flower, i + 1)),
      };
    }
    function setGame(g, w, segs) { game = g; walls = w; pal = palette(g.biome); gradeStyle = null; buildProps(); setState(w, segs); }
    function setState(w, segs) { walls = w; segments = segs; cacheDirty = true; shapeCache.clear(); buildPathPixels(); }
    function setView(v) { view = v; }
    function setHover(t) { hover = t; }
    function setReducedMotion(v) { reduced = v; }
    function setFx(v) { fx = !!v; }
    function setSpark(i) { sparkIdx = Math.max(0, Math.min(pathPx.length - 1, i | 0)); }
    function pathLength() { return pathPx.length; }
    function flashError() { errorUntil = performance.now() + 450; }
    function addEffect(e) { effects.push(Object.assign({ t0: performance.now() }, e)); }
    const isWall = (x, y) => x >= 0 && y >= 0 && x < game.cols && y < game.rows && walls[y * game.cols + x] === 1;
    // Drawn shape of a block: chamfered top face lifted by H, plus a face extruded from the top face's bottom edge.
    const shapeCache = new Map();
    function shapeOf(tx, ty) {
      const key = ty * game.cols + tx; let sh = shapeCache.get(key); if (sh) return sh;
      const n = isWall(tx, ty - 1), e = isWall(tx + 1, ty), s = isWall(tx, ty + 1), w = isWall(tx - 1, ty);
      const top = new Uint8Array(T * T), bottomRow = new Int8Array(T).fill(-1);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        // distance inward from the nearest open edge or chamfer line; joined sides count as far away
        let d = 99;
        if (!n) d = Math.min(d, y); if (!s) d = Math.min(d, T - 1 - y); if (!w) d = Math.min(d, x); if (!e) d = Math.min(d, T - 1 - x);
        if (!n && !w) d = Math.min(d, (x + y - CH) / 1.414); if (!n && !e) d = Math.min(d, ((T - 1 - x) + y - CH) / 1.414);
        if (!s && !w) d = Math.min(d, (x + (T - 1 - y) - CH) / 1.414); if (!s && !e) d = Math.min(d, ((T - 1 - x) + (T - 1 - y) - CH) / 1.414);
        const wx = tx * T + x, wy = ty * T + y;
        const erode = vnoise(wx, wy, 5) * 3 + vnoise(wx + 77, wy + 31, 13) * 2 - 0.9; // organic edge, up to ~4px in
        if (d >= erode) { top[y * T + x] = 1; if (y > bottomRow[x]) bottomRow[x] = y; }
      }
      sh = { n, e, s, w, top, bottomRow };
      shapeCache.set(key, sh); return sh;
    }
    // Is world pixel (x,y) covered by a drawn block? (top faces reach H px into the tile above)
    function solidAt(x, y) {
      const tx = Math.floor(x / T), ty0 = Math.floor(y / T);
      for (let ty = ty0; ty <= ty0 + 1; ty++) {
        if (!isWall(tx, ty)) continue;
        const sh = shapeOf(tx, ty), lx = x - tx * T, ly = y - ty * T + H; // ly: top-face-local row
        if (lx < 0 || lx >= T) continue;
        if (ly >= 0 && ly < T && sh.top[ly * T + lx]) return true;
        if (!sh.s) { const br = sh.bottomRow[lx]; if (br >= 0 && ly > br && ly <= br + H) return true; }
      }
      return false;
    }

    function buildGrade() {
      const W = grade.width, Hh = grade.height, A = pal.atmos;
      grctx.setTransform(1, 0, 0, 1, 0, 0); grctx.globalCompositeOperation = "source-over";
      const g = grctx.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, A.top); g.addColorStop(1, A.bot);
      grctx.fillStyle = g; grctx.fillRect(0, 0, W, Hh);
      grctx.globalCompositeOperation = "multiply";
      const vig = grctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.35, W / 2, Hh / 2, Math.max(W, Hh) * 0.75);
      vig.addColorStop(0, "rgba(255,255,255,1)"); vig.addColorStop(1, "rgba(120,110,150,1)");
      grctx.fillStyle = vig; grctx.fillRect(0, 0, W, Hh);
      gradeStyle = pal.style;
    }

    /* ---------- static pixel buffer ---------- */
    function buildCache() {
      const W = worldW(), Hh = worldH(), cols = game.cols, rows = game.rows, P = pal;
      const img = new ImageData(W, Hh), d = img.data;
      const cat = new Uint8Array(W * Hh); // 1 rock top, 2 rock face, 3 wood top, 4 wood face, 5 trail, 6 prop
      const solid = new Uint8Array(W * Hh); // block silhouettes, for shadows
      const owner = new Int16Array(W * Hh).fill(-1); // tile row that owns a block/prop pixel (for depth against the spark)
      const set = (x, y, c, k, o) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = y * W + x; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; if (k !== undefined) cat[i] = k; if (o !== undefined) owner[i] = o; };
      const blend = (x, y, c, a) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = (y * W + x) * 4; if (!d[i + 3]) return; d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a; };
      const blit = (sp, ox, oy, k, o) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const c = sp.c[y * sp.w + x]; if (c) set(ox + x, oy + y, c, k, o); } };

      // ground
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) blit(props.ground[Math.floor(hash2(tx, ty) * props.ground.length)], PAD + tx * T, PAD + ty * T, 0);
      // score zones: chunky ordered dither, denser the hotter the zone
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        const m = game.scoreMod[ty * cols + tx]; if (m <= 1) continue;
        const density = Math.min(16, 5 + Math.round((m - 1) * 2.2)), ox = PAD + tx * T, oy = PAD + ty * T;
        const zn = (dx, dy) => { const X = tx + dx, Y = ty + dy; return X >= 0 && Y >= 0 && X < cols && Y < rows && game.scoreMod[Y * cols + X] > 1; };
        const oN = !zn(0, -1), oS = !zn(0, 1), oW = !zn(-1, 0), oE = !zn(1, 0);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          let d = 99; if (oN) d = Math.min(d, y); if (oS) d = Math.min(d, T - 1 - y); if (oW) d = Math.min(d, x); if (oE) d = Math.min(d, T - 1 - x);
          const feather = d >= 99 ? 1 : Math.max(0, Math.min(1, (d + vnoise(tx * T + x, ty * T + y, 6) * 8 - 5) / 8));
          const bv = BAYER[(y >> 1) & 3][(x >> 1) & 3], dd = density * feather;
          if (bv < dd) blend(ox + x, oy + y, bv < dd / 3 ? P.zoneLight : P.zone, 0.85);
        }
      }
      // block silhouettes (top face lifted by H, chamfered convex corners, front face when open below)
      const blocks = [];
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        if (!isWall(tx, ty)) continue;
        const sh = shapeOf(tx, ty);
        const b = { tx, ty, n: sh.n, e: sh.e, s: sh.s, w: sh.w, nat: game.natural[ty * cols + tx] === 1, top: sh.top, bottomRow: sh.bottomRow, ox: PAD + tx * T, oy: PAD + ty * T };
        blocks.push(b);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (b.top[y * T + x]) solid[(b.oy + y - H) * W + b.ox + x] = 1;
        if (!sh.s) for (let x = 0; x < T; x++) { const br = b.bottomRow[x]; if (br < 0) continue; const fh = H - (hash2(tx * T + x, 99) < 0.35 ? 1 : 0); for (let k = 1; k <= fh; k++) solid[(b.oy - H + br + k) * W + b.ox + x] = 1; }
      }
      // the ley channel: ground scorched dark where the current runs, with a lit groove down the middle
      const trail = new Uint8Array(W * Hh), core = new Uint8Array(W * Hh);
      const stampDisc = (mask, cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) { const px = cx + x, py = cy + y; if (px >= 0 && py >= 0 && px < W && py < Hh) mask[py * W + px] = 1; } };
      for (let i = 0; i < pathPx.length; i += 2) { const [x, y] = pathPx[i]; stampDisc(trail, PAD + x, PAD + y, 6 + (hash2(x, y) < 0.4 ? 1 : 0)); stampDisc(core, PAD + x, PAD + y, 2); }
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!trail[i] || solid[i]) continue;
        const h = hash2(x * 3, y * 7);
        blend(x, y, h < 0.2 ? CHANNEL[1] : CHANNEL[0], 0.62);
        if (core[i]) blend(x, y, h < 0.3 ? GROOVE[1] : GROOVE[0], 0.62);
        cat[i] = 5;
      }
      // rubble where a natural rock was cleared: a scar of disturbed earth with outlined rock chunks (tap to restore for a refund)
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        const i = ty * cols + tx; if (!game.natural[i] || walls[i]) continue;
        const ox = PAD + tx * T, oy = PAD + ty * T, R = P.rock, earth = mix(R[1], P.ground[1], 0.45);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          const dx = x - 16, dy = y - 16, rr = Math.sqrt(dx * dx + dy * dy) + (vnoise(ox + x, oy + y, 5) - 0.5) * 8;
          if (rr < 13) blend(ox + x, oy + y, earth, 0.55 * Math.min(1, (13 - rr) / 4));
          if (rr < 12 && hash2(ox + x, oy + y) < 0.06) blend(ox + x, oy + y, R[3], 0.7);
        }
        const nChunks = 4 + Math.floor(hash2(tx + 5, ty + 9) * 3);
        for (let k = 0; k < nChunks; k++) {
          const a = hash2(tx * 3 + k, ty * 5 + 1) * Math.PI * 2, d = 3 + hash2(tx * 7 + k, ty * 3 + 2) * 8;
          const cx = ox + 16 + Math.round(Math.cos(a) * d), cy = oy + 16 + Math.round(Math.sin(a) * d * 0.8);
          const rx = 1.5 + Math.floor(hash2(k, tx + ty) * 2.5), ry = 1 + Math.floor(hash2(k + 3, tx * ty + 1) * 2);
          for (let yy = -Math.ceil(ry) - 1; yy <= Math.ceil(ry) + 1; yy++) for (let xx = -Math.ceil(rx) - 1; xx <= Math.ceil(rx) + 1; xx++) {
            const inner = (xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1, outer = (xx * xx) / ((rx + 1) * (rx + 1)) + (yy * yy) / ((ry + 1) * (ry + 1)) <= 1;
            if (!outer) continue;
            set(cx + xx, cy + yy, !inner ? INK : xx < 0 && yy < 0 ? R[3] : yy > 0 ? R[1] : R[2], 0);
          }
        }
      }
      // soft cast shadows (light from top-left)
      for (let ring = 0; ring < 3; ring++) {
        const a = [0.26, 0.15, 0.07][ring], o = 4 + ring * 3;
        for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { if (solid[y * W + x]) continue; const sx = x - o, sy = y - o; if (sx >= 0 && sy >= 0 && solid[sy * W + sx]) blend(x, y, INK, a); }
      }
      // block faces and tops (row order so lower blocks cover the faces above)
      for (const b of blocks) {
        const R = b.nat ? P.rock : P.ward;
        if (!b.s) for (let x = 0; x < T; x++) { // cliff face: extruded down from the plateau's (wobbly) bottom edge
          const br = b.bottomRow[x]; if (br < 0) continue;
          const fh = H - (hash2(b.tx * T + x, 99) < 0.35 ? 1 : 0);
          for (let k = 1; k <= fh; k++) {
            const y = br + k; let c;
            if (b.nat) { // sod lip, then rocky strata with a few cracks
              const wx = b.tx * T + x, band = Math.floor((k + vnoise(wx, b.ty * 7, 6) * 2.5) / 2.5), lip = 1 + (hash2(wx * 3 + 5, b.ty) < 0.4 ? 1 : 0);
              if (k <= lip) c = k === 1 ? P.ground[1] : P.ground[0];
              else { c = band % 2 ? R[1] : R[2]; if (hash2(wx * 3, b.ty * 11 + k) < 0.05) c = R[0]; }
              if (k >= fh - 1) c = R[0];
            }
            else { const q = x % 6; c = q === 0 ? R[0] : q === 2 ? R[3] : R[2]; if (k >= fh - 1) c = R[0]; }
            set(b.ox + x, b.oy - H + y, c, b.nat ? 2 : 4, b.ty);
          }
        }
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          if (!b.top[y * T + x]) continue;
          const lit = (y >= 2 && b.top[(y - 1) * T + x] && !b.top[(y - 2) * T + x]) || (x >= 2 && b.top[y * T + x - 1] && !b.top[y * T + x - 2]); // one pixel inside a top/left-facing edge
          let c;
          if (b.nat) { // natural highland: earthy grass, rock outcrops and dirt patches from multi-scale noise
            const wx = b.tx * T + x, wy = b.ty * T + y;
            const n1 = vnoise(wx, wy, 13), n2 = vnoise(wx + 500, wy + 300, 5), n3 = vnoise(wx * 0.5 + 900, wy * 0.5 + 700, 29);
            const G = P.ground, hv = hash2(wx * 7 + 1, wy * 3 + 2);
            const rocky = n1 * 0.6 + n2 * 0.4 + (n3 - 0.5) * 0.3;
            const tint = mix(G[1], R[2], P.style === "grass" ? 0.4 : 0.55); // highland base
            if (rocky > 0.62) { c = rocky < 0.655 ? R[1] : n2 > 0.55 ? R[3] : R[2]; if (hv < 0.06) c = R[1]; }
            else if (n3 > 0.6 && n2 > 0.35) { c = mix(R[2], G[1], 0.35); if (hv < 0.08) c = R[1]; else if (hv < 0.14) c = R[3]; }
            else { c = mix(tint, G[2], (n3 - 0.5) * 0.6); if (hv < 0.05) c = mix(c, G[0], 0.5); else if (hv < 0.09) c = mix(c, G[3], 0.6); }
            if (P.style === "snow" && n1 > 0.45 && rocky <= 0.62) c = mix(c, [240, 244, 250], 0.8);
            if (P.style === "ash" && n2 > 0.8 && rocky <= 0.62) c = mix(c, [255, 110, 50], 0.6);
            if (lit) c = mix(c, [255, 250, 232], 0.22);
          } else { // a chalked ward stone: pale kerb carrying a sigil that links to its neighbours
            const hv = hash2(b.tx * 32 + x + 5, b.ty * 32 + y + 9);
            c = hv < 0.16 ? R[1] : hv > 0.86 ? R[4] : R[2];
            if (lit) c = mix(c, [255, 253, 245], 0.3);
            const dx = x - 16, dy = y - 16, d = Math.hypot(dx, dy);
            const ring = d > 4.2 && d < 6.0;
            const spoke = (b.n && Math.abs(dx) < 1.6 && dy < 0) || (b.s && Math.abs(dx) < 1.6 && dy > 0)
              || (b.w && Math.abs(dy) < 1.6 && dx < 0) || (b.e && Math.abs(dy) < 1.6 && dx > 0);
            if (ring || spoke) c = [232, 250, 255];
          }
          set(b.ox + x, b.oy + y - H, c, b.nat ? 1 : 3, b.ty);
        }
      }
      // small boulders and shrubs scattered on the plateaus (per block, hashed, away from the chamfered edges)
      const shrubCol = { grass: [[46, 96, 52], [90, 150, 70]], sand: [[120, 110, 60], [160, 150, 90]], snow: [[40, 80, 56], [230, 236, 244]], ash: [[52, 40, 40], [90, 70, 60]], stone: [[40, 70, 96], [90, 150, 190]] }[P.style];
      for (const b of blocks) {
        if (!b.nat) continue;
        const h1 = hash2(b.tx * 13 + 5, b.ty * 17 + 9), h2 = hash2(b.tx * 19 + 3, b.ty * 23 + 1);
        const R = P.rock, px = b.ox + 6 + Math.floor(h1 * 16), py = b.oy - H + 6 + Math.floor(h2 * 16);
        if (h1 < 0.22) { // boulder
          const rx = 2 + Math.floor(h2 * 2), ry = 1.5 + Math.floor(h1 * 10) % 2;
          for (let dy = -Math.ceil(ry) - 1; dy <= Math.ceil(ry) + 1; dy++) for (let dx = -Math.ceil(rx) - 1; dx <= Math.ceil(rx) + 1; dx++) {
            const inner = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1, outer = (dx * dx) / ((rx + 1) * (rx + 1)) + (dy * dy) / ((ry + 1) * (ry + 1)) <= 1;
            if (!outer) continue;
            const c = !inner ? INK : dx < 0 && dy < 0 ? R[3] : dy > 0 ? R[1] : R[2];
            set(px + dx, py + dy, c, 1, b.ty);
          }
        } else if (h1 > 0.72 && shrubCol) { // shrub
          for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) {
            const d = (dx * dx) / 16 + (dy * dy) / 9; if (d > 1.35) continue;
            const c = d > 0.95 ? INK : hash2(px + dx, py + dy) < 0.22 ? shrubCol[1] : shrubCol[0];
            set(px + dx, py + dy, c, 1, b.ty);
          }
        } else if (h1 > 0.45 && h2 > 0.5 && P.style === "grass") { // tall grass tuft
          for (let k = 0; k < 3; k++) { const hh = 2 + Math.floor(hash2(px + k, py) * 3); for (let j = 0; j <= hh; j++) set(px + k * 2 - 2, py - j, j === hh ? P.ground[3] : P.ground[1], 1, b.ty); }
        }
      }
      // outline pass: dark edge wherever a category meets a different one (joined blocks merge, chamfers show gaps)
      const cat2 = cat.slice();
      for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
        const k = cat2[y * W + x]; if (!k) continue;
        if (cat2[y * W + x - 1] !== k || cat2[y * W + x + 1] !== k || cat2[(y - 1) * W + x] !== k || cat2[(y + 1) * W + x] !== k) set(x, y, INK, k);
      }
      // props: trees on interior plateaus, buildings on the stops
      const propShadow = (cx, cy, rx, ry) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) blend(cx + x, cy + y, INK, 0.28); };
      for (const b of blocks) {
        if (!b.nat || !b.n || hash2(b.tx + 31, b.ty + 17) > 0.14) continue;
        const sp = props.trees[Math.floor(hash2(b.tx, b.ty + 3) * props.trees.length)];
        propShadow(b.ox + 17, b.oy - H + 15, 11, 4);
        blit(sp, b.ox + 1, b.oy - H - 24, 6, b.ty);
      }
      game.waypoints.forEach(([x, y], i) => {
        const ox = PAD + x * T, oy = PAD + y * T, last = i === game.waypoints.length - 1;
        if (i === 0) { propShadow(ox + 16, oy + 24, 17, 5); blit(props.focus, ox - 2, oy - 16, 6, y); }
        else if (last) { propShadow(ox + 16, oy + 22, 11, 4); blit(props.beacon, ox + 3, oy - 34, 6, y); }
        else { propShadow(ox + 16, oy + 24, 10, 4); blit(props.menhir, ox + 2, oy - 14, 6, y); }
      });
      // zone badges
      const plotBuf = (x, y, w, h, c) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) set(x + xx, y + yy, c); };
      for (const z of game.zones) {
        const m = Math.round(game.scoreMod[z.y * cols + z.x]), txt = "x" + m, tw = textWidth(txt, 2);
        const bx = PAD + z.x * T + 16 - Math.floor(tw / 2), by = PAD + z.y * T + 11;
        plotBuf(bx - 3, by - 3, tw + 6, 16, INK); pixelText(plotBuf, txt, bx, by, 2, [255, 240, 200], null);
      }
      // board edge
      for (let x = -2; x <= cols * T + 1; x++) for (let k = 0; k < 2; k++) { set(PAD + x, PAD - 1 - k, INK); set(PAD + x, PAD + rows * T + k, INK); }
      for (let y = -2; y <= rows * T + 1; y++) for (let k = 0; k < 2; k++) { set(PAD - 1 - k, PAD + y, INK); set(PAD + cols * T + k, PAD + y, INK); }

      cache = document.createElement("canvas"); cache.width = W; cache.height = Hh;
      cache.getContext("2d").putImageData(img, 0, 0);
      // per-row overlays of block/prop pixels, drawn in front of the spark when he stands above that row
      rowOverlays = [];
      for (let r = 0; r < rows; r++) {
        const y0 = Math.max(0, PAD + r * T - 36), y1 = Math.min(Hh, PAD + (r + 1) * T);
        const od = new ImageData(W, y1 - y0); let any = false;
        for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x; if (owner[i] !== r) continue;
          const j = ((y - y0) * W + x) * 4; od.data[j] = d[i * 4]; od.data[j + 1] = d[i * 4 + 1]; od.data[j + 2] = d[i * 4 + 2]; od.data[j + 3] = 255; any = true;
        }
        if (!any) { rowOverlays.push(null); continue; }
        const cv = document.createElement("canvas"); cv.width = W; cv.height = y1 - y0; cv.getContext("2d").putImageData(od, 0, 0);
        rowOverlays.push({ cv, y0 });
      }
      cacheDirty = false;
    }

    /* ---------- route pixels: the road centreline, bent to keep clear of blocks ---------- */
    function buildPathPixels() {
      pathPx = [];
      if (!game) return;
      const pts = [];
      for (let i = 0; i < segments.length; i++) for (let k = i === 0 ? 0 : 1; k < segments[i].length; k++) pts.push(segments[i][k]);
      if (!pts.length) return;
      // 1px samples along the straight centre-to-centre polyline
      const raw = [];
      for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0] * T + 16, ay = pts[i - 1][1] * T + 16, bx = pts[i][0] * T + 16, by = pts[i][1] * T + 16;
        const n = Math.ceil(Math.hypot(bx - ax, by - ay));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) raw.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
      }
      if (!raw.length) raw.push([pts[0][0] * T + 16, pts[0][1] * T + 16]);
      // push each sample away from the drawn block silhouettes within R px (chamfered channels centre the line)
      const R = 10;
      const bent = raw.map(([x, y]) => {
        let ox = 0, oy = 0;
        const px = Math.round(x), py = Math.round(y);
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          const d2 = dx * dx + dy * dy; if (d2 === 0 || d2 > R * R) continue;
          if (!solidAt(px + dx, py + dy)) continue;
          const d = Math.sqrt(d2), wgt = (R - d) / R;
          ox -= (dx / d) * wgt; oy -= (dy / d) * wgt;
        }
        const m = Math.hypot(ox, oy); if (m > 0) { const k = Math.min(R, m * 0.9) / m; ox *= k; oy *= k; }
        return [x + ox, y + oy];
      });
      // smooth, then resample to whole pixels with a facing direction
      for (let pass = 0; pass < 3; pass++) for (let i = 2; i < bent.length - 2; i++) {
        bent[i] = [(bent[i - 2][0] + bent[i - 1][0] + bent[i][0] + bent[i + 1][0] + bent[i + 2][0]) / 5, (bent[i - 2][1] + bent[i - 1][1] + bent[i][1] + bent[i + 1][1] + bent[i + 2][1]) / 5];
      }
      // guarantee: every road point sits on a free pixel (nudge to the nearest free one)
      for (let i = 0; i < bent.length; i++) {
        let x = Math.round(bent[i][0]), y = Math.round(bent[i][1]);
        if (!solidAt(x, y)) continue;
        let best = null, bd = Infinity;
        for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { const d2 = dx * dx + dy * dy; if (d2 < bd && !solidAt(x + dx, y + dy)) { bd = d2; best = [x + dx, y + dy]; } }
        if (best) bent[i] = best;
      }
      let dir = 1;
      for (let i = 0; i < bent.length; i++) {
        const x = Math.round(bent[i][0]), y = Math.round(bent[i][1]);
        const ahead = bent[Math.min(bent.length - 1, i + 4)][0] - bent[Math.max(0, i - 4)][0];
        if (Math.abs(ahead) > 0.5) dir = Math.sign(ahead);
        const last = pathPx[pathPx.length - 1];
        if (last && last[0] === x && last[1] === y) continue;
        pathPx.push([x, y, dir]);
      }
      sparkIdx = Math.min(sparkIdx, Math.max(0, pathPx.length - 1));
    }

    /* ---------- scene ---------- */
    function worldTransform(c, scale) {
      c.setTransform(dpr / scale, 0, 0, dpr / scale, 0, 0);
      c.translate(Math.round(view.ox * dpr) / dpr, Math.round(view.oy * dpr) / dpr);
      c.scale(view.scale, view.scale);
    }
    function drawScene(c, now) {
      c.clearRect(0, 0, scene.width, scene.height);
      worldTransform(c, 1);
      c.imageSmoothingEnabled = false;
      c.drawImage(cache, -PAD, -PAD);
      const rect = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      if (hover) {
        const hx = hover[0] * T, hy = hover[1] * T;
        c.fillStyle = "rgba(255,255,255,0.16)"; c.fillRect(hx, hy, T, T);
        const corner = (cx, cy, dx, dy) => { rect(cx, cy, 7 * dx, 2 * dy, "#fff"); rect(cx, cy, 2 * dx, 7 * dy, "#fff"); };
        c.save(); c.translate(hx, hy); corner(0, 0, 1, 1); c.translate(T, 0); corner(0, 0, -1, 1); c.translate(0, T); corner(0, 0, -1, -1); c.translate(-T, 0); corner(0, 0, 1, -1); c.restore();
      }
      // the current: a steady thread with bright pulses running toward the beacon
      const err = now < errorUntil;
      for (let i = 0; i < pathPx.length; i++) { const p = pathPx[i]; rect(p[0] - 1, p[1] - 1, 2, 2, err ? "#ff3b5c" : "#8ff0ff"); }
      const flow = reduced ? 0 : Math.floor(now / 22);
      for (let i = 0; i < pathPx.length; i++) {
        if (((i - flow) % 30 + 30) % 30 > 3) continue;
        const p = pathPx[i]; rect(p[0] - 2, p[1] - 2, 4, 4, err ? "#ffd0d8" : "#ffffff");
      }
      game.waypoints.forEach(([x, y], i) => {
        if (i === 0 || i === game.waypoints.length - 1) return;
        const txt = String(i), tw = textWidth(txt, 2);
        pixelText(rect, txt, x * T + 16 - Math.floor(tw / 2), y * T - 16, 2, "#fff", "#1e1710");
      });
      const p = pathPx[sparkIdx];
      if (p) {
        for (let k = 10; k > 0; k--) { // the tail it drags behind
          const q = pathPx[sparkIdx - k * 2];
          if (q) rect(q[0] - 1, q[1] - 1, 2, 2, "rgba(190,244,255," + (0.5 - k * 0.045).toFixed(2) + ")");
        }
        c.drawImage(Math.floor(now / 180) % 2 ? sprites.sparkB : sprites.sparkA, p[0] - 5, p[1] - 5);
        // blocks and props whose footprint is below the spark stand in front of it
        const cr = Math.floor(p[1] / T);
        for (let r = cr + 1; r < Math.min(game.rows, cr + 3); r++) { const o = rowOverlays[r]; if (o) c.drawImage(o.cv, -PAD, o.y0 - PAD); }
      }
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i], age = (now - e.t0) / 1000;
        if (age > e.life) { effects.splice(i, 1); continue; }
        const k = age / e.life;
        if (e.type === "burst") {
          for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2 + e.seed, dd = 6 + k * 24; rect(Math.round(e.x * T + 16 + Math.cos(a) * dd), Math.round(e.y * T + 16 + Math.sin(a) * dd), 3, 3, k < 0.5 ? "#ffffff" : e.color); }
          if (k < 0.4) c.drawImage(sprites.sparkle, e.x * T + 12, e.y * T + 12 - Math.round(k * 20));
        } else if (e.type === "text") {
          const sc = 3, tw = textWidth(e.text, sc);
          c.globalAlpha = 1 - k * k;
          pixelText(rect, e.text, Math.round(e.x * T + 16 - tw / 2), Math.round(e.y * T - 10 - k * 28), sc, e.color, "#1e1710");
          c.globalAlpha = 1;
        }
      }
    }
    function drawGlow(c, now) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, glow.width, glow.height);
      worldTransform(c, LOW);
      const pulse = reduced ? 0.5 : (Math.sin(now / 600) + 1) / 2;
      const radial = (x, y, r, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
      for (const z of game.zones) radial((z.x + 0.5) * T, (z.y + 0.5) * T, (z.r + 1) * T, pal.zoneHex, 0.45 + pulse * 0.2);
      if (!(now < errorUntil)) { // the current glows along its whole length
        c.strokeStyle = rgba("#7fe4ff", 0.24); c.lineWidth = 3; c.lineJoin = "round"; c.lineCap = "round";
        c.beginPath();
        for (let i = 0; i < pathPx.length; i += 3) { const q = pathPx[i]; i === 0 ? c.moveTo(q[0], q[1]) : c.lineTo(q[0], q[1]); }
        c.stroke();
        const flow = reduced ? 0 : Math.floor(now / 22);
        c.fillStyle = "rgba(230,250,255,0.5)";
        for (let i = 0; i < pathPx.length; i++) { if (((i - flow) % 30 + 30) % 30 > 3) continue; const q = pathPx[i]; c.beginPath(); c.arc(q[0], q[1], T * 0.3, 0, Math.PI * 2); c.fill(); }
      }
      game.waypoints.forEach(([x, y], i) => {
        const last = i === game.waypoints.length - 1;
        if (i === 0) radial(x * T + 16, y * T + 10, T * 0.7, "#9fe8ff", 0.35 + pulse * 0.15);
        else if (last) radial(x * T + 16, y * T - 3, T * 0.95, "#bdf2ff", 0.5 + pulse * 0.15);
        else radial(x * T + 16, y * T + 5, T * 0.65, "#9fe8ff", 0.28 + pulse * 0.15);
      });
      const p = pathPx[sparkIdx];
      if (p) radial(p[0], p[1], T * 1.2, "#cdf6ff", 0.6);
      for (const e of effects) if (e.type === "burst") { const k = (now - e.t0) / 1000 / e.life; radial((e.x + 0.5) * T, (e.y + 0.5) * T, T * 1.5, "#ffffff", (1 - k) * 0.9); }
    }

    /* ---------- frame ---------- */
    function draw(now) {
      if (!game) return;
      if (cacheDirty) buildCache();
      const W = canvas.width, Hh = canvas.height;
      drawScene(sctx, now);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      if (!fx) { ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#08081c"; ctx.fillRect(0, 0, W, Hh); ctx.drawImage(scene, 0, 0); return; }
      lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.imageSmoothingEnabled = true; lctx.clearRect(0, 0, low.width, low.height); lctx.drawImage(scene, 0, 0, low.width, low.height);
      l2ctx.setTransform(1, 0, 0, 1, 0, 0); l2ctx.clearRect(0, 0, low2.width, low2.height);
      if (hasFilter) l2ctx.filter = "blur(1.6px)";
      l2ctx.drawImage(low, 0, 0);
      if (hasFilter) l2ctx.filter = "none";
      ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#08081c"; ctx.fillRect(0, 0, W, Hh); ctx.drawImage(scene, 0, 0);
      ctx.imageSmoothingEnabled = true;
      const STRIPS = 8, bandH = Hh * 0.3, sh = bandH / STRIPS, k = low2.height / Hh;
      for (let i = 0; i < STRIPS; i++) {
        ctx.globalAlpha = Math.pow(1 - i / STRIPS, 1.6);
        const yTop = i * sh, yBot = Hh - (i + 1) * sh;
        ctx.drawImage(low2, 0, yTop * k, low2.width, sh * k, 0, yTop, W, sh);
        ctx.drawImage(low2, 0, yBot * k, low2.width, sh * k, 0, yBot, W, sh);
      }
      ctx.globalAlpha = 1;
      drawGlow(gctx, now);
      g2ctx.setTransform(1, 0, 0, 1, 0, 0); g2ctx.clearRect(0, 0, glow2.width, glow2.height);
      if (hasFilter) g2ctx.filter = "blur(2.5px)";
      g2ctx.drawImage(glow, 0, 0);
      if (hasFilter) g2ctx.filter = "none";
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6; ctx.drawImage(glow2, 0, 0, W, Hh); ctx.globalAlpha = 1;
      if (gradeStyle !== pal.style) buildGrade();
      ctx.globalCompositeOperation = "multiply"; ctx.drawImage(grade, 0, 0);
      const A = pal.atmos;
      ctx.globalCompositeOperation = "lighter";
      if (!reduced) {
        ctx.save(); ctx.translate(W * 0.5, 0); ctx.rotate(-0.42);
        for (let i = 0; i < 4; i++) {
          const x = ((now / 40 + i * 260 * dpr) % (W * 1.6)) - W * 0.8, w = (40 + i * 25) * dpr;
          const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, rgba(A.ray, 0)); g.addColorStop(0.5, rgba(A.ray, 0.07)); g.addColorStop(1, rgba(A.ray, 0));
          ctx.fillStyle = g; ctx.fillRect(x, -Hh, w, Hh * 3);
        }
        ctx.restore();
      }
      const t = now / 1000;
      for (const p of particles) {
        const dx = Math.sin(t * 0.6 + p.p) * 12, dy = reduced ? 0 : -((t * p.s + p.p * 50) % (cssH + 40)) + cssH + 20;
        const px = (p.x + dx) * dpr, py = (reduced ? p.y : dy) * dpr, r = p.r * dpr * (0.8 + 0.2 * Math.sin(t * 3 + p.p));
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 3); g.addColorStop(0, rgba(A.dust, p.a)); g.addColorStop(1, rgba(A.dust, 0));
        ctx.fillStyle = g; ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function worldToTile(sx, sy) {
      const wx = (sx - view.ox) / view.scale, wy = (sy - view.oy) / view.scale;
      const x = Math.floor(wx / T), y = Math.floor(wy / T);
      if (!game || x < 0 || y < 0 || x >= game.cols || y >= game.rows) return null;
      return [x, y];
    }
    function fitView(w, h, margin) {
      const bw = game.cols * T, bh = game.rows * T + H;
      const scale = Math.min((w - margin * 2) / bw, (h - margin * 2) / bh);
      return { scale, ox: (w - bw * scale) / 2, oy: (h - bh * scale) / 2 + H * scale };
    }
    return { T, resize, setGame, setState, setView, setHover, setReducedMotion, setFx, setSpark, pathLength, flashError, addEffect, draw, worldToTile, fitView, get view() { return view; }, cacheCanvas: () => cache, boardSize: () => ({ w: game.cols * T, h: game.rows * T }) };
  }

  root.MazerRender = { createRenderer, T };
})(typeof globalThis !== "undefined" ? globalThis : this);
