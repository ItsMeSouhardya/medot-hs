// Read-only local production smoke. Requires a built app and demo Neon config.
// Never creates, activates, revokes or deletes tags. No real Clerk session.
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
const web = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(web);
const origin = "http://localhost:3110";
const sql = neon(process.env.DATABASE_URL);
let server, checks = 0;
function assert(condition, label) {
  if (!condition) { console.error("FAIL " + label); throw new Error(label); }
  checks++; console.log("PASS " + label);
}
async function snapshot() {
  // Digests stay in memory; clinical/demo fields and credentials are not logged.
  const rows = await sql`SELECT 'medicines' AS kind, jsonb_agg(to_jsonb(m) ORDER BY id) AS data FROM medicines m
    UNION ALL SELECT 'tags', jsonb_agg(to_jsonb(t) ORDER BY token) FROM tags t
    UNION ALL SELECT 'audio', jsonb_agg(to_jsonb(a) ORDER BY token, language) FROM tag_audio a
    ORDER BY kind`;
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
async function start() {
  server = spawn(process.execPath, [web + "node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", "3110"], { cwd: web, windowsHide: true, stdio: "ignore" });
  server.on("error", () => {});
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("Preview server exited");
    try { if ((await request("/api/live")).ok) return; } catch {}
    await delay(250);
  }
  throw new Error("Preview server did not start");
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const stopped = once(server, "exit"); server.kill(); await stopped;
}
function request(route, options = {}) {
  return fetch(origin + route, { ...options, redirect: "manual", signal: AbortSignal.timeout(30000) });
}
async function run() {
  const initial = await snapshot();
  const [record] = await sql`SELECT token, generic_name, strength FROM tags JOIN medicines ON medicines.id = tags.medicine_id WHERE status = 'ACTIVE' LIMIT 1`;
  assert(!!record, "Existing demo record is available for read-only regression");
  await start();
  for (const route of ["/api/live", "/api/health"]) {
    const r = await request(route); assert(r.status === 200 && (await r.json()).ok, route + " healthy");
  }
  const home = await request("/"); const homeHtml = await home.text();
  assert(home.status === 200 && homeHtml.includes("A small touch."), "Homepage renders");
  assert(!homeHtml.includes("clerk.browser.js"), "Homepage independent of Clerk browser loader");
  const patient = await request("/m/" + record.token); const html = await patient.text();
  assert(patient.status === 200 && html.includes(record.generic_name) && html.includes(record.strength), "Existing record identity survives integration");
  assert(!html.includes("clerk.browser.js"), "Patient page independent of Clerk browser loader");
  const fresh = await request("/api/public/tags/" + record.token); const active = await fresh.json();
  assert(fresh.status === 200 && active.kind === "active" && active.record.token === record.token, "Fresh public lookup resolves the same record");
  assert(fresh.headers.get("cache-control")?.includes("no-store"), "Fresh record is uncached");
  assert(!("createdBy" in active.record) && !("created_by" in active.record), "Creator metadata stays private");
  const unknown = await request("/api/public/tags/not-a-valid-token");
  assert(unknown.status === 404 && JSON.stringify(await unknown.json()) === '{"kind":"unknown"}', "Malformed token cannot expose identity");
  assert(unknown.headers.get("cache-control")?.includes("no-store"), "Unknown response is uncached");
  const unknownPage = await request("/m/not-a-valid-token"); const unknownHtml = await unknownPage.text();
  assert(unknownPage.status === 200 && unknownHtml.includes("Unknown MEDOT tag") && !unknownHtml.includes("Read medicine aloud"), "Unknown page has no speech control");
  for (const route of ["/api/admin/medicines"]) {
    const r = await request(route, { headers: { Cookie: "medot_admin=obsolete-session" } });
    assert(r.status === 401 && (await r.json()).error === "UNAUTHENTICATED", route + " denies obsolete cookie");
  }
  const unsupportedRead = await request("/api/admin/tags");
  assert(unsupportedRead.status === 405 && !(await unsupportedRead.text()).includes(record.generic_name), "Unsupported tag API GET exposes no record");
  for (const route of ["/api/admin/tags", `/api/admin/tags/${record.token}/activate`, `/api/admin/tags/${record.token}/revoke`]) {
    const r = await request(route, { method: "POST", headers: { Cookie: "medot_admin=obsolete-session", Origin: origin, "Content-Type": "application/json" }, body: '{}' });
    assert(r.status === 401, "Protected mutation denies unauthenticated request");
  }
  const legacy = await request("/api/admin/login", { method: "POST", body: new URLSearchParams({ password: "obsolete-password" }) });
  assert(legacy.status === 410 && !legacy.headers.get("set-cookie"), "Old login cannot issue a session");
  for (const route of ["/pharmacy", "/pharmacy/provision", "/pharmacy/tags"]) {
    const r = await request(route); assert(r.status === 307 && r.headers.get("location") === "/sign-in", route + " requires sign-in");
  }
  for (const route of ["/icon.svg", "/favicon.ico", "/apple-icon.png"]) assert((await request(route)).status === 200, route + " resolves");
  for (const [code, text] of [["bn", "ওষুধের তথ্য"], ["hi", "दवा की जानकारी"]]) assert((await (await request("/?preview=" + code)).text()).includes(text), code + " server preview resolves");
  const audioRows = await sql`SELECT COUNT(*)::int AS count FROM tag_audio`;
  console.log("Audio cache rows: " + audioRows[0].count + "; M4/provider cache behavior remains unverified.");
  await stop(); await start();
  assert((await request("/api/health")).status === 200, "Readiness after a fresh local server process");
  assert(await snapshot() === initial, "Medicine/tag/audio-table contents unchanged across local restart");
  console.log(checks + " local production checks passed; no tag mutations, real account session or Render deploy.");
}
try { await run(); }
catch { console.error("Production smoke failed; private provider/database diagnostics withheld."); process.exitCode = 1; }
finally { await stop(); }
