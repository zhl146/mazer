// Run: node web/test/engine.test.js
const assert = require("assert");
const M = require("../src/engine.js");

let checked = 0;
const styles = {}, biomes = {}, shapes = {};
for (let i = 0; i < 300; i++) {
  const seed = "test-" + i;
  const g = M.generate(seed);
  const g2 = M.generate(seed);
  assert.deepStrictEqual(Array.from(g.walls), Array.from(g2.walls), "deterministic walls " + seed);
  assert.strictEqual(g.baseScore, g2.baseScore, "deterministic score " + seed);
  assert(g.baseSegments.length === g.waypoints.length - 1, "all segments routed " + seed);
  assert(g.waypoints.length >= 2 && g.waypoints.length <= 6, "waypoint count " + seed);
  for (const [x, y] of g.waypoints) assert(!g.walls[M.idx(g.cols, x, y)], "waypoint free " + seed);
  assert(g.baseScore > 0);
  styles[g.wallStyle] = (styles[g.wallStyle] || 0) + 1;
  biomes[g.biome.id] = (biomes[g.biome.id] || 0) + 1;
  shapes[g.zoneShape] = (shapes[g.zoneShape] || 0) + 1;

  // play a few random legal moves, then verify the diff reproduces the score
  const R = M.makeRng(seed + "-play");
  let walls = g.walls, ap = g.maxActionPoints, score = g.baseScore;
  for (let k = 0; k < 40; k++) {
    const r = M.tryToggle(g, walls, ap, R.int(0, g.cols - 1), R.int(0, g.rows - 1));
    if (r.ok) { walls = r.walls; ap = r.ap; score = r.score; }
  }
  const moves = M.diffMoves(g, walls);
  const v = M.verifySolution(g, moves);
  assert(v.ok, "verify ok " + seed);
  assert.strictEqual(v.score, score, "verify score " + seed);
  assert.strictEqual(v.ap, ap, "verify ap " + seed);
  // tamper: add a waypoint toggle → invalid
  const bad = M.verifySolution(g, moves.concat([g.waypoints[0]]));
  assert(!bad.ok);
  checked++;
}
// pathfinding sanity: corner-touching blocks do not block a diagonal step
{
  const walls = new Uint8Array(9); walls[1] = 1; walls[3] = 1; // block (1,0) and (0,1)
  const p = M.findPath(walls, 3, 3, 0, 0, 2, 2);
  assert(p && p.length === 3, "slips between corner-touching blocks");
  walls[4] = 1; // (1,1) blocked too: now sealed in
  assert.strictEqual(M.findPath(walls, 3, 3, 0, 0, 2, 2), null, "orthogonally joined blocks seal");
}
// sprite art sanity: every row of every string-map sprite has the same width
{
  const src = require("fs").readFileSync(__dirname + "/../src/render.js", "utf8");
  const re = /(\w+): \{ pal: \{[^}]*\}, rows: \[([\s\S]*?)\] \}/g; let m, n = 0;
  while ((m = re.exec(src))) {
    const rows = m[2].match(/"[^"]*"/g).map((r) => r.slice(1, -1));
    const w = rows[0].length;
    for (const r of rows) assert.strictEqual(r.length, w, "sprite " + m[1] + " row width");
    n++;
  }
  assert(n > 0, "found sprites");
}
console.log("ok", checked, "seeds");
console.log("wall styles", styles);
console.log("biomes", biomes);
console.log("zone shapes", shapes);
const g = M.generate(M.dailySeed(new Date("2026-09-06T12:00:00Z")));
console.log("daily", g.seed, g.cols + "x" + g.rows, g.biome.name, g.wallStyle, g.zoneShape, "AP", g.maxActionPoints, "cost", g.removalCost, "base", g.baseScore);
