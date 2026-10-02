# Clerk setup for M2

The application uses Clerk for pharmacy sign-in and a server-side list of authorized user IDs. Patient `/m/[token]` pages need no account. Until Clerk keys are configured, pharmacy requests fail closed and the sign-in page explains that setup is unavailable. The application does not create a temporary Clerk account automatically.

## Create the demo application

1. Open the [Clerk dashboard](https://dashboard.clerk.com), sign in, and create an application named MEDOT. Use its development instance for local testing.
2. Enable email/password sign-in in the application settings. Restrict sign-up to invited or pre-created accounts; the MEDOT UI does not show a registration entry point.
3. In Users, create or invite your account and your teammate's account. Copy each Clerk user ID, such as `user_...`. The app checks IDs, not email addresses or client-side roles.
4. In API keys, copy the publishable key and secret key from the same instance. Keep the secret key out of chat, screenshots, logs and Git.
5. Edit the existing ignored `web/.env.local`. Keep its current demo `DATABASE_URL` and local `APP_ORIGIN`. Add the following names with your actual values:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
PHARMACY_ALLOWED_USER_IDS=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/pharmacy
```

`PHARMACY_ALLOWED_USER_IDS` is a comma-separated list of the two exact IDs, without quotes around individual IDs. An empty list grants nobody access. `ADMIN_PASSWORD` and `SESSION_SECRET` are obsolete after M2; remove them. The old password cookie is ignored, and POST `/api/admin/login` returns 410.

Restart `npm --prefix .\web run dev` after changing local configuration. Open `http://localhost:3000/sign-in`; a successful sign-in returns to `/pharmacy`. Provisioning is at `/pharmacy/provision`, recovery/revocation at `/pharmacy/tags`. Sign out is available in the pharmacy navigation. Provider errors grant no access.

Clerk's official [Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart) and [SignIn component reference](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in) describe the SDK and account options. M2 pins `@clerk/nextjs` 7.9.10, compatible with the preserved Next/React versions. The provider and proxy are scoped to pharmacy/sign-in/admin API routes.

## Verify real accounts

Use actual sessions; unit-test mocks do not prove provider connectivity.

1. Sign in as an allowed teammate. Open overview, provisioning and recent tags; verify the catalog loads.
2. Sign out. Pharmacy pages should lead to sign-in. Admin catalog/mutation requests should return JSON 401.
3. With a separate demo account omitted from the allowlist, sign in and check the access-required screen. The catalog, provision, activate and revoke APIs must return JSON 403. Sign out from that screen, then use an authorized account.
4. Open the existing patient token while signed out. Its record should remain public and the URL unchanged.
5. Check that the old `/admin` links redirect to the new routes and that the old password login cannot issue a cookie.

Do not activate guessed physical pack records for an authentication test. The software suite verifies authorized service entry with mocked repositories; real tag activation still requires independent physical readback.

## Render

Add the Clerk keys and allowlist in the Render environment dashboard. The publishable key must exist at build time; changing it requires rebuilding. Set `APP_ORIGIN` to the service's actual HTTPS origin. Mutation origin checks use that configured origin, so Render's internal request host cannot authorize a foreign request.

The root blueprint now contains these settings. On an existing service, manually add new `sync: false` values and remove obsolete password/session keys; a blueprint update does not populate new secrets for you. Follow the [Render runbook](RENDER_RUNBOOK.md).

If custom-domain production Clerk setup is not ready, use and disclose a development instance for the hackathon. Never mix development publishable keys with production secret keys. See [Clerk environments](https://clerk.com/docs/guides/development/managing-environments) and [production setup](https://clerk.com/docs/guides/development/deployment/production).

## Observed status

On 2026-10-02, local code/tests/build were verified. Real Clerk credentials and account-session checks were not yet available at implementation start. Record subsequent live sign-in/out, outsider denial and deployed origin evidence in `CONTEXT.md`; do not count the automated mocks as a live provider check.
