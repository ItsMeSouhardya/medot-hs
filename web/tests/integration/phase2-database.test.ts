import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nextEnv from "@next/env";
import { getSql } from "@/lib/db";
import { generateToken } from "@/lib/domain";
import { reserveSpeechGeneration, speechDay } from "@/lib/speech/budget";
import { getCachedAudio, putCachedAudio } from "@/lib/speech/cache";
import { createSpeechService } from "@/lib/speech/service";
import { resolveTag } from "@/lib/tag-repository";
import { spawnSync } from "node:child_process";

// Owned software-only pending fixtures. No provider request or activation.
describe.skipIf(process.env.MEDOT_RUN_PHASE2_DB_TESTS !== "1")("Phase 2 durable cache and budget", () => {
  const tokens = new Set<string>();
  const now = new Date("3026-10-03T10:00:00Z"), day = speechDay(now);
  let original: unknown[];
  async function snapshot() {
    return getSql()`SELECT 'medicines' AS kind, jsonb_agg(to_jsonb(m) ORDER BY id) AS data FROM medicines m
      UNION ALL SELECT 'tags', jsonb_agg(to_jsonb(t) ORDER BY token) FROM tags t
      UNION ALL SELECT 'audio', jsonb_agg(to_jsonb(a) ORDER BY token, language, script_kind) FROM tag_audio a
      UNION ALL SELECT 'budget', jsonb_agg(to_jsonb(b) ORDER BY day) FROM speech_budget b
      UNION ALL SELECT 'throttle', jsonb_agg(to_jsonb(s) ORDER BY token) FROM speech_throttle s ORDER BY kind`;
  }
  beforeAll(async () => {
    nextEnv.loadEnvConfig(process.cwd()); original = await snapshot();
    expect(await getSql()`SELECT day FROM speech_budget WHERE day = ${day}`).toEqual([]);
  });
  afterEach(async () => {
    const sql = getSql();
    for (const token of tokens) {
      await sql`DELETE FROM tag_audio WHERE token = ${token}`;
      await sql`DELETE FROM speech_throttle WHERE token = ${token}`;
      await sql`DELETE FROM tags WHERE token = ${token} AND status = 'PENDING' AND batch_number = 'E3-SOFTWARE-FIXTURE' AND created_by = 'e3-software-fixture'`;
    }
    await sql`DELETE FROM speech_budget WHERE day = ${day} AND generation_count <= 100`;
    tokens.clear(); vi.unstubAllEnvs();
  });
  afterAll(async () => expect(await snapshot()).toEqual(original));
  async function pending() {
    const token = generateToken(); tokens.add(token);
    await getSql()`INSERT INTO tags (token, medicine_id, batch_number, expiry_month, instruction, instruction_bn, created_by, status)
      VALUES (${token}, 'paracetamol-500', 'E3-SOFTWARE-FIXTURE', '2099-12', 'Software fixture only.', 'শুধুমাত্র সফটওয়্যার ডেমো।', 'e3-software-fixture', 'PENDING')`;
    return token;
  }
  it("concurrent durable reservations never exceed the configured day limit", async () => {
    vi.stubEnv("ELEVENLABS_MAX_GENERATIONS_PER_DAY", "2");
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveSpeechGeneration(now)));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(await getSql()`SELECT generation_count FROM speech_budget WHERE day = ${day}`).toEqual([{ generation_count: 2 }]);
  }, 30000);
  it("durable per-token throttle merges races and allows another attempt only after five seconds", async () => {
    const token = await pending(); vi.stubEnv("ELEVENLABS_MAX_GENERATIONS_PER_DAY", "100");
    const results = await Promise.all(Array.from({ length: 6 }, () => reserveSpeechGeneration(now, token)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await reserveSpeechGeneration(new Date(now.getTime() + 4000), token)).toBe(false);
    expect(await reserveSpeechGeneration(new Date(now.getTime() + 5000), token)).toBe(true);
  }, 30000);
  it("migration retries preserve old full-cache rows and all script-kind entries", async () => {
    const token = await pending(), sql = getSql();
    await sql`INSERT INTO tag_audio (token, language, content_hash, audio_base64) VALUES (${token}, 'en', 'software-full', 'AQID')`;
    await sql`INSERT INTO tag_audio (token, language, script_kind, content_hash, audio_base64) VALUES (${token}, 'en', 'expiry', 'software-expiry', 'BAUG')`;
    for (let repeat = 0; repeat < 2; repeat++) {
      const result = spawnSync(process.execPath, ['scripts/setup-db.mjs'], { cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 15000 });
      // Raw diagnostics stay out of assertions/logs.
      expect(result.status, "Additive migration exit status").toBe(0);
    }
    expect(await getCachedAudio(token, "en", "full", "software-full")).toEqual(Uint8Array.of(1, 2, 3));
    expect(await getCachedAudio(token, "en", "expiry", "software-expiry")).toEqual(Uint8Array.of(4, 5, 6));
    expect(await getCachedAudio(token, "en", "instructions", "software-full")).toBeNull();
    const synthesize = vi.fn(), read = vi.fn(getCachedAudio), reserve = vi.fn(reserveSpeechGeneration);
    const speech = createSpeechService({ resolve: resolveTag, read, put: putCachedAudio, reserve, synthesize, config: () => ({ model: 'eleven_v3', voice: 'software', format: 'mp3_44100_128' }), now: () => now });
    await expect(speech(token, "en", "full")).rejects.toMatchObject({ code: "PENDING" });
    expect(read).not.toHaveBeenCalled(); expect(synthesize).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
    await expect(putCachedAudio(token, "en", "full", "new-software", Uint8Array.of(7))).rejects.toMatchObject({ code: "STALE" });
  }, 40000);
});
