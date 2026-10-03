export const DEMO_MARKER = "HACKATHON DEMO ONLY — NOT FOR CLINICAL USE";
import type { UsageSlot } from "@/lib/usage-slots";

export type DemoInstruction = {
  id: string;
  medicineId: string;
  instruction: string;
  instructionBn: string;
  instructionHi: string;
  usageSlots?: UsageSlot[];
};

export type DemoPrescription = {
  id: string;
  demoMarker: typeof DEMO_MARKER;
  reviewStatus: "DRAFT_REQUIRES_REVIEW" | "REVIEWED" | "DEMO_TEMPLATE";
  items: DemoInstruction[];
};

// Drafts transcribed from docs/DEMO_CATALOG.md. Do not auto-fill or provision
// these until a teammate verifies every language and the physical pack.
export const draftPrescriptions: DemoPrescription[] = [
  {
    id: "DEMO-RX-001", demoMarker: DEMO_MARKER, reviewStatus: "DRAFT_REQUIRES_REVIEW",
    items: [
      { id: "DEMO-RX-001-A", medicineId: "zocmox-625-cv",
        instruction: "Take one tablet after breakfast and one tablet after dinner, as directed by the prescriber.",
        instructionBn: "চিকিৎসকের নির্দেশ অনুযায়ী, সকালের খাবারের পরে একটি এবং রাতের খাবারের পরে একটি ট্যাবলেট নিন।",
        instructionHi: "चिकित्सक के निर्देशानुसार, नाश्ते के बाद एक गोली और रात के खाने के बाद एक गोली लें।" },
      { id: "DEMO-RX-001-B", medicineId: "rabijoi-dsr",
        instruction: "Take one capsule before breakfast, as directed by the prescriber.",
        instructionBn: "চিকিৎসকের নির্দেশ অনুযায়ী, সকালের খাবারের আগে একটি ক্যাপসুল নিন।",
        instructionHi: "चिकित्सक के निर्देशानुसार, नाश्ते से पहले एक कैप्सूल लें।" },
    ],
  },
  {
    id: "DEMO-RX-002", demoMarker: DEMO_MARKER, reviewStatus: "DRAFT_REQUIRES_REVIEW",
    items: [
      { id: "DEMO-RX-002-A", medicineId: "clopidogrel-75",
        instruction: "Take one tablet once daily after breakfast, as directed by the prescriber.",
        instructionBn: "চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার সকালের খাবারের পরে একটি ট্যাবলেট নিন।",
        instructionHi: "चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार नाश्ते के बाद एक गोली लें।" },
      { id: "DEMO-RX-002-B", medicineId: "atorvastatin-10",
        instruction: "Take one tablet once daily in the evening, as directed by the prescriber.",
        instructionBn: "চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার সন্ধ্যায় একটি ট্যাবলেট নিন।",
        instructionHi: "चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार शाम को एक गोली लें।" },
    ],
  },
  {
    id: "DEMO-RX-003", demoMarker: DEMO_MARKER, reviewStatus: "DRAFT_REQUIRES_REVIEW",
    items: [
      { id: "DEMO-RX-003-A", medicineId: "impro-red",
        instruction: "Take one tablet once daily after food, as directed by the prescriber.",
        instructionBn: "চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার খাবারের পরে একটি ট্যাবলেট নিন।",
        instructionHi: "चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार भोजन के बाद एक गोली लें।" },
      { id: "DEMO-RX-003-B", medicineId: "axovit-plus",
        instruction: "Take one capsule once daily after a meal, as directed by the prescriber.",
        instructionBn: "চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার খাবারের পরে একটি ক্যাপসুল নিন।",
        instructionHi: "चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार भोजन के बाद एक कैप्सूल लें।" },
    ],
  },
];

