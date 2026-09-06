/* Mazer renderer — Canvas 2D, a cached static layer (ground, zones, walls)
 * plus a live layer (path, waypoints, effects) drawn every frame. */
(function (root) {
  "use strict";
  const T = 64; // world units per tile

  function hash2(x, y) { // cheap deterministic per-tile noise, independent of game rng
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, amt) { // amt -1..1
    const [r, g, b] = hexToRgb(hex);
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const f = (c) => Math.round((t - c) * p + c);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function luma(hex) { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

  function roundRectPath(ctx, x, y, w, h, r) {
    // r: [tl, tr, br, bl]
    const [tl, tr, br, bl] = r;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    if (tr) ctx.arcTo(x + w, y, x + w, y + tr, tr); else ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - br);
    if (br) ctx.arcTo(x + w, y + h, x + w - br, y + h, br); else ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + bl, y + h);
    if (bl) ctx.arcTo(x, y + h, x, y + h - bl, bl); else ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + tl);
    if (tl) ctx.arcTo(x, y, x + tl, y, tl); else ctx.lineTo(x, y);
    ctx.closePath();
  }

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    let game = null, walls = null, segments = [];
    let cache = null, cacheScale = 1;
    const H = T * 0.3; // block height
    const PAD = T * 0.6;
    let view = { scale: 1, ox: 0, oy: 0 };
    let dpr = 1, cssW = 0, cssH = 0;
    const effects = []; // {type, x, y, t0, ...}
    let hover = null;
    let errorUntil = 0;
    let reduced = false;
    let darkText = false;

    const worldW = () => game.cols * T + PAD * 2;
    const worldH = () => game.rows * T + PAD * 2;

    function resize(w, h, ratio) {
      cssW = w; cssH = h; dpr = ratio;
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
    }

    function setGame(g, w, segs) {
      game = g; walls = w; segments = segs;
      darkText = luma(g.biome.ground[0]) > 0.62;
      cache = null;
    }
    function setState(w, segs) { walls = w; segments = segs; cache = null; }
    function setView(v) { view = v; }
    function setHover(t) { hover = t; }
    function setReducedMotion(v) { reduced = v; }
    function flashError() { errorUntil = performance.now() + 450; }
    function addEffect(e) { effects.push(Object.assign({ t0: performance.now() }, e)); }

    /* ---------- static layer ---------- */
    function isWall(x, y) { return x >= 0 && y >= 0 && x < game.cols && y < game.rows && walls[y * game.cols + x] === 1; }

    function buildCache(scale) {
      const W = worldW(), Hh = worldH();
      const maxSide = 3072;
      cacheScale = Math.min(scale, maxSide / W, maxSide / Hh);
      cache = document.createElement("canvas");
      cache.width = Math.ceil(W * cacheScale); cache.height = Math.ceil(Hh * cacheScale);
      const c = cache.getContext("2d");
      c.scale(cacheScale, cacheScale);
      c.translate(PAD, PAD);
      const b = game.biome, cols = game.cols, rows = game.rows;

      // ground
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const hv = hash2(x, y);
        c.fillStyle = b.ground[Math.floor(hv * b.ground.length)];
        c.fillRect(x * T, y * T, T, T);
      }
      // pebbles / grass tufts
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const hv = hash2(x + 101, y + 7);
        if (hv < 0.35) {
          const n = 1 + Math.floor(hv * 8);
          c.fillStyle = rgba(b.ground[0], 0);
          for (let k = 0; k < n; k++) {
            const px = x * T + T * (0.15 + hash2(x * 3 + k, y * 5) * 0.7), py = y * T + T * (0.15 + hash2(y * 7 + k, x * 11) * 0.7);
            c.fillStyle = k % 2 ? shade(b.ground[0], -0.12) : shade(b.ground[0], 0.12);
            c.beginPath(); c.arc(px, py, T * 0.035, 0, Math.PI * 2); c.fill();
          }
        }
      }
      // score zones: tint + glow
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const m = game.scoreMod[y * cols + x];
        if (m > 1) {
          c.fillStyle = rgba(b.zone, Math.min(0.72, 0.16 + (m - 1) * 0.11));
          c.fillRect(x * T, y * T, T, T);
        }
      }
      c.save(); c.beginPath(); c.rect(0, 0, cols * T, rows * T); c.clip();
      for (const z of game.zones) {
        const cx = (z.x + 0.5) * T, cy = (z.y + 0.5) * T, r = (z.r + 0.8) * T;
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, rgba(b.zone, 0.55)); g.addColorStop(0.6, rgba(b.zone, 0.12)); g.addColorStop(1, rgba(b.zone, 0));
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // grid
      c.strokeStyle = darkText ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.07)";
      c.lineWidth = 1.5;
      c.beginPath();
      for (let x = 0; x <= cols; x++) { c.moveTo(x * T, 0); c.lineTo(x * T, rows * T); }
      for (let y = 0; y <= rows; y++) { c.moveTo(0, y * T); c.lineTo(cols * T, y * T); }
      c.stroke();
      // zone multiplier badges
      for (const z of game.zones) {
        const m = game.scoreMod[z.y * cols + z.x];
        const cx = (z.x + 0.5) * T, cy = (z.y + 0.5) * T;
        c.fillStyle = "rgba(0,0,0,0.42)";
        roundRectPath(c, cx - T * 0.3, cy - T * 0.19, T * 0.6, T * 0.38, [8, 8, 8, 8]); c.fill();
        c.fillStyle = "#fff"; c.font = `700 ${T * 0.26}px Nunito, system-ui, sans-serif`;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("×" + Math.round(m), cx, cy + 1);
      }
      // walls: blocks with rounded convex corners and a front face
      const r = T * 0.24;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!isWall(x, y)) continue;
        const nat = game.natural[y * cols + x] === 1;
        const top = nat ? b.rockTop : b.stoneTop, side = nat ? b.rock : b.stone;
        const n = isWall(x, y - 1), e = isWall(x + 1, y), s = isWall(x, y + 1), w = isWall(x - 1, y);
        const radii = [!n && !w ? r : 0, !n && !e ? r : 0, !s && !e ? r : 0, !s && !w ? r : 0];
        const px = x * T, py = y * T;
        // shadow on the ground to the lower-right
        c.fillStyle = "rgba(0,0,0,0.18)";
        roundRectPath(c, px + T * 0.08, py - H + T * 0.12, T, T + H, radii); c.fill();
        // front face
        if (!s) {
          c.fillStyle = shade(side, -0.05);
          roundRectPath(c, px, py + T - H - 1, T, H + 1, [0, 0, radii[2], radii[3]]); c.fill();
          c.fillStyle = "rgba(0,0,0,0.22)";
          c.fillRect(px + (w ? 0 : radii[3]), py + T - H * 0.45, T - (w ? 0 : radii[3]) - (e ? 0 : radii[2]), H * 0.45);
        }
        // top face
        c.fillStyle = top;
        roundRectPath(c, px, py - H, T, T, radii); c.fill();
        // highlight edge (top) and shade edge (left)
        c.fillStyle = "rgba(255,255,255,0.22)";
        if (!n) c.fillRect(px + radii[0], py - H, T - radii[0] - radii[1], T * 0.06);
        c.fillStyle = "rgba(0,0,0,0.10)";
        if (!w) c.fillRect(px, py - H + radii[0], T * 0.06, T - radii[0] - radii[3]);
        // texture: rock specks vs. stone seams
        if (nat) {
          c.fillStyle = "rgba(0,0,0,0.16)";
          for (let k = 0; k < 3; k++) {
            const sx = px + T * (0.2 + hash2(x + k * 13, y) * 0.6), sy = py - H + T * (0.25 + hash2(y + k * 7, x) * 0.55);
            c.beginPath(); c.ellipse(sx, sy, T * 0.07, T * 0.045, hash2(x, y + k) * 3, 0, Math.PI * 2); c.fill();
          }
        } else {
          c.strokeStyle = "rgba(0,0,0,0.13)"; c.lineWidth = 2;
          c.beginPath();
          c.moveTo(px + (w ? 0 : 4), py - H + T * 0.5); c.lineTo(px + T - (e ? 0 : 4), py - H + T * 0.5);
          c.moveTo(px + T * 0.5, py - H + (n ? 0 : 4)); c.lineTo(px + T * 0.5, py - H + T * 0.5);
          c.moveTo(px + T * 0.25, py - H + T * 0.5); c.lineTo(px + T * 0.25, py - H + T - (s ? 0 : 4));
          c.moveTo(px + T * 0.75, py - H + T * 0.5); c.lineTo(px + T * 0.75, py - H + T - (s ? 0 : 4));
          c.stroke();
        }
      }
      // board edge
      c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 3;
      c.strokeRect(0, 0, cols * T, rows * T);
    }

    /* ---------- live layer ---------- */
    function draw(now) {
      if (!game) return;
      const wantScale = Math.min(4, view.scale * dpr * 1.25);
      if (!cache || Math.abs(wantScale - cacheScale) > cacheScale * 0.5) buildCache(wantScale);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.scale, view.scale);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cache, -PAD, -PAD, worldW(), worldH());

      const b = game.biome;
      // hover
      if (hover) {
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillRect(hover[0] * T, hover[1] * T, T, T);
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3;
        ctx.strokeRect(hover[0] * T + 2, hover[1] * T + 2, T - 4, T - 4);
      }
      // path
      const err = now < errorUntil;
      const pts = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        for (let k = i === 0 ? 0 : 1; k < seg.length; k++) pts.push(seg[k]);
      }
      if (pts.length > 1) {
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + 0.5) * T, (pts[0][1] + 0.5) * T);
        for (let i = 1; i < pts.length; i++) ctx.lineTo((pts[i][0] + 0.5) * T, (pts[i][1] + 0.5) * T);
        const col = err ? "#ff3b5c" : b.path;
        ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = T * 0.34; ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = T * 0.2; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = T * 0.08;
        ctx.setLineDash([T * 0.35, T * 0.45]);
        ctx.lineDashOffset = reduced ? 0 : -(now / 9) % (T * 0.8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // waypoints
      const pulse = reduced ? 0 : (Math.sin(now / 380) + 1) / 2;
      game.waypoints.forEach(([x, y], i) => {
        const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
        const last = i === game.waypoints.length - 1;
        const color = i === 0 ? "#3ddc84" : last ? "#ff4d6d" : "#ffd54a";
        ctx.fillStyle = rgba(color === "#3ddc84" ? "#3ddc84" : color, 0.25 + pulse * 0.2);
        ctx.beginPath(); ctx.arc(cx, cy, T * (0.42 + pulse * 0.08), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.arc(cx + 2, cy + 3, T * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx, cy, T * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.arc(cx - T * 0.08, cy - T * 0.1, T * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a1d26"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `800 ${T * 0.28}px Nunito, system-ui, sans-serif`;
        ctx.fillText(i === 0 ? "S" : last ? "E" : String(i), cx, cy + 1);
      });
      // effects
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i], age = (now - e.t0) / 1000;
        if (age > e.life) { effects.splice(i, 1); continue; }
        const k = age / e.life;
        if (e.type === "burst") {
          for (let p = 0; p < 8; p++) {
            const a = (p / 8) * Math.PI * 2 + e.seed;
            const d = T * (0.2 + k * 0.7);
            ctx.fillStyle = rgba(e.color, 1 - k);
            ctx.beginPath(); ctx.arc((e.x + 0.5) * T + Math.cos(a) * d, (e.y + 0.5) * T + Math.sin(a) * d, T * 0.06 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill();
          }
        } else if (e.type === "text") {
          ctx.globalAlpha = 1 - k * k;
          ctx.font = `900 ${T * 0.34}px Nunito, system-ui, sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const tx = (e.x + 0.5) * T, ty = (e.y + 0.5) * T - T * 0.2 - k * T * 0.9;
          ctx.lineWidth = T * 0.09; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.strokeText(e.text, tx, ty);
          ctx.fillStyle = e.color; ctx.fillText(e.text, tx, ty);
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
      const bw = game.cols * T, bh = game.rows * T;
      const scale = Math.min((w - margin * 2) / bw, (h - margin * 2) / bh);
      return { scale, ox: (w - bw * scale) / 2, oy: (h - bh * scale) / 2 };
    }

    return { T, resize, setGame, setState, setView, setHover, setReducedMotion, flashError, addEffect, draw, worldToTile, fitView, get view() { return view; }, boardSize: () => ({ w: game.cols * T, h: game.rows * T }) };
  }

  root.MazerRender = { createRenderer, T };
})(typeof globalThis !== "undefined" ? globalThis : this);
