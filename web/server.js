#!/usr/bin/env node
/* Mazer server — static hosting + accounts + verified leaderboard.
 * Zero dependencies: node >= 22.13 (node:sqlite, node:crypto).
 *
 *   node web/server.js            # http://localhost:8080
 *   PORT=3000 MAZER_DATA=/var/mazer node web/server.js
 *
 * Every submitted score is re-verified here by regenerating the maze from its seed
 * and replaying the player's moves, so the client is never trusted for a score. */
"use strict";
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const M = require("./src/engine.js");

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.MAZER_DATA || path.join(__dirname, "data");
const CORS_ORIGIN = process.env.CORS_ORIGIN || ""; // set when the page is served from another origin
const SESSION_DAYS = 60;
const PAGE = path.join(__dirname, "dist", "standalone.html");

/* ---------- storage ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "mazer.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT NOT NULL, username_lc TEXT NOT NULL UNIQUE,
    pass_hash BLOB NOT NULL, salt BLOB NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS scores (
    seed TEXT NOT NULL, user_id INTEGER NOT NULL, score INTEGER NOT NULL, ap INTEGER NOT NULL,
    moves TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (seed, user_id));
  CREATE INDEX IF NOT EXISTS scores_seed_score ON scores (seed, score DESC, updated_at ASC);
`);
const q = {
  userByName: db.prepare("SELECT * FROM users WHERE username_lc = ?"),
  insertUser: db.prepare("INSERT INTO users (username, username_lc, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)"),
  insertSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
  session: db.prepare("SELECT s.expires_at, u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at < ?"),
  top: db.prepare("SELECT u.username, s.score, s.ap, s.updated_at FROM scores s JOIN users u ON u.id = s.user_id WHERE s.seed = ? ORDER BY s.score DESC, s.updated_at ASC LIMIT ?"),
  count: db.prepare("SELECT COUNT(*) AS n FROM scores WHERE seed = ?"),
  mine: db.prepare("SELECT score, ap, updated_at FROM scores WHERE seed = ? AND user_id = ?"),
  rank: db.prepare("SELECT COUNT(*) + 1 AS r FROM scores WHERE seed = ? AND (score > ? OR (score = ? AND updated_at < ?))"),
  upsert: db.prepare("INSERT INTO scores (seed, user_id, score, ap, moves, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(seed, user_id) DO UPDATE SET score = excluded.score, ap = excluded.ap, moves = excluded.moves, updated_at = excluded.updated_at"),
  solution: db.prepare("SELECT s.moves FROM scores s JOIN users u ON u.id = s.user_id WHERE s.seed = ? AND u.username_lc = ?"),
};

/* ---------- helpers ---------- */
const now = () => Date.now();
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
function hashPassword(pw, salt) { return crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 }); }
const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

const games = new Map(); // seed → generated game (bounded)
function gameFor(seed) {
  let g = games.get(seed);
  if (!g) { g = M.generate(seed); games.set(seed, g); if (games.size > 300) games.delete(games.keys().next().value); }
  return g;
}

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const limiter = new Map(); // key → {n, reset}
function rateLimit(key, max, windowMs) {
  const t = now(); let e = limiter.get(key);
  if (!e || e.reset < t) { e = { n: 0, reset: t + windowMs }; limiter.set(key, e); }
  if (++e.n > max) throw new HttpError(429, "Too many requests. Try again in a few minutes.");
  if (limiter.size > 10000) for (const [k, v] of limiter) if (v.reset < t) limiter.delete(k);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "", size = 0;
    req.on("data", (c) => { size += c.length; if (size > 65536) { reject(new HttpError(413, "Body too large")); req.destroy(); } else body += c; });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(new HttpError(400, "Invalid JSON")); } });
    req.on("error", reject);
  });
}
function send(res, status, data, headers) {
  const h = Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, headers || {});
  if (CORS_ORIGIN) { h["Access-Control-Allow-Origin"] = CORS_ORIGIN; h["Access-Control-Allow-Headers"] = "Content-Type, Authorization"; h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"; }
  res.writeHead(status, h); res.end(JSON.stringify(data));
}
function clientIp(req) { return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?"; }
function authUser(req, required) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || "");
  if (!m) { if (required) throw new HttpError(401, "Log in to do that"); return null; }
  const row = q.session.get(sha(m[1]));
  if (!row || row.expires_at < now()) { if (required) throw new HttpError(401, "Session expired. Log in again."); return null; }
  return { id: row.id, username: row.username };
}
function issueSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  q.insertSession.run(sha(token), userId, now() + SESSION_DAYS * 86400000);
  return token;
}
function credentials(body) {
  const username = String(body.username || "").trim(), password = String(body.password || "");
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "Username: 3–16 letters, numbers or _");
  if (password.length < 8 || password.length > 128) throw new HttpError(400, "Password must be at least 8 characters");
  return { username, password };
}

