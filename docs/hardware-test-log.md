# MEDOT hardware and acceptance log

Status: **not run**. The Galaxy F62 and NTAG213 tags are not currently available. Leave results blank until observed; software test results are in the project README.

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

Record any failed write without activating its pending record. Note the next hardware change to try, if needed:

> Pending observation.
