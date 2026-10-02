import { en, type Dictionary } from "./en";
import { bn } from "./bn";
import { hi } from "./hi";

export const languages = ["en", "bn", "hi"] as const;
export type Language = typeof languages[number];
export type { Dictionary } from "./en";
export const dictionaries: Record<Language, Dictionary> = { en, bn, hi };
export const locales: Record<Language, string> = { en: "en-IN", bn: "bn-IN", hi: "hi-IN" };
export const languageNames: Record<Language, string> = { en: "English", bn: "বাংলা", hi: "हिन्दी" };

export function normalizeLanguage(raw?: string | null): Language {
  return raw === "bn" || raw === "hi" ? raw : "en";
}

export function selectInstruction(
  record: { instruction: string; instructionBn?: string; instructionHi?: string },
  requested: Language,
): { text: string; language: Language; usedFallback: boolean } {
  const translated = requested === "bn" ? record.instructionBn : requested === "hi" ? record.instructionHi : record.instruction;
  if (translated?.trim()) return { text: translated, language: requested, usedFallback: false };
  // Preserve the stored English verbatim; no prescription translation occurs.
  return { text: record.instruction, language: "en", usedFallback: requested !== "en" };
}
