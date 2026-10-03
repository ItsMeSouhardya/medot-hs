import type { Language } from "../i18n";
export const speechKinds = ["full", "instructions", "expiry", "details"] as const;
export type SpeechKind = typeof speechKinds[number];
export type SpeechScript = { text: string; language: Language; usedFallback: boolean };
export type SpeechResult = Omit<SpeechScript, "text"> & { audio: Uint8Array };
export type SpeechConfig = { model: string; voice: string; format: string };
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export class SpeechError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "UNKNOWN" | "PENDING" | "REVOKED" | "PROVIDER" | "DATABASE" | "BUDGET" | "STALE") { super(code); }
}
