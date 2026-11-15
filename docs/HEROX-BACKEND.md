# HEROX backend API v1

The HEROX backend is added alongside the existing `/api/online` service so the current client remains available while its interface is migrated. It uses the existing Firebase Auth project and named Firestore Enterprise database from `firebase-applet-config.json`.

## Routes

- `GET /api/herox/health` — service status and persistence mode; contains no player data.
- `GET /api/herox/v1/catalog` — factions, attributes, powers, and campaign chapters.
- `POST /api/herox/v1/bootstrap` — create or retrieve the authenticated player's new HEROX profile. Optional body: `{ "faction": "sentinel" | "outcast" }`.
- `GET /api/herox/v1/me` — authenticated private profile.
- `POST /api/herox/v1/action` — authenticated, server-validated progression, power unlock, campaign mission, or real-player arena duel.
- `GET /api/herox/v1/rankings?limit=50` — top real player profiles only; no synthetic players or bots are seeded.

All authenticated requests use `Authorization: Bearer <Firebase ID token>`. Mutations require a unique `opId` (8–80 letters, digits, `_` or `-`) so retries cannot award the same progress twice.

## Persistence

The preferred store is the `herox_players/{uid}` collection in the existing named Firestore database. Configure the Railway service with a secret variable named `FIREBASE_SERVICE_ACCOUNT_JSON` containing the service account JSON for Firebase project `abstract-bee-901dl`. This credential is server-only: never put it in the frontend, source control, or this repository. The Admin SDK uses the configured Firestore database ID and commits multi-player arena results in a Firestore transaction.

If no Admin credential is configured, the API explicitly reports `persistence: "railway-volume"` and writes to `.data/herox_authority_state.json`; Railway must have the existing persistent volume mounted for that fallback. This fallback is for continuity only and should not be used with multiple service replicas. The `health` response makes the active mode visible.

## Launch and legacy data

HEROX data is kept in a new collection/file namespace and starts empty without fake leaderboard players. Existing `/api/online` endpoints and old Firestore collections are not deleted by this change. Firebase Auth accounts, Firestore records, and Railway's old `.data/online_authority_state.json` need separate backups before any approved wipe; no wipe runs automatically during deploy.

## Actions

`allocate_attribute`: `{ "action":"allocate_attribute", "opId":"...", "attribute":"power|agility|intellect|vitality", "points":1 }`

`unlock_power`: `{ "action":"unlock_power", "opId":"...", "powerId":"..." }`

`campaign_mission`: `{ "action":"campaign_mission", "opId":"..." }`

`arena_challenge`: `{ "action":"arena_challenge", "opId":"...", "targetUid":"..." }`

The server derives rewards and combat outcomes. Arena duels require a registered human HEROX profile and enforce a level range and short request cooldown. NPCs appear only in campaign content.
