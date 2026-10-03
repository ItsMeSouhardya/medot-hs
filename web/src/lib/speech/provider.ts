import type { Language } from "../i18n";
import { MAX_AUDIO_BYTES, SpeechError, type SpeechConfig } from "./types";
export function speechConfiguration(language: Language): SpeechConfig {
  const model = process.env.ELEVENLABS_MODEL_ID || "eleven_v3";
  const voice = process.env[`ELEVENLABS_VOICE_ID_${language.toUpperCase()}`];
  if (model !== "eleven_v3" || !voice || !/^[a-zA-Z0-9_-]{1,128}$/.test(voice)) throw new SpeechError("PROVIDER");
  return { model, voice, format: "mp3_44100_128" };
}
export async function synthesizeSpeech({ text, language }: { text: string; language: Language }): Promise<Uint8Array> {
  if (!text.trim() || text.length > 2000 || !["en", "bn", "hi"].includes(language)) throw new SpeechError("INVALID_INPUT");
  const { model, voice, format } = speechConfiguration(language), key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new SpeechError("PROVIDER");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new SpeechError("PROVIDER")); }, 8000); });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await Promise.race([fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=${format}`, {
      method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: model, language_code: language }), signal: controller.signal,
    }), deadline]);
    if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/mpeg") || Number(response.headers.get("content-length")) > MAX_AUDIO_BYTES || !response.body) throw new SpeechError("PROVIDER");
    reader = response.body.getReader();
    const parts: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES) throw new SpeechError("PROVIDER");
      parts.push(value);
    }
    if (!size) throw new SpeechError("PROVIDER");
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return bytes;
  } catch { throw new SpeechError("PROVIDER"); }
  finally { clearTimeout(timer!); void reader?.cancel().catch(() => {}); controller.abort(); }
}
