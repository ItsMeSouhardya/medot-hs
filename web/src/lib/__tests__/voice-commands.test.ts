import { expect, it } from "vitest";
import { parseVoiceCommand } from "../voice/commands";
it.each([["Repeat.","en","REPEAT"],[" More information ","en","DETAILS"],["Is this expired?","en","EXPIRY"],["Read the instructions again","en","INSTRUCTIONS"],["Stop","en","STOP"],["আবার পড়ুন","bn","REPEAT"],["আরও তথ্য","bn","DETAILS"],["মেয়াদ শেষ হয়েছে কি?","bn","EXPIRY"],["নির্দেশনা আবার পড়ুন","bn","INSTRUCTIONS"],["বন্ধ করুন","bn","STOP"],["दोहराएँ","hi","REPEAT"],["अधिक जानकारी","hi","DETAILS"],["क्या इसकी समाप्ति तिथि बीत गई है?","hi","EXPIRY"],["निर्देश फिर से पढ़ें","hi","INSTRUCTIONS"],["बंद करें","hi","STOP"]] as const)("%s in %s maps only to %s", (text, language, command) => expect(parseVoiceCommand(text, language)).toBe(command));
it("unknown, mixed/ambiguous, negated and excessive text never trigger a command", () => {
  for (const text of ["Take it now", "repeat and stop", "Do not repeat", "is this safe", "Metformin", "x".repeat(201), ""]) expect(parseVoiceCommand(text, "en")).toBeNull();
  expect(parseVoiceCommand("Repeat", "bn")).toBeNull();
});
