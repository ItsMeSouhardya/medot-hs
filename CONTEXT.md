# MEDOT working context

Updated: 2026-10-02, Asia/Calcutta. State: M1 local baseline verified; first Render deployment and hardware observations pending.

## Objective

Turn the existing MEDOT prototype into a polished hackathon demo in approximately 22 development hours. The event date is 2026-10-02. Use relative hours until its actual start time is supplied. Preserve the tactile clip -> NFC/QR -> accessible medicine record flow.

## Current checkout

- Destination: `D:\Personal Projects\medot\medot-hs`. Application imported into `web/`; 56 source files verified by SHA256. Source files remain unchanged.
- Root Git: `main` tracks `origin/main` at `45b9beb` (existing initial commit), remote `https://github.com/ItsMeSouhardya/medot-hs.git`, selected by the user. No M1 commit or push. Preserve the ignored nested `medot-hs/` clone and unrelated `.kilo/` files.
- Prototype: `D:\Personal Projects\medot\medot-base\medot-v0\web`. Its installed dependencies and lockfile exist. The source repository has no commits yet and has untracked `docs/` and `medot-v0/`; do not clean or reset it.
- Verified source versions: Next.js 16.3.6, React 19.2.8, Neon driver, Zod, qrcode, Vitest.
- Imported baseline has pending provisioning, password/cookie login, URL and QR output, independent readback activation, recent-tag recovery, revoke, English browser speech, expiry and unavailable states. M1 adds Render configuration, `/api/live`, and clean-checkout type checking. ElevenLabs, multilingual interface, modern landing page and managed authentication remain future milestones.

## Decisions

One Next.js app at `web/`, Neon retained, Render Node web service, Clerk free pharmacy authentication with a server-held allowlist, ElevenLabs `eleven_v3` initially for English/Bengali/Hindi. Manually reviewed instructions; no runtime translation. Existing `/m/[token]` and `/api/admin/...` contracts evolve in place. Native execution; eight commit milestones; full flow target by H10.

M1 uses Node 24.18.1, matching the actual installed runtime; dependencies and lockfile package versions remain unchanged. Render configuration selects Singapore/free and manual deployments. User authorized selective reuse of the prototype's demo Neon/password/session configuration in ignored `web/.env.local`; local origin is `http://localhost:3000`. No credentials appear in committed examples. Commit/push/deploy authorization has not been given.

## Actual evidence

Imported application checks on 2026-10-02: locked `npm ci` succeeded; `npm test` passed 11 files / 27 tests; lint, `next typegen && tsc --noEmit`, and production build exited 0. Framework versions remain Next 16.3.6 / React 19.2.8. Render YAML parsed and baseline fields verified; secret/dependency/build paths ignored and `.env.example` included. Final scan of 76 candidate repository files found no reused credential values; only root engine metadata changed in the package lock.

Live reused Neon setup ran twice: five medicines both times; the existing active tag and its status survived unchanged. Production server on loopback passed 15 HTTP checks: liveness/readiness, homepage, pharmacy login, correct existing patient medicine/strength, noindex, unknown-token safe state, unauthenticated denials, valid password session, cross-origin denials and invalid provision rejection. No tags were created, activated or revoked. Smoke server stopped afterward. The check initially used `127.0.0.1` as request origin, which Next normalized differently; using the configured `localhost` origin passed without an application change.

No Render deployment, Clerk session, ElevenLabs call, physical NFC readback, phone speech or TalkBack test has been performed. HTTP results are local production evidence only. Hardware observations remain unrun in `docs/hardware-test-log.md`. Detailed command logs and import manifest are ignored under `.superpowers/sdd/2026-10-01-medot-hs/`.

RTK was blocked by Windows Application Control. Direct commands and context-mode were used. Hardware acceptance remains unrun. Source photo labels show expired Clopidogrel (02/2026), Atorvastatin (01/2026), and IMPRO-RED (10/2025); verify in hand and retain their warnings.

## Next action

M1 local work is ready for the user's commit: `.gitignore`, `.node-version`, `AGENTS.md`, `CONTEXT.md`, `README.md`, `docs/`, `render.yaml`, `web/`. At the user's request, the root ignore file also excludes local `.kilo/` agent files, Playwright artifacts and OS/editor scratch files. Secrets, dependencies, build output, execution logs and the nested clone remain ignored; `.env.example` remains includable. Suggested message: `chore: establish medot hackathon workspace and render baseline`.

Complete first hosting when publishing is authorized and Render account access is available: commit/push the tested baseline, connect the selected repository, configure server environment in Render, set actual HTTPS `APP_ORIGIN`, and verify deployed health/login/current-token pages before writing tags. Do not assume the requested service name determines its final URL. M2 can proceed locally on a subsequent request; obtain a Clerk application/allowlist and ElevenLabs sponsor access in parallel through the teammate.

## Session handoff fields

Current milestone: M1 local gate passed, external deploy/hardware steps pending. Completed milestones: no fully deployed milestone claimed. Latest local base commit: `45b9beb`; no application milestone commit. Blockers: Render account connection and publishing authorization; physical hardware/pack observations; future Clerk/ElevenLabs credentials. Next check: deployed liveness/readiness and current tag on the stable origin. Implementation elapsed time has not been measured reliably; do not treat the 1.5-hour timebox as actual usage.
