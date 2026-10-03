import type { PublicRecord } from "../tag-repository";
import { dictionaries, selectInstruction, type Language } from "../i18n";
import { expiryState } from "../expiry";
import { formatExpiryMonth } from "../speech-text";
import type { SpeechKind, SpeechScript } from "./types";
export function buildSpeechScript(record: PublicRecord, requested: Language, kind: SpeechKind, now = new Date()): SpeechScript {
  let selection = selectInstruction(record, requested);
  const notes = requested === "bn" ? record.infoBn : requested === "hi" ? record.infoHi : record.infoEn;
  if (kind === "details" && record.infoEn && !notes?.trim()) selection = { text: record.instruction, language: "en", usedFallback: requested !== "en" };
  const { language, usedFallback } = selection, copy = dictionaries[language];
  const expired = expiryState(record.expiryMonth, now) === "EXPIRED";
  const warning = expired ? copy.spokenWarning + " " : "";
  const identity = `MEDOT. ${copy.medicineIdentified}. ${record.brandName ? record.brandName + ". " : ""}${record.genericName}. ${record.strength}. ${record.dosageForm}. `;
  const expiry = `${copy.labelledExpiry}: ${formatExpiryMonth(record.expiryMonth, language)}. `;
  let content: string;
  if (kind === "instructions") content = `${copy.recordedInstruction}: ${selection.text}`;
  else if (kind === "expiry") content = `${expired ? "" : copy.expiryCurrent + " "}${expiry}`;
  else if (kind === "details") {
    const information = language === "bn" ? record.infoBn : language === "hi" ? record.infoHi : record.infoEn;
    const slots = { MORNING: copy.slotMorning, AFTERNOON: copy.slotAfternoon, EVENING: copy.slotEvening, NIGHT: copy.slotNight, AS_NEEDED: copy.slotAsNeeded };
    content = `${identity}${copy.batch}: ${record.batchNumber}. ${expiry}${copy.recordedTiming}: ${record.usageSlots?.length ? record.usageSlots.map(slot => slots[slot]).join(", ") : copy.timingUnknown}. ${information ?? copy.noMedicineInformation}`;
  } else content = `${identity}${copy.recordedInstruction}: ${selection.text}. ${expiry}${copy.batch}: ${record.batchNumber}.`;
  return { text: warning + content, language, usedFallback };
}
