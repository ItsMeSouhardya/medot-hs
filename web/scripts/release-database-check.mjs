// Explicitly opted-in, isolated demo fixtures only. Never contacts TTS or push.
import nextEnv from "@next/env";
import { spawn,spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir,writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

if (process.env.MEDOT_RELEASE_DEMO_DB !== "1") {
  console.error("Set MEDOT_RELEASE_DEMO_DB=1 only for the authorized demo database.");
  process.exit(1);
}
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) { console.error("Demo DATABASE_URL is required."); process.exit(1); }
const origin = "http://localhost:3116";
let server;
try {
  // Refuse to reuse or terminate a pre-existing process on this fixed port.
  const occupied = await fetch(origin + "/api/live", { signal: AbortSignal.timeout(1000) }).then(() => true, () => false);
  if (occupied) throw new Error("occupied");
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", "3116"], {
    env: { ...process.env, APP_ORIGIN: "https://medot-smoke.example" }, windowsHide: true, stdio: "ignore",
  });
  server.on("error", () => {});
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("exited");
    ready = await fetch(origin + "/api/live", { signal: AbortSignal.timeout(1000) }).then(response => response.ok, () => false);
    if (ready) break;
    await delay(250);
  }
  if (!ready) throw new Error("start");
  const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--no-file-parallelism",
    "tests/integration/m3-database.test.ts", "tests/integration/phase1-database.test.ts",
    "tests/integration/phase2-database.test.ts", "tests/integration/phase5-database.test.ts",
    "tests/integration/reminder-database.test.ts"], {
    env: { ...process.env, MEDOT_RUN_DB_TESTS: "1", MEDOT_RUN_PHASE1_DB_TESTS: "1", MEDOT_RUN_PHASE2_DB_TESTS: "1",
      MEDOT_RUN_PHASE5_DB_TESTS: "1", MEDOT_RUN_REMINDER_DB_TESTS: "1", MEDOT_PHASE5_HTTP_ORIGIN: origin },
    encoding: "utf8", timeout: 240000, windowsHide: true,
  });
  let output = (result.stdout ?? "") + (result.stderr ?? "");
  for (const [name,value] of Object.entries(process.env)) if (/KEY|SECRET|URL|TOKEN/.test(name) && value?.length >= 8)
    output = output.split(value).join("[REDACTED]");
  output = output.replace(/(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g, "[PRIVATE_CODE]");
  const directory = new URL("../../.superpowers/release/", import.meta.url);
  await mkdir(directory, { recursive: true }); await writeFile(new URL("database.log", directory), output);
  console.log(output.split("\n").filter(line => /Test Files|Tests |FAIL|Error:/.test(line)).join("\n"));
  process.exitCode = result.status ?? 1;
} catch {
  console.error("Demo DB release check unavailable. Build first, free port 3116, and check demo configuration. Private diagnostics withheld.");
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit"); server.kill(); await stopped;
  }
}
