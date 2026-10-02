# MEDOT hackathon product design

Date: 2026-10-01. Development allowance: 22 hours within a 26-hour event. This is a planning deliverable; application implementation remains pending.

## Intent and success

MEDOT gives a visually impaired person a tactile way to find a medicine strip's NFC marker and hear a pharmacist-entered medicine record. One reusable PETG clip contains a writable, preferably anti-metal NTAG213. Its NDEF URL opens an accessible page. A matching QR is a fallback for a helper or low-vision user. The app identifies the linked record; it does not establish medicine authenticity or prescribe treatment.

Success is a live judge demonstration: an authorized pharmacist selects a catalog item, records physical batch/expiry and reviewed instructions, checks the strip, creates a pending record, writes the exact URL, independently retaps and compares its token ending, activates, then hears the correct record in English and Bengali. Hindi is shown and spoken for reviewed demo fixtures where possible. A second strip resolves a different record. Unknown, pending, revoked, expired, and unavailable states behave safely.

## Constraints supplied by the user

- Extend the existing base in `medot-hs`; preserve its essential features.
- ElevenLabs primary speech, Web Speech fallback; Render replaces Vercel.
- English and Bengali are mandatory; Hindi is optional but planned.
- Modern public homepage and coherent brand; patient page prioritizes accessibility with restrained polish.
- Icons instead of emojis. Optional user-supplied design/3D assets can be integrated later.
- Pharmacy sign-in; expanded catalog including supplied packs; polished GitHub README at the end.
- Approximately 22 development hours; 6–8 commits; agentic execution with tests/lint/build and no repetitive feature reviews.

Assumptions: two humans are available, consistent with the user mentioning a teammate; primary NFC test phone is the Galaxy F62 from the base spec; a dedicated demo Neon database is available or can be created; accounts/credits can be supplied without sharing secrets in chat. These are recorded setup facts to confirm during M1, not reasons to stop planning.

## Approaches considered

| Approach | Tradeoff | Decision |
|---|---|---|
| Extend existing Next.js + Neon, deploy on Render | Preserves tested lifecycle and schema; account setup for Clerk/ElevenLabs | Chosen |
| Rebuild around Supabase database/auth | Cohesive platform, but repeats working SQL/data integration | Excess migration for 22 hours |
| Return to the older Prisma/SQLite proposal | Familiar local development, but persistence and ORM work repeat the base | Rejected for this build |

Native execution best fits tightly shared contracts and a short deadline. One coding agent owns the app; the teammate supplies hardware observations, language review, assets and rehearsals. Preserve review at milestone verification and final integration without a separate reviewer for every feature.

## Required feature mapping

| Original required feature | New implementation responsibility |
|---|---|
| Medicine database | Retain Neon, idempotent expanded demo catalog, brand/generic search |
| Batch and expiry | Store actual printed batch and `YYYY-MM`; keep month-end rule |
| MEDOT token | Preserve cryptographic 22-character base64url generation |
| NFC URL and QR | Preserve `/m/[token]`; one URL drives writer, copy and QR |
| Tactile clip and real NFC demo | First-hour hardware gate and final two-strip acceptance |
| Patient page and accessible UI | Public, mobile, semantic, large controls, TalkBack/keyboard usable |
| Text-to-speech | ElevenLabs primary; explicit browser fallback and transcript |
| Pharmacist provisioning | Sign-in, search, review, pending/write/readback/activate, recovery/revoke |
| Expired warning | Warning before identity in text and speech; actual dates respected |
| Unknown/revoked handling | No identity/audio leakage; add loading/offline/DB-unavailable clarity |
| New mandatory multilingual feature | English/Bengali UI and reviewed instructions/audio; Hindi framework/fixtures |
| New sign-in feature | Clerk pharmacy session plus server-side user allowlist |
| New public polish | Responsive landing page, SVG brand family and final README |

Offline cache, haptic patterns, near-expiry notice, GS1 scanning and richer tag history were stretch in the original plan. Preserve their status in `docs/FEATURES.md`; the base's recent-tag recovery remains required because it already exists and supports provisioning.

