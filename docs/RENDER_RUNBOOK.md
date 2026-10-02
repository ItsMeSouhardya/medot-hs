# Render deployment and setup runbook

Run this during M1 and revisit at every deploy. On 2026-10-02, the local baseline and root `render.yaml` were verified. No Render service or public deployment has been created. The user authorized reusing the existing demo Neon configuration and selected `https://github.com/ItsMeSouhardya/medot-hs.git` as the repository; root `main` tracks its existing initial commit. No push has occurred.

## Preflight

- Confirm access to GitHub/Render, a dedicated demo Neon database, a Clerk application and the ElevenLabs sponsor account. Supply keys through ignored local environment files or the hosting dashboard, not committed documents/chat logs.
- Confirm the actual hackathon rules for prebuilt code and hardware; preserve the base provenance and disclose it where the event requires. Prepare the physical tag and phone independently while coding.
- Choose the stable Render service URL before writing MEDOT tags. Every existing tag points to that origin; keep the service name/domain through the event.

## Render service

Deploy this full Next.js app as a **Node web service**, not a static export. Retain Neon as the database. [Render Next.js deployment](https://render.com/docs/deploy-nextjs-app).

| Setting | Value |
|---|---|
| Repository root | `medot-hs` Git repository |
| Root directory | `web` |
| Runtime | Node |
| Build | `npm ci --no-audit --no-fund && npm run build` |
| Start | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Health path | `/api/live` |
| Node version | `NODE_VERSION=24.18.1`, matching the verified M1 runtime |
| Region | Singapore in the prepared blueprint; measure actual response after deploying |
| Instance | Free for the hackathon unless the user chooses otherwise |

The root `render.yaml` has `rootDir: web`, runtime node, build/start/health settings and secret env entries using `sync: false`. Automatic deployments are off; deploy each tested milestone manually. Set Node explicitly rather than relying on Render's changing default. [Node version configuration](https://render.com/docs/node-version), [Blueprint specification](https://render.com/docs/blueprint-spec).

M1's blueprint includes only database/origin and temporary password/session settings. Add Clerk and ElevenLabs entries at their milestones. New `sync: false` entries require manual dashboard configuration on an existing service; verify the actual environment before deploying.

## Environment matrix

| Variable | Exposure | Value source / purpose |
|---|---|---|
| `DATABASE_URL` | Server secret | Dedicated Neon connection with TLS |
| `APP_ORIGIN` | Server configuration | `http://localhost:3000` locally; exact Render HTTPS origin deployed |
| `NODE_VERSION` | Build configuration | Pinned runtime |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public by design | Clerk instance publishable key, available at build time |
| `CLERK_SECRET_KEY` | Server secret | Same Clerk instance as publishable key |
| `PHARMACY_ALLOWED_USER_IDS` | Server configuration | Comma-separated authorized Clerk user IDs; empty denies all |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public configuration | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Public configuration | `/pharmacy` |
| `ELEVENLABS_API_KEY` | Server secret | Sponsor key with TTS permissions/credits |
| `ELEVENLABS_MODEL_ID` | Server configuration | Initially `eleven_v3` |
| `ELEVENLABS_VOICE_ID_EN/BN/HI` | Server configuration | Tested voice IDs; omit Hindi only if visibly unavailable |
| `ELEVENLABS_MAX_GENERATIONS_PER_DAY` | Server configuration | `100` initial demo call-attempt cap |
| `DEMO_PUBLIC_TOKEN` | Server configuration | Actual activated fictional sample token for homepage demo, optional until created |

M1 temporarily uses the imported `ADMIN_PASSWORD` and `SESSION_SECRET` for the base smoke flow. Remove them and disable the password login route at Clerk cutover. Never configure `NEXT_PUBLIC_DATABASE_URL` or expose the ElevenLabs/Clerk secret keys.

`web/.env.example` includes the milestone variable names and non-secret defaults. Keep `.env.local` and all real environment files ignored. M1 reused only the user-authorized demo database/password/session values and set the local origin explicitly; the source environment file was preserved. Never copy extra source secrets automatically. Changes to `NEXT_PUBLIC_*` values require a rebuild.

## Authentication setup

Enable email/password in a free Clerk application. Create the two teammate accounts beforehand through Clerk, record only their IDs in the allowlist, and test sign-in/sign-out. Leave public self-registration out of the UI. A third signed-in account must be denied pharmacy access.

For a shared `onrender.com` hackathon URL, use and label the Clerk development instance if production domain/DNS setup is unavailable. Production Clerk instances have domain/DNS requirements; use production keys only once that configuration is complete. Do not spend the event inventing a DNS workaround. Patient pages must remain accessible even if pharmacy sign-in is unavailable. [Clerk environments](https://clerk.com/docs/guides/development/managing-environments), [production setup](https://clerk.com/docs/guides/development/deployment/production).

## Migration and first deploy sequence

1. Import the app, preserve lockfile and run `npm ci` in `web/`. Initialize Git if absent; the first commit includes planning and imported source.
2. Add `/api/live`, Render configuration and example env. Install no new product stack yet. Run imported tests/lint/build.
3. Set the demo environment locally. Run `npm run db:setup` from `web/` against the dedicated Neon target. Do not run migrations in a public request handler or every server startup.
4. Create/connect the Render service when deployment is authorized. Record its actual URL, set `APP_ORIGIN` to it, build and deploy. Check `/api/live` then `/api/health` (DB readiness).
5. Before real tags, create one fictional record, independently write/read/activate and check NFC/QR equality. Follow the inherited basic login until M2 cutover.
6. At M3, rerun the additive setup twice; confirm existing records survive and seed count is stable. For free Render, run setup from the configured local machine/CI against Neon: do not depend on a paid pre-deploy command, shell access, or one-off job. [Deployment behavior](https://render.com/docs/deploys).
7. After Clerk cutover and speech integration, rerun authorized/unauthorized/public checks on the actual deployed origin. Before judging, verify persistence after a subsequent successful deploy.

## Event operations and rollback

Free Render instances can spin down after 15 idle minutes and may take about a minute to resume. Their filesystem is ephemeral. Store records/audio in Neon; manually open the app shortly before judging and rehearse once warm. Record cold-start and warm-load behavior separately. Do not promise instant first-use speech or offline operation. [Free service limitations](https://render.com/docs/free).

At H19, freeze new features and deploy the final tested commit. Subsequent changes are fixes only. Record last green commit, deployment URL and schema version in `CONTEXT.md`. If a new build fails, keep the previous healthy deployment. If it deploys but regresses, roll back to the last tested compatible version through Render; additive DB columns remain. Do not restore the source Vercel setup or wipe the database as a rollback.

Recheck health, both tag URLs, language speech and revoke behavior after rollback. An `APP_ORIGIN` change requires rewriting tags and their QR labels; verify them again before activation. If provider credits fail, announce the browser fallback. If the service cannot resolve a current record, use a clearly identified demo recording/slide to explain the intended flow and report the live failure honestly.
