import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../scripts/dispatch-reminders.mjs", import.meta.url));
function run(payload, status = 200, verifyRedirect = false) {
  const setup = `globalThis.fetch=async(url,options)=>{
    if(${verifyRedirect}&&options.redirect!=="error")throw new Error("Unsafe redirect policy");
    return new Response(${JSON.stringify(JSON.stringify(payload))},{status:${status}});
  };`;
  return spawnSync(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(setup)}`, script], {
    env: { ...process.env, APP_ORIGIN: "https://medot.example", REMINDER_CRON_SECRET: "fixture-only-secret-with-32-characters" },
    encoding: "utf8", timeout: 5000,
  });
}
describe("reminder scheduler operational failures", () => {
  it("signals failed push delivery even when the dispatch endpoint returns HTTP 200", () => {
    const result = run({ claimed: 2, sent: 1, skipped: 0, failed: 1 });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"failed":1');
  });
  it("reports successful and suppressed occurrences without following redirects", () => {
    const result = run({ claimed: 2, sent: 1, skipped: 1, failed: 0 }, 200, true);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ claimed: 2, sent: 1, skipped: 1, failed: 0 });
  });
  it("rejects malformed counts and never prints an arbitrary server response", () => {
    const result = run({ claimed: 1, sent: 1, skipped: 0, privateData: "DO-NOT-LOG" });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain("DO-NOT-LOG");
  });
  it("rejects inconsistent accounting instead of reporting success", () => {
    expect(run({ claimed: 1, sent: 2, skipped: 0, failed: 0 }).status).toBe(1);
  });
});
