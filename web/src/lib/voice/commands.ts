import { dictionaries, type Language } from "../i18n";
import type { FindTarget, FindOption } from "../finder/types";
import { usageSlots } from "../usage-slots";
const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase().trim().replace(/[.!?।]+$/u, "").trim().replace(/\s+/g, " ");
export function parseFindSelection(text: string, language: Language, options: readonly FindOption[]): {kind:"target";target:FindTarget}|{kind:"ambiguous"}|{kind:"unknown"} {
  if (typeof text !== "string" || text.length > 200) return { kind: "unknown" };
  const value = normalize(text), copy = dictionaries[language];
  const labels = [copy.slotMorning, copy.slotAfternoon, copy.slotEvening, copy.slotNight, copy.slotAsNeeded];
  const matches: FindTarget[] = [];
  usageSlots.forEach((slot, index) => {
    const label = normalize(labels[index]);
    // Bengali/Hindi reuse the reviewed timing labels. English also accepts the
    // user's requested finder phrase; no free-text clinical interpretation.
    const phrases = language === "en" ? [label, `${label} medicine`, `find my ${label} medicine`] : [label];
    if (phrases.includes(value)) matches.push({ kind: "slot", slot });
  });
  const identities = new Set<string>();
  for (const option of options) {
    const phrases = [option.genericName, option.brandName, `${option.genericName} ${option.strength} ${option.dosageForm}`, `${option.brandName ?? ""} ${option.genericName} ${option.strength} ${option.dosageForm}`].filter((phrase): phrase is string => Boolean(phrase));
    if (phrases.some(phrase => normalize(phrase) === value) && !identities.has(option.medicineId)) { matches.push({ kind: "medicine", medicineId: option.medicineId }); identities.add(option.medicineId); }
  }
  return matches.length === 1 ? { kind: "target", target: matches[0] } : matches.length > 1 ? { kind: "ambiguous" } : { kind: "unknown" };
}
export type VoiceCommand = "REPEAT" | "DETAILS" | "EXPIRY" | "INSTRUCTIONS" | "STOP";
const aliases: Record<Language, Record<VoiceCommand, readonly string[]>> = {
  en: { REPEAT: ["repeat", "repeat please", "read again"], DETAILS: ["more information", "more details"], EXPIRY: ["is this expired"], INSTRUCTIONS: ["read the instructions again", "instructions"], STOP: ["stop", "stop reading"] },
  bn: { REPEAT: ["আবার পড়ুন"], DETAILS: ["আরও তথ্য"], EXPIRY: ["মেয়াদ শেষ হয়েছে কি"], INSTRUCTIONS: ["নির্দেশনা আবার পড়ুন"], STOP: ["বন্ধ করুন", "থামুন"] },
  hi: { REPEAT: ["दोहराएँ"], DETAILS: ["अधिक जानकारी"], EXPIRY: ["क्या इसकी समाप्ति तिथि बीत गई है"], INSTRUCTIONS: ["निर्देश फिर से पढ़ें"], STOP: ["बंद करें", "रुकें"] },
};
export function parseVoiceCommand(text: string, language: Language): VoiceCommand | null {
  if (typeof text !== "string" || text.length > 200) return null;
  const normalized = normalize(text);
  const matches = (Object.keys(aliases[language]) as VoiceCommand[]).filter(command => aliases[language][command].includes(normalized));
  return matches.length === 1 ? matches[0] : null;
}
