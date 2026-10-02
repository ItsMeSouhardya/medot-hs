# MEDOT working context

Updated: 2026-10-02, Asia/Calcutta. State: M3 code/data gate verified; physical pack and language review, real Clerk sessions and Render checks pending.

## Objective

Turn the existing MEDOT prototype into a polished hackathon demo in approximately 22 development hours. The event date is 2026-10-02. Use relative hours until its actual start time is supplied. Preserve the tactile clip -> NFC/QR -> accessible medicine record flow.

## Current checkout

- Destination: `D:\Personal Projects\medot\medot-hs`. Application imported into `web/`; 56 source files verified by SHA256. Source files remain unchanged.
- Root Git: `main` tracks `origin/main`; latest commit `0fa03c5` is the user's M2 commit. Remote `https://github.com/ItsMeSouhardya/medot-hs.git`, selected by the user. M3 remains uncommitted; agent execution has not pushed. Preserve the ignored nested `medot-hs/` clone and unrelated `.kilo/` files.
- Prototype: `D:\Personal Projects\medot\medot-base\medot-v0\web`. Its installed dependencies and lockfile exist. The source repository has no commits yet and has untracked `docs/` and `medot-v0/`; do not clean or reset it.
- Verified source versions: Next.js 16.3.6, React 19.2.8, Neon driver, Zod, qrcode, Vitest.
- The app retains pending provisioning, URL and QR output, independent readback activation, recent-tag recovery, revoke, English browser speech, expiry and unavailable states. M1 added Render configuration, `/api/live`, and clean-checkout type checking. M2 replaces password login with Clerk 7.9.10, an exact server user-ID allowlist, scoped operator provider/proxy and protected `/pharmacy` routes. M3 adds 17 catalog rows, readiness enforcement, stored English/Bengali/optional Hindi instructions, server creator metadata and typed dictionaries/fallback functions. ElevenLabs and patient language controls remain M4; complete pharmacy polish M5 and shared brand/homepage M6.

## Decisions

One Next.js app at `web/`, Neon retained, Render Node web service, Clerk free pharmacy authentication with a server-held allowlist, ElevenLabs `eleven_v3` initially for English/Bengali/Hindi. Manually reviewed instructions; no runtime translation. Existing `/m/[token]` and `/api/admin/...` contracts evolve in place. Native execution; eight commit milestones; full flow target by H10.

Node 24.18.1 remains pinned. M2 pins Clerk 7.9.10 without changing any existing package version; `dequal` only changes from a development/peer classification to runtime use. Render configuration selects Singapore/free and manual deployments. User authorized demo Neon reuse in ignored `web/.env.local`; local origin is `http://localhost:3000`. M2 removes obsolete password/session settings from local, example and blueprint configuration. Protected mutations compare against validated `APP_ORIGIN`; production requires HTTPS. No credentials appear in committed examples. Agent commit/push/deploy authorization has not been given.

Ruling: without Clerk credentials, return unauthenticated access and show a setup-unavailable sign-in screen; never use automatic keyless setup. This allows builds and public patient pages while failing closed on pharmacy records. Provider/proxy scope excludes `/m`, `/`, public APIs and health. Each protected server page and API still checks access independently. Layouts and proxy alone do not authorize records.

## Actual evidence

M3 checks on 2026-10-02: observed failing behavior tests for instruction validation, server creator mapping and form requirements/readiness before implementation. Final normal suite: 17 files / 72 passed, plus one opt-in integration file / six cases skipped. Lint (no warnings), type checking and production build exited 0. No dependency or framework versions changed in M3.

Live authorized demo Neon setup ran twice with 17 catalog rows both times: nine `DEMO_READY` fictional labels and eight `PACK_CHECK_REQUIRED` physical candidates. The original five medicine identities and existing active tag survived unchanged; legacy Bengali/Hindi/creator fields remain null rather than fabricated. Six separately enabled real database cases passed: readiness, exact multilingual/private creator persistence, atomic blocked insertion, domain creation without Hindi, missing-Bengali activation denial, and audio/budget schema availability. Temporary software-only pending fixtures were cleaned up; the before/after tag snapshot matched. No tag was activated or speech generated.

Final M3 production HTTP smoke: 19 checks passed with Clerk keys present, including public existing/unknown patient pages, database readiness, patient independence from Clerk, protected JSON 401, obsolete login 410 and compatible redirects/sign-in entry. No real signed-in session was exercised and no tags mutated. The initial protected request timed out/returned 500 because the test server bound `127.0.0.1` while requests used `localhost`; Clerk's internal rewrite looped between those hostnames. Matching the smoke server hostname to `localhost` resolved it without changing application code. Anonymous Clerk API/frontend connectivity probes succeeded. This is local production evidence, not a deployed/authenticated-provider gate.

Static server-rendered actual provisioning form checked in the browser at desktop and 360px mobile: no horizontal overflow, all eight blocked choices disabled, language fields correctly labelled/required, visible review control. This fixture bypassed no application auth route and exercised no API actions; the authenticated portal itself remains to be checked with a real allowed account. Temporary tab/server were closed. Command logs and fixture helpers remain ignored under `.superpowers/sdd/2026-10-01-medot-hs/`.

M2 checks on 2026-10-02: policy tests first failed on missing allowlist behavior, then passed; cutover tests first reproduced obsolete-cookie/login access, then passed. Final suite: 15 files / 55 tests passed. Lint (no warnings), type checking and production build exited 0. Installed Next docs call the matcher utility `unstable_doesProxyMatch`, but this version exports `unstable_doesMiddlewareMatch`; tests use the actual installed export. No framework upgrade.

