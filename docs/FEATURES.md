# Optional features and scope control

Required features are listed in the product spec. These items cannot displace English/Bengali, sign-in, the physical tag flow, testing or rehearsal. Hindi is a planned lower-priority language, not an excuse to postpone Bengali. Complete Hindi demo fixtures before new feature extras.

| Priority | Addition | Budget | Entry condition |
|---|---|---:|---|
| 1 | Haptic success/warning patterns with capability check | 20–30 min | Core mobile flow passes; no haptic-only feedback |
| 2 | Downloadable QR label sheet with medicine label and token suffix | 30–45 min | Exact QR/NFC URL test green; basic QR download already required |
| 3 | Near-expiry notice within 60 days of labelled month end | 30–45 min | Month-end tests preserved; warning never masks expired state |
| 4 | Larger-text and high-contrast preference | 30–45 min | Baseline accessible design already passes at 200% zoom |
| 5 | Simple tag lifecycle timestamps/history panel | 45–60 min | Existing created/activated/revoked timestamps sufficient; no analytics |
| 6 | Short matching check phrase shown on review/clip label | 20–30 min | Random token remains actual identity; human checks remain explicit |

Original stretch backlog: read-only offline cache and GS1/DataMatrix input. These exceed the default 22-hour scope. Offline records need conspicuous unverified-cache status, expiry recomputation and a revocation policy; do not silently cache a medicine identity as live. GS1 scan may fill a catalog query only after verified decoding; it cannot replace the physical label review. Do not start either after H16.

Optional 3D/template asset: accept only if supplied by H13, under a 30-minute integration budget and without changing shared contracts. Place in the homepage hero, defer loading, keep a static fallback. Later assets go into the post-event backlog.

Post-event: user research with visually impaired people, clinical translation review, multi-pharmacy isolation, stronger provisioning/audit, durable distributed rate limits, repeatable accessibility audits, and production auth/domain operations. They are not claimed by this demo.
