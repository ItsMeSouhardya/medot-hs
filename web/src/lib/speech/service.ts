import type { Language } from "../i18n";
import { resolveTag, type TagLookup } from "../tag-repository";
import { isValidToken } from "../domain";
import { createHash } from "node:crypto";
import { buildSpeechScript } from "./script";
import { getCachedAudio, putCachedAudio } from "./cache";
import { reserveSpeechGeneration } from "./budget";
import { speechConfiguration, synthesizeSpeech } from "./provider";
import { MAX_AUDIO_BYTES, SpeechError, speechKinds } from "./types";
import type { SpeechKind, SpeechResult, SpeechConfig } from "./types";
export { SpeechError } from "./types";
export type SpeechDependencies = {
  resolve(token: string): Promise<TagLookup>;
  read(token: string, language: Language, kind: SpeechKind, hash: string): Promise<Uint8Array | null>;
  put(token: string, language: Language, kind: SpeechKind, hash: string, audio: Uint8Array): Promise<void>;
  reserve(now: Date, token: string): Promise<boolean>;
  synthesize(input: { text: string; language: Language }): Promise<Uint8Array>;
  config(language: Language): SpeechConfig;
  now(): Date;
};
export function createSpeechService(dependencies: SpeechDependencies) {
  const pending = new Map<string, Promise<SpeechResult>>();
  async function current(token: string, language: Language, kind: SpeechKind) {
    const lookup = await dependencies.resolve(token);
    if (lookup.kind !== "active") throw new SpeechError(lookup.kind === "unknown" ? "UNKNOWN" : lookup.kind === "pending" ? "PENDING" : "REVOKED");
    const script = buildSpeechScript(lookup.record, language, kind, dependencies.now());
    if (script.text.length > 2000) throw new SpeechError("INVALID_INPUT");
    const config = dependencies.config(script.language);
    const hash = createHash("sha256").update(JSON.stringify({ version: 1, kind, ...script, ...config })).digest("hex");
    return { script, hash };
  }
  async function confirm(token: string, language: Language, kind: SpeechKind, hash: string) {
    if ((await current(token, language, kind)).hash !== hash) throw new SpeechError("STALE");
  }
  return async (token: string, language: Language, kind: SpeechKind = "full"): Promise<SpeechResult> => {
    if (!isValidToken(token)) throw new SpeechError("UNKNOWN");
    if (!["en", "bn", "hi"].includes(language) || !speechKinds.includes(kind)) throw new SpeechError("INVALID_INPUT");
    try {
      const { script, hash } = await current(token, language, kind);
      const key = `${token}:${language}:${kind}:${hash}`;
      const existing = pending.get(key);
      if (existing) { const result = await existing; await confirm(token, language, kind, hash); return result; }
      if (pending.size >= 32) throw new SpeechError("BUDGET");
      const operation = (async () => {
        let audio = await dependencies.read(token, language, kind, hash);
        if (!audio) {
          if (!await dependencies.reserve(dependencies.now(), token)) throw new SpeechError("BUDGET");
          audio = await dependencies.synthesize({ text: script.text, language: script.language });
          if (!audio.length || audio.length > MAX_AUDIO_BYTES) throw new SpeechError("PROVIDER");
          await confirm(token, language, kind, hash);
          await dependencies.put(token, language, kind, hash, audio);
        }
        if (!audio.length || audio.length > MAX_AUDIO_BYTES) throw new SpeechError("PROVIDER");
        await confirm(token, language, kind, hash);
        return { audio, language: script.language, usedFallback: script.usedFallback };
      })();
      pending.set(key, operation);
      try { return await operation; } finally { if (pending.get(key) === operation) pending.delete(key); }
    } catch (error) { if (error instanceof SpeechError) throw error; throw new SpeechError("DATABASE"); }
  };
}
export const getTagSpeech = createSpeechService({ resolve: resolveTag, read: getCachedAudio, put: putCachedAudio, reserve: reserveSpeechGeneration, synthesize: synthesizeSpeech, config: speechConfiguration, now: () => new Date() });
