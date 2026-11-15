# HEROX backend API v1

The HEROX backend is added alongside the existing `/api/online` service so the current client remains available while its interface is migrated. It uses the existing Firebase Auth project and named Firestore Enterprise database from `firebase-applet-config.json`.

## Routes

- `GET /api/herox/health` — service status and persistence mode; contains no player data.
- `GET /api/herox/v1/catalog` — factions, attributes, powers, and campaign chapters.
- `POST /api/herox/v1/bootstrap` — create or retrieve the authenticated player's new HEROX profile. Optional body: `{ "faction": "sentinel" | "outcast" }`.
- `GET /api/herox/v1/me` — authenticated private profile.
- `POST /api/herox/v1/action` — authenticated, server-validated progression, power unlock, campaign mission, or real-player arena duel.
- `GET /api/herox/v1/rankings?limit=50` — top real player profiles only; no synthetic players or bots are seeded.
- `WS /api/herox/arena` — authenticated, server-authoritative 2D extraction match. The client opens same-origin WSS, sends `{ "type":"auth", "token":"<Firebase ID token>" }` as its first message, then `{ "type":"queue" }`. No bots enter the queue.

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

## 2D extraction arena

The live side-view game is a separate mode and does not replace the turn-based PvP screen. The arena uses original canvas-drawn rodent heroes, wooden platforms, loot crates, gold/XP pickups, and an active extraction portal. A/D or arrow keys move, Space jumps, J/click attacks, Q uses the power, and E extracts. Agility affects movement and jump, power/strength affects damage, vitality affects maximum health, and intellect scales the power hit.

The WebSocket server limits incoming messages to 2 KB and 35 input updates per second. It accepts only known boolean controls. Server tick and combat state determine collisions, damage, health, loot, and match results. The first replica supports 1v1 human matchmaking; queue and match rooms are in memory, so keep Railway at one replica until matchmaking is moved to a shared room service.

Each match lasts at most 8:42. Extraction points open after 45 seconds. Carried loot is temporary: only a successful extraction banks carried gold/XP/weapons; defeat, timeout, or disconnect clears unbanked loot. Extracting awards 25 XP plus collected XP and gold; a KO victory awards 25 XP, while the eliminated player gets no loot reward. Every third successful extraction attempts to unlock a unique curated weapon. Match IDs are idempotent in the profile repository, so a repeated settlement cannot double-award progress. Old profiles receive defaults for the new `gold`, `weapons`, and `arenaExtractions` fields when read.

