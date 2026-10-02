# Planning document index

Read only the references relevant to the task after loading `CONTEXT.md` and the current execution milestone.

| Document | Read when | Authority |
|---|---|---|
| [Product design](superpowers/specs/2026-10-01-medot-hs-design.md) | Starting execution or checking scope | Product requirements and chosen approach |
| [Execution plan](superpowers/plans/2026-10-01-medot-hs.md) | Implementing or resuming | Ordered tasks, files, interfaces, 22-hour schedule, eight commits |
| [Base audit](BASE_AUDIT.md) | Importing or diagnosing a regression | Observed prototype behavior and baseline evidence |
| [Architecture](ARCHITECTURE.md) | Changing database, auth, APIs, or speech services | Proposed data and service contracts |
| [Clerk setup](CLERK_SETUP.md) | Configuring M2 accounts or checking live sign-in | Environment, allowlist, local and Render checks |
| [Design system and UX](DESIGN_AND_UX.md) | Building homepage, pharmacy, patient, or brand assets | Layout, visual direction, copy, interactions |
| [Speech and languages](SPEECH_AND_LANGUAGES.md) | Building multilingual text or audio | Provider, translation, playback, cache and fallback rules |
| [Render runbook](RENDER_RUNBOOK.md) | Configuring or deploying environments | Setup, secrets, health, stable URL, rollback |
| [Demo catalog and script](DEMO_CATALOG.md) | Seeding or rehearsing | Pack candidates, fictional prescriptions, real-expiry constraints |
| [Quality and release](QUALITY_AND_RELEASE.md) | Verifying milestones and releasing | Automated/manual gates and final README contract |
| [M7 integration evidence](M7_RELEASE_CHECKS.md) | Reproducing current integration checks or first Render setup | Observed local evidence, safety fixes and pending external gates |
| [Optional features](FEATURES.md) | Considering additions or reducing scope | Ranked extras and time boundaries |
| [Decision record](DECISIONS.md) | A proposal conflicts with this plan | Why the choices were made and unresolved external facts |

The dated spec, plan, and references describe intended implementation. `BASE_AUDIT.md` and `CONTEXT.md` distinguish observations from proposals. Checkbox completion is updated only after work and verification.

Current handoff: M7 local integration checks and fresh browser-speech safety fixes passed. The user chose to keep M4 pending; no Render service exists yet. M7 live/deployed/device gates remain open. See `CONTEXT.md` and the M7 evidence document for exact checks and blockers.
