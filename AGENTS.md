# MEDOT execution instructions

@C:\Users\LENOVO\.codex\RTK.md

## Start and resume

Read `CONTEXT.md`, then `docs/README.md`, then the current milestone in `docs/superpowers/plans/2026-10-01-medot-hs.md`. Read the linked design and the relevant reference document before changing that subsystem. Update `CONTEXT.md` after each milestone and before ending a working session: completed work, actual checks, blockers, next action, and commit.

This checkout is `D:\Personal Projects\medot\medot-hs`. The source prototype is `..\medot-base\medot-v0\web`. The application will live in `web/` here. Preserve the source prototype; import its app at M1 with its lockfile and generated Next.js agent guidance, excluding dependencies, build output, Git metadata, and secret environment files. This planning turn authorizes documents only; application execution begins on the user's subsequent implementation request.

## Delivery rules

- The latest user request and this project's accepted documents take precedence over generic skill workflows. The user requested the full planning package together and a 22-hour implementation without a feature-by-feature approval or review cycle.
- Default to native execution: one coding agent owns the application and shared interfaces. The second human teammate handles hardware, pack verification, language checks, and rehearsal. Do not introduce mandatory per-task reviewer agents. Perform the release integration review and required checks.
- Use eight tested commit milestones in the plan. The user intends to commit 6–8 times; do not make a separate commit for each checkbox. If instructed to commit, stage named paths and preserve unrelated work. Do not push or publish without authorization.
- Before writing Next.js code, read relevant installed guides under `web/node_modules/next/dist/docs/`, as required by the imported app's `web/AGENTS.md`. Preserve Next.js 16.3.6 and React 19.2.8 initially; pin newly installed compatible dependencies in the lockfile.
- Keep the app a single Next.js App Router service with Neon Postgres. Hosting is Render. Existing `/m/[token]` URLs remain stable. Keep the existing domain/repository seams and lifecycle; avoid a Prisma, SQLite, or backend rewrite.
- English and Bengali text and audio are required. Include Hindi controls and reviewed Hindi fixtures; Hindi completion is a lower priority than English/Bengali. ElevenLabs is the primary voice provider, Web Speech is the explicit fallback. Patient pages require no sign-in.
- Preserve `PENDING -> ACTIVE -> REVOKED`, independent physical readback before activation, 22-character random tokens, exact NFC/QR URL equality, and month-end expiry in Asia/Kolkata. Corrections issue a new token and revoke the old one.
- Use icons with accessible text labels. Do not use emojis in the UI, logo, docs, README, or demo materials. Follow the design reference for typography and patient interaction.
- Store only demo medicine/strip instructions. No patient identifiers, invented doses, treatment recommendations, automatic prescription translation, or claims of medicine authenticity. Verify uncertain pack details before provisioning; keep actual printed expiry values.
- Keep secrets server-side. Check pharmacy authorization at every protected read/mutation and same-origin requests on mutations. Public speech accepts token and language only, never arbitrary client-supplied text or voice IDs.
- Test behavior that could identify the wrong strip, expose protected records, serve stale/revoked audio, lose records, or fail speech/accessibility. Use existing Vitest tests and bounded integration tests. Visual/CSS edits need visual checks rather than implementation-mirroring tests.
- A milestone is complete only with its stated evidence. A provider mock is not a live provider check; a build is not a deployment; software tests are not physical NFC or TalkBack evidence. Run tests, lint, type checking, and production build at release.

## Commands and environment

Use RTK when executable. On 2026-10-01 Windows Application Control blocked `rtk.exe`; direct commands were used after reporting that limitation. If the block persists, record it and use the underlying command without trying to bypass Windows policy. Use context-mode for substantial command output when available. Keep credentials and full connection strings out of logs.

Ask only for missing credentials, external permissions, or a scope choice that blocks progress. Continue independent work while waiting. If time is tight, remove only optional items in `docs/FEATURES.md`; keep the required medicine flow, multilingual accessibility, authentication, and tests.
