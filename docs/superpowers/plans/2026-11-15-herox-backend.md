# HEROX backend and publication plan

## Approved scope

- Start the HEROX game backend on the existing GLADIATORUM repository and Firebase project.
- Keep the existing Firebase Authentication token verification and target the existing named Firestore Enterprise database.
- Provide server-authoritative player progression, attributes, powers, campaign, arena battles, and rankings; no seeded bot accounts.
- Preserve the current API while the frontend migration is still pending.
- Do not delete Auth users or existing Firestore documents until an export is recoverable and verified. The user's earlier approval to reset accounts remains noted, but this environment cannot safely perform that destructive cloud operation before backup.

## Implementation

1. Add a separate HEROX domain module and persistence adapter, preferring Firestore Admin when Railway credentials are configured and using the persistent Railway volume as an explicit fallback.
2. Add authenticated `/api/herox/v1` routes and a health route that reports the active persistence mode without exposing player data.
3. Keep current `/api/online` routes intact to avoid breaking the Roman frontend before its separate conversion.
4. Add a new launch identifier and use a distinct HEROX data namespace. Do not fabricate player rankings or touch old user documents.
5. Prepare a GitHub change against `main` so Railway's existing GitHub integration can deploy it. Confirm the deployment status before claiming it is live.

## Known constraints

- Firebase Firestore is Enterprise in `us-west2`; server writes require Admin credentials in Railway.
- Railway has no connected management tool in this session. Automatic deployment can be triggered by merging into the configured GitHub branch, but runtime health still needs confirmation.
- The running Roman frontend is intentionally preserved; this backend step does not finish the HEROX visual migration.
