import { createECDH } from "node:crypto";
import { describe, expect, it } from "vitest";
import { configurationChecks } from "../../scripts/configuration.mjs";

function fixture() {
  const curve = createECDH("prime256v1"); curve.generateKeys();
  return {
    DATABASE_URL: "postgresql://demo:fixture-password@demo.neon.tech/demo?sslmode=require",
    APP_ORIGIN: "https://medot.example",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_" + Buffer.from("demo.clerk.accounts.dev$").toString("base64"),
    CLERK_SECRET_KEY: "sk_test_fixture-only",
    PHARMACY_ALLOWED_USER_IDS: "user_fixture",
    ELEVENLABS_API_KEY: "provider-secret-do-not-print", ELEVENLABS_MODEL_ID: "eleven_v3",
    ELEVENLABS_VOICE_ID_EN: "en-fixture", ELEVENLABS_VOICE_ID_BN: "bn-fixture",
    ELEVENLABS_VOICE_ID_HI: "hi-fixture", ELEVENLABS_MAX_GENERATIONS_PER_DAY: "100",
    SHARING_RATE_LIMIT_SECRET: "sharing-fixture-with-32-characters", REMINDER_CRON_SECRET: "reminder-fixture-with-32-characters",
    VAPID_PUBLIC_KEY: curve.getPublicKey().toString("base64url"),
    VAPID_PRIVATE_KEY: curve.getPrivateKey().toString("base64url"), VAPID_SUBJECT: "https://medot.example",
  };
}
const state = (env, name, production = false) => configurationChecks(env, { production }).find(check => check.name === name)?.state;
describe("configuration readiness without credential disclosure", () => {
  it("distinguishes a valid local origin from production HTTPS readiness", () => {
    const env = { ...fixture(), APP_ORIGIN: "http://localhost:3000" };
    expect(state(env, "origin")).toBe("ok");
    expect(state(env, "origin", true)).toBe("error");
    expect(state({ ...env, APP_ORIGIN: "https://medot.example/path" }, "origin")).toBe("error");
  });
  it("rejects mismatched VAPID keys and reused device/rate-limit secrets", () => {
    const env = fixture();
    expect(state(env, "push")).toBe("ok");
    expect(state({ ...env, VAPID_PRIVATE_KEY: fixture().VAPID_PRIVATE_KEY }, "push")).toBe("error");
    expect(state({ ...env, REMINDER_CRON_SECRET: env.SHARING_RATE_LIMIT_SECRET }, "sharingAndSchedulerSecrets")).toBe("error");
  });
  it("fails closed for empty authorization and mismatched Clerk key environments", () => {
    const env = fixture();
    expect(state(env, "pharmacyAuthorization")).toBe("ok");
    expect(state({ ...env, PHARMACY_ALLOWED_USER_IDS: "" }, "pharmacyAuthorization")).toBe("error");
    expect(state({ ...env, CLERK_SECRET_KEY: "sk_live_fixture-only" }, "clerk")).toBe("error");
  });
  it("reports incomplete Bengali speech and accidental public secrets without returning their values", () => {
    const env = { ...fixture(), ELEVENLABS_VOICE_ID_BN: "", NEXT_PUBLIC_ELEVENLABS_API_KEY: "leaked-secret" };
    const checks = configurationChecks(env);
    expect(state(env, "speech")).toBe("error");
    expect(state(env, "publicSecrets")).toBe("error");
    for (const secret of [env.DATABASE_URL, env.CLERK_SECRET_KEY, env.ELEVENLABS_API_KEY, env.VAPID_PRIVATE_KEY, "leaked-secret"])
      expect(JSON.stringify(checks)).not.toContain(secret);
  });
  it("keeps missing physical demo setup distinct from required configuration errors", () => {
    const env = fixture();
    expect(configurationChecks(env).some(check => check.state === "error")).toBe(false);
    expect(state(env, "demoRecords")).toBe("pending");
    expect(state({ ...env, FIND_DEMO_TOKENS: "fake" }, "demoRecords")).toBe("error");
  });
});
