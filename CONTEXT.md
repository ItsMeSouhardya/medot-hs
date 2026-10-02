# MEDOT working context

Updated: 2026-10-02, Asia/Calcutta. State: M2 local authentication cutover verified; live Clerk account and Render checks pending.

## Objective

Turn the existing MEDOT prototype into a polished hackathon demo in approximately 22 development hours. The event date is 2026-10-02. Use relative hours until its actual start time is supplied. Preserve the tactile clip -> NFC/QR -> accessible medicine record flow.

## Current checkout

- Destination: `D:\Personal Projects\medot\medot-hs`. Application imported into `web/`; 56 source files verified by SHA256. Source files remain unchanged.
- Root Git: `main` tracks `origin/main`; latest commit `520a3e0` is the user's M1 commit. Remote `https://github.com/ItsMeSouhardya/medot-hs.git`, selected by the user. M2 remains uncommitted; agent execution has not pushed. Preserve the ignored nested `medot-hs/` clone and unrelated `.kilo/` files.
- Prototype: `D:\Personal Projects\medot\medot-base\medot-v0\web`. Its installed dependencies and lockfile exist. The source repository has no commits yet and has untracked `docs/` and `medot-v0/`; do not clean or reset it.
- Verified source versions: Next.js 16.3.6, React 19.2.8, Neon driver, Zod, qrcode, Vitest.
- The app retains pending provisioning, URL and QR output, independent readback activation, recent-tag recovery, revoke, English browser speech, expiry and unavailable states. M1 added Render configuration, `/api/live`, and clean-checkout type checking. M2 replaces password login with Clerk 7.9.10, an exact server user-ID allowlist, scoped operator provider/proxy and protected `/pharmacy` routes. ElevenLabs, multilingual interface and modern full design remain future milestones.

## Decisions

One Next.js app at `web/`, Neon retained, Render Node web service, Clerk free pharmacy authentication with a server-held allowlist, ElevenLabs `eleven_v3` initially for English/Bengali/Hindi. Manually reviewed instructions; no runtime translation. Existing `/m/[token]` and `/api/admin/...` contracts evolve in place. Native execution; eight commit milestones; full flow target by H10.

Node 24.18.1 remains pinned. M2 pins Clerk 7.9.10 without changing any existing package version; `dequal` only changes from a development/peer classification to runtime use. Render configuration selects Singapore/free and manual deployments. User authorized demo Neon reuse in ignored `web/.env.local`; local origin is `http://localhost:3000`. M2 removes obsolete password/session settings from local, example and blueprint configuration. Protected mutations compare against validated `APP_ORIGIN`; production requires HTTPS. No credentials appear in committed examples. Agent commit/push/deploy authorization has not been given.

Ruling: without Clerk credentials, return unauthenticated access and show a setup-unavailable sign-in screen; never use automatic keyless setup. This allows builds and public patient pages while failing closed on pharmacy records. Provider/proxy scope excludes `/m`, `/`, public APIs and health. Each protected server page and API still checks access independently. Layouts and proxy alone do not authorize records.

## Actual evidence

M2 checks on 2026-10-02: policy tests first failed on missing allowlist behavior, then passed; cutover tests first reproduced obsolete-cookie/login access, then passed. Final suite: 15 files / 55 tests passed. Lint (no warnings), type checking and production build exited 0. Installed Next docs call the matcher utility `unstable_doesProxyMatch`, but this version exports `unstable_doesMiddlewareMatch`; tests use the actual installed export. No framework upgrade.

Final M2 production HTTP smoke: 19 checks passed with Clerk keys absent, including public current/unknown patient pages, real Neon readiness, no patient Clerk loader, JSON 401 across catalog/provision/activate/revoke, obsolete password endpoint 410 without a cookie, legacy redirects including tag search, and pharmacy redirects to explicit unavailable sign-in. No tags mutated. Browser screenshot/AX check confirmed the unavailable page renders legibly. Full Clerk form, sign-in/out, authorized/outsider sessions and mobile navigation cannot yet be visually/provider verified. Secret-value scan found no configured server credentials in candidate repository files. Render YAML parsed with required Clerk settings and no obsolete auth settings.

Imported application checks on 2026-10-02: locked `npm ci` succeeded; `npm test` passed 11 files / 27 tests; lint, `next typegen && tsc --noEmit`, and production build exited 0. Framework versions remain Next 16.3.6 / React 19.2.8. Render YAML parsed and baseline fields verified; secret/dependency/build paths ignored and `.env.example` included. Final scan of 76 candidate repository files found no reused credential values; only root engine metadata changed in the package lock.

Live reused Neon setup ran twice: five medicines both times; the existing active tag and its status survived unchanged. Production server on loopback passed 15 HTTP checks: liveness/readiness, homepage, pharmacy login, correct existing patient medicine/strength, noindex, unknown-token safe state, unauthenticated denials, valid password session, cross-origin denials and invalid provision rejection. No tags were created, activated or revoked. Smoke server stopped afterward. The check initially used `127.0.0.1` as request origin, which Next normalized differently; using the configured `localhost` origin passed without an application change.

No Render deployment, real Clerk session, ElevenLabs call, physical NFC readback, phone speech or TalkBack test has been performed. HTTP results are local production evidence only. Hardware observations remain unrun in `docs/hardware-test-log.md`. Detailed command logs and import manifest are ignored under `.superpowers/sdd/2026-10-01-medot-hs/`.

RTK was blocked by Windows Application Control. Direct commands and context-mode were used. Hardware acceptance remains unrun. Source photo labels show expired Clopidogrel (02/2026), Atorvastatin (01/2026), and IMPRO-RED (10/2025); verify in hand and retain their warnings.

## Next action

M2 is ready for the user's commit: `CONTEXT.md`, `README.md`, changed `docs/`, `render.yaml`, and changed/new paths under `web/`. Suggested message: `feat: secure pharmacy portal with clerk authentication`. Nothing staged or committed by the agent. Secrets, dependencies, build output, local agent files, execution logs and nested clone remain ignored; `.env.example` remains includable.

The user requested Clerk setup instructions; [CLERK_SETUP.md](docs/CLERK_SETUP.md) now contains dashboard/account/environment and verification steps. Add matching Clerk keys plus the teammates' exact user IDs to ignored `web/.env.local`, restart/rebuild, then verify allowed sign-in/out and a separate unlisted account. No keys are configured as of the final smoke check. Do not paste secrets into chat.

Complete first hosting when publishing is authorized and Render account access is available: connect the selected repository, configure server environment, set actual HTTPS `APP_ORIGIN`, and verify deployed health/auth/current-token pages before writing tags. On any pre-existing service, manually remove obsolete password/session keys and add Clerk settings; blueprint changes do not populate new secrets. Do not assume the requested service name determines its final URL. Next implementation milestone is M3 on the user's next request; Clerk/live hosting gates remain pending independently.

## Session handoff fields

Current milestone: M2 local code gate passed, actual Clerk/deployed gates pending; M1 local gate also passed. Latest commit: `520a3e0` (user's M1). M2 uncommitted. Blockers: Clerk keys/accounts/allowlist, Render connection and publishing authorization, physical pack/NFC observations, future ElevenLabs credentials. Next live check: allowed/outsider Clerk sessions and public patient independence. Implementation elapsed time has not been measured reliably; do not treat milestone timeboxes as actual usage.
