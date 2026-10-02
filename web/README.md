# MEDOT web app

The imported Next.js app lives here. Next.js 16.3.6 and React 19.2.8 are retained. Use Node.js 24.x; the root `.node-version` pins the verified local runtime.

From the workspace root:

```powershell
npm --prefix .\web ci
npm --prefix .\web run dev
```

Open [http://localhost:3000](http://localhost:3000). Pharmacy sign-in is `/sign-in`, overview `/pharmacy`, provisioning `/pharmacy/provision`, and recovery `/pharmacy/tags`. Old `/admin` URLs redirect. Follow [Clerk setup](../docs/CLERK_SETUP.md) to configure accounts and authorize their exact user IDs.

Configure `web/.env.local` using the key names in [`.env.example`](.env.example). Set `DATABASE_URL`, `APP_ORIGIN`, the Clerk publishable/secret keys, and `PHARMACY_ALLOWED_USER_IDS`. Keep credentials out of Git. An empty allowlist denies all signed-in users; missing Clerk keys leave pharmacy access unavailable. Patient pages remain public. Use a demo Neon database; the app does not store patient identifiers.

The old password login endpoint returns 410 and its cookies grant no access. Remove obsolete `ADMIN_PASSWORD` and `SESSION_SECRET` settings. Clerk setup and real sign-in/out still require your application credentials; mock tests do not prove a live login.

```powershell
npm --prefix .\web run db:setup
```

Setup performs an atomic additive migration and seeds 17 demo catalog rows idempotently, preserving existing identities, instructions and tag states. It adds nullable Bengali/Hindi instructions and creator metadata for legacy tags, plus persistent audio/budget tables for M4. Nine generic labels are ready for fictional samples; eight physical pack candidates remain blocked pending verification. Existing rows use `ON CONFLICT (id) DO NOTHING`, so seed edits do not overwrite stored metadata/readiness. See [catalog review rules](../docs/DEMO_CATALOG.md).

New records require reviewed English and Bengali instructions of 1–500 trimmed characters; Hindi is optional but must be nonempty when supplied. Creator IDs come from the verified server session. Legacy English-only active records remain readable; legacy pending records without Bengali cannot activate. Draft prescription fixtures are not seeded or offered as live presets. Patient language controls and ElevenLabs arrive in M4.

`/api/live` checks process liveness. `/api/health` checks database readiness and returns 503 when unavailable. Liveness does not prove database connectivity.

Run checks from the workspace root:

```powershell
npm --prefix .\web test
npm --prefix .\web run lint
npm --prefix .\web run typecheck
npm --prefix .\web run build
```

`typecheck` generates Next route types before TypeScript, so it works before the first production build. Run `npm --prefix .\web start` for the production server. Production mutations require an HTTPS `APP_ORIGIN`; use the development server for local HTTP provisioning. The [root Render blueprint](../render.yaml) configures hosting; follow the [Render runbook](../docs/RENDER_RUNBOOK.md). Publishable Clerk key changes require a rebuild.

The normal test suite skips seven database integration cases. Run them only against the configured disposable demo database after setup:

```powershell
Push-Location .\web
$env:MEDOT_RUN_DB_TESTS = '1'
try { npx vitest run tests/integration/m3-database.test.ts } finally {
  Remove-Item Env:MEDOT_RUN_DB_TESTS -ErrorAction SilentlyContinue
  Pop-Location
}
```

These tests insert temporary software-only pending records and delete only their own pending fixtures. They never activate a tag or call a voice provider. Real authenticated sessions, hosted behavior and physical readback require separate checks.

Keep `APP_ORIGIN` at the final stable HTTPS origin before writing physical tags. QR and NFC use the exact same returned URL. The inherited pending -> independent readback -> activate flow is preserved.

M5 pharmacy flow: search/select a ready fictional label, enter actual printed batch/expiry and reviewed instructions, review every field, then check the physical-confirmation box. Creation saves a pending record before writing. Copy/write its exact URL, independently retap and compare the token ending, scan the QR for the same URL, then attest readback and activate. `POST /api/admin/tags/[token]/activate` now requires JSON `{ "verified": true }`; missing/false/nonboolean confirmation returns 400, state/readiness conflicts return 409. Every mutation still checks the Clerk allowlist and origin first.

Recent tags show the latest 50 rows; full URL/token search finds older records and displays saved language variants. Incomplete legacy pending records cannot activate; replace them with reviewed new tokens. Conflicts and network uncertainty offer a fresh saved-state request. Check Recent tags before repeating a creation whose response was lost. Revocation is terminal and asks for confirmation; corrections issue a new token.

Drafts stay only in component memory. After a 401, sign in in a new tab and return to retry; reloading or closing the draft tab discards unsaved fields. All supplied prescription presets are still drafts and disabled. After human review, explicitly mark the correct fixture `REVIEWED` and use only a verified ready catalog identity; never generate or translate instructions automatically. English edits clear translated fields for renewed review. Pharmacy styling is scoped; M6 supplies the shared logo and bundled fonts.

M7 validates the current public record before every English browser read using `GET /api/public/tags/[token]` with `no-store`. Inactive/unavailable results never speak page-load text. Stop, timeout, navigation and page hide cancel work; Stop returns focus to Read. The displayed record remains the page-load snapshot until reload; M4 will supply the full fresh-state/localized patient interface and ElevenLabs.

After a production build, run `node web/scripts/m7-production-smoke.mjs` from the repository root for the read-only 29-check local smoke, including a server restart and unchanged Neon record comparison. It starts/stops its own localhost server on port 3110 and does not provision or mutate tags. [M7 evidence](../docs/M7_RELEASE_CHECKS.md) includes fixture reproduction, first Render setup and the remaining release gates.
