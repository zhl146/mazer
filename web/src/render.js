/* Mazer renderer — 16-bit era pixel art, generated at runtime.
 * Static layer: a pixel buffer (ground, zones, cliffs, bricks) at 1 world unit = 1 pixel.
 * Live layer: pixel-dashed route, walking courier, waypoint sprites, sparkles, pixel text. */
(function (root) {
  "use strict";
  const T = 16;      // pixels per tile
  const H = 6;       // block height in pixels
  const PAD = 8;     // world padding around the board

  /* ---------- colour helpers ---------- */
  function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(c, t, p) { return [Math.round(c[0] + (t[0] - c[0]) * p), Math.round(c[1] + (t[1] - c[1]) * p), Math.round(c[2] + (t[2] - c[2]) * p)]; }
  function shade(c, amt) { return amt < 0 ? mix(c, [8, 6, 20], -amt) : mix(c, [255, 252, 240], amt); }
  function ramp(hex) { const c = hexToRgb(hex); return [shade(c, -0.42), c, shade(c, 0.16), shade(c, 0.45)]; }
  const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  /* ---------- sprite art (string maps) ---------- */
  const K = "#1a1428"; // universal outline ink
  const ART = {
    crystal: { pal: { k: K, a: "#1f8a4c", b: "#3fd37a", c: "#a8ffcd", w: "#ffffff", s: "#00000055" }, rows: [
      "................", ".......kk.......", "......kcbk......", "......kcbk......", ".....kccbbk.....", ".....kccbbk.....", "....kccwbbak....", "....kccwbbak....",
      "....kcccbbak....", "....kccbbbak....", ".....kcbbak.....", ".....kcbbak.....", "......kbak......", "......kbak......", ".......kk.......", "....ssssssss...."] },
    chest: { pal: { k: K, o: "#6b3a1e", p: "#a8632d", q: "#d9964f", g: "#c9a227", G: "#ffe680", s: "#00000055" }, rows: [
      "................", "................", "....kkkkkkkk....", "...kqqqqqqqqk...", "..kqppppppppqk..", "..kpppppppppqk..", "..kkkkkkkkkkkk..", "..kqqqqkGkqqqk..",
      "..kppppkgkpppk..", "..kpppppkppppk..", "..kppppppppppk..", "..kooooooooook..", "..kooooooooook..", "...kkkkkkkkkk...", "..ssssssssssss..", "................"] },
    flag: { pal: { k: K, r: "#d63b4f", R: "#ff8a97", p: "#8a5a2b", P: "#c98d4a", s: "#00000055" }, rows: [
      "................", ".....kk.........", ".....kPk........", ".....kPRk.......", ".....kPRrk......", ".....kPRrrk.....", ".....kPRrrrk....", ".....kPRrrrrk...",
      ".....kPRrrrk....", ".....kPRrrk.....", ".....kPRrk......", ".....kPRk.......", ".....kPk........", ".....kpk........", "....kkkkk.......", "....sssss......."] },
    courierA: { pal: { k: K, s: "#f2c9a0", h: "#6b3f1f", c: "#2f5fd0", C: "#6f95ff", b: "#c9a06a", o: "#3b2a1a" }, rows: [
      "................", ".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khssssssk....", "...kskssksk.....", "...ksssssssk....", "....kssssk......",
      "...kkCCCCkk.....", "..kbkCCCCkck....", "..kbkccccckk....", "..kkkccccck.....", "...kcccccck.....", "....kokkokk.....", "....kkk.kkk.....", "................"] },
    courierB: { pal: { k: K, s: "#f2c9a0", h: "#6b3f1f", c: "#2f5fd0", C: "#6f95ff", b: "#c9a06a", o: "#3b2a1a" }, rows: [
      ".....kkkkkk.....", "....khhhhhhk....", "...khhhhhhhhk...", "...khssssssk....", "...kskssksk.....", "...ksssssssk....", "....kssssk......", "...kkCCCCkk.....",
      "..kbkCCCCkck....", "..kbkccccckk....", "..kkkccccck.....", "...kcccccck.....", "...kok...kok....", "...kkk...kkk....", "................", "................"] },
    sparkle: { pal: { w: "#ffffff", W: "#fff6b0" }, rows: ["..w..", "..w..", "wwWww", "..w..", "..w.."] },
  };
  const FONT = { // 3x5 pixel glyphs
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"], "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"], "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "001", "001"],
    "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"], "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"],
    "x": ["000", "101", "010", "101", "000"], "S": ["111", "100", "111", "001", "111"], "E": ["111", "100", "110", "100", "111"],
  };
  const GLYPHS = { // ground decorations: chars index the ground ramp, f = flower, w = white, r = ember
    tuft: [".0.0.", "0.0.0"], tuftLight: [".2.2.", "2.2.2"], flower: [".f.", "fwf", ".f."], pebble: [".22", "200"],
    ripple: ["2222"], crack: ["0..0", ".00."], bump: [".33.", "3221", ".11."], flake: ["w"], seam: ["0000"], glow: [".r.", "rrr", ".r."],
  };

  function makeSprite(def, flip) {
    const w = def.rows[0].length, h = def.rows.length;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = def.rows[y][x]; if (ch === ".") continue;
      c.fillStyle = def.pal[ch]; c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
    return cv;
  }
  function pixelText(plot, text, x, y, scale, color, outline) {
    // plot(px, py, w, h, color)
    let cx = x;
    for (const ch of String(text)) {
      const g = FONT[ch]; if (!g) { cx += 2 * scale; continue; }
      if (outline) plot(cx - scale, y - scale, 5 * scale, 7 * scale, outline);
      cx += 4 * scale;
    }
    cx = x;
    for (const ch of String(text)) {
      const g = FONT[ch]; if (!g) { cx += 2 * scale; continue; }
      for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r][q] === "1") plot(cx + q * scale, y + r * scale, scale, scale, color);
      cx += 4 * scale;
    }
  }
  const textWidth = (text, scale) => [...String(text)].reduce((w, ch) => w + (FONT[ch] ? 4 : 2) * scale, 0) - scale;

  /* ---------- biome palettes → ramps ---------- */
  function palette(b) {
    return {
      ground: ramp(b.ground[0]), groundAlt: ramp(b.ground[2]), rock: ramp(b.rock), stone: ramp(b.stone),
      zone: hexToRgb(b.zone), zoneLight: shade(hexToRgb(b.zone), 0.5), flower: hexToRgb(b.flower || b.path), path: b.path, style: b.groundStyle || "grass",
    };
  }

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    let game = null, walls = null, segments = [];
    let cache = null, cacheDirty = true, pal = null;
    let view = { scale: 1, ox: 0, oy: 0 };
    let dpr = 1, cssW = 0, cssH = 0;
    const effects = [];
    let hover = null, errorUntil = 0, reduced = false;
    let pathPx = []; // pixel coordinates along the route
    const sprites = {};
    for (const k in ART) sprites[k] = makeSprite(ART[k]);
    sprites.courierAf = makeSprite(ART.courierA, true); sprites.courierBf = makeSprite(ART.courierB, true);

    const worldW = () => game.cols * T + PAD * 2, worldH = () => game.rows * T + PAD * 2;

    function resize(w, h, ratio) {
      cssW = w; cssH = h; dpr = ratio;
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
    }
    function setGame(g, w, segs) { game = g; walls = w; pal = palette(g.biome); setState(w, segs); }
    function setState(w, segs) { walls = w; segments = segs; cacheDirty = true; buildPathPixels(); }
    function setView(v) { view = v; }
    function setHover(t) { hover = t; }
    function setReducedMotion(v) { reduced = v; }
    function flashError() { errorUntil = performance.now() + 450; }
    function addEffect(e) { effects.push(Object.assign({ t0: performance.now() }, e)); }
    const isWall = (x, y) => x >= 0 && y >= 0 && x < game.cols && y < game.rows && walls[y * game.cols + x] === 1;

    /* ---------- static pixel buffer ---------- */
    function buildCache() {
      const W = worldW(), Hh = worldH();
      const img = new ImageData(W, Hh), d = img.data;
      const set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
      const blend = (x, y, c, a) => { if (x < 0 || y < 0 || x >= W || y >= Hh) return; const i = (y * W + x) * 4; if (!d[i + 3]) return; d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a; };
      const stamp = (gx, gy, glyph, map) => { for (let r = 0; r < glyph.length; r++) for (let q = 0; q < glyph[r].length; q++) { const ch = glyph[r][q]; if (ch !== ".") set(gx + q, gy + r, map(ch)); } };
      const cols = game.cols, rows = game.rows, P = pal;
      const groundMap = (ch) => ch === "f" ? P.flower : ch === "w" ? [250, 250, 255] : ch === "r" ? [255, 120, 60] : P.ground[+ch];

      // ground
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        const ox = PAD + tx * T, oy = PAD + ty * T;
        const alt = hash2(tx, ty) < 0.3;
        const g = alt ? P.groundAlt : P.ground;
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          const h = hash2(tx * 16 + x, ty * 16 + y);
          set(ox + x, oy + y, h < 0.025 ? g[0] : h < 0.06 ? g[2] : g[1]);
        }
        const dv = hash2(tx + 77, ty + 91);
        const gx = ox + 2 + Math.floor(hash2(tx, ty + 5) * 9), gy = oy + 2 + Math.floor(hash2(ty, tx + 9) * 10);
        switch (P.style) {
          case "sand": if (dv < 0.5) stamp(gx, gy, GLYPHS.ripple, groundMap); if (dv > 0.85) stamp(ox + 9, oy + 11, GLYPHS.pebble, groundMap); break;
          case "snow": if (dv < 0.35) stamp(gx, gy, GLYPHS.flake, groundMap); if (dv > 0.9) stamp(gx, gy, GLYPHS.pebble, groundMap); break;
          case "ash": if (dv < 0.25) stamp(gx, gy, GLYPHS.crack, groundMap); if (dv > 0.93) stamp(gx, gy, GLYPHS.glow, groundMap); break;
          case "stone":
            for (let x = 0; x < T; x++) { blend(ox + x, oy + 7, P.ground[0], 0.5); blend(ox + x, oy + 15, P.ground[0], 0.5); }
            for (let y = 0; y < T; y++) blend(ox + (y < 8 ? 15 : 7), oy + y, P.ground[0], 0.5);
            if (dv < 0.2) stamp(gx, gy, GLYPHS.crack, groundMap); break;
          default:
            if (dv < 0.45) stamp(gx, gy, hash2(tx, ty + 1) < 0.5 ? GLYPHS.tuft : GLYPHS.tuftLight, groundMap);
            if (dv > 0.9) stamp(ox + 3 + Math.floor(hash2(tx + 3, ty) * 9), oy + 3 + Math.floor(hash2(ty + 3, tx) * 9), GLYPHS.flower, groundMap);
            else if (dv > 0.84) stamp(gx, gy, GLYPHS.pebble, groundMap);
        }
      }
      // score zones: ordered-dither gold floor, denser the hotter the zone
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        const m = game.scoreMod[ty * cols + tx]; if (m <= 1) continue;
        const density = Math.min(16, 5 + Math.round((m - 1) * 2.2));
        const ox = PAD + tx * T, oy = PAD + ty * T;
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          const bv = BAYER[y & 3][x & 3];
          if (bv < density) blend(ox + x, oy + y, bv < density / 3 ? P.zoneLight : P.zone, 0.85);
        }
      }
      // zone badges
      const plotBuf = (x, y, w, h, c) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) set(x + xx, y + yy, c); };
      for (const z of game.zones) {
        const m = Math.round(game.scoreMod[z.y * cols + z.x]);
        const txt = "x" + m, tw = textWidth(txt, 1);
        const bx = PAD + z.x * T + 8 - Math.floor(tw / 2), by = PAD + z.y * T + 5;
        plotBuf(bx - 2, by - 2, tw + 4, 9, [26, 20, 40]);
        pixelText(plotBuf, txt, bx, by, 1, [255, 240, 200], null);
      }
      // walls (row order so lower blocks cover the faces of the ones above)
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        if (!isWall(tx, ty)) continue;
        const nat = game.natural[ty * cols + tx] === 1;
        const R = nat ? P.rock : P.stone;
        const n = isWall(tx, ty - 1), e = isWall(tx + 1, ty), s = isWall(tx, ty + 1), w = isWall(tx - 1, ty);
        const ox = PAD + tx * T, oy = PAD + ty * T;
        // ground shadow to the right and below
        if (!e) for (let y = -H + 2; y < T; y++) { blend(ox + T, oy + y, [10, 8, 24], 0.35); blend(ox + T + 1, oy + y + 1, [10, 8, 24], 0.2); }
        if (!s) for (let x = 2; x < T + 2; x++) blend(ox + x, oy + T, [10, 8, 24], 0.35);
        // front face
        if (!s) for (let y = T - H; y < T; y++) for (let x = 0; x < T; x++) {
          const cut = (!w && x === 0 && y >= T - 2) || (!e && x === T - 1 && y >= T - 2);
          if (cut) continue;
          let c;
          if (nat) { const stripe = hash2(tx * 16 + x, 3) < 0.35 ? 0 : 1; c = y === T - 1 || y === T - H ? R[0] : R[stripe]; if (y < T - 2 && hash2(x + tx, y + ty) < 0.08) c = R[2]; }
          else { const row = Math.floor((y - (T - H)) / 3), off = row % 2 ? 2 : 0; const mortar = (y - (T - H)) % 3 === 2 || (x + off) % 5 === 0; c = y === T - 1 ? R[0] : mortar ? R[0] : R[1]; }
          set(ox + x, oy + y, c);
        }
        // top face (lifted by H)
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
          const cut = (!n && !w && ((x === 0 && y < 2) || (y === 0 && x < 2))) || (!n && !e && ((x === T - 1 && y < 2) || (y === 0 && x > T - 3))) ||
            (!s && !w && ((x === 0 && y > T - 3) || (y === T - 1 && x < 2))) || (!s && !e && ((x === T - 1 && y > T - 3) || (y === T - 1 && x > T - 3)));
          if (cut) continue;
          let c = R[2];
          if (nat) {
            const h = hash2(tx * 16 + x + 999, ty * 16 + y);
            c = h < 0.035 ? R[0] : h < 0.07 ? R[1] : h < 0.11 ? R[3] : R[2];
          } else {
            const off = Math.floor(y / 4) % 2 ? 4 : 0;
            const mortar = y % 4 === 3 || (x + off) % 8 === 7;
            c = mortar ? R[0] : (y % 4 === 0 || (x + off) % 8 === 0) ? R[2] : R[1];
          }
          if (!n && y === 0) c = R[3]; else if (!n && y === 1) c = R[3];
          if (!w && x === 0) c = R[3];
          if (!e && x === T - 1) c = R[0]; else if (!e && x === T - 2) c = R[1];
          if (!s && y === T - 1) c = R[0]; else if (!s && y === T - 2) c = R[1];
          set(ox + x, oy + y - H, c);
        }
        if (nat && hash2(tx, ty + 42) < 0.5) stamp(ox + 3 + Math.floor(hash2(tx, ty) * 8), oy - H + 4 + Math.floor(hash2(ty, tx) * 8), GLYPHS.crack, (ch) => R[+ch]);
        if (nat && hash2(tx + 9, ty) < 0.35) stamp(ox + 2 + Math.floor(hash2(tx + 1, ty) * 9), oy - H + 3 + Math.floor(hash2(ty + 1, tx) * 9), GLYPHS.bump, (ch) => R[+ch]);
      }
      // board edge
      for (let x = -1; x <= cols * T; x++) { set(PAD + x, PAD - 1, [26, 20, 40]); set(PAD + x, PAD + rows * T, [26, 20, 40]); }
      for (let y = -1; y <= rows * T; y++) { set(PAD - 1, PAD + y, [26, 20, 40]); set(PAD + cols * T, PAD + y, [26, 20, 40]); }

      cache = document.createElement("canvas"); cache.width = W; cache.height = Hh;
      cache.getContext("2d").putImageData(img, 0, 0);
      cacheDirty = false;
    }

    /* ---------- route pixels ---------- */
    function buildPathPixels() {
      pathPx = [];
      const pts = [];
      for (let i = 0; i < segments.length; i++) for (let k = i === 0 ? 0 : 1; k < segments[i].length; k++) pts.push(segments[i][k]);
      for (let i = 1; i < pts.length; i++) {
        let x0 = pts[i - 1][0] * T + 8, y0 = pts[i - 1][1] * T + 8;
        const x1 = pts[i][0] * T + 8, y1 = pts[i][1] * T + 8;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          pathPx.push([x0, y0, Math.sign(x1 - x0) || (pathPx.length ? pathPx[pathPx.length - 1][2] : 1)]);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }
    }

    /* ---------- live layer ---------- */
    function draw(now) {
      if (!game) return;
      if (cacheDirty) buildCache();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.translate(Math.round(view.ox * dpr) / dpr, Math.round(view.oy * dpr) / dpr);
      ctx.scale(view.scale, view.scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cache, -PAD, -PAD);

      const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      // hover frame
      if (hover) {
        const hx = hover[0] * T, hy = hover[1] * T;
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(hx, hy, T, T);
        const corner = (cx, cy, dx, dy) => { rect(cx, cy, 4 * dx, 1 * dy, "#fff"); rect(cx, cy, 1 * dx, 4 * dy, "#fff"); };
        ctx.save(); ctx.translate(hx, hy);
        corner(0, 0, 1, 1); ctx.translate(T, 0); corner(0, 0, -1, 1); ctx.translate(0, T); corner(0, 0, -1, -1); ctx.translate(-T, 0); corner(0, 0, 1, -1);
        ctx.restore();
      }
      // route: pixel dashes flowing toward E
      const err = now < errorUntil;
      const off = reduced ? 0 : Math.floor(now / 70);
      const col = err ? "#ff3b5c" : pal.path;
      for (let i = 0; i < pathPx.length; i++) { const p = pathPx[i]; ctx.fillStyle = "rgba(15,10,30,0.45)"; ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
      for (let i = 0; i < pathPx.length; i++) {
        if (!err && ((i - off) % 8 + 8) % 8 > 4) continue;
        const p = pathPx[i]; rect(p[0] - 1, p[1] - 1, 2, 2, col);
      }
      // waypoints
      const bob = reduced ? 0 : Math.floor(now / 500) % 2;
      game.waypoints.forEach(([x, y], i) => {
        const last = i === game.waypoints.length - 1;
        const sp = i === 0 ? sprites.crystal : last ? sprites.flag : sprites.chest;
        ctx.drawImage(sp, x * T, y * T - (i === 0 ? bob : 0));
        if (!last && i > 0) {
          const txt = String(i), tw = textWidth(txt, 1);
          const bx = x * T + 8 - Math.floor(tw / 2), by = y * T - 5 - bob;
          pixelText(rect, txt, bx, by, 1, "#fff", "#1a1428");
        }
      });
      // courier walking the route
      if (pathPx.length > 1) {
        const speed = reduced ? 0 : 28; // px per second
        const total = pathPx.length + 40;
        const idx = Math.min(pathPx.length - 1, Math.floor((now / 1000 * speed) % total));
        const p = pathPx[idx];
        const frame = Math.floor(now / 160) % 2;
        const facingLeft = p[2] < 0;
        const sp = frame ? (facingLeft ? sprites.courierBf : sprites.courierB) : (facingLeft ? sprites.courierAf : sprites.courierA);
        ctx.fillStyle = "rgba(15,10,30,0.35)"; ctx.fillRect(p[0] - 4, p[1] - 1, 8, 2);
        ctx.drawImage(sp, p[0] - 8, p[1] - 14);
      }
      // effects
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i], age = (now - e.t0) / 1000;
        if (age > e.life) { effects.splice(i, 1); continue; }
        const k = age / e.life;
        if (e.type === "burst") {
          for (let p = 0; p < 8; p++) {
            const a = (p / 8) * Math.PI * 2 + e.seed, dd = 3 + k * 12;
            const px = Math.round(e.x * T + 8 + Math.cos(a) * dd), py = Math.round(e.y * T + 8 + Math.sin(a) * dd);
            rect(px, py, 2, 2, k < 0.5 ? "#ffffff" : e.color);
          }
          if (k < 0.4) ctx.drawImage(sprites.sparkle, e.x * T + 6, e.y * T + 6 - Math.round(k * 10));
        } else if (e.type === "text") {
          const txt = e.text, sc = 2, tw = textWidth(txt, sc);
          const tx = Math.round(e.x * T + 8 - tw / 2), ty = Math.round(e.y * T - 6 - k * 14);
          ctx.globalAlpha = 1 - k * k;
          pixelText(rect, txt, tx, ty, sc, e.color, "#1a1428");
          ctx.globalAlpha = 1;
        }
      }
      return effects.length > 0;
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
    return { T, resize, setGame, setState, setView, setHover, setReducedMotion, flashError, addEffect, draw, worldToTile, fitView, get view() { return view; }, boardSize: () => ({ w: game.cols * T, h: game.rows * T }) };
  }

  root.MazerRender = { createRenderer, T };
})(typeof globalThis !== "undefined" ? globalThis : this);
