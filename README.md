# MEDOT

A tactile NFC clip that connects a medicine strip to an accessible, spoken record.

This is the hackathon execution workspace. The prototype is imported into `web/`; M1–M3, M5 and M6 local code checks are verified. M4 patient localization and ElevenLabs remain unimplemented. Render configuration is prepared; no public deployment has been made. Clerk keys are configured locally; real signed-in account checks remain pending.

Start with [the document index](docs/README.md), [working context](CONTEXT.md), and [the 22-hour implementation plan](docs/superpowers/plans/2026-10-01-medot-hs.md). Agent instructions are in [AGENTS.md](AGENTS.md).

The current app uses Next.js 16.3.6, React 19.2.8, Neon Postgres and Clerk 7.9.10. Pharmacy pages and APIs require a verified Clerk session and an authorized user ID. Provisioning now requires English and Bengali instructions, with optional Hindi. The 17-entry demo catalog contains nine fictional labels and eight blocked physical packs. Three prescription fixtures remain drafts awaiting language review. Existing English-only active tags remain readable. ElevenLabs and patient language controls are planned next. NFC and QR resolve the same token URL; activation still follows independent physical readback.

M5 adds a responsive pharmacy dashboard with actual tag totals, searchable catalog, explicit physical review, guarded demo presets, draft preservation during reauthentication and saved-record recovery. QR labels can be downloaded/printed; Web NFC capability and NFC Tools instructions are visible. Activation requires an explicit readback attestation, and revocation is confirmed and terminal. Unverified packs and prescription drafts remain unavailable.

M6 adds the original clip-and-dot brand, locally hosted licensed fonts, responsive homepage, keyboard navigation, multilingual interface preview and native FAQ. The preview contains no prescription and plays no audio. To link a real demo, set `DEMO_PUBLIC_TOKEN` to an explicitly fictional active sample; the homepage checks its current status and otherwise opens the illustration. [Font sources and licenses](web/public/fonts/README.md) ship with the assets. Regenerate logo exports with `node web/scripts/generate-brand-assets.mjs`. Native 200% zoom, real pharmacy-session visuals and device accessibility checks remain manual release checks.

Use Node 24.18.1. Follow [application setup](web/README.md) for environment configuration, database setup and local commands:

```powershell
npm --prefix .\web ci
npm --prefix .\web run dev
```

Open `http://localhost:3000`; pharmacy sign-in is `/sign-in` and the portal is `/pharmacy`. Follow [Clerk setup](docs/CLERK_SETUP.md). `/api/live` checks the process and `/api/health` checks database connectivity. Keep secrets in ignored environment files.

M5 verification: 95 tests passed, plus seven separately enabled live database checks. Lint, type checking and production build passed. Existing records remained unchanged; temporary pending fixtures were cleaned up without activation. Nineteen local production HTTP checks passed with Clerk configured and no authenticated session. Static pharmacy visual fixtures were checked at desktop, tablet and mobile widths. Real Clerk sign-in/out, pack/language review, hosted checks and hardware checks remain pending. See [working context](CONTEXT.md), [Render setup](docs/RENDER_RUNBOOK.md) and [deployment configuration](render.yaml).

At the final milestone, replace this planning README with the polished product README specified in [the release checklist](docs/QUALITY_AND_RELEASE.md). Include actual screenshots, setup, environment keys without values, architecture, Render instructions, sponsor integration, accessibility behavior, tests, and observed demo limitations.
