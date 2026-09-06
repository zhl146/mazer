/* Mazer app — UI, input, persistence, leaderboard. */
(function () {
  "use strict";
  const M = globalThis.Mazer, RR = globalThis.MazerRender;
  // Build-time config: {api: "/api" | null, shareUrl, mode}. See web/build.js.
  const CFG = globalThis.MAZER_CONFIG || {};
  const API = CFG.api || null; // null → no server: scores stay on this device
  const SHARE_BASE = CFG.shareUrl || "";
  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mazer." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mazer." + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  let pid = store.get("pid", null);
  if (!pid) { pid = "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); store.set("pid", pid); }
  let playerName = store.get("name", "");
  let soundOn = store.get("sound", true);

  /* ---------- sound ---------- */
  let actx = null;
  function beep(freq, dur, type, gain) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(freq, actx.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), actx.currentTime + dur);
      g.gain.setValueAtTime(gain || 0.08, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    place: () => beep(520, 0.12, "triangle", 0.09),
    remove: () => beep(300, 0.14, "triangle", 0.07),
    error: () => { beep(140, 0.22, "sawtooth", 0.06); },
    good: () => { beep(660, 0.1, "sine", 0.08); setTimeout(() => beep(880, 0.16, "sine", 0.08), 90); },
  };
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  /* ---------- game state ---------- */
  const canvas = $("board"), wrap = $("boardWrap");
  const R = RR.createRenderer(canvas);
  R.setReducedMotion(reduced);
  let game = null, walls = null, ap = 0, segments = [], score = 0;
  let history = [];
  let fit = null, view = null;
  let shownScore = 0, scoreAnim = null;

  function seedLabel(seed) {
    const m = /^daily-(\d{4})-(\d{2})-(\d{2})$/.exec(seed);
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      return "Daily · " + d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
    }
    return seed;
  }
  const fmt = (n) => Math.round(n).toLocaleString();

  function loadGame(seed, opts) {
    seed = M.sanitizeSeed(seed) || M.dailySeed();
    game = M.generate(seed);
    walls = new Uint8Array(game.natural);
    ap = game.maxActionPoints;
    segments = game.baseSegments;
    score = game.baseScore;
    history = [];
    // restore progress for this seed
    const saved = store.get("moves." + seed, null);
    if (saved && !(opts && opts.fresh)) {
      const v = M.verifySolution(game, saved);
      if (v.ok) {
        for (const [x, y] of saved) walls[y * game.cols + x] = walls[y * game.cols + x] ? 0 : 1;
        ap = v.ap; score = v.score;
        segments = M.routeWaypoints(walls, game.cols, game.rows, game.waypoints).segments;
      }
    }
    R.setGame(game, walls, segments);
    layout(true);
    $("seedTitle").textContent = seedLabel(seed);
    $("seedSub").textContent = " · " + game.biome.name + " ⛏" + game.removalCost;
    $("seedDot").style.color = game.biome.path;
    
    shownScore = score; $("score").textContent = fmt(score);
    updateHud();
    updateUrl(seed);
    leaderboard.setSeed(seed);
  }
  function updateUrl(seed) {
    try {
      const u = new URL(location.href);
      if (u.searchParams.get("seed") !== seed) { u.searchParams.set("seed", seed); history_replace(u); }
    } catch (e) { /* ignore */ }
  }
  function history_replace(u) { try { window.history.replaceState(null, "", u.toString()); } catch (e) { /* sandboxed */ } }

  function updateHud() {
    const pct = ap / game.maxActionPoints;
    $("energyFill").style.transform = "scaleX(" + pct + ")";
    $("energyText").textContent = ap + " / " + game.maxActionPoints;
    $("energy").classList.toggle("low", pct <= 0.2);
    $("energy").setAttribute("aria-valuenow", ap);
    const best = store.get("best." + game.seed, 0);
    $("best").innerHTML = best > 0 ? "Best <b>" + fmt(best) + "</b>" : "Base <b>" + fmt(game.baseScore) + "</b>";
    $("btnUndo").disabled = history.length === 0;
    $("btnReset").disabled = history.length === 0 && M.diffMoves(game, walls).length === 0;
    animateScore();
  }
  function animateScore() {
    if (scoreAnim) cancelAnimationFrame(scoreAnim);
    const from = shownScore, to = score, t0 = performance.now(), dur = reduced ? 0 : 420;
    const el = $("score");
    el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 140);
    const step = (t) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      shownScore = from + (to - from) * e;
      el.textContent = fmt(shownScore);
      if (k < 1) scoreAnim = requestAnimationFrame(step); else scoreAnim = null;
    };
    scoreAnim = requestAnimationFrame(step);
  }
  function saveProgress() { store.set("moves." + game.seed, M.diffMoves(game, walls)); }

  function toggleTile(x, y) {
    const res = M.tryToggle(game, walls, ap, x, y);
    if (!res.ok) {
      R.flashError();
      wrap.classList.remove("shake"); void wrap.offsetWidth; if (!reduced) wrap.classList.add("shake");
      buzz(40); sfx.error();
      toast(res.reason === "energy" ? "Not enough MP" : res.reason === "blocked" ? "That would trap the courier" : res.reason === "waypoint" ? "Stops can't be moved" : "Can't do that", "error");
      return;
    }
    history.push({ walls, ap, segments, score });
    if (history.length > 200) history.shift();
    const delta = res.score - score;
    const placed = res.walls[y * game.cols + x] === 1;
    walls = res.walls; ap = res.ap; segments = res.segments; score = res.score;
    R.setState(walls, segments);
    R.addEffect({ type: "burst", x, y, life: 0.45, color: placed ? "#fff0c8" : game.biome.zone, seed: Math.random() * 6 });
    if (delta !== 0) R.addEffect({ type: "text", x, y, life: 0.9, text: (delta > 0 ? "+" : "-") + Math.abs(delta), color: delta > 0 ? "#7cff9e" : "#ff6b7d" });
    placed ? sfx.place() : sfx.remove();
    buzz(10);
    if (score > store.get("best." + game.seed, 0)) store.set("best." + game.seed, score);
    saveProgress(); updateHud();
  }
  function undo() {
    const h = history.pop(); if (!h) return;
    walls = h.walls; ap = h.ap; segments = h.segments; score = h.score;
    R.setState(walls, segments); sfx.remove(); saveProgress(); updateHud();
  }
  function reset() {
    if (M.diffMoves(game, walls).length === 0) return;
    history.push({ walls, ap, segments, score });
    walls = new Uint8Array(game.natural); ap = game.maxActionPoints; segments = game.baseSegments; score = game.baseScore;
    R.setState(walls, segments); saveProgress(); updateHud(); toast("Board reset");
  }

  /* ---------- view / layout ---------- */
  const DPR = () => Math.min(3, window.devicePixelRatio || 1);
  function layout(refit) {
    const rect = wrap.getBoundingClientRect();
    R.resize(rect.width, rect.height, DPR());
    const nf = R.fitView(rect.width, rect.height, 10);
    // prefer a whole number of device pixels per art pixel when it costs less than a quarter of the size
    const k = nf.scale * DPR(), ki = Math.floor(k);
    if (ki >= 1 && ki >= k * 0.9) { const f = ki / DPR() / nf.scale; nf.ox = rect.width / 2 - (rect.width / 2 - nf.ox) * f; nf.oy = rect.height / 2 - (rect.height / 2 - nf.oy) * f; nf.scale = ki / DPR(); }
    if (refit || !view) { fit = nf; view = Object.assign({}, nf); }
    else { fit = nf; clampView(); }
    R.setView(view);
  }
  function clampView() {
    const { w, h } = R.boardSize();
    const rect = wrap.getBoundingClientRect();
    view.scale = Math.max(fit.scale * 0.8, Math.min(fit.scale * 4.5, view.scale));
    const bw = w * view.scale, bh = h * view.scale;
    // keep at least 30% of the board on screen in each axis
    const minX = Math.min(rect.width * 0.3 - bw, (rect.width - bw) / 2), maxX = Math.max(rect.width * 0.7, (rect.width - bw) / 2);
    const minY = Math.min(rect.height * 0.3 - bh, (rect.height - bh) / 2), maxY = Math.max(rect.height * 0.7, (rect.height - bh) / 2);
    view.ox = Math.max(minX, Math.min(maxX, view.ox));
    view.oy = Math.max(minY, Math.min(maxY, view.oy));
  }
  function snapZoom() {
    const d = DPR(), k = view.scale * d, r = Math.round(k);
    if (r >= 1 && Math.abs(k - r) / r < 0.3 && Math.abs(k - r) > 0.001) zoomAt(r / d / view.scale, wrap.clientWidth / 2, wrap.clientHeight / 2);
  }
  function zoomAt(f, sx, sy) {
    const ns = Math.max(fit.scale * 0.8, Math.min(fit.scale * 4.5, view.scale * f));
    const k = ns / view.scale;
    view.ox = sx - (sx - view.ox) * k; view.oy = sy - (sy - view.oy) * k; view.scale = ns;
    clampView();
  }

  /* ---------- pointer input ---------- */
  const pointers = new Map();
  let gesture = null; // {type:'tap'|'pan'|'pinch', ...}
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) gesture = { type: "tap", x0: e.clientX, y0: e.clientY, t0: performance.now(), ox: view.ox, oy: view.oy };
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { type: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y), s0: view.scale, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, ox: view.ox, oy: view.oy };
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === "mouse") R.setHover(R.worldToTile(e.clientX - rect.left, e.clientY - rect.top));
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;
    if (gesture.type === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ns = Math.max(fit.scale * 0.8, Math.min(fit.scale * 4.5, gesture.s0 * (d / gesture.d0)));
      const k = ns / gesture.s0;
      const lcx = gesture.cx - rect.left, lcy = gesture.cy - rect.top;
      view.scale = ns;
      view.ox = (lcx - (lcx - gesture.ox) * k) + (mx - gesture.cx);
      view.oy = (lcy - (lcy - gesture.oy) * k) + (my - gesture.cy);
      clampView();
      return;
    }
    if (gesture.type === "tap" || gesture.type === "pan") {
      const dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
      if (gesture.type === "tap" && Math.hypot(dx, dy) > 8) gesture.type = "pan";
      if (gesture.type === "pan") { view.ox = gesture.ox + dx; view.oy = gesture.oy + dy; clampView(); }
    }
  });
  const endPointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    if (gesture && gesture.type === "tap" && pointers.size === 1 && pointers.has(e.pointerId) && performance.now() - gesture.t0 < 500 && e.type === "pointerup") {
      const t = R.worldToTile(e.clientX - rect.left, e.clientY - rect.top);
      if (t) toggleTile(t[0], t[1]);
    }
    pointers.delete(e.pointerId);
    gesture = pointers.size === 0 ? null : gesture && gesture.type === "pinch" ? { type: "done" } : gesture;
    if (pointers.size === 0) snapZoom();
    if (e.pointerType !== "mouse") R.setHover(null);
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", () => R.setHover(null));
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    clearTimeout(wheelTimer); wheelTimer = setTimeout(snapZoom, 180);
  }, { passive: false });
  let wheelTimer = null;
  $("zoomIn").onclick = () => { zoomAt(1.5, wrap.clientWidth / 2, wrap.clientHeight / 2); snapZoom(); };
  $("zoomOut").onclick = () => { zoomAt(1 / 1.5, wrap.clientWidth / 2, wrap.clientHeight / 2); snapZoom(); };
  $("zoomFit").onclick = () => layout(true);
  window.addEventListener("resize", () => layout(false));
  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;
    if ((e.ctrlKey || e.metaKey) && e.key === "z") { undo(); e.preventDefault(); }
    if (e.key === "Escape") closeSheets();
  });

  /* ---------- render loop ---------- */
  function frame(now) {
    R.setView(view);
    R.draw(now);
    requestAnimationFrame(frame);
  }

  /* ---------- toasts & sheets ---------- */
  let toastTimer = null;
  function toast(msg, kind) {
    const el = $("toast");
    el.textContent = msg; el.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }
  let openSheet = null;
  function showSheet(id) {
    closeSheets();
    openSheet = id;
    $("backdrop").classList.add("show"); $(id).classList.add("show");
    if (id === "sheetRanks") leaderboard.open(); else leaderboard.close();
  }
  function closeSheets() {
    if (!openSheet) return;
    $("backdrop").classList.remove("show");
    document.querySelectorAll(".sheet.show").forEach((s) => s.classList.remove("show"));
    openSheet = null; leaderboard.close();
  }
  $("backdrop").onclick = closeSheets;
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeSheets));

  /* ---------- server API & auth ---------- */
  async function api(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (auth.token) headers.Authorization = "Bearer " + auth.token;
    let res;
    try { res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { throw { status: 0, error: "Can't reach the server" }; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, error: data.error || "Request failed" };
    return data;
  }
  const auth = {
    token: store.get("token", null), user: store.get("user", null), after: null,
    set(token, user) { this.token = token; this.user = user; store.set("token", token); store.set("user", user); renderAccount(); },
    async logout() { try { await api("POST", "/logout"); } catch (e) { /* ignore */ } this.set(null, null); toast("Logged out"); },
  };
  let authMode = "login";
  function renderAccount() {
    if (!API) return;
    $("accountText").innerHTML = auth.user ? "Logged in as <b></b>" : "Not logged in";
    if (auth.user) $("accountText").querySelector("b").textContent = auth.user;
    $("accountBtn").textContent = auth.user ? "Log out" : "Log in";
  }
  function openAuth(mode, after) {
    authMode = mode; auth.after = after || null;
    $("authTitle").textContent = mode === "login" ? "LOG IN" : "NEW ACCOUNT";
    $("authGo").textContent = mode === "login" ? "Log in" : "Create account";
    $("authSwap").textContent = mode === "login" ? "New here? Create an account" : "Have an account? Log in";
    $("authPass").autocomplete = mode === "login" ? "current-password" : "new-password";
    $("authErr").textContent = ""; $("authPass").value = "";
    showSheet("sheetAuth"); setTimeout(() => $("authUser").focus(), 300);
  }
  if (API) {
    $("accountBtn").onclick = () => { if (auth.user) auth.logout(); else openAuth("login"); };
    $("authSwap").onclick = () => openAuth(authMode === "login" ? "register" : "login", auth.after);
    $("authForm").onsubmit = async (e) => {
      e.preventDefault();
      const username = $("authUser").value.trim(), password = $("authPass").value;
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) { $("authErr").textContent = "Username: 3–16 letters, numbers or _"; return; }
      if (password.length < 8) { $("authErr").textContent = "Password must be at least 8 characters"; return; }
      $("authGo").disabled = true; $("authErr").textContent = "";
      try {
        const r = await api("POST", authMode === "login" ? "/login" : "/register", { username, password });
        auth.set(r.token, r.username);
        sfx.good(); toast(authMode === "login" ? "Welcome back, " + r.username : "Account created", "good");
        const next = auth.after; auth.after = null; closeSheets();
        if (next) next();
      } catch (err) { $("authErr").textContent = err.error; }
      $("authGo").disabled = false;
    };
    api("GET", "/me").then((r) => { if (auth.token && !r.user) auth.set(null, null); }).catch(() => {});
    $("nameSection").hidden = true; $("accountSection").hidden = false;
  } else {
    $("nameSection").hidden = false; $("accountSection").hidden = true;
  }

  /* ---------- leaderboard ---------- */
  const leaderboard = (function () {
    let seed = null, entries = [], mine = null, total = 0, status = API ? "loading" : "local";
    function localEntries(s) { return store.get("lb." + s, []); }
    function saveLocal(s, entry) {
      const list = localEntries(s).filter((e) => e.pid !== entry.pid);
      list.push(entry); store.set("lb." + s, list.slice(-100));
    }
    // Local mode: verify every entry by replaying its moves against the seed.
    function verifiedLocal(list) {
      const out = [];
      for (const e of list) {
        if (!e || typeof e.name !== "string" || !Array.isArray(e.moves)) continue;
        const v = M.verifySolution(game, e.moves);
        if (!v.ok) continue;
        out.push({ username: e.name.slice(0, 16), score: v.score, ap: v.ap, at: e.at || 0, me: e.pid === pid });
      }
      out.sort((a, b) => b.score - a.score || a.at - b.at);
      return out.map((e, i) => Object.assign(e, { rank: i + 1 }));
    }
    function render() {
      const list = $("lbList"); list.innerHTML = "";
      $("ranksSub").textContent = seedLabel(seed) + " · " + game.biome.name;
      const st = $("lbStatus");
      st.innerHTML = status === "global" ? '<span class="pill global">● Global</span><span>' + total + (total === 1 ? " player" : " players") + " on this seed</span>"
        : status === "loading" ? '<span class="pill">Loading…</span>'
        : status === "offline" ? '<span class="pill">Offline</span><span>Couldn\'t reach the server</span>'
        : '<span class="pill">Local only</span><span>Scores are saved on this device</span>';
      if (!entries.length) list.innerHTML = '<li class="lb-empty">No scores yet. Be the first to submit.</li>';
      entries.slice(0, 50).forEach((e) => {
        const li = document.createElement("li");
        li.className = "lb-row" + (e.me ? " me" : "") + (e.rank <= 3 ? " top" : "");
        li.innerHTML = '<div class="rank">' + e.rank + '</div><div><div class="name"></div><div class="meta">' + e.ap + " MP left</div></div><div class=\"pts\">" + fmt(e.score) + "</div>";
        li.querySelector(".name").textContent = e.username || "Anonymous";
        list.appendChild(li);
      });
      const me = mine || entries.find((e) => e.me);
      $("lbYou").textContent = me ? "You're #" + me.rank + " of " + (total || entries.length) + " with " + fmt(me.score)
        : API && !auth.user ? "Log in to post a score" : entries.length ? "Submit a score to get on the board" : "";
    }
    function setSeed(s) { seed = s; entries = []; mine = null; total = 0; }
    async function open() {
      if (!API) { entries = verifiedLocal(localEntries(seed)); total = entries.length; status = "local"; render(); return; }
      status = "loading"; render();
      try {
        const r = await api("GET", "/scores?seed=" + encodeURIComponent(seed));
        if (r.seed !== seed) return;
        entries = r.entries.map((e) => Object.assign(e, { me: auth.user && e.username === auth.user }));
        mine = r.me; total = r.total; status = "global";
      } catch (e) { status = "offline"; entries = []; }
      render();
    }
    function close() { /* nothing to release */ }
    async function submit() {
      const moves = M.diffMoves(game, walls);
      if (!API) {
        saveLocal(seed, { pid, name: playerName, score, ap, at: Date.now(), moves, seed });
        sfx.good(); buzz([20, 40, 20]); toast("Saved on this device", "good"); showSheet("sheetRanks"); return;
      }
      if (!auth.user) { openAuth("login", submit); return; }
      try {
        const r = await api("POST", "/scores", { seed, moves });
        sfx.good(); buzz([20, 40, 20]);
        toast(r.improved ? "Posted! You're #" + r.rank : "Your best is still " + fmt(r.best) + " (#" + r.rank + ")", "good");
        if (score > store.get("best." + game.seed, 0)) store.set("best." + game.seed, score);
        showSheet("sheetRanks");
      } catch (err) {
        if (err.status === 401) { auth.set(null, null); openAuth("login", submit); return; }
        sfx.error(); toast(err.error, "error");
      }
    }
    return { setSeed, open, close, submit };
  })();

  /* ---------- buttons ---------- */
  $("btnUndo").onclick = undo;
  $("btnReset").onclick = reset;
  $("btnRanks").onclick = () => showSheet("sheetRanks");
  $("btnMenu").onclick = () => { $("nameInput").value = playerName; $("seedInput").value = ""; updateCountdown(); renderAccount(); showSheet("sheetMenu"); };
  $("seedChip").onclick = () => { showSheet("sheetMenu"); $("seedInput").value = game.seed; };
  $("btnSubmit").onclick = () => {
    if (!API && !playerName) { $("nameInput2").value = ""; showSheet("sheetName"); setTimeout(() => $("nameInput2").focus(), 300); return; }
    leaderboard.submit();
  };
  $("nameSubmit").onclick = () => {
    const n = cleanName($("nameInput2").value); if (!n) { toast("Pick a name first", "error"); return; }
    playerName = n; store.set("name", n); leaderboard.submit();
  };
  $("nameInput2").addEventListener("keydown", (e) => { if (e.key === "Enter") $("nameSubmit").click(); });
  $("nameSave").onclick = () => { const n = cleanName($("nameInput").value); if (n) { playerName = n; store.set("name", n); toast("Name saved", "good"); } };
  function cleanName(s) { return String(s || "").replace(/[^\w \-.'!?]/g, "").trim().slice(0, 16); }
  $("menuDaily").onclick = () => { closeSheets(); loadGame(M.dailySeed()); };
  $("menuRandom").onclick = () => { closeSheets(); loadGame(M.randomSeed()); toast("New maze: " + game.seed); };
  $("seedGo").onclick = () => { const s = M.sanitizeSeed($("seedInput").value); if (!s) return; closeSheets(); loadGame(s); };
  $("seedInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("seedGo").click(); });
  $("menuHow").onclick = () => showSheet("sheetHow");
  $("howDone").onclick = () => { store.set("seen", 1); closeSheets(); };
  const sw = $("soundSwitch");
  sw.setAttribute("aria-checked", String(!!soundOn));
  sw.onclick = () => { soundOn = !soundOn; store.set("sound", soundOn); sw.setAttribute("aria-checked", String(soundOn)); if (soundOn) sfx.place(); };
  $("btnShare").onclick = async () => {
    const url = shareUrl();
    const text = "I scored " + fmt(score) + " on Mazer (" + seedLabel(game.seed) + "). Beat me: seed “" + game.seed + "”";
    try {
      if (navigator.share) { await navigator.share({ title: "Mazer", text, url }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text + " " + url); toast("Link copied", "good"); }
    catch (e) { toast("Seed: " + game.seed); }
  };
  function shareUrl() {
    try {
      const base = SHARE_BASE || (window.top === window ? location.href : (document.referrer || location.href));
      const u = new URL(base); u.searchParams.set("seed", game.seed); u.hash = ""; return u.toString();
    } catch (e) { return ""; }
  }
  function updateCountdown() {
    const now = new Date();
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const ms = next - now.getTime(), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    $("dailyCountdown").textContent = "Same maze for everyone · next one in " + h + "h " + m + "m";
    $("menuSub").textContent = "Seed: " + game.seed + " · " + game.cols + "×" + game.rows + " · " + game.biome.name + " / " + game.wallStyle;
  }

  /* ---------- boot ---------- */
  function seedFromUrl() {
    try {
      const u = new URL(location.href);
      const q = u.searchParams.get("seed") || new URLSearchParams(u.hash.replace(/^#/, "")).get("seed");
      if (q) return q;
      if (document.referrer) { const r = new URL(document.referrer); const rq = r.searchParams.get("seed"); if (rq) return rq; }
    } catch (e) { /* ignore */ }
    return null;
  }
  document.fonts && document.fonts.ready.then(() => R.setState(walls, segments));
  loadGame(seedFromUrl() || M.dailySeed());
  requestAnimationFrame(frame);
  if (!store.get("seen", 0)) setTimeout(() => showSheet("sheetHow"), 400);
})();
