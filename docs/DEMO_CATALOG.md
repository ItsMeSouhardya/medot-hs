# Demo catalog and judge workflow

All prescription examples are fictional workflow fixtures copied from or aligned with the referenced plan. Display **HACKATHON DEMO ONLY — NOT FOR CLINICAL USE**. They are not treatment recommendations. Do not store the fictional patient names in the public app. One clip maps to one medicine strip, even if several items belong to one fictional prescription.

## Catalog seed specification

Use stable IDs in `src/data/medicine-catalog.json`; import those records in `scripts/setup-db.mjs`. Seed idempotently. Never seed automatic patient instructions into the general catalog, and never overwrite an existing medicine identity used by active tags. All manufacturer/barcode fields remain absent unless verified.

| Stable ID | Catalog label | Strength / form | Readiness |
|---|---|---|---|
| `metformin-500` | Metformin | 500 mg tablet | Existing fictional catalog |
| `amlodipine-5` | Amlodipine | 5 mg tablet | Existing fictional catalog |
| `atorvastatin-10` | Atorvastatin / supplied label | 10 mg tablet | Existing ID; transcribe the supplied brand in hand rather than guess from the image |
| `pantoprazole-40` | Pantoprazole | 40 mg tablet | Existing fictional catalog |
| `paracetamol-500` | Paracetamol | 500 mg tablet | Existing fictional catalog |
| `clopidogrel-75` | Clopidogrel / CLOPITAB | 75 mg tablet | Visible in photo; physical check required before matching |
| `rosuvastatin-10` | Rosuvastatin / ROSUMILL 10 | 10 mg tablet | Visible in photo; physical check required before matching |
| `zocmox-625-cv` | Zocmox-625 CV / Amoxycillin and Clavulanate | 625 combination tablet | Check component panel; do not infer component amounts |
| `rabijoi-dsr` | Rabijoi DSR / Rabeprazole and Domperidone SR | Capsule; component strengths require check | `PACK_CHECK_REQUIRED` |
| `adoprox-500` | Adoprox-500 / Cefuroxime Axetil | Tablet; 500 branding, verify strength panel | `PACK_CHECK_REQUIRED` until checked |
| `impro-red` | IMPRO-RED / Ferrous Ascorbate, Folic Acid and Zinc Sulphate | Combination tablet; amounts require check | `PACK_CHECK_REQUIRED` |
| `axovit-plus` | Axovit-Plus / Multivitamin, Multimineral and Antioxidant | Softgel; detailed composition requires check | `PACK_CHECK_REQUIRED` |
| `antox` | ANTOX | Capsule; full label requires check | `PACK_CHECK_REQUIRED` |
| `cetirizine-10` | Cetirizine | 10 mg tablet | Additional fictional catalog label |
| `ibuprofen-200` | Ibuprofen | 200 mg tablet | Additional fictional catalog label |
| `losartan-50` | Losartan | 50 mg tablet | Additional fictional catalog label |
| `omeprazole-20` | Omeprazole | 20 mg capsule | Additional fictional catalog label |

This yields 17 catalog rows, with incomplete physical candidates visible but unavailable for provisioning until checked. Additional generic entries are demo labels, not recommended medicines or instructions. Keep the existing five records. For pack checks before initial seed, set complete label fields/readiness in the seed JSON; if an already-used identity needs a correction later, append a new ID rather than changing old tags through a shared row.

M3 implementation status, 2026-10-02: all 17 rows are seeded in the authorized demo Neon database. The existing five plus Cetirizine, Ibuprofen, Losartan and Omeprazole are `DEMO_READY` fictional labels. All eight physical pack candidates are `PACK_CHECK_REQUIRED`; the user confirmed they have not yet been checked. The existing Atorvastatin identity remains generic with no guessed brand. The three prescription groups in `web/src/data/demo-prescriptions.ts` remain `DRAFT_REQUIRES_REVIEW`; no batch/expiry is invented or seeded, and the app does not offer them as live presets.

Setup uses `ON CONFLICT (id) DO NOTHING`: editing a seeded JSON row does not change its stored identity or readiness. After physical verification, append a fully checked replacement ID when label details change; do not silently relabel existing tags. A readiness-only change for an unchanged identity needs an explicit verified database update, not a rerun assumed to overwrite it. Language review is a separate gate before entering preset instructions into a live demo record.

## Expiry observations from the actual images

Atorvastatin appears to expire January 2026; Clopidogrel February 2026; IMPRO-RED October 2025. They are expired on the 2026-10-02 event date. Rosuvastatin appears to show May 2028. Verify all in hand. Batch and expiry must be copied from the actual pack during a physical demonstration; do not prefill a future expiry to hide the warning. Other photos are insufficiently clear for authoritative component/expiry transcription.

