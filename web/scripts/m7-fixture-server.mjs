// Local-only static patient-state smoke, exported by m7-patient.test.tsx.
// This is separate from Next and exposes no protected application records.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const web = fileURLToPath(new URL("../", import.meta.url));
const fixtures = resolve(web, "../.superpowers/sdd/2026-10-01-medot-hs/m7-fixtures");
const states = new Set(["current", "expired", "unknown", "pending", "revoked", "unavailable"]);
const fonts = new Set(["manrope.ttf", "noto-sans-bengali.ttf", "noto-sans-devanagari.ttf"]);
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost:3112").pathname;
    let target, type;
    if (pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(`<html lang="en"><title>M7 software fixtures</title><h1>M7 software fixtures</h1><p>Static state rendering only. No database, auth bypass or functional speech.</p><ul>${[...states].map(s => `<li><a href="/${s}">${s}</a></li>`).join("")}</ul></html>`); return;
    } else if (states.has(pathname.slice(1))) {
      target = resolve(fixtures, pathname.slice(1) + ".html"); type = "text/html; charset=utf-8";
    } else if (pathname === "/globals.css") {
      target = resolve(web, "src/app/globals.css"); type = "text/css; charset=utf-8";
    } else if (pathname.startsWith("/fonts/") && fonts.has(pathname.slice(7))) {
      target = resolve(web, "public/fonts", pathname.slice(7)); type = "font/ttf";
    } else { response.writeHead(404); response.end("Unknown fixture"); return; }
    const bytes = await readFile(target);
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" }); response.end(bytes);
  } catch { response.writeHead(404); response.end("Run the opt-in fixture export first."); }
});
server.listen(3112, "localhost", () => console.log("M7 static fixture smoke: http://localhost:3112"));
