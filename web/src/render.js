/* Mazer renderer — HD-2D village style, generated at runtime (no image files).
 * 32px tiles, warm dark outlines on everything, a worn dirt trail for the route, procedurally painted
 * buildings and trees, cobbled cliffs and wooden palisades, plus post-processing (tilt-shift depth
 * of field, bloom, light grade, vignette, light rays, drifting particles). */
(function (root) {
  "use strict";
  const T = 32;       // pixels per tile
  const H = 10;       // block height in pixels
  const PAD = 40;     // world padding (room for the tower roof and canopies)
  const CH = 12;      // chamfer on convex corners: shows the diagonal gap the courier slips through
  const INK = [30, 23, 16];

  /* ---------- colour helpers ---------- */
  function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(c, t, p) { return [Math.round(c[0] + (t[0] - c[0]) * p), Math.round(c[1] + (t[1] - c[1]) * p), Math.round(c[2] + (t[2] - c[2]) * p)]; }
  function shade(c, amt) { return amt < 0 ? mix(c, [24, 18, 14], -amt) : mix(c, [255, 250, 232], amt); }
  function ramp5(hex) { const c = hexToRgb(hex); return [shade(c, -0.6), shade(c, -0.3), c, shade(c, 0.2), shade(c, 0.45)]; }
  const rgba = (hex, a) => { const c = hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

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

  const COURIER_PAL = { k: "#1e1710", R: "#b8323c", r: "#e05a62", h: "#5a3a1e", s: "#f0c8a0", C: "#5a7fd6", c: "#2f4fa8", b: "#c9a06a", p: "#4a3a5a", o: "#3b2a1a" };
  const COURIER_BODY = [
    "......kkkk......", "....kkrRRRkk....", "...krRRRRRRRk...", "..kRRRRRRRRRRk..", ".kkkkkkkkkkkkkk.", "...khhhhhhhhk...", "...khsssssshk...", "...kssksskssk...",
    "...kssssssssk...", "....kssssssk....", "...kkCCCCCCkk...", "..kCkccccccckCk.", "..kCkccccccckCk.", "..kCkbccccbbkCk.", "..kCkccccccckCk.", "..kckccccccckck.",
    "...kkccccccckk..", "....kccccccck...", "....kkkkkkkkk..."];
  const ART = {
    courierA: { pal: COURIER_PAL, rows: COURIER_BODY.concat([".....kppkppk....", ".....kppkppk....", ".....kppkppk....", ".....kookook....", ".....kkk.kkk...."]) },
    courierB: { pal: COURIER_PAL, rows: COURIER_BODY.concat(["....kpk...kpk...", "....kpk...kpk...", "...kpk.....kpk..", "...kok.....kok..", "...kkk.....kkk.."]) },
    sparkle: { pal: { w: "#ffffff", W: "#fff6b0" }, rows: ["...w...", "...w...", "...W...", "wwWWWww", "...W...", "...w...", "...w..."] },
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
  function paintCottage() {
    const sp = new Sprite(36, 40), plaster = [232, 220, 192], timber = [110, 75, 45], roof = [178, 96, 52], roofD = [130, 66, 36], roofL = [205, 128, 72];
    sp.rect(4, 22, 28, 15, plaster);
    for (const x of [4, 10, 18, 26, 31]) sp.rect(x, 22, 1, 15, timber);
    sp.rect(4, 22, 28, 1, timber); sp.rect(4, 29, 28, 1, timber);
    sp.rect(15, 27, 6, 10, [70, 45, 30]); sp.set(15, 27, plaster); sp.set(20, 27, plaster); sp.set(19, 32, [200, 170, 90]);
    sp.rect(7, 25, 4, 4, [255, 220, 120]); sp.rect(25, 25, 4, 4, [255, 220, 120]); sp.set(9, 25, timber); sp.set(9, 27, timber); sp.set(27, 25, timber); sp.set(27, 27, timber);
    for (let y = 5; y < 23; y++) { const hw = 6 + (y - 5) * 0.75; for (let x = Math.round(18 - hw); x <= Math.round(18 + hw); x++) { const row = (y - 5) % 3 === 2, sh = hash2(x + y * 3, y) < 0.35; sp.set(x, y, row ? roofD : sh ? roofL : roof); } }
    sp.rect(12, 5, 12, 1, roofL);
    sp.rect(26, 1, 4, 9, [120, 110, 105]); sp.rect(25, 1, 6, 2, [80, 72, 68]);
    return sp.outline(INK);
  }
  function paintTower() {
    const sp = new Sprite(26, 60), sL = [180, 176, 170], sM = [140, 136, 130], sD = [95, 92, 88], bL = [90, 130, 200], bM = [58, 95, 168], bD = [40, 66, 120];
    for (let y = 22; y < 58; y++) for (let x = 4; x < 22; x++) {
      const t = (x - 4) / 17, h = hash2(x, y);
      let c = t < 0.2 ? sL : t < 0.6 ? sM : sD; if (t < 0.35 && h < 0.3) c = sL; if (t > 0.5 && t < 0.75 && h < 0.4) c = sD;
      if (y % 6 === 5 || ((x + (Math.floor(y / 6) % 2) * 4) % 8 === 0 && y % 6 !== 5 && h < 0.7)) c = shade(c, -0.25);
      sp.set(x, y, c);
    }
    for (let y = 4; y < 24; y++) { const hw = 1 + (y - 4) * 0.62; for (let x = Math.round(13 - hw); x <= Math.round(13 + hw); x++) sp.set(x, y, x < 11 ? bL : x > 15 ? bD : bM); }
    sp.rect(4, 22, 18, 2, bD);
    sp.rect(12, 0, 1, 5, INK); sp.rect(13, 0, 5, 3, [200, 50, 60]);
    sp.rect(11, 32, 4, 6, [255, 220, 120]); sp.set(11, 32, sD); sp.set(14, 32, sD);
    sp.rect(10, 50, 6, 8, [60, 42, 30]); sp.set(10, 50, sM); sp.set(15, 50, sM);
    return sp.outline(INK);
  }
  function paintWell() {
    const sp = new Sprite(28, 30), wood = [110, 75, 45], woodL = [150, 105, 62], stone = [150, 146, 140], stoneD = [100, 96, 92];
    for (let y = 0; y < 8; y++) { const hw = 3 + y * 1.4; for (let x = Math.round(14 - hw); x <= Math.round(14 + hw); x++) sp.set(x, y, y % 3 === 2 ? wood : woodL); }
    sp.rect(5, 8, 2, 13, wood); sp.rect(21, 8, 2, 13, wood);
    sp.rect(13, 8, 1, 8, INK); sp.rect(11, 15, 5, 4, wood); sp.rect(11, 15, 5, 1, woodL);
    sp.disc(14, 23, 11, 6, stone); sp.disc(14, 25, 11, 4.5, stoneD); sp.disc(14, 22, 7, 3, [60, 90, 150]); sp.disc(13, 21.5, 3, 1.2, [120, 160, 220]);
    for (let x = 3; x < 25; x += 4) sp.set(x, 23 + Math.round(Math.sin(x) * 1.5), stoneD);
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
  const TRAIL = [[214, 190, 140], [196, 170, 120], [226, 204, 158]];
  function palette(b) {
    const style = b.groundStyle || "grass";
    const rockBase = shade(hexToRgb(b.rock), 0.28);
    return { ground: ramp5(b.ground[0]), rock: [shade(rockBase, -0.55), shade(rockBase, -0.25), rockBase, shade(rockBase, 0.18), shade(rockBase, 0.42)], wood: ramp5("#9a6a3c"), zone: hexToRgb(b.zone), zoneHex: b.zone, zoneLight: shade(hexToRgb(b.zone), 0.5), flower: hexToRgb(b.flower || b.path), path: b.path, style, atmos: ATMOS[style] || ATMOS.grass };
  }

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    let game = null, walls = null, segments = [];
    let cache = null, cacheDirty = true, pal = null;
    let view = { scale: 1, ox: 0, oy: 0 };
    let dpr = 1, cssW = 0, cssH = 0;
    const effects = [];
    let hover = null, errorUntil = 0, reduced = false, fx = true, courierIdx = 0;
    let pathPx = [], rowOverlays = [];
    const hasFilter = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;
    const sprites = {
      courierA: fromRows(ART.courierA.rows, ART.courierA.pal).toCanvas(), courierB: fromRows(ART.courierB.rows, ART.courierB.pal).toCanvas(),
      courierAf: fromRows(ART.courierA.rows, ART.courierA.pal, true).toCanvas(), courierBf: fromRows(ART.courierB.rows, ART.courierB.pal, true).toCanvas(),
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
        cottage: paintCottage(), tower: paintTower(), well: paintWell(),
        ground: Array.from({ length: 10 }, (_, i) => paintGround(pal.style, pal.ground, pal.flower, i + 1)),
      };
    }
    function setGame(g, w, segs) { game = g; walls = w; pal = palette(g.biome); gradeStyle = null; buildProps(); setState(w, segs); }
    function setState(w, segs) { walls = w; segments = segs; cacheDirty = true; buildPathPixels(); }
    function setView(v) { view = v; }
    function setHover(t) { hover = t; }
    function setReducedMotion(v) { reduced = v; }
    function setFx(v) { fx = !!v; }
    function setCourier(i) { courierIdx = Math.max(0, Math.min(pathPx.length - 1, i | 0)); }
    function pathLength() { return pathPx.length; }
    function flashError() { errorUntil = performance.now() + 450; }
    function addEffect(e) { effects.push(Object.assign({ t0: performance.now() }, e)); }
    const isWall = (x, y) => x >= 0 && y >= 0 && x < game.cols && y < game.rows && walls[y * game.cols + x] === 1;

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
      const owner = new Int16Array(W * Hh).fill(-1); // tile row that owns a block/prop pixel (for depth against the courier)
      const set = (x, y, c, k, o) => { if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = y * W + x; d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; if (k !== undefined) cat[i] = k; if (o !== undefined) owner[i] = o; };
      const blend = (x, y, c, a) => { if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = (y * W + x) * 4; if (!d[i + 3]) return; d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a; };
      const blit = (sp, ox, oy, k, o) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const c = sp.c[y * sp.w + x]; if (c) set(ox + x, oy + y, c, k, o); } };

      // ground
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) blit(props.ground[Math.floor(hash2(tx, ty) * props.ground.length)], PAD + tx * T, PAD + ty * T, 0);
      // score zones: chunky ordered dither, denser the hotter the zone
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        const m = game.scoreMod[ty * cols + tx]; if (m <= 1) continue;
        const density = Math.min(16, 5 + Math.round((m - 1) * 2.2)), ox = PAD + tx * T, oy = PAD + ty * T;
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const bv = BAYER[(y >> 1) & 3][(x >> 1) & 3]; if (bv < density) blend(ox + x, oy + y, bv < density / 3 ? P.zoneLight : P.zone, 0.85); }
      }
      // block silhouettes (top face lifted by H, chamfered convex corners, front face when open below)
      const corner = (n, e, s, w) => (x, y) => { // true when (x,y) inside a top face is cut away
        const inTL = !n && !w && x + y < CH, inTR = !n && !e && (T - 1 - x) + y < CH, inBL = !s && !w && x + (T - 1 - y) < CH, inBR = !s && !e && (T - 1 - x) + (T - 1 - y) < CH;
        return inTL || inTR || inBL || inBR;
      };
      const blocks = [];
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        if (!isWall(tx, ty)) continue;
        const n = isWall(tx, ty - 1), e = isWall(tx + 1, ty), s = isWall(tx, ty + 1), w = isWall(tx - 1, ty);
        // bottom row of the top face in column x (follows the chamfer), so the face extrudes from it
        const bottomRow = (x) => Math.min(T - 1, !s && !w && x < CH ? T - 1 - CH + x : T - 1, !s && !e && x > T - 1 - CH ? T - 1 - CH + (T - 1 - x) : T - 1);
        const b = { tx, ty, n, e, s, w, nat: game.natural[ty * cols + tx] === 1, cut: corner(n, e, s, w), bottomRow, ox: PAD + tx * T, oy: PAD + ty * T };
        blocks.push(b);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (!b.cut(x, y)) solid[(b.oy + y - H) * W + b.ox + x] = 1;
        if (!s) for (let x = 0; x < T; x++) { const br = bottomRow(x); for (let k = 1; k <= H; k++) solid[(b.oy - H + br + k) * W + b.ox + x] = 1; }
      }
      // dirt trail along the bent route: a thin core that always connects, plus a wider band that keeps clear of blocks
      const trail = new Uint8Array(W * Hh), core = new Uint8Array(W * Hh);
      const stampDisc = (mask, cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) { const px = cx + x, py = cy + y; if (px >= 0 && py >= 0 && px < W && py < Hh) mask[py * W + px] = 1; } };
      for (let i = 0; i < pathPx.length; i += 2) { const [x, y] = pathPx[i]; stampDisc(trail, PAD + x, PAD + y, 6 + (hash2(x, y) < 0.4 ? 1 : 0)); stampDisc(core, PAD + x, PAD + y, 2); }
      const near = new Uint8Array(W * Hh); // within 3px of a block silhouette
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const px = x + dx, py = y + dy; if (px >= 0 && py >= 0 && px < W && py < Hh) near[py * W + px] = 1; }
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!trail[i] || solid[i] || (near[i] && !core[i])) continue;
        const h = hash2(x * 3, y * 7); set(x, y, h < 0.15 ? TRAIL[1] : h < 0.22 ? TRAIL[2] : TRAIL[0], 5);
      }
      // soft cast shadows (light from top-left)
      for (let ring = 0; ring < 3; ring++) {
        const a = [0.26, 0.15, 0.07][ring], o = 4 + ring * 3;
        for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { if (solid[y * W + x]) continue; const sx = x - o, sy = y - o; if (sx >= 0 && sy >= 0 && solid[sy * W + sx]) blend(x, y, INK, a); }
      }
      // block faces and tops (row order so lower blocks cover the faces above)
      for (const b of blocks) {
        const R = b.nat ? P.rock : P.wood;
        if (!b.s) for (let x = 0; x < T; x++) { // cliff face: extruded H px down from the plateau's bottom edge
          const br = b.bottomRow(x);
          for (let k = 1; k <= H; k++) {
            const y = br + k; let c;
            if (b.nat) { const st = hash2(b.tx * 32 + x, 3), c0 = st < 0.3 ? R[0] : st < 0.6 ? R[1] : R[2]; c = k >= H - 1 ? R[0] : c0; if (hash2(x + b.tx, y + b.ty) < 0.06) c = R[3]; }
            else { const q = x % 6; c = q === 0 ? R[0] : q === 2 ? R[3] : R[2]; if (k >= H - 1) c = R[0]; }
            set(b.ox + x, b.oy - H + y, c, b.nat ? 2 : 4, b.ty);
          }
        }
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          if (b.cut(x, y)) continue;
          let c;
          if (b.nat) { // cobbles in 8px cells with jitter
            const cx = Math.floor(x / 8), cy = Math.floor(y / 8), jx = Math.floor(hash2(b.tx * 4 + cx, b.ty * 4 + cy) * 2), jy = Math.floor(hash2(b.ty * 4 + cy, b.tx * 4 + cx + 9) * 2);
            const lx = x - cx * 8 - jx, ly = y - cy * 8 - jy, hv = hash2(b.tx * 4 + cx + 100, b.ty * 4 + cy);
            const gap = lx <= 0 || ly <= 0 || lx > 7 || ly > 7;
            c = gap ? R[0] : hv < 0.25 ? R[1] : hv < 0.7 ? R[2] : R[3]; if (!gap && lx === 1 && ly === 1) c = R[4]; if (!gap && (lx === 7 || ly === 7)) c = shade(c, -0.18);
            if (P.style === "grass" && hash2(b.tx * 7 + (x >> 2), b.ty * 5 + (y >> 2)) < 0.12 && !gap) c = mix(c, P.ground[2], 0.55); // moss
          } else { // log ends
            const lx = x % 8 - 4, ly = y % 8 - 4, rr = lx * lx + ly * ly;
            c = rr <= 3 ? R[3] : rr <= 7 ? R[1] : rr <= 11 ? R[2] : R[0]; if (rr <= 1) c = R[4];
          }
          set(b.ox + x, b.oy + y - H, c, b.nat ? 1 : 3, b.ty);
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
        if (i === 0) { propShadow(ox + 18, oy + 22, 17, 5); blit(props.cottage, ox - 2, oy - 14, 6, y); }
        else if (last) { propShadow(ox + 16, oy + 22, 11, 4); blit(props.tower, ox + 3, oy - 34, 6, y); }
        else { propShadow(ox + 16, oy + 22, 12, 4); blit(props.well, ox + 2, oy - 4, 6, y); }
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
      // per-row overlays of block/prop pixels, drawn in front of the courier when he stands above that row
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
      // push each sample away from nearby block silhouettes (footprint plus the lifted top face)
      const R = 11;
      const bent = raw.map(([x, y]) => {
        const tx = Math.floor(x / T), ty = Math.floor(y / T); let ox = 0, oy = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const bx = tx + dx, by = ty + dy; if (!isWall(bx, by)) continue;
          const x0 = bx * T, y0 = by * T - H, x1 = x0 + T, y1 = by * T + T;
          const cx = Math.max(x0, Math.min(x1, x)), cy = Math.max(y0, Math.min(y1, y));
          const ddx = x - cx, ddy = y - cy, dist = Math.hypot(ddx, ddy);
          if (dist < 0.5 || dist >= R) continue;
          ox += (ddx / dist) * (R - dist); oy += (ddy / dist) * (R - dist);
        }
        const m = Math.hypot(ox, oy); if (m > R) { ox *= R / m; oy *= R / m; }
        return [x + ox, y + oy];
      });
      // smooth, then resample to whole pixels with a facing direction
      for (let pass = 0; pass < 3; pass++) for (let i = 2; i < bent.length - 2; i++) {
        bent[i] = [(bent[i - 2][0] + bent[i - 1][0] + bent[i][0] + bent[i + 1][0] + bent[i + 2][0]) / 5, (bent[i - 2][1] + bent[i - 1][1] + bent[i][1] + bent[i + 1][1] + bent[i + 2][1]) / 5];
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
      courierIdx = Math.min(courierIdx, Math.max(0, pathPx.length - 1));
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
      if (now < errorUntil) for (let i = 0; i < pathPx.length; i += 2) { const p = pathPx[i]; rect(p[0] - 2, p[1] - 2, 4, 4, ((i >> 3) & 1) ? "#ff3b5c" : "#ffd0d8"); }
      game.waypoints.forEach(([x, y], i) => {
        if (i === 0 || i === game.waypoints.length - 1) return;
        const txt = String(i), tw = textWidth(txt, 2);
        pixelText(rect, txt, x * T + 16 - Math.floor(tw / 2), y * T - 16, 2, "#fff", "#1e1710");
      });
      const p = pathPx[courierIdx];
      if (p) {
        const walking = courierIdx > 0 && courierIdx < pathPx.length - 1;
        const frame = walking ? Math.floor(now / 140) % 2 : 0, left = p[2] < 0;
        const sp = frame ? (left ? sprites.courierBf : sprites.courierB) : (left ? sprites.courierAf : sprites.courierA);
        c.fillStyle = "rgba(30,23,16,0.35)"; c.fillRect(p[0] - 5, p[1] - 2, 10, 3);
        c.drawImage(sp, p[0] - 8, p[1] - 23);
        // blocks and props whose footprint is below the courier stand in front of him
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
      game.waypoints.forEach(([x, y], i) => {
        const last = i === game.waypoints.length - 1;
        if (i === 0) { radial(x * T + 7, y * T + 13, T * 0.7, "#ffd27a", 0.9); radial(x * T + 25, y * T + 13, T * 0.7, "#ffd27a", 0.9); }
        else if (last) radial(x * T + 16, y * T + 1, T * 0.8, "#ffd27a", 0.9);
        else radial(x * T + 16, y * T + 18, T * 0.9, "#7fd0ff", 0.35 + pulse * 0.2);
      });
      const p = pathPx[courierIdx];
      if (p) radial(p[0], p[1] - 10, T * 1.6, "#ffd68c", 0.8);
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
    return { T, resize, setGame, setState, setView, setHover, setReducedMotion, setFx, setCourier, pathLength, flashError, addEffect, draw, worldToTile, fitView, get view() { return view; }, boardSize: () => ({ w: game.cols * T, h: game.rows * T }) };
  }

  root.MazerRender = { createRenderer, T };
})(typeof globalThis !== "undefined" ? globalThis : this);
