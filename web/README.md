# MEDOT web app

The imported Next.js app lives here. Next.js 16.3.6 and React 19.2.8 are retained. Use Node.js 24.x; the root `.node-version` pins the verified local runtime.

From the workspace root:

```powershell
npm --prefix .\web ci
npm --prefix .\web run dev
```

Open [http://localhost:3000](http://localhost:3000). For M1, `/admin` uses the temporary operator password. Managed pharmacy sign-in and the new interface arrive in later milestones.

Configure `web/.env.local` using the key names in [`.env.example`](.env.example). M1 needs `DATABASE_URL`, `APP_ORIGIN`, `ADMIN_PASSWORD`, and a `SESSION_SECRET` of at least 32 unpredictable characters. Keep credentials out of Git. Use a demo Neon database; the app does not store patient identifiers.

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

`typecheck` generates Next route types before TypeScript, so it works before the first production build. Run `npm --prefix .\web start` for the production server. The [root Render blueprint](../render.yaml) configures hosting; follow the [Render runbook](../docs/RENDER_RUNBOOK.md).

Keep `APP_ORIGIN` at the final stable HTTPS origin before writing physical tags. QR and NFC use the exact same returned URL. The inherited pending -> independent readback -> activate flow is preserved.
