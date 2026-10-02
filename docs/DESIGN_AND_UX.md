# Visual direction and page design

## Brand and foundations

MEDOT should feel calm, tangible, and dependable: warm paper backgrounds, deep forest teal, soft mint panels, generous space and rounded forms inspired by a physical clip. Use a restrained editorial layout rather than a dense medical dashboard.

| Token | Value | Use |
|---|---|---|
| Background | `#F6F7F2` | Warm page canvas |
| Surface | `#FFFFFF` | Cards and forms |
| Primary | `#215C50` | CTA and selected actions, white text |
| Ink | `#172F2B` | Main text |
| Secondary text | `#526860` | Explanations; measure contrast on actual background |
| Mint | `#DDEDE5` | Decorative surfaces, with dark text |
| Border | `#C8D6CE` | Card separation; stronger border for interactive controls |
| Warning | `#86530E` on `#FFF1D8` | Expiry warning, with text and icon |
| Error | `#9C2F36` on `#FDECEC` | Failed/revoked state, with text and icon |

Use Manrope for Latin headings and Atkinson Hyperlegible or a legible system sans for body. Bengali uses Noto Sans Bengali; Hindi uses Noto Sans Devanagari. Bundle licensed fonts locally when available; include licenses and sensible script-aware fallbacks. Do not make patient text or deployment depend on a live Google Fonts request. Limit weights and font files. Verify Bengali conjuncts and Hindi matras at the real sizes.

Homepage width 1200px, horizontal gutters 24px desktop / 20px mobile; sections 80–104px desktop / 48–64px mobile. Cards 20px radius, fields 12px. Subtle shadow and border; no glass effect behind reading text. Use an 8px spacing scale. Desktop hero heading 56–64px; mobile 36–42px. Body 18px homepage, at least 22px patient, line-height 1.5–1.65. Patient primary controls at least 64px tall; other tappable controls at least 48px. Contrast target 4.5:1 text and 3:1 control/focus boundaries; measure actual rendered pairs.

One consistent icon family such as Lucide. Decorative SVGs use `aria-hidden`; icon actions also have visible text or an accessible name. No emojis. Motion limited to 150–200ms UI transitions and a slow optional hero float; respect reduced motion. No scroll-jacking or content hidden until animation completes.

## Logo concept

Create an original SVG mark: a rounded clip/pill outline with one solid raised dot positioned at its upper corner and a short open seam suggesting a reusable clip. The dot is the tactile locator; the surrounding shape is the medicine packaging connection. Avoid a red cross, imitation Braille, or a complex medical symbol. The mark must read at 16px in one color.

Wordmark `MEDOT` in a calm medium/semibold sans with modest spacing; use the same mark alongside it. Implement `brand/medot-logo.tsx` with `mark/wordmark` variants and an accessible label. Produce `public/brand/medot-mark.svg`, `medot-wordmark.svg`, mono/light variants, `src/app/icon.svg`, favicon and apple-touch PNG during implementation. Check 16/32/180px and dark/light contrast. Use code-native vector design; raster image generation is unnecessary for this logo.

## Homepage `/`

1. **Navbar:** MEDOT left. Desktop links How it works, Accessibility, For pharmacies, Resources dropdown; language dropdown `English / বাংলা / हिन्दी`; right Pharmacy sign in. Resources links FAQ and the project's docs/repository only after their real URLs exist. Sticky compact bar with subtle border. Mobile menu button announces expanded state; sheet contains the same links. Escape closes, keyboard focus remains predictable, selecting a link closes.
2. **Hero:** eyebrow `Accessible medicine information`; headline `A small touch. A clearer medicine routine.`; supporting copy `Find the raised marker, tap your phone, and hear the medicine details recorded by your pharmacist.` Primary `Open pharmacy portal`; secondary `Explore the demo`. Right: CSS/SVG illustration of a blister strip, tactile clip and phone showing a record. Label it as a concept illustration. Small chips English, বাংলা, हिन्दी and NFC + QR; explain Hindi availability honestly if unfinished. Mobile stacks copy above visual.
3. **Purpose band:** three brief commitments with icons: tactile first, spoken information, one strip per clip. Use factual capabilities, not invented outcome statistics.
4. **How it works:** three numbered cards Find the dot / Tap the clip / Hear the record, with a concise pharmacy preparation note. Use a static diagram; optional tiny clip hover movement on desktop only.
5. **For people and pharmacies:** two balanced panels. Patient benefit is access to recorded information; pharmacy benefit is quick matching, review, readback and correction. Show an authentic cropped interface preview once built. CTA to the relevant workflow.
6. **Languages and accessibility:** real language tabs preview localized UI copy and the explicit Read aloud action. These tabs change a static preview, not a live prescription. Include screen-reader compatibility, large controls, transcript and fallback explanation. Link to the actual demo record when seeded.
7. **Responsible demo panel:** short explanation that the prototype reads a linked pharmacy record and does not authenticate medicines or determine dosage. Display the demo label clearly. `Explore the demo` uses an explicitly marked seeded public sample; if no active sample exists, show a local illustrative preview instead of a dead token URL.
8. **FAQ accordion:** Is an app required? What if NFC isn't supported? How does a pharmacist set it up? What languages are available? What happens if a tag is revoked or the network fails? Use button/heading semantics and accurate tested answers.
9. **Final CTA and footer:** `Make the next strip easier to identify.` Pharmacy portal link, concise prototype note, actual team/GitHub info when supplied. Footer logo and navigation. Do not invent affiliations or sponsor endorsements.

