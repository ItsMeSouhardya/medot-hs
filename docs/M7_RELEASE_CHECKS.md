# M7 integration evidence and deployment handoff

Observed 2026-10-02. Baseline commit: `d5bb315` (user's M6). M7 changes are uncommitted. The user chose to verify the current build and keep M4 pending, and confirmed there is no Render service yet. **This is a local integration checkpoint, not a completed release gate.**

## Software evidence

| Check | Actual result |
| --- | --- |
| Default Vitest suite | 22 files / 128 passed; seven opt-in Neon cases skipped |
| Separately enabled Neon suite | Seven passed; temporary software-only pending fixtures cleaned; no activation |
| Lint / types / production build | All exit 0 |
| Local production HTTP smoke | 29 passed, configured Clerk keys; no real signed-in session |
| Local restart persistence | Medicine/tag/audio-table contents unchanged across two fresh server processes |
| Audio cache persistence | Zero audio rows; provider cache behavior not verified |
| Current/expired/unknown/pending/revoked/unavailable fixture pages | All checked at 360px, 22px body, no horizontal overflow; inactive/error states hide identity and speech |
| Actual public patient Read/Stop | Keyboard validation and cancellation checked; focus returns to Read; 64px action |
| Home | Mobile Enter/Escape navigation, Bengali preview and FAQ keyboard disclosure checked |
| Signed-out pharmacy | Redirects to `/sign-in`; entry page renders. No allowed/outsider/sign-out session evidence |
| Template/emoji scan | Zero application text references or emoji matches; unused inherited Next/Vercel logo assets removed |
| Render configuration | YAML parsed and required baseline settings checked against official documentation. Installed AJV cannot compile the official draft 2020-12 schema; no provider validation or deploy |
| Native 200% zoom, TalkBack, NFC/QR hardware | Not run; prior equivalent 720px reflow is not native zoom evidence |

The standalone Playwright runner is not installed. The bounded browser smoke was executed with the available browser's Playwright controls, using real public pages and isolated static patient fixtures. This does not replace a real authenticated portal session, a voice-provider call or a physical readback.

## Integration review and fixes

The prior Read aloud component spoke text captured at page load. Revoking a tag after that load did not prevent a later read. The new public `GET /api/public/tags/[token]` resolves current state, computes expiry in the existing domain and returns `no-store` responses. Active responses contain the repository's public fields only; unknown/pending/revoked/database errors contain no identity or diagnostic detail.

Every browser read now fetches that endpoint, validates the token and required fields, and builds speech from the fresh record. It never falls back to cached text after an error. Expired speech starts with the warning. Stop, timeout, unmount and page hide abort pending requests, invalidate late replies/events and cancel speech. Stop returns keyboard focus to Read. Tests reproduced these defects before their fixes. No ElevenLabs, translation, language controls, clinical dose generation or physical activation was added.

The review also checked existing authorization/origin guards, terminal revocation, pending/readback gates, month-end expiry, stored instruction integrity, creator privacy, canonical writer/QR URL sharing and persistent Neon storage. Unit/fixture evidence covers these boundaries; external and hardware evidence remains separate. The HTTP harness initially expected a GET on the POST-only tag API to return 401; the actual safe response is 405. The corrected smoke checks 405 without identity and checks every supported mutation's 401 separately.

M4 remains a release blocker: English-only browser speech is the current implementation. The displayed record is still the page-load snapshot until reload; a failed fresh speech lookup clearly refuses to read and instructs reload/verification. Full patient refresh/hide behavior, translated controls, ElevenLabs, cache invalidation/quota and pronunciation checks belong to M4. All supplied pack candidates and prescription presets stay blocked pending human review.

## Reproduce locally

From the repository root, use Node 24.18.1 and the ignored `web/.env.local`. All commands below use the existing authorized demo database. Keep secret values out of terminal output and screenshots.

```powershell
npm --prefix .\web test
npm --prefix .\web run lint
npm --prefix .\web run typecheck
npm --prefix .\web run build
node .\web\scripts\m7-production-smoke.mjs
```

The smoke uses localhost port 3110, starts/stops its own production server twice, reads existing demo rows and makes denied mutation requests only. It changes no records. Free port 3110 before running it. It does not use a production HTTP origin to provision tags.

Run the opt-in database cases using the commands in [the app README](../web/README.md). They insert/delete only their own pending software fixtures. To reproduce static visual states:

```powershell
Push-Location .\web
$env:MEDOT_EXPORT_M7_FIXTURES = '1'
try { npx vitest run tests/integration/m7-patient.test.tsx } finally {
  Remove-Item Env:MEDOT_EXPORT_M7_FIXTURES -ErrorAction SilentlyContinue
  Pop-Location
}
node .\web\scripts\m7-fixture-server.mjs
```

Open `http://localhost:3112`; all six pages are clearly labelled static software fixtures. Their speech buttons are intentionally inert. The server binds to localhost, serves only explicit fixture/CSS/font paths, and is not part of the Render start command. Stop it with Ctrl+C. Temporary fixtures/screenshots/logs are ignored under `.superpowers/sdd/2026-10-01-medot-hs/`.

## First Render handoff

Use a Node **Web Service** for server-side Next.js; the prepared `render.yaml` retains Neon. [Render Next.js guide](https://render.com/docs/deploy-nextjs-app), [Blueprint reference](https://render.com/docs/blueprint-spec).

1. Commit the tested M7 changes and push only when authorized. Connect `https://github.com/ItsMeSouhardya/medot-hs` to Render. Create a service from the root Blueprint, or enter the matching settings manually.
2. Use root directory `web`, Node runtime, free plan, Singapore, and manual deploys. Build: `npm ci --no-audit --no-fund && npm run build`. Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`. Health path: `/api/live`. Set `NODE_VERSION=24.18.1`.
3. In Render's environment dashboard, set `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `PHARMACY_ALLOWED_USER_IDS`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/pharmacy`. Copy credentials privately from the configured local file; do not paste them into chat/docs/Git. An empty allowlist denies every account. Remove obsolete `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. Set `APP_ORIGIN` to the service's **actual** HTTPS origin, with no path/query. Redeploy after environment updates; the Clerk publishable key must be present during build. Keep local `web/.env.local` at the local origin. Do not derive the service URL from its name or write localhost URLs onto final tags.
5. Verify `/api/live`, `/api/health`, public current/unknown pages, fresh public lookup's `no-store`, disabled old login and pharmacy redirects. Follow [Clerk setup](CLERK_SETUP.md) for allowed and outsider accounts. Test sign-in/out and 401/403/origin behavior with real sessions before physical provisioning.
6. Complete M4 before claiming the required demo ready. Configure its server-only ElevenLabs settings and run live English/Bengali/provider/cache checks; those settings are intentionally not declared active in the current M2 Render baseline. Leave `DEMO_PUBLIC_TOKEN` unset until an explicitly fictional record is independently read back and activated.
7. After actual pack/language review, provision two distinct final records, verify exact NFC/QR URL equality and activate only after independent readback. Record the device observations in [the hardware log](hardware-test-log.md).
8. Redeploy the same compatible tested app, then prove records and nonempty audio cache survive on Render. Record the actual URL, deployed commit, observation times and rollback target. A local server restart does not satisfy this step.

Free Render services spin down after 15 idle minutes, can take about a minute to wake, and have ephemeral local files. Store records/audio in Neon and measure cold and warm behavior separately. [Render free-service limitations](https://render.com/docs/free).

## Gates still open

| Owner | Required observation |
| --- | --- |
| Application implementation | M4 patient localization, ElevenLabs, persistent audio/quota and full fresh-state UI |
| Account/service operator | Real allowed/outsider Clerk sessions, sign-out, Render deploy/redeploy, HTTPS canonical origin |
| Human teammate | Printed medicine/batch/expiry verification; every fixture's English/Bengali and optional Hindi review |
| Human teammate | Two physical tags, exact QR equality, bare/foil/clip recognition >=9/10 within 3s, zero wrong record |
| Human teammate | Actual English/Bengali pronunciation, TalkBack order, native 200% zoom, screen-obscured probe and timing |

Keep these rows pending until observed. No provider mock, screenshot or software test certifies a physical medicine strip.
