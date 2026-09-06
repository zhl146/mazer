#!/usr/bin/env node
// Concatenate web/src into a single self-contained web/dist/index.html.
// Usage: node web/build.js [--standalone]
//   --standalone wraps the fragment in a full <!doctype html> document (for hosting outside Claude artifacts).
const fs = require("fs");
const path = require("path");
const src = (f) => fs.readFileSync(path.join(__dirname, "src", f), "utf8");

let html = src("template.html")
  .replace("/*__CSS__*/", () => src("styles.css"))
  .replace("/*__ENGINE__*/", () => src("engine.js"))
  .replace("/*__RENDER__*/", () => src("render.js"))
  .replace("/*__APP__*/", () => src("app.js"));

const out = path.join(__dirname, "dist");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), html);

const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">\n${html.replace(/<div id="app">[\s\S]*$/, "")}</head>\n<body>\n${html.slice(html.indexOf('<div id="app">'))}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(out, "standalone.html"), standalone);
console.log("built web/dist/index.html (" + (html.length / 1024).toFixed(0) + " KB) and web/dist/standalone.html");