Every nav/dropdown/accordion is keyboard usable. Use links for navigation and buttons for state changes. Prefer native disclosure elements where they serve the behavior. No mandatory 3D scene; a later supplied asset belongs in the hero with a static fallback, lazy loading and a fixed layout box. Preserve patient performance when marketing assets are added.

## Patient `/m/[token]`

Keep the first viewport useful on a 360px phone. Max readable width 640px, centered with 20px gutters. Header contains mark/wordmark, a concise identification status and a visible language selector. No public marketing menu.

Order: (1) expiry/revocation/error warning, (2) medicine brand/generic heading, strength and form, (3) large Read medicine aloud, Stop and Repeat controls with visible status, (4) recorded instruction card, (5) labelled expiry, (6) batch and more-details disclosure, (7) help and demo notice. Show the instruction as an exact stored quotation with its language; separate it from labels. A sticky lower audio action can be used only if it leaves content/focus unobscured.

Language buttons use the names English, বাংলা and हिन्दी with `aria-pressed`. Follow `?lang=` first, saved preference second, browser language third, English otherwise; do not write a language query onto the physical tag. The canonical token URL stays neutral. Set document `lang` to the UI language and instruction `lang` to its actual stored language. Patient missing-translation notices are explicit and announce English fallback.

| State | Presentation and action |
|---|---|
| Loading | Stable heading `Loading medicine information`; restrained placeholder, no fake identity |
| Active/current | Correct identity, exact instruction, expiry, Read aloud |
| Active/expired | Warning before identity and audio; never imply usability from active tag status |
| Pending | `Tag awaiting activation`; six-character token ending for operator readback, no identity |
| Revoked | `This MEDOT tag has been withdrawn`; no identity/audio, pharmacist guidance |
| Unknown | `This tag could not be identified`; no guessed match, helper guidance |
| Network/DB unavailable | `Medicine information is unavailable`; retry and verification guidance |
| ElevenLabs error | Transcript remains; announce browser fallback and its language availability |

No automatic audio after NFC navigation. The phone opens the URL, then the user activates Read aloud. Keep the action first and easy to find with TalkBack. A screen reader should not compete with unrequested app speech. A polite status region announces loading/playback; an alert is reserved for urgent warning/error, avoiding repeated announcements.

## Pharmacy `/pharmacy`

Desktop: small sidebar/logo, Overview / Provision / Recent tags, authenticated user and sign out. Mobile: compact top navigation rather than a dashboard squeezed into a sidebar. Overview shows real pending/active/revoked totals, a prominent Provision a clip action and recent records with resume/revoke controls. Add a search field with labelled query and empty state; do not fabricate activity charts.

Provisioning stepper: Medicine -> Batch and expiry -> Instructions -> Physical review -> Write and activate. Medicine selector supports brand/generic/strength search, keeps a clearly selected item and displays incomplete pack metadata as non-provisionable. English/Bengali instruction tabs show required status; Hindi optional. Demo presets populate only explicitly selected fictional cases; any source-text edit invalidates the matching translated preset until reviewed again.

Physical review presents medicine/strength/form, printed batch/month and each instruction. Use an explicit labelled checkbox and Confirm button; no hold-to-confirm or gesture requirement. Creation leads to pending output with exact URL, copy, token suffix, QR download/print, optional browser writer and NFC Tools instructions. Readback confirmation enables activation; write success alone does not. Sign-in expiration preserves the unsaved in-memory draft while prompting reauthentication; resume saved pending records through Recent tags.
