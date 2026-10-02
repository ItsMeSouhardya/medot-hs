# Design decisions

| Decision | Reason | Revisit when |
|---|---|---|
| Retain Next.js/Neon/raw SQL | Tested base already solves the core flow | An observed bottleneck or post-event requirement warrants migration |
| Use Render web service | Explicit hosting change; SSR/API need a server | User chooses another host |
| Use native agent execution | Shared contracts and short deadline; avoids per-feature reviewer overhead | Truly independent work exists and delegation is authorized |
| Target eight commits | Requested 6–8 commits; milestones provide recoverable working states | User explicitly changes commit cadence |
| Clerk free instance + allowlist | Managed sign-in without replacing Neon; authentication and pharmacy permission are distinct | Multi-pharmacy product or owned production domain |
| Scope Clerk to operator routes | Patient access must survive auth SDK/account failure | Patient accounts become an explicit requirement |
| ElevenLabs v3 initially | TTS model coverage includes Bengali; compatible direct TTS endpoint | Sponsor entitlement or pronunciation test requires another verified model |
| Reviewed stored language variants | Prevents runtime translation from altering medicine instructions | Clinically reviewed translation workflow exists |
| Preserve pending/readback activation | Hardware write success alone cannot prove a correct physical link | A stronger measured provisioning mechanism exists |
| Preserve month-end expiry semantics | Printed expiry is a month, not an arbitrary timestamp | Label format or applicable product requirements change |
| Durable audio cache and budget in Neon | Render filesystem is temporary; repeated demo taps should reuse verified audio | Post-event object storage/scale needs justify more services |
| Vector clip-and-dot logo | Matches tactile idea and remains usable as a favicon | User supplies a preferred brand design |

## External facts to record during setup

These are explicit account/hardware inputs, not undefined architectural decisions: actual Render URL; available account permissions; Neon connection target; Clerk instance and authorized user IDs; sponsor credits/voice IDs/model access; physical phone/tag backing/clip fit; full pack labels and current expiry; Bengali/Hindi review by a competent speaker; team name/GitHub URL; event rules about prebuilt work.

Do independent local work while waiting for an external input. Keep the unresolved item in `CONTEXT.md`. Do not replace a required feature silently because a credential or device is missing. Hindi can remain visibly unavailable if time prevents reviewed completion; English/Bengali cannot be called complete without their live checks.
