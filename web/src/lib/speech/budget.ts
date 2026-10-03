import { getSql } from "../db";
export function speechDay(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export async function reserveSpeechGeneration(now: Date, token?: string): Promise<boolean> {
  const configured = process.env.ELEVENLABS_MAX_GENERATIONS_PER_DAY ?? "100";
  if (!/^\d+$/.test(configured)) return false;
  const limit = Number(configured);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return false;
  const sql = getSql();
  if (!token) {
    const rows = await sql`INSERT INTO speech_budget (day, generation_count) VALUES (${speechDay(now)}, 1)
      ON CONFLICT (day) DO UPDATE SET generation_count = speech_budget.generation_count + 1
      WHERE speech_budget.generation_count < ${limit} RETURNING day`;
    return rows.length === 1;
  }
  // One statement reserves the token throttle and durable day attempt. Failed
  // provider attempts count; replicas cannot exceed the atomic daily limit.
  const rows = await sql`WITH throttled AS (
    INSERT INTO speech_throttle (token, last_attempt_at) VALUES (${token}, ${now.toISOString()}::timestamptz)
    ON CONFLICT (token) DO UPDATE SET last_attempt_at = EXCLUDED.last_attempt_at
    WHERE speech_throttle.last_attempt_at <= EXCLUDED.last_attempt_at - interval '5 seconds' RETURNING token
  ) INSERT INTO speech_budget (day, generation_count) SELECT ${speechDay(now)}::date, 1 FROM throttled
    ON CONFLICT (day) DO UPDATE SET generation_count = speech_budget.generation_count + 1
    WHERE speech_budget.generation_count < ${limit} RETURNING day`;
  return rows.length === 1;
}