## Architecture and scope

Use `web/` at workspace root, Next.js App Router, TypeScript, Neon SQL, existing Zod/qrcode/Vitest, CSS variables and focused components. Add Clerk and one icon set; use direct server fetch for ElevenLabs instead of another backend. Preserve the core services and existing admin API URLs. Pharmacy pages move to `/pharmacy`; old `/admin` links redirect. Public `/m/[token]` stays independent of sign-in SDKs.

Data changes are additive: brand name and catalog readiness metadata; Bengali/Hindi instruction fields; a per-tag per-language audio cache and a durable provider budget. Keep old active English records readable; new provisioning requires English and Bengali. No patient accounts, health records, prescriptions generated by AI, OCR identification, interaction checker, chatbots, blockchain, delivery, or hospital integrations.

Keep clinic instructions exact and human reviewed. Translations are authored/approved before activation. TTS speaks supplied text and structured metadata. No LLM may infer doses or silently translate a live instruction. Demo fixtures are labeled `HACKATHON DEMO ONLY — NOT FOR CLINICAL USE`.

## User experiences

Homepage: warm neutral background, forest/teal accents, calm typography, logo, desktop/mobile navigation, language menu, a tangible clip/strip illustration, clear hero, three-step explanation, audience sections, multilingual/accessibility evidence, controlled demo entry, FAQ and final pharmacy CTA. No fake testimonials, impact numbers, or authenticity claims.

Patient page: minimal MEDOT header; visible language control; warning first; medicine name/strength/form; prominent Read aloud and Stop/Repeat; recorded instruction; labelled expiry; batch/details disclosure; help. The current language and playback/fallback state are always visible. Screen-reader text works even if both speech engines fail. Patient pages have no marketing navigation, carousel, hover-dependent UI, sign-in gate, or decorative 3D dependency.

Pharmacy: authenticated dashboard with provision/recent-tags actions and real database counts; searchable catalog; stepper for medicine, batch/expiry, instructions, physical review, write/readback/activate. Show branded pending result, exact URL, token suffix, QR and writing-app instructions. Sign-out and accessible expired-session recovery are required.

Detailed routes, schema and interfaces: `docs/ARCHITECTURE.md`. Visual specifications: `docs/DESIGN_AND_UX.md`. Speech behavior: `docs/SPEECH_AND_LANGUAGES.md`.

## Acceptance and release

Full English/Bengali flow working by H10; polished pharmacy and landing by H16; H16–22 reserved for integration, fixes, final deployment and rehearsal. Eight commit milestones are defined in the execution plan. Extras only after required gates pass.

Required final evidence: tests, lint, type check, production build, live DB persistence across deploy, real Clerk authorized/unauthorized checks, live ElevenLabs English/Bengali, browser fallback, mobile/TalkBack, two distinct NFC/QR records, expiry/revoke/unknown/pending checks, and 9/10 correct link recognitions within three seconds on the primary phone. Measure page and audio delay separately. No wrong medicine resolution is acceptable.

The supplied Clopidogrel, Atorvastatin and IMPRO-RED photos show already-past expiry labels. Use them as expired demos unless a different physically verified pack is available. Do not fill synthetic future dates against those packs. Use a separately marked fictional sample for the valid path when needed.

## External configuration facts

Render must run this server-rendered app as a web service; free instances may sleep after inactivity. Prepare it before judging and retain a network/fallback script. [Render Next.js](https://render.com/docs/deploy-nextjs-app), [free instance limits](https://render.com/docs/free).

Eleven v3 supports Bengali as well as English/Hindi through the TTS API. Use configurable `eleven_v3` initially; verify sponsor entitlement and actual pronunciation during setup. Do not assume the default Multilingual v2 covers Bengali. [ElevenLabs model coverage](https://elevenlabs.io/docs/overview/models).

Clerk offers a free tier. Authorize near each resource, not solely in the route proxy. [Clerk pricing](https://clerk.com/pricing), [Next.js integration](https://clerk.com/docs/reference/nextjs/clerk-middleware).
