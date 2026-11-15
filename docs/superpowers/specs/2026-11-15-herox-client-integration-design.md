# HEROX client integration design

## Intent

Make the existing public game open as HEROX and use the shipped HEROX API for online progression. The user asked to execute the previously outlined launch steps and test them.

## Goals

- Reuse Firebase Authentication and the existing Railway API origin.
- Create fresh HEROX profiles in the `herox_players` namespace without migrating or deleting legacy player data.
- Expose the current server-authoritative loop: faction selection, campaign, attribute allocation, powers, PvP challenge, and rankings.
- Keep the previous client available at `?legacy=1` during transition.
- Test HTTP auth/error behavior and run the existing suite and production build.

## Non-goals and constraints

- Do not fabricate bot accounts or client-side PvP results.
- Do not delete Firestore documents or Authentication accounts without a verified recoverable backup.
- Keep Firebase credentials out of source, browser code, and chat.
- Firestore Admin credentials are not configured in Railway; the existing persistent volume remains the current backend persistence mode.

## Approaches

- Replace the Roman client in place: simplest entry point, but removes an easy rollback path.
- Add a separate HEROX client and select it in `main.tsx`: chosen because the backend and legacy client remain isolated, and `?legacy=1` supports rollback.
- Build a second deployment: unnecessary because Railway already serves this repository and API.

## Design

Add a small typed HEROX API client that always sends a Firebase ID token for protected routes, plus a focused responsive React client for the existing API. Load the catalog and rankings publicly; after Google login, bootstrap the selected faction and render the server profile. Every progression action uses a unique operation ID and replaces local profile state only with the server response. No local gameplay fallback is presented as online progress.

## Builder calls

- HEROX is the default experience; `?legacy=1` retains the earlier app.
- New users choose Sentinela or Dissidente before first bootstrap; returning users keep their server faction.
- Arena challenges only target real player UIDs present in the ranking API.
- The legacy Firestore/Auth cleanup remains blocked until a verified backup and required IAM are available.
