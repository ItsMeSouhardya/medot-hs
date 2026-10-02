export const DEMO_MARKER = "HACKATHON DEMO ONLY — NOT FOR CLINICAL USE";

export type DemoInstruction = {
  id: string;
  medicineId: string;
  instruction: string;
  instructionBn: string;
  instructionHi: string;
};

export type DemoPrescription = {
  id: string;
  demoMarker: typeof DEMO_MARKER;
  reviewStatus: "DRAFT_REQUIRES_REVIEW" | "REVIEWED";
  items: DemoInstruction[];
};

// Drafts transcribed from docs/DEMO_CATALOG.md. Do not auto-fill or provision
// these until a teammate verifies every language and the physical pack.
export const demoPrescriptions: DemoPrescription[] = [
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
