# MEDOT

A tactile NFC clip that connects a medicine strip to an accessible, spoken record.

This is the hackathon execution workspace. The prototype is imported into `web/` and its M1 local baseline is verified. Render configuration is prepared; no public deployment has been made.

Start with [the document index](docs/README.md), [working context](CONTEXT.md), and [the 22-hour implementation plan](docs/superpowers/plans/2026-10-01-medot-hs.md). Agent instructions are in [AGENTS.md](AGENTS.md).

The current app uses Next.js 16.3.6, React 19.2.8 and Neon Postgres. It includes password-protected pharmacy provisioning, independent readback activation, QR output, revocation, and a public patient page with English browser speech. Clerk sign-in, ElevenLabs, multilingual accessibility and the modern visual design are planned next. NFC and QR resolve the same token URL.

Use Node 24.18.1. Follow [application setup](web/README.md) for environment configuration, database setup and local commands:

```powershell
npm --prefix .\web ci
npm --prefix .\web run dev
```

Open `http://localhost:3000`; the baseline pharmacy portal is `/admin`. `/api/live` checks the process and `/api/health` checks database connectivity. Keep secrets in ignored environment files.

M1 verification: 27 tests passed, lint/type checking/production build passed, live Neon setup was idempotent, and 15 local production HTTP checks passed. Hardware and hosted checks remain pending. See [Render setup](docs/RENDER_RUNBOOK.md) and [deployment configuration](render.yaml).

At the final milestone, replace this planning README with the polished product README specified in [the release checklist](docs/QUALITY_AND_RELEASE.md). Include actual screenshots, setup, environment keys without values, architecture, Render instructions, sponsor integration, accessibility behavior, tests, and observed demo limitations.
