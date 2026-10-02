# Verification and release contract

Use focused tests while implementing behavior. At milestone boundaries run the affected tests and lint; run a production build after framework/auth/schema/page integration. Release requires all four automated gates plus deployed and physical evidence. Do not spend time testing trivial class names or repeatedly rerunning green checks without changes.

## Automated gates

From `web/`, use RTK if available; if Windows still blocks it, use the direct equivalents and record why.

```text
rtk npm test
rtk npm run lint
rtk npm run typecheck
rtk npm run build
```

M1 adds `typecheck: next typegen && tsc --noEmit` to `package.json`; the imported base does not currently have that script. Read the installed guide and verify the command on a clean checkout. Build includes TypeScript too. Run commands sequentially where they share `.next` type generation. Expected: exit 0, no failing tests/lint/type errors; production routes generated. A skipped required test is not a pass.

| Suite / behavior | Required assertions |
|---|---|
| Domain | Token format/entropy construction, canonical HTTPS URL, malformed token/input rejection, blank/oversized English/Bengali/Hindi |
| Expiry | Month remains current until next month in Asia/Kolkata; year rollover and leap-year boundary; no UTC off-by-one |
| Provision/lifecycle | Unknown/non-ready medicine rejected; new record pending; write failure pending; verification required; conditional activate/revoke; no reactivation |
| Authorization | No session -> 401; signed-in non-allowlisted -> 403; empty allowlist denies; wrong origin -> 403; every protected read/write checked |
| Localization/script | Dictionary key parity; exact instruction retained; missing language explicitly falls back; expired warning first; no added dosage |
| Provider service | Server-selected voice/model; token/lang only; timeout/401/429/500/oversize safe; mock calls never spend credits |
| Audio cache/budget | Cache hit avoids generation; revoked/unknown/pending denied before cache; expiry/script/model change invalidates; quota atomic; provider result discarded if revoked in flight |
| Patient playback | Stop aborts/cancels; rapid language switch ignores stale response; no overlapping playback; play rejection needs a fresh gesture; absent browser voices explicit |
| Pharmacy UI | Search/select/review exact labels; changed source invalidates preset translation; submit busy guard; readback/activation; pending resume |
| URL/QR | Writer and QR consume exact server URL; copied/printed value equals token route |

Keep existing domain/service/component cases when meaningful; update their multilingual/auth fixtures rather than deleting the safety coverage. Use testing-library/jsdom for components. Add a small Playwright smoke suite in M7 if its browser is available; do not require cloud accounts in deterministic tests.

## Deployed checks

- [ ] `/api/live` returns 200. `/api/health` returns 200 with DB; provider readiness is checked separately.
- [ ] Real Clerk sign-in and sign-out on the Render URL; unauthorized third account cannot read catalog/tags or mutate. Old cookie/password route cannot bypass authorization.
- [ ] Patient URL opens without login or Clerk assets; auth service unavailability does not gate it.
- [ ] Create pending with actual batch/expiry, independently read back, activate, resolve; revoke a separate tag and confirm identity and new speech disappear.
- [ ] Data and audio cache remain after a fresh successful deploy. Setup run twice leaves catalog count and existing records stable.
- [ ] Live ElevenLabs English and Bengali are heard and checked, not just mocked. Record model, language, observed delay and sponsor integration without logging secrets. Hindi live check if completed.
- [ ] Force provider failure in a controlled local/configured test; fallback is explicit and reads only a freshly validated active record. Both speech engines absent leaves usable text/TalkBack.
- [ ] Check unknown/pending/revoked/expired/unavailable page and speech API responses. Printed expiry is preserved; expired audio starts with warning.
- [ ] Check final Render production build logs for failures and actual origin in generated tag URLs. Cold-start behavior recorded separately from warm performance.

## Accessibility and visual checks

- [ ] 360px phone, 768px tablet and 1440px desktop; no horizontal overflow, hidden button or clipped Bengali/Hindi text.
- [ ] Keyboard through homepage navigation, menus, FAQ, sign-in, provisioning, readback, patient languages/audio and details. Focus remains visible; Escape closes menus.
- [ ] At 200% zoom text and actions remain usable; important content/focus is not covered by sticky controls.
- [ ] Measured contrast passes the design targets. Color and icons never carry a warning alone.
- [ ] Android TalkBack reaches status/warning, medicine heading, strength, instruction, expiry, Read/Stop, language and details in a sensible order. DOM `lang` matches UI/actual instruction.
- [ ] Audio never starts unrequested, and state announcements do not repeatedly interrupt TalkBack. Reduced motion disables optional motion.
- [ ] Homepage/logo screenshots match the chosen visual direction; favicon readable at 16px. No emojis, stock template branding, fake stats/testimonials, dead demo/repository links or unauthenticated mutation controls.

## Hardware acceptance log

The teammate records these observations in `docs/hardware-test-log.md` during implementation. Start with the inherited log, updating its setup/date and actual results instead of claiming its pending checks passed.

| Setup / attempt | Correct link recognition / 10 | Recognition time | Page ready / audio time | Notes |
|---|---:|---|---|---|
| Bare NTAG213 | Not run | Not run | Not run | Phone/case/orientation/app |
| Tag near foil | Not run | Not run | Not run | Tag backing/spacing |
| Anti-metal/spacer in clip | Not run | Not run | Not run | Clip fit and tactile locator |
| First final strip | Not run | Not run | Not run | Exact token suffix and medicine |
| Second final strip | Not run | Not run | Not run | Distinct token and instruction |

Acceptance: at least 9/10 correct link recognitions within three seconds on the primary phone; **zero wrong medicine openings**. NFC recognition, server page delay and user-triggered speech delay are separate measurements. QR for each opens its identical NFC URL. Test a second phone if available. Screen-obscured rehearsal is a limited usability probe, not evidence of clinical accessibility validation.

## Final product README

Replace root planning README at M8. Use a centered original SVG wordmark/banner and clean Markdown sections, no emojis. Badges represent actual stack/checks, not fictitious CI status. Include:

1. One-sentence purpose, working demo URL and screenshot of homepage/patient/pharmacy.
2. Clear demo scope and one-clip/one-strip physical workflow, with a small Mermaid architecture diagram.
3. Feature matrix marking implemented English/Bengali/Hindi and optional features truthfully.
4. Sponsor ElevenLabs integration, model selection, cache and browser fallback.
5. Stack, `web/` directory map, clean installation, setup and environment names without values.
6. Render/Neon/Clerk setup links to these runbooks; stable-origin requirement and free-tier behavior.
7. Check commands and actual software/deployed/hardware evidence, including unrun items.
8. Demo catalog/fictional instruction note, accessibility controls and measured limitations.
9. Team/credits and third-party asset/font licenses. Add a project license only when the user has chosen it.
10. Concise future scope, leaving agent execution detail in `docs/`.

Store real screenshots in `docs/assets/` during M8; exclude private user identifiers and provider dashboards/keys. Do not publish screenshots of patient data because this demo should not store any.

## Release signoff

Feature freeze at H19. Record version/commit, final URL, tests, verified languages, demo token suffixes, physical results, remaining limitations and rollback target in `CONTEXT.md`. One bounded integration review checks the entire flow and serious defects; skip mandatory fresh reviewers per feature. Address wrong-record, auth, expiry, stale-audio, accessibility or persistence failures before cosmetic improvements. Final commit at H22 contains truthful docs and rehearsal results. A required live/hardware failure remains an open release gate, even if a backup demonstration exists.
