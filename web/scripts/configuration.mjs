import { createECDH } from "node:crypto";

// Operator diagnostics return fixed descriptions and states, never env values.
export function configurationChecks(env, { production = false } = {}) {
  const checks = [];
  const add = (name, valid, detail) => checks.push({ name, state: valid ? "ok" : "error", detail });
  let database = false, origin = false, clerk = false, push = false;
  try {
    const url = new URL(env.DATABASE_URL);
    database = ["postgres:", "postgresql:"].includes(url.protocol) && !!url.hostname &&
      ["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode"));
  } catch {}
  try {
    const url = new URL(env.APP_ORIGIN);
    origin = !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash &&
      (url.protocol === "https:" || (!production && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
  } catch {}
  const publishable = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "", secret = env.CLERK_SECRET_KEY ?? "";
  const mode = publishable.startsWith("pk_live_") ? "live" : publishable.startsWith("pk_test_") ? "test" : null;
  if (mode) {
    const domain = Buffer.from(publishable.slice(8), "base64").toString("utf8");
    clerk = /^[a-z0-9.-]+\$$/i.test(domain) && secret.startsWith(`sk_${mode}_`) && secret.length > 12;
  }
  try {
    const publicKey = env.VAPID_PUBLIC_KEY ?? "", privateKey = env.VAPID_PRIVATE_KEY ?? "";
    const contact = new URL(env.VAPID_SUBJECT);
    const canonical = value => /^[A-Za-z0-9_-]+$/.test(value) && Buffer.from(value, "base64url").toString("base64url") === value;
    if (canonical(publicKey) && canonical(privateKey) && Buffer.from(privateKey, "base64url").length === 32 &&
        contact.protocol === "https:" && !contact.username && !contact.password) {
      const curve = createECDH("prime256v1"); curve.setPrivateKey(Buffer.from(privateKey, "base64url"));
      push = curve.getPublicKey().toString("base64url") === publicKey;
    }
  } catch {}
  add("database", database, "A TLS PostgreSQL connection is required; live schema is checked separately.");
  add("origin", origin, production ? "An exact HTTPS application origin is required." : "An exact HTTPS or localhost development origin is required.");
  add("clerk", clerk, "Matching Clerk key environments are required; this does not prove a live session.");
  if (clerk && mode === "test") checks.push({ name: "clerkEnvironment", state: "warning", detail: "Development Clerk instance; label this honestly in the demo." });
  const users = (env.PHARMACY_ALLOWED_USER_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean);
  add("pharmacyAuthorization", users.length > 0 && users.every(id => /^user_[A-Za-z0-9]+$/.test(id)), "At least one exact Clerk user ID must be authorized server-side.");
  const cap = env.ELEVENLABS_MAX_GENERATIONS_PER_DAY ?? "100";
  add("speech", !!env.ELEVENLABS_API_KEY && (env.ELEVENLABS_MODEL_ID ?? "eleven_v3") === "eleven_v3" &&
    ["EN", "BN"].every(lang => !!env[`ELEVENLABS_VOICE_ID_${lang}`]) && /^\d+$/.test(cap) && Number(cap) > 0,
    "English/Bengali voice IDs, eleven_v3 and a positive generation budget are required; entitlement needs a live synthesis check.");
  if (!env.ELEVENLABS_VOICE_ID_HI) checks.push({ name: "hindiSpeech", state: "pending", detail: "Hindi online voice is optional and currently unconfigured." });
  add("push", push, "Matching P-256 VAPID keys and an HTTPS contact are required.");
  add("sharingAndSchedulerSecrets", (env.SHARING_RATE_LIMIT_SECRET?.length ?? 0) >= 32 &&
    (env.REMINDER_CRON_SECRET?.length ?? 0) >= 32 && env.SHARING_RATE_LIMIT_SECRET !== env.REMINDER_CRON_SECRET,
    "Sharing and reminder scheduler require distinct server secrets of at least 32 characters.");
  add("publicSecrets", !Object.keys(env).some(name => name.startsWith("NEXT_PUBLIC_") &&
    /SECRET|PRIVATE|DATABASE|API_KEY|TOKEN|PASSWORD/.test(name)), "Private credentials must have no NEXT_PUBLIC prefix.");
  const tokens = (env.FIND_DEMO_TOKENS ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const demo = env.DEMO_PUBLIC_TOKEN;
  const validTokens = tokens.length <= 5 && tokens.every(token => /^[A-Za-z0-9_-]{22}$/.test(token)) && (!demo || /^[A-Za-z0-9_-]{22}$/.test(demo));
  checks.push({ name: "demoRecords", state: !validTokens ? "error" : tokens.length && demo ? "ok" : "pending",
    detail: "Homepage/finder demo tokens are optional until independent physical readback and activation; never create synthetic activation evidence." });
  return checks;
}
