import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { configurationChecks } from "./configuration.mjs";

const args = process.argv.slice(2);
if (args.some(arg => !["--live", "--production"].includes(arg))) {
  console.error("Use --live for read-only provider/schema checks and --production for HTTPS readiness.");
  process.exit(1);
}
nextEnv.loadEnvConfig(process.cwd());
const checks = configurationChecks(process.env, { production: args.includes("--production") });
const schema = {
  medicines: ["id", "record_kind", "info_en", "info_bn", "info_hi", "creation_request_id", "readiness_reviewed_at"],
  tags: ["token", "status", "instruction_bn", "instruction_hi", "usage_slots", "verified_at", "verification_version"],
  tag_audio: ["token", "language", "script_kind", "content_hash", "audio_base64"],
  speech_budget: ["day", "generation_count"], speech_throttle: ["token", "last_attempt_at"],
  sharing_groups: ["owner_code_hash", "consent_version", "consent_expires_at", "enabled"],
  sharing_members: ["group_id", "token", "selected"], sharing_owner_sessions: ["credential_hash", "expires_at"],
  caregiver_invites: ["secret_hash", "redeemed_at", "consent_version"],
  caregiver_grants: ["clerk_user_id", "revoked_at", "consent_version"],
  identification_check_ins: ["group_id", "token", "identified_at", "outcome"],
  sharing_exchange_throttle: ["bucket_hash", "window_start", "attempts"],
  reminder_devices: ["credential_hash", "subscription", "enabled", "expires_at"],
  medication_reminders: ["device_id", "token", "local_time", "next_due", "enabled"],
  reminder_registration_throttle: ["bucket_hash", "window_start", "attempts"],
};
if (args.includes("--live")) {
  try {
    const sql = neon(process.env.DATABASE_URL, { readOnly: true, fetchOptions: { signal: AbortSignal.timeout(15000) } });
    const rows = await sql`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'`;
    const missing = Object.entries(schema).flatMap(([table, columns]) => columns.filter(column =>
      !rows.some(row => row.table_name === table && row.column_name === column)).map(column => `${table}.${column}`));
    checks.push({ name: "liveDatabaseSchema", state: missing.length ? "error" : "ok", tables: Object.keys(schema).length, missing });
  } catch {
    checks.push({ name: "liveDatabaseSchema", state: "error", detail: "Read-only schema lookup unavailable; private diagnostics withheld." });
  }
  const users = (process.env.PHARMACY_ALLOWED_USER_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean);
  const statuses = [];
  if (checks.find(check => check.name === "clerk")?.state === "ok") {
    for (const id of users.slice(0, 10)) {
      try {
        const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }, redirect: "error", signal: AbortSignal.timeout(10000),
        });
        statuses.push(response.status); await response.body?.cancel();
      } catch { statuses.push(null); }
    }
  }
  checks.push({ name: "liveAuthorizedClerkUsers", state: users.length > 0 && users.length <= 10 && statuses.length === users.length && statuses.every(status => status === 200) ? "ok" : "error", statuses,
    detail: "Backend key and allowlisted account existence only; browser allowed/outsider/sign-out evidence remains separate." });
}
console.log(JSON.stringify({ checks, externalGates: [
  "Actual Render deployment/redeployment and stable HTTPS origin",
  "Minute reminder dispatch and daily sharing cleanup job runs",
  "Live ElevenLabs EN/BN synthesis, cache and device pronunciation",
  "Allowed pharmacy, invited caregiver and unrelated signed-in browser sessions",
  "Independent NFC/QR readback, TalkBack, native zoom and phone notification permission/delivery",
] }, null, 2));
if (checks.some(check => check.state === "error")) process.exitCode = 1;