/* ---------- API ---------- */
const routes = {
  "POST /api/register": async (req) => {
    rateLimit("reg:" + clientIp(req), 10, 3600000);
    const { username, password } = credentials(await readJson(req));
    if (q.userByName.get(username.toLowerCase())) throw new HttpError(409, "That username is taken");
    const salt = crypto.randomBytes(16);
    const r = q.insertUser.run(username, username.toLowerCase(), hashPassword(password, salt), salt, now());
    return [201, { token: issueSession(Number(r.lastInsertRowid)), username }];
  },
  "POST /api/login": async (req) => {
    rateLimit("login:" + clientIp(req), 30, 900000);
    const body = await readJson(req);
    const u = q.userByName.get(String(body.username || "").trim().toLowerCase());
    const pw = String(body.password || "");
    const ok = u && pw && crypto.timingSafeEqual(hashPassword(pw, u.salt), u.pass_hash);
    if (!ok) throw new HttpError(401, "Wrong username or password");
    return [200, { token: issueSession(u.id), username: u.username }];
  },
  "POST /api/logout": async (req) => {
    const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || "");
    if (m) q.deleteSession.run(sha(m[1]));
    return [200, { ok: true }];
  },
  "GET /api/me": async (req) => {
    const u = authUser(req, false);
    return [200, { user: u ? { username: u.username } : null }];
  },
  "GET /api/scores": async (req, url) => {
    const seed = M.sanitizeSeed(url.searchParams.get("seed"));
    if (!seed) throw new HttpError(400, "seed required");
    const me = authUser(req, false);
    const rows = q.top.all(seed, 100).map((r, i) => ({ rank: i + 1, username: r.username, score: r.score, ap: r.ap, at: r.updated_at }));
    let mine = null;
    if (me) {
      const m = q.mine.get(seed, me.id);
      if (m) mine = { username: me.username, score: m.score, ap: m.ap, rank: q.rank.get(seed, m.score, m.score, m.updated_at).r };
    }
    return [200, { seed, entries: rows, total: q.count.get(seed).n, me: mine }];
  },
  "POST /api/scores": async (req) => {
    const me = authUser(req, true);
    rateLimit("submit:" + me.id, 60, 60000);
    const body = await readJson(req);
    const seed = M.sanitizeSeed(body.seed);
    if (!seed) throw new HttpError(400, "seed required");
    const moves = body.moves;
    if (!Array.isArray(moves) || moves.length > 4000) throw new HttpError(400, "Bad move list");
    const v = M.verifySolution(gameFor(seed), moves);
    if (!v.ok) throw new HttpError(422, "That solution doesn't check out");
    const existing = q.mine.get(seed, me.id);
    const improved = !existing || v.score > existing.score;
    const t = now();
    if (improved) q.upsert.run(seed, me.id, v.score, v.ap, JSON.stringify(moves), t);
    const best = improved ? v.score : existing.score;
    const at = improved ? t : existing.updated_at;
    return [200, { score: v.score, best, improved, rank: q.rank.get(seed, best, best, at).r, total: q.count.get(seed).n }];
  },
  "GET /api/solution": async (req, url) => {
    // Replays are public once a daily puzzle is over; other seeds are open immediately.
    const seed = M.sanitizeSeed(url.searchParams.get("seed")), user = String(url.searchParams.get("username") || "").toLowerCase();
    if (seed === M.dailySeed()) throw new HttpError(403, "Today's solutions unlock tomorrow");
    const row = q.solution.get(seed, user);
    if (!row) throw new HttpError(404, "No solution");
    return [200, { seed, username: user, moves: JSON.parse(row.moves) }];
  },
};

/* ---------- static + dispatch ---------- */
let page = null, pageMtime = 0;
function loadPage() {
  try { const st = fs.statSync(PAGE); if (st.mtimeMs !== pageMtime) { page = fs.readFileSync(PAGE); pageMtime = st.mtimeMs; } } catch (e) { page = null; }
  return page;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    const key = req.method + " " + url.pathname;
    if (routes[key]) { const [status, data] = await routes[key](req, url); return send(res, status, data); }
    if (url.pathname.startsWith("/api/")) throw new HttpError(404, "No such endpoint");
    if (url.pathname === "/healthz") return send(res, 200, { ok: true });
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = loadPage();
      if (!html) throw new HttpError(503, "Run `node web/build.js` first");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end(html);
    }
    throw new HttpError(404, "Not found");
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    send(res, status, { error: status === 500 ? "Server error" : e.message });
  }
});
setInterval(() => q.purgeSessions.run(now()), 3600000).unref();
if (require.main === module) server.listen(PORT, () => console.log("mazer listening on http://localhost:" + PORT + "  data: " + DATA_DIR));
module.exports = { server };
