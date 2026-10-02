# MEDOT

A tactile NFC clip that connects a medicine strip to an accessible, spoken record.

This is the hackathon execution workspace. The prototype is imported into `web/`; M1–M3 local code checks are verified. Render configuration is prepared; no public deployment has been made. Clerk keys are configured locally; real signed-in account checks remain pending.

Start with [the document index](docs/README.md), [working context](CONTEXT.md), and [the 22-hour implementation plan](docs/superpowers/plans/2026-10-01-medot-hs.md). Agent instructions are in [AGENTS.md](AGENTS.md).

The current app uses Next.js 16.3.6, React 19.2.8, Neon Postgres and Clerk 7.9.10. Pharmacy pages and APIs require a verified Clerk session and an authorized user ID. Provisioning now requires English and Bengali instructions, with optional Hindi. The 17-entry demo catalog contains nine fictional labels and eight blocked physical packs. Three prescription fixtures remain drafts awaiting language review. Existing English-only active tags remain readable. ElevenLabs, patient language controls and the modern visual design are planned next. NFC and QR resolve the same token URL; activation still follows independent physical readback.

Use Node 24.18.1. Follow [application setup](web/README.md) for environment configuration, database setup and local commands:

```powershell
npm --prefix .\web ci
npm --prefix .\web run dev
```

Open `http://localhost:3000`; pharmacy sign-in is `/sign-in` and the portal is `/pharmacy`. Follow [Clerk setup](docs/CLERK_SETUP.md). `/api/live` checks the process and `/api/health` checks database connectivity. Keep secrets in ignored environment files.

M3 verification: 72 tests passed, plus six separately enabled live database checks. Lint, type checking and production build passed. Database setup ran twice with 17 rows while preserving existing records; temporary pending test fixtures were cleaned up without activation. Nineteen local production HTTP checks passed with Clerk configured and no authenticated session. Real Clerk sign-in/out, pack/language review, hosted checks and hardware checks remain pending. See [working context](CONTEXT.md), [Render setup](docs/RENDER_RUNBOOK.md) and [deployment configuration](render.yaml).

At the final milestone, replace this planning README with the polished product README specified in [the release checklist](docs/QUALITY_AND_RELEASE.md). Include actual screenshots, setup, environment keys without values, architecture, Render instructions, sponsor integration, accessibility behavior, tests, and observed demo limitations.
