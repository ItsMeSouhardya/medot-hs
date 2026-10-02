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

Setup creates the base tables and seeds five demo labels idempotently, preserving existing rows. `/api/live` checks process liveness. `/api/health` checks database readiness and returns 503 when unavailable. Liveness does not prove database connectivity.

Run checks from the workspace root:

```powershell
npm --prefix .\web test
npm --prefix .\web run lint
npm --prefix .\web run typecheck
npm --prefix .\web run build
```

`typecheck` generates Next route types before TypeScript, so it works before the first production build. Run `npm --prefix .\web start` for the production server. Production mutations require an HTTPS `APP_ORIGIN`; use the development server for local HTTP provisioning. The [root Render blueprint](../render.yaml) configures hosting; follow the [Render runbook](../docs/RENDER_RUNBOOK.md). Publishable Clerk key changes require a rebuild.

Keep `APP_ORIGIN` at the final stable HTTPS origin before writing physical tags. QR and NFC use the exact same returned URL. The inherited pending -> independent readback -> activate flow is preserved.
