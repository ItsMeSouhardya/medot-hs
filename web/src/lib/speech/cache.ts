import { getSql } from "../db";
import type { Language } from "../i18n";
import { MAX_AUDIO_BYTES, SpeechError, type SpeechKind } from "./types";
export async function getCachedAudio(token: string, language: Language, kind: SpeechKind, hash: string): Promise<Uint8Array | null> {
  const rows = await getSql()`SELECT audio_base64 FROM tag_audio WHERE token = ${token}
    AND language = ${language} AND script_kind = ${kind} AND content_hash = ${hash}
    AND length(audio_base64) <= ${Math.ceil(MAX_AUDIO_BYTES / 3) * 4}`;
  if (!rows[0]) return null;
  const audio = Buffer.from(rows[0].audio_base64, "base64");
  if (!audio.length || audio.length > MAX_AUDIO_BYTES) return null;
  return new Uint8Array(audio);
}
export async function putCachedAudio(token: string, language: Language, kind: SpeechKind, hash: string, audio: Uint8Array): Promise<void> {
  const rows = await getSql()`INSERT INTO tag_audio (token, language, script_kind, content_hash, audio_base64)
    SELECT ${token}, ${language}, ${kind}, ${hash}, ${Buffer.from(audio).toString("base64")}
    WHERE EXISTS (SELECT 1 FROM tags WHERE token = ${token} AND status = 'ACTIVE')
    ON CONFLICT (token, language, script_kind) DO UPDATE SET content_hash = EXCLUDED.content_hash,
      audio_base64 = EXCLUDED.audio_base64, created_at = now() RETURNING token`;
  if (rows.length !== 1) throw new SpeechError("STALE");
}
