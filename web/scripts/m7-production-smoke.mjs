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
const mutationOrigin = "https://medot-smoke.example";
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
  server = spawn(process.execPath, [web + "node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", "3110"], { cwd: web, env: { ...process.env, APP_ORIGIN: mutationOrigin, FIND_DEMO_TOKENS: "", ...(process.env.MEDOT_SMOKE_NO_CLERK==="1"?{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"",CLERK_SECRET_KEY:""}:{}) }, windowsHide: true, stdio: "ignore" });
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
  for(const [language,marker]of [["en","Your reminders"],["bn","আপনার মনে করানোর তালিকা"],["hi","आपके अनुस्मारक"]]){
    const r=await request("/reminders?lang="+language),html=await r.text();
    assert(r.status===200&&html.includes(marker)&&html.includes(`lang="${language}"`),language+" reminder page renders without an account");
    assert(!html.includes("clerk.browser.js")&&r.headers.get("referrer-policy")==="no-referrer"&&r.headers.get("cache-control")?.includes("no-store"),"Reminders remain private and independent of Clerk");
  }
  const reminderState=await request("/api/reminders"),reminderBody=await reminderState.json();
  assert(reminderState.status===200&&reminderBody.reminders.length===0&&!reminderBody.enabled,"Anonymous device cannot enumerate reminders");
  assert(reminderState.headers.get("cache-control")?.includes("no-store")&&!JSON.stringify(reminderBody).match(/privateKey|endpoint|credential/),"Reminder config exposes only the public push key");
  for(const [route,method] of [["/api/reminders","POST"],["/api/reminders","DELETE"],["/api/reminders/subscription","POST"],["/api/reminders/subscription","PATCH"],["/api/reminders/subscription","DELETE"]]){
    const r=await request(route,{method,headers:{Origin:"https://foreign.example","Content-Type":"application/json"},body:'{}'});
    assert(r.status===403,"Reminder mutation rejects foreign origin before writes");
  }
  const reminderWrite=await request("/api/reminders",{method:"POST",headers:{Origin:mutationOrigin,"Content-Type":"application/json"},body:'{}'});
  assert(reminderWrite.status===403,"Same-origin public token cannot create a reminder without a device capability");
  const cron=await request("/api/reminders/dispatch",{method:"POST"});assert(cron.status===403,"Public caller cannot trigger push dispatch");
  const cleanup=await request("/api/sharing/cleanup",{method:"POST"});assert(cleanup.status===403,"Public caller cannot trigger sharing retention cleanup");
  for(const route of ["/manifest.webmanifest","/sw.js","/brand/medot-192.png","/brand/medot-512.png"])assert((await request(route)).status===200,route+" resolves for installable reminders");
  assert(homeHtml.includes('href="/find"'), "Homepage links to the finder");
  assert(homeHtml.includes('href="/detective"'), "Homepage resources link to Medication Detective");
  assert(homeHtml.includes('href="/sharing"')&&homeHtml.includes('href="/caregiver"'),"Homepage links to owner and caregiver screens");
  for(const [language,marker]of [["en","Caregiver sharing"],["bn","পরিচর্যাকারীর সঙ্গে শেয়ার"],["hi","देखभालकर्ता से साझा करें"]]){
    const r=await request("/sharing?lang="+language),html=await r.text();assert(r.status===200&&html.includes(marker),language+" owner controls render without a patient account");
    assert(!html.includes("clerk.browser.js")&&r.headers.get("referrer-policy")==="no-referrer","Owner controls exclude public Clerk loader and referrers");
  }
  for(const route of ["/api/sharing/consent","/api/sharing/owner-records","/api/caregiver/groups","/api/admin/sharing-groups"]){
    const r=await request(route);assert([401,403].includes(r.status)&&r.headers.get("cache-control")?.includes("no-store"),"Private sharing read denies anonymous access");
  }
  for(const route of ["/api/sharing/session","/api/sharing/consent","/api/sharing/invites","/api/sharing/check-ins","/api/caregiver/redeem"]){
    const r=await request(route,{method:"POST",headers:{Origin:"https://foreign.example","Content-Type":"application/json"},body:'{}'});
    assert(r.status===403,"Sharing mutation rejects foreign origin before writes");
  }
  const caregiver=await request("/caregiver");assert(caregiver.status===307&&caregiver.headers.get("location")==="/caregiver/sign-in","Caregiver dashboard requires its own sign-in");
  const targets = await request("/api/public/find-targets");
  assert(targets.status === 200 && JSON.stringify(await targets.json()) === '{"targets":[]}', "Unconfigured finder does not enumerate the catalog");
  assert(targets.headers.get("cache-control")?.includes("no-store"), "Finder target list is uncached");
  const targetMutation = await request("/api/public/find-targets", { method: "POST" });
  assert(targetMutation.status === 405, "Finder target route accepts no mutations");
  for (const [language, marker] of [["en", "Find my medicine"], ["bn", "আমার ওষুধ খুঁজুন"], ["hi", "मेरी दवा खोजें"]]) {
    const finder = await request("/find?lang=" + language); const finderHtml = await finder.text();
    assert(finder.status === 200 && finderHtml.includes(marker) && finderHtml.includes(`lang="${language}"`), `${language} finder renders with confirmation and language shell`);
    assert(!finderHtml.includes("clerk.browser.js") && !finderHtml.includes(record.generic_name), "Finder needs no patient sign-in or arbitrary sample identity");
  }
  for (const [language, marker] of [["en", "Medication Detective"], ["bn", "ওষুধ অনুসন্ধান"], ["hi", "दवा खोज"]]) {
    const detective = await request("/detective?lang=" + language); const detectiveHtml = await detective.text();
    assert(detective.status === 200 && detectiveHtml.includes(marker) && detectiveHtml.includes(`lang="${language}"`), `${language} detective renders with confirmation and language shell`);
    assert(!detectiveHtml.includes("clerk.browser.js") && !detectiveHtml.includes(record.generic_name), "Detective starts without patient sign-in or arbitrary sample identity");
    assert(detectiveHtml.includes('noindex') && !detectiveHtml.includes('id="candidate-url"'), "Detective is noindex and waits for confirmation before scanning");
  }
  const patient = await request("/m/" + record.token); const html = await patient.text();
  assert(patient.status === 200 && html.includes(record.generic_name) && html.includes(record.strength), "Existing record identity survives integration");
  assert(!html.includes("clerk.browser.js"), "Patient page independent of Clerk browser loader");
  const fresh = await request("/api/public/tags/" + record.token); const active = await fresh.json();
  assert(fresh.status === 200 && active.kind === "active" && active.record.token === record.token, "Fresh public lookup resolves the same record");
  assert(fresh.headers.get("cache-control")?.includes("no-store"), "Fresh record is uncached");
  assert(!("createdBy" in active.record) && !("created_by" in active.record), "Creator metadata stays private");
  assert(html.includes("Medicine twin") && html.includes("Record timeline"), "Twin and lifecycle timeline render on the public page");
  assert(!("readinessReviewedBy" in active.record) && !("creationRequestId" in active.record), "Catalog reviewer and request IDs stay private");
  if (!active.record.verificationVersion) assert(html.includes("Verification details unavailable"), "Legacy pairing evidence is not fabricated");
  const unknown = await request("/api/public/tags/not-a-valid-token");
  assert(unknown.status === 404 && JSON.stringify(await unknown.json()) === '{"kind":"unknown"}', "Malformed token cannot expose identity");
  assert(unknown.headers.get("cache-control")?.includes("no-store"), "Unknown response is uncached");
  const unknownPage = await request("/m/not-a-valid-token"); const unknownHtml = await unknownPage.text();
  assert(unknownPage.status === 200 && unknownHtml.includes("Unknown MEDOT tag") && !unknownHtml.includes("Read medicine aloud"), "Unknown page has no speech control");
  for (const [language, marker] of [["bn", "ওষুধের"], ["hi", "दवा"]]) {
    const page = await request(`/m/${record.token}?lang=${language}`); const localized = await page.text();
    assert(page.status === 200 && localized.includes(`lang="${language}"`) && localized.includes(marker), `${language} patient shell is localized`);
  }
  for (const suffix of ["", "/instructions", "/expiry", "/details"]) {
    const speech = `/api/public/tags/${record.token}/speech${suffix}`;
    const forged = await request(speech, { method: "POST", headers: { Origin: mutationOrigin, "Content-Type": "application/json" }, body: '{"language":"en","text":"forged"}' });
    assert(forged.status === 400 && (await forged.json()).error === "INVALID_INPUT", "Speech rejects arbitrary text before generation");
    const foreign = await request(speech, { method: "POST", headers: { Origin: "https://foreign.example", "Content-Type": "application/json" }, body: '{"language":"en"}' });
    assert(foreign.status === 403, "Speech rejects foreign origin");
    const unknownSpeech = await request(`/api/public/tags/abcdefghijklmnopqrstu0/speech${suffix}`, { method: "POST", headers: { Origin: mutationOrigin, "Content-Type": "application/json" }, body: '{"language":"en"}' });
    assert(unknownSpeech.status === 404 && unknownSpeech.headers.get("cache-control")?.includes("no-store"), "Unknown speech returns no audio or provider call");
  }
  for (const route of ["/api/admin/medicines"]) {
    const r = await request(route, { headers: { Cookie: "medot_admin=obsolete-session" } });
    assert(r.status === 401 && (await r.json()).error === "UNAUTHENTICATED", route + " denies obsolete cookie");
  }
  const unsupportedRead = await request("/api/admin/tags");
  assert(unsupportedRead.status === 405 && !(await unsupportedRead.text()).includes(record.generic_name), "Unsupported tag API GET exposes no record");
  for (const route of ["/api/admin/medicines", "/api/admin/medicines/custom_software_fixture/review", "/api/admin/tags", `/api/admin/tags/${record.token}/activate`, `/api/admin/tags/${record.token}/revoke`]) {
    const r = await request(route, { method: "POST", headers: { Cookie: "medot_admin=obsolete-session", Origin: origin, "Content-Type": "application/json" }, body: '{}' });
    assert(r.status === 401, "Protected mutation denies unauthenticated request");
  }
  const legacy = await request("/api/admin/login", { method: "POST", body: new URLSearchParams({ password: "obsolete-password" }) });
  assert(legacy.status === 410 && !legacy.headers.get("set-cookie"), "Old login cannot issue a session");
  for (const route of ["/pharmacy", "/pharmacy/provision", "/pharmacy/tags", "/pharmacy/sharing"]) {
    const r = await request(route); assert(r.status === 307 && r.headers.get("location") === "/sign-in", route + " requires sign-in");
  }
  for (const route of ["/icon.svg", "/favicon.ico", "/apple-icon.png"]) assert((await request(route)).status === 200, route + " resolves");
  for (const [code, text] of [["bn", "ওষুধের তথ্য"], ["hi", "दवा की जानकारी"]]) assert((await (await request("/?preview=" + code)).text()).includes(text), code + " server preview resolves");
  const audioRows = await sql`SELECT COUNT(*)::int AS count FROM tag_audio`;
  console.log("Audio cache rows: " + audioRows[0].count + "; live provider playback remains unverified.");
  await stop(); await start();
  assert((await request("/api/health")).status === 200, "Readiness after a fresh local server process");
  assert(await snapshot() === initial, "Medicine/tag/audio-table contents unchanged across local restart");
  console.log(checks + " local production checks passed; no tag mutations, real account session or Render deploy.");
}
try { await run(); }
catch { console.error("Production smoke failed; private provider/database diagnostics withheld."); process.exitCode = 1; }
finally { await stop(); }
