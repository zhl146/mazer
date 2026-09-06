#!/usr/bin/env node
// Concatenate web/src into two self-contained pages:
//   dist/standalone.html — full document for web/server.js (accounts + global leaderboard via /api)
//   dist/index.html      — fragment for the Claude artifact (no network: local leaderboard only)
const fs = require("fs");
const path = require("path");
const src = (f) => fs.readFileSync(path.join(__dirname, "src", f), "utf8");

const ARTIFACT_URL = "https://claude.ai/code/artifact/4f85ce17-09de-4f3a-8456-70e7b5bbceec";

function assemble(config) {
  return src("template.html")
    .replace("/*__CSS__*/", () => src("styles.css"))
    .replace("/*__CONFIG__*/", () => "window.MAZER_CONFIG = " + JSON.stringify(config) + ";")
    .replace("/*__ENGINE__*/", () => src("engine.js"))
    .replace("/*__RENDER__*/", () => src("render.js"))
    .replace("/*__APP__*/", () => src("app.js"));
}

const out = path.join(__dirname, "dist");
fs.mkdirSync(out, { recursive: true });

const fragment = assemble({ api: null, shareUrl: ARTIFACT_URL, mode: "artifact" });
fs.writeFileSync(path.join(out, "index.html"), fragment);

const body = assemble({ api: "/api", shareUrl: "", mode: "server" });
const head = body.slice(0, body.indexOf('<div id="app">'));
const rest = body.slice(body.indexOf('<div id="app">'));
const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">\n${head}</head>\n<body>\n${rest}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(out, "standalone.html"), standalone);
console.log("built dist/index.html (" + (fragment.length / 1024).toFixed(0) + " KB, artifact) and dist/standalone.html (server)");
