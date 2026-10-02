# MEDOT hardware and acceptance log

Status: **not run**, updated 2026-10-02 during M7. No new physical observations were supplied. The inherited log listed the Galaxy F62 and NTAG213 tags as unavailable; confirm current device/tag availability with the teammate. Leave physical results blank until observed. [M7 release checks](M7_RELEASE_CHECKS.md) records software evidence separately. There is no Render service yet and M4 voice/language integration remains pending.

## Test setup

| Item | Observed value |
|---|---|
| Date, tester | |
| Galaxy F62 Android version | |
| NFC setting on? | |
| Phone case / orientation / antenna position | |
| Tag model, backing, and writing app | NTAG213; confirm backing and app |
| Blister material and clip material | |
| Tag-to-foil spacing or ferrite layer | |
| Stable deployed URL and app version | |

## Bare-tag gate

Write `https://example.com` as one NDEF URL record to a disposable NTAG213. Close the writer. With the phone unlocked and NFC on, try ten ordinary taps. Record **link recognition within three seconds** separately from network page load. This gate checks phone/tag coupling before app behavior.

| Placement | Case on/off | Correct link recognized / 10 | Typical recognition time | Page load | Notes |
|---|---|---:|---|---|---|
| Bare tag | | | | | |
| Beside blister, away from foil | | | | | |
| Directly against foil | | | | | |
| With nonmetal spacer or ferrite, if available | | | | | |
| Inside rough clip | | | | | |

If the bare tag fails, check tag format, NFC setting, and phone antenna placement before debugging MEDOT. Do not finalize clip dimensions until the foil-and-clip position recognizes the **correct** link at least 9/10 times within three seconds.

## Deployed end-to-end run

Use only sample or empty packaging and test instructions. Provision two distinct records, such as metformin and amlodipine with different batches. Write each returned URL to its own tag, independently retap, compare the last six token characters, and activate.

| Check | Observed result / URL ending | Pass? |
|---|---|---|
| Deployed `/api/health` after database seed | | |
| First tag opens only first record | | |
| First QR opens exact first tag URL | | |
| Second tag opens only second record | | |
| Second QR opens exact second tag URL | | |
| Unknown URL hides medicine details | | |
| Pending URL hides medicine details | | |
| Revoked URL hides medicine details | | |
| Expired record shows and speaks warning | | |
| Read aloud speaks stored fields and instruction | | |
| TalkBack reaches title, warning, fields, and button | | |
| Screen-obscured usability probe | | |
| Record survives a fresh deployment | | |

## Language, accessibility and final pairing

Use the actual printed values and the reviewed fixtures; no inferred expiry or generated treatment instruction. All supplied packs and prescription presets currently remain blocked. For each medicine entry in the three draft cases, record who checked its pack identity and English/Bengali text; Hindi is optional. Unreviewed entries cannot be used to demonstrate a clinical instruction.

| Observation | Actual result | Tester / date |
| --- | --- | --- |
| First strip identity, printed batch/expiry and token suffix | | |
| Second strip identity, printed batch/expiry and distinct token suffix | | |
| Each QR URL exactly equals its NFC URL | | |
| English instruction and actual audio pronunciation reviewed | | |
| Bengali instruction and actual audio pronunciation reviewed | | |
| Hindi instruction/audio reviewed, if completed | | |
| TalkBack order: warning, identity, instruction, expiry, language and audio | | |
| Read/Stop via keyboard; visible focus after Stop | | |
| Native browser zoom at 200% | | |
| Screen-obscured find/tap/read usability probe | | |
| NFC recognition time separately from page ready time | | |
| User-triggered audio delay; cold versus warm service | | |
| Revoked spare blocks a new read from an already open page | | |

Acceptance: the final clip placement recognizes the correct link at least 9/10 times within three seconds, with zero wrong-record openings. A static fixture, local production test or browser state does not count as this result.

Record any failed write without activating its pending record. Note the next hardware change to try, if needed:

> Pending observation.