Final M2 production HTTP smoke: 19 checks passed with Clerk keys absent, including public current/unknown patient pages, real Neon readiness, no patient Clerk loader, JSON 401 across catalog/provision/activate/revoke, obsolete password endpoint 410 without a cookie, legacy redirects including tag search, and pharmacy redirects to explicit unavailable sign-in. No tags mutated. Browser screenshot/AX check confirmed the unavailable page renders legibly. Full Clerk form, sign-in/out, authorized/outsider sessions and mobile navigation cannot yet be visually/provider verified. Secret-value scan found no configured server credentials in candidate repository files. Render YAML parsed with required Clerk settings and no obsolete auth settings.

Imported application checks on 2026-10-02: locked `npm ci` succeeded; `npm test` passed 11 files / 27 tests; lint, `next typegen && tsc --noEmit`, and production build exited 0. Framework versions remain Next 16.3.6 / React 19.2.8. Render YAML parsed and baseline fields verified; secret/dependency/build paths ignored and `.env.example` included. Final scan of 76 candidate repository files found no reused credential values; only root engine metadata changed in the package lock.

Live reused Neon setup ran twice: five medicines both times; the existing active tag and its status survived unchanged. Production server on loopback passed 15 HTTP checks: liveness/readiness, homepage, pharmacy login, correct existing patient medicine/strength, noindex, unknown-token safe state, unauthenticated denials, valid password session, cross-origin denials and invalid provision rejection. No tags were created, activated or revoked. Smoke server stopped afterward. The check initially used `127.0.0.1` as request origin, which Next normalized differently; using the configured `localhost` origin passed without an application change.

No Render deployment, real Clerk session, ElevenLabs call, physical NFC readback, phone speech or TalkBack test has been performed. HTTP results are local production evidence only. Hardware observations remain unrun in `docs/hardware-test-log.md`. Detailed command logs and import manifest are ignored under `.superpowers/sdd/2026-10-01-medot-hs/`.

RTK was blocked by Windows Application Control. Direct commands and context-mode were used. Hardware acceptance remains unrun. Source photo labels show expired Clopidogrel (02/2026), Atorvastatin (01/2026), and IMPRO-RED (10/2025); verify in hand and retain their warnings.

## Next action

M3 is ready for the user's milestone commit: `CONTEXT.md`, both READMEs, changed catalog/plan documents, `web/scripts/setup-db.mjs`, and changed/new source/tests under `web/`. Suggested message: `feat: add multilingual medicine catalog and provisioning data`. Nothing staged or committed by the agent. Secrets, dependencies, build output, local agent files, execution logs and nested clone remain ignored; `.env.example` remains includable.

Clerk publishable/secret keys are now present locally; the configured sign-in entry and signed-out denials passed. Follow [CLERK_SETUP.md](docs/CLERK_SETUP.md) for exact allowed user IDs, real sign-in/out and a separate unlisted account. These sessions remain untested. Do not paste secrets into chat.

The user explicitly said packs and Bengali/Hindi instructions have not been reviewed and should remain blocked. All eight pack candidates stay unavailable; all three prescription fixtures remain `DRAFT_REQUIRES_REVIEW` and are not offered as live presets. General ready entries are fictional labels, not verified physical packs. Setup preserves existing rows with `ON CONFLICT DO NOTHING`: seed edits do not update stored identity/readiness. Correct label identities by appending checked replacement IDs; readiness-only changes require an explicit verified update. Preserve actual printed batch/expiry.

New creation trims English/Bengali to 1–500 characters, requires both and validates nonempty supplied Hindi; form omits blank optional Hindi. SQL rechecks readiness at insertion and stored language readiness at activation. Creator comes only from server-verified Clerk context and stays out of public records. Dictionary key parity covers en/bn/hi; `selectInstruction` returns stored text verbatim and flags English fallback when a legacy translation is missing. Dictionaries are authored UI copy pending human language review. Legacy pending records lacking Bengali require replacement; active English-only records remain readable. Audio/cache tables exist but provider/cache logic remains M4.

Next implementation milestone is M4 on the user's request: patient controls/localization, fresh lookup, deterministic speech scripts, ElevenLabs/cache/budget and explicit browser fallback. ElevenLabs live checks require sponsor key and voice configuration; continue offline tests independently of credentials. Human teammate can review packs/languages and test Clerk accounts concurrently. Complete first hosting when publishing is authorized and Render account access is available: connect the selected repository, configure server environment, set actual HTTPS `APP_ORIGIN`, and verify deployed health/auth/current-token pages before writing tags. On a pre-existing service, explicitly remove obsolete auth keys/add new settings; blueprint changes do not populate secrets. Do not assume a service name determines its final URL.

## Session handoff fields

Current milestone: M3 code/data gate passed; human review remains blocked by explicit user instruction. M1/M2 local gates passed; real Clerk/deployed gates pending. Latest commit: `0fa03c5` (user's M2). M3 uncommitted. Blockers: verified packs/language drafts, real Clerk allowed/outsider sessions, Render connection/publishing authorization, physical NFC/TalkBack observations and ElevenLabs credentials. Next implementation: M4. Implementation elapsed time has not been measured reliably; do not treat milestone timeboxes as actual usage.
