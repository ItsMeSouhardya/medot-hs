import { expect, it } from "vitest";
import { dictionaries, languages, languageNames, locales, normalizeLanguage, selectInstruction } from "../i18n";

it("supports the three planned languages and complete dictionary keys", () => {
  expect(languages).toEqual(["en", "bn", "hi"]);
  const keys = Object.keys(dictionaries.en).sort();
  for (const language of languages) {
    expect(Object.keys(dictionaries[language]).sort()).toEqual(keys);
    expect(Object.values(dictionaries[language]).every(value => value.trim().length > 0)).toBe(true);
  }
  expect(languageNames).toEqual({ en: "English", bn: "বাংলা", hi: "हिन्दी" });
  expect(locales).toEqual({ en: "en-IN", bn: "bn-IN", hi: "hi-IN" });
});
it("normalizes supported language codes without guessing", () => {
  expect(normalizeLanguage("bn")).toBe("bn");
  expect(normalizeLanguage("hi")).toBe("hi");
  for (const language of [undefined, null, "fr", "bn-IN", "BN", ""]) expect(normalizeLanguage(language)).toBe("en");
});
it("selects the exact stored language text without translating it", () => {
  const record = { instruction: "English exact.", instructionBn: "বাংলা নির্দেশনা।", instructionHi: "हिन्दी निर्देश।" };
  expect(selectInstruction(record, "bn")).toEqual({ text: record.instructionBn, language: "bn", usedFallback: false });
  expect(selectInstruction(record, "hi")).toEqual({ text: record.instructionHi, language: "hi", usedFallback: false });
  expect(selectInstruction(record, "en")).toEqual({ text: record.instruction, language: "en", usedFallback: false });
});
it("marks legacy/missing translations as English fallback", () => {
  for (const record of [{ instruction: "Legacy exact." }, { instruction: "Legacy exact.", instructionBn: " ", instructionHi: "" }]) {
    for (const language of ["bn", "hi"] as const) expect(selectInstruction(record, language)).toEqual({ text: record.instruction, language: "en", usedFallback: true });
  }
});
