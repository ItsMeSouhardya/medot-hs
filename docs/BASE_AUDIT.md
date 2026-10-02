# Source prototype audit

Inspected 2026-10-01. Source: `../medot-base/medot-v0/web`. Destination was empty. No application code was changed or copied during planning.

## What already exists

| Capability | Evidence in source | Status |
|---|---|---|
| One full-stack Next.js app | `package.json`, `src/app/`, `next.config.ts` | Next.js 16.3.6 / React 19.2.8 installed |
| Durable database adapter | `src/lib/db.ts`, `scripts/setup-db.mjs` | Neon SQL; live connection not tested here |
| Five demo medicines | `scripts/setup-db.mjs` | Metformin, amlodipine, atorvastatin, pantoprazole, paracetamol |
| Validation and token URL | `src/lib/domain.ts` | Zod, 16 random bytes, 22-character base64url, HTTPS origin validation |
| Pending provisioning | `src/lib/provision.ts`, `src/components/provision-form.tsx` | Physical strip review before create; collision retry |
| Authentication | `src/lib/admin-auth.ts`, `/admin`, `/api/admin/login` | Shared demo password, signed eight-hour HttpOnly cookie |
| Protected mutations | `/api/admin/tags`, activate, revoke routes | Cookie authorization and same-origin checks |
| Tag lifecycle | `src/lib/tag-lifecycle.ts`, `tag-repository.ts` | Conditional pending activation and permanent revoke |
| Tag recovery | `src/lib/operator-tags.ts`, `/admin/tags` | Latest 50 records, lookup by full URL or token |
| NFC and QR | `tag-writer.tsx`, `qr-code.tsx` | One returned URL; Web NFC or writing-app fallback |
| Independent verification | `tag-writer.tsx`, patient pending state | Compare final six token characters, then activate |
| Patient access | `/m/[token]/page.tsx` | Active identity, batch, expiry, instruction; no login |
| Safe unavailable states | Same page and resolver | Unknown/pending/revoked/DB failure hide medicine identity |
| Expiry rule | `expiryState()` | Current through printed month end in Asia/Kolkata |
| Speech | `speech-text.ts`, `read-aloud.tsx` | English Web Speech on explicit button; expired warning first |
| Basic accessible markup | Patient and operator pages | Semantic text, labels and status messages; phone QA unrun |
| Health | `/api/health` | Database `SELECT 1`; 503 on failure |

## Missing or incomplete for the new request

ElevenLabs and durable audio caching; reviewed Bengali and Hindi content; language controls; managed pharmacy sign-in and logout; a polished landing page; logo and favicon family; pharmacy dashboard/search and refined stepper; a calmer but richer patient layout; Render deployment configuration; expanded demo medicine catalog; end-to-end browser/phone evidence; final product README.

The base docs still describe Neon/Vercel. The older chat proposed Prisma/SQLite; the implemented base instead uses Neon and tagged SQL. Preserve the working implementation and replace deployment instructions in the new workspace. No reason to reinstall a new app or switch ORM.

## Checks actually performed

From the source app: `npm test` -> 11 files, 27 tests passed; `npm run lint` -> exit 0; `npm run build` -> exit 0 with TypeScript and all listed routes generated. The source contains `node_modules`, `package-lock.json`, `.env.example`, and `.env.local`. Secret environment values were not inspected. The test named `db-smoke.test.ts` checks missing configuration; it is not a live database test.

These checks do not prove live DB provisioning, production sign-in, physical readback, Bengali/Hindi voice quality, or deployed availability. The hardware log explicitly says not run. Source Git reports no commits yet; preserve its existing untracked files.

## Referenced conversation limits

[Medot · All In One Plan](chatgpt-conversation://6abd8e57-bf0c-83ee-9c33-baf1e2356ab8) was read through the chat tool, including the 26-hour plan, procurement context, demo prescriptions and three attached medicine images. That fork exposes five turns; the long plan is tool-truncated after the start of section 32. Earlier ancestral idea discussion is not present. This package uses all retrieved requirements plus the actual base spec; it does not claim to recover missing text. The retrieved original must-have list is fully mapped in the new spec. Original stretch features remain stretch except languages and pharmacy login, which the user explicitly promoted.
