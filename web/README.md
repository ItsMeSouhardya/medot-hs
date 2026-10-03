# MEDOT application

See [the project README](../README.md) for complete setup, environment, architecture, privacy, hosting, free scheduler and release instructions. Internal plans and evidence are local and excluded from Git.

From this directory, after configuring ignored `.env.local`:

```powershell
npm ci --no-audit --no-fund
npm run db:setup
npm run config:check -- --live
npm run dev
```

Use Node 24.18.1 and preserve Next.js 16.3.6, React 19.2.8 and the lockfile.

Release commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run release:smoke`. Explicit demo database fixtures use `MEDOT_RELEASE_DEMO_DB=1` with `npm run release:db` (PowerShell syntax in the root README). Production configuration checks use `npm run config:check -- --production --live`; speech checks use `npm run speech:check -- --synthesize`; fixed cue checks use `npm run cues:check`.