Use the expired strips to prove warning behavior. For a current example, use a physically verified current pack or an obviously fictional sample strip with its own printed demo label, such as batch `DEMO-2026-A` and expiry `2028-12`. Never put that label into the record linked to a pack that visibly says an expired date.

## Fictional prescription fixtures

The following translations are draft demo content for a Bengali/Hindi speaker to review during M3. Preserve numbers and timing. The application displays the approved versions, not this draft status as a clinical claim.

| Fixture / medicine | English instruction |
|---|---|
| `DEMO-RX-001-A`, Zocmox-625 CV | Take one tablet after breakfast and one tablet after dinner, as directed by the prescriber. |
| `DEMO-RX-001-B`, Rabijoi DSR | Take one capsule before breakfast, as directed by the prescriber. |
| `DEMO-RX-002-A`, Clopidogrel 75 mg | Take one tablet once daily after breakfast, as directed by the prescriber. |
| `DEMO-RX-002-B`, Atorvastatin 10 mg | Take one tablet once daily in the evening, as directed by the prescriber. |
| `DEMO-RX-003-A`, IMPRO-RED | Take one tablet once daily after food, as directed by the prescriber. |
| `DEMO-RX-003-B`, Axovit-Plus | Take one capsule once daily after a meal, as directed by the prescriber. |

| Fixture | Bengali draft |
|---|---|
| `001-A` | চিকিৎসকের নির্দেশ অনুযায়ী, সকালের খাবারের পরে একটি এবং রাতের খাবারের পরে একটি ট্যাবলেট নিন। |
| `001-B` | চিকিৎসকের নির্দেশ অনুযায়ী, সকালের খাবারের আগে একটি ক্যাপসুল নিন। |
| `002-A` | চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার সকালের খাবারের পরে একটি ট্যাবলেট নিন। |
| `002-B` | চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার সন্ধ্যায় একটি ট্যাবলেট নিন। |
| `003-A` | চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার খাবারের পরে একটি ট্যাবলেট নিন। |
| `003-B` | চিকিৎসকের নির্দেশ অনুযায়ী, প্রতিদিন একবার খাবারের পরে একটি ক্যাপসুল নিন। |

| Fixture | Hindi draft |
|---|---|
| `001-A` | चिकित्सक के निर्देशानुसार, नाश्ते के बाद एक गोली और रात के खाने के बाद एक गोली लें। |
| `001-B` | चिकित्सक के निर्देशानुसार, नाश्ते से पहले एक कैप्सूल लें। |
| `002-A` | चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार नाश्ते के बाद एक गोली लें। |
| `002-B` | चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार शाम को एक गोली लें। |
| `003-A` | चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार भोजन के बाद एक गोली लें। |
| `003-B` | चिकित्सक के निर्देशानुसार, प्रतिदिन एक बार भोजन के बाद एक कैप्सूल लें। |

Create the fixtures in `src/data/demo-prescriptions.ts` with `id`, `medicineId`, `instruction`, `instructionBn`, `instructionHi`, and an explicit demo marker. UI selection is manual. No antibiotic/statin combinations are suggested automatically. Keep the original three cases; do not combine Atorvastatin and Rosuvastatin or add another antibiotic just to use every supplied packet.

## Three-minute primary demo

1. **0:00–0:20:** explain the tactile marker and one-clip/one-strip record. Show two distinct sample strips and the phone. State demo status.
2. **0:20–1:15:** already signed-in pharmacy portal; search/select a label-verified item; enter the actual batch/expiry and fictional instruction in front of judges. Use an explicit reviewed language preset or enter Bengali too. Review the physical strip, create pending, display URL/QR.
3. **1:15–1:45:** write using the supported browser or NFC Tools; independently retap and compare the six-character suffix; return and activate. Keep a prepared second tag nearby if a physical write needs troubleshooting, and say which one is prepared.
4. **1:45–2:20:** retap the newly activated tag. Press Read aloud for ElevenLabs English, switch to Bengali and read. Show Hindi on the reviewed fixture if ready. Speech is user triggered, not promised automatic.
5. **2:20–2:45:** tap the second tag and demonstrate its different instruction or expiry warning. The supplied Clopidogrel/Atorvastatin pair is an expired-warning contrast, not a current-use example.
6. **2:45–3:00:** show QR opening the identical URL, then explain revoke/replacement. Longer judging time: revoke the spare and retap to prove no identity/audio is served.

## Before judges arrive

Open the Render app manually, check readiness and sign-in, turn NFC on, confirm phone volume/voice playback, warm both demo tags' language audio, and test the exact intended tag/QR pair. Bring writing-app fallback, hotspot, chargers, spare anti-metal tags, clip variants, label sheet/tape and a short clearly labeled backup recording. Do not edit working URLs or rebuild the app during the live demonstration.
