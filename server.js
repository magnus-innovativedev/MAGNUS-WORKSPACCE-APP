"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PUBLIC_DIR = path.join(__dirname, "public");
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".png", "image/png"]
]);

function createServer() {
  return http.createServer((req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end("Bad request");
      return;
    }

    const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = path.resolve(PUBLIC_DIR, requestedPath);
    const relativePath = path.relative(PUBLIC_DIR, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      res.writeHead(404).end("Not found");
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
          console.error("Static file request failed:", error);
          res.writeHead(500).end("Unable to read file");
          return;
        }
        res.writeHead(404).end("Not found");
        return;
      }

      const headers = {
        "Content-Type": CONTENT_TYPES.get(path.extname(filePath)) || "application/octet-stream",
        "Content-Length": contents.length,
        "Cache-Control": [".html", ".js"].includes(path.extname(filePath)) ? "no-cache" : "public, max-age=3600"
      };
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : contents);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`MAGNUS Company Workspace listening on port ${port}`));
}

module.exports = { createServer };