// Non-clinical identification cues, separate from the unreviewed prescriptions.
// DEMO_TEMPLATE is fixture readiness, never a claim of human prescription review.
const timing = {
  morningEvening: { usageSlots: ["MORNING", "EVENING"] as UsageSlot[], instruction: "Fictional demo only. Identify this sample in the morning and evening.", instructionBn: "শুধুমাত্র কাল্পনিক ডেমো। সকাল ও সন্ধ্যায় এই নমুনাটি শনাক্ত করুন।", instructionHi: "केवल काल्पनिक डेमो। सुबह और शाम इस नमूने की पहचान करें।" },
  morning: { usageSlots: ["MORNING"] as UsageSlot[], instruction: "Fictional demo only. Identify this sample in the morning.", instructionBn: "শুধুমাত্র কাল্পনিক ডেমো। সকালে এই নমুনাটি শনাক্ত করুন।", instructionHi: "केवल काल्पनिक डेमो। सुबह इस नमूने की पहचान करें।" },
  evening: { usageSlots: ["EVENING"] as UsageSlot[], instruction: "Fictional demo only. Identify this sample in the evening.", instructionBn: "শুধুমাত্র কাল্পনিক ডেমো। সন্ধ্যায় এই নমুনাটি শনাক্ত করুন।", instructionHi: "केवल काल्पनिक डेमो। शाम इस नमूने की पहचान करें।" },
  afternoon: { usageSlots: ["AFTERNOON"] as UsageSlot[], instruction: "Fictional demo only. Identify this sample in the afternoon.", instructionBn: "শুধুমাত্র কাল্পনিক ডেমো। দুপুরে এই নমুনাটি শনাক্ত করুন।", instructionHi: "केवल काल्पनिक डेमो। दोपहर में इस नमूने की पहचान करें।" },
  asNeeded: { usageSlots: ["AS_NEEDED"] as UsageSlot[], instruction: "Fictional demo only. Identify this sample when needed for the demonstration.", instructionBn: "শুধুমাত্র কাল্পনিক ডেমো। প্রদর্শনের জন্য প্রয়োজন হলে এই নমুনাটি শনাক্ত করুন।", instructionHi: "केवल काल्पनिक डेमो। प्रदर्शन के लिए ज़रूरत होने पर इस नमूने की पहचान करें।" },
};
export const fictionalDemoPrescriptions: DemoPrescription[] = [
  { id: "FICTIONAL-SAMPLES-01", demoMarker: DEMO_MARKER, reviewStatus: "DEMO_TEMPLATE", items: [
    { id: "FICTIONAL-01-A", medicineId: "fictional-zocmox-625-cv", ...timing.morningEvening },
    { id: "FICTIONAL-01-B", medicineId: "fictional-rabijoi-dsr", ...timing.morning },
  ] },
  { id: "FICTIONAL-SAMPLES-02", demoMarker: DEMO_MARKER, reviewStatus: "DEMO_TEMPLATE", items: [
    { id: "FICTIONAL-02-A", medicineId: "fictional-clopidogrel-75", ...timing.morning },
    { id: "FICTIONAL-02-B", medicineId: "fictional-rosuvastatin-10", ...timing.evening },
  ] },
  { id: "FICTIONAL-SAMPLES-03", demoMarker: DEMO_MARKER, reviewStatus: "DEMO_TEMPLATE", items: [
    { id: "FICTIONAL-03-A", medicineId: "fictional-impro-red", ...timing.afternoon },
    { id: "FICTIONAL-03-B", medicineId: "fictional-axovit-plus", ...timing.evening },
  ] },
  { id: "FICTIONAL-SAMPLES-04", demoMarker: DEMO_MARKER, reviewStatus: "DEMO_TEMPLATE", items: [
    { id: "FICTIONAL-04-A", medicineId: "fictional-adoprox-500", ...timing.afternoon },
    { id: "FICTIONAL-04-B", medicineId: "fictional-antox", ...timing.asNeeded },
  ] },
];
export const demoPrescriptions: DemoPrescription[] = [...fictionalDemoPrescriptions, ...draftPrescriptions];
export function demoPresetUsable(group: DemoPrescription, medicine: { catalogStatus: string; recordKind?: string } | undefined): boolean {
  return medicine?.catalogStatus === "DEMO_READY" && (group.reviewStatus === "REVIEWED" || group.reviewStatus === "DEMO_TEMPLATE" && medicine.recordKind === "FICTIONAL_DEMO");
}
