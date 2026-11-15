# HEROX 2D Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an original, server-authoritative 1v1 side-view HEROX extraction game with online matchmaking, loot, attributes, XP, and weapon drops.

**Architecture:** A pure TypeScript arena simulation owns physics and combat. An authenticated WebSocket gateway pairs human sessions, relays bounded input and server snapshots, and settles a single result through `HeroXAuthority`. A React canvas view renders original hero silhouettes and HUD, with the current HEROX dashboard and PvP left intact. One Railway replica is the supported first deployment because rooms are in memory.

**Tech Stack:** Existing React/TypeScript, Node HTTP server, `ws`, Firebase Auth ID tokens, current Firestore-or-volume HeroX repository, Node test runner/esbuild, Figma Design.

**Spec:** `docs/superpowers/specs/2026-11-15-herox-2d-arena.md`

## Global Constraints

- Match only authenticated human profiles; no bot enters competitive matchmaking.
- Server owns positions, physics, attacks, cooldowns, match outcomes, XP, and unlocks.
- Preserve old HEROX screens, profiles, campaign, and PvP.
- Never store socket tokens or Firebase secrets in source or browser logs.
- The first release supports one Railway replica; no false multi-replica claim.

## Review Focus

- Malformed, oversized, unauthenticated, or rate-spammed messages must be rejected without crashing the process.
- A player who disconnects must not create an automatic reward or false win.
- Duplicate match completion must not award XP/weapon twice.
- Low agility, low health, and near-boundary physics must remain finite and bounded.
- Old persisted profiles missing newly added weapons must load with a safe default.

### Task 1: Arena rules, loot, extraction, and progression

**Files:** `src/game/heroxArena.ts`, `src/game/heroxArena.test.ts`, `src/server/heroxAuthority.ts`, `src/server/heroxAuthority.test.ts`.

- [x] Test stat conversion, movement bounds, jump, platform/floor collision, cooldown/range damage, KO, loot pickup, extraction-only banking, and match reward calculation.
- [x] Run the new tests and confirm they fail for missing arena rules.
- [x] Implement the pure arena state/update functions with the spec's fixed movement, weapon and XP rules.
- [x] Add backward-compatible owned weapon/gold inventory and a server-only idempotent `completeArenaMatch` persistence operation that banks loot only on extraction.
- [x] Re-run new and existing server/game tests.

### Task 2: Authenticated realtime matchmaking

**Files:** `server.ts`, `src/server/heroxArenaSocket.ts`, `src/server/heroxArenaSocket.test.ts`, `package.json`, `package-lock.json`.

- [x] Test queue pairing, authenticated socket setup, invalid message rejection, disconnect cleanup, and exactly-once completion.
- [x] Confirm tests fail before implementation.
- [x] Attach the WebSocket server to the existing HTTP server at `/api/herox/arena`; authenticate the first socket message via existing Firebase token verification.
- [x] Match one human vs one human, run a bounded simulation tick, send snapshots, and persist the final result once.
- [x] Run socket/unit tests and existing tests.

### Task 3: Responsive extraction arena canvas client

**Files:** `src/components/herox/ArenaGame.tsx`, `src/components/herox/herox.css`, `src/services/heroxArenaClient.ts`, tests as needed.

- [x] Test input serialization, connection lifecycle and snapshot decoding.
- [x] Confirm tests fail before implementation.
- [x] Add queue/join/cancel, keyboard movement/jump/attack/power/extract, original chibi rodent heroes, sky/ruin/platform/ladder/crate/loot stage, integrated menu, timer/extraction markers/backpack/health/energy/power HUD, touch-safe controls fallback, and reconnect/error feedback.
- [x] Add a clear route/tab to launch and return from the live mode without removing existing screens.
- [ ] Build and lint; verify desktop and narrow viewport rendering in browser. (Build/lint pass; final visual inspection via Opera could not run in this session.)

### Task 4: End-to-end verification and publication

**Files:** `docs/HEROX-BACKEND.md`, `docs/VALIDACAO-2026-11-15-arena.md`.

- [x] Run `npm test`, `npm run lint`, and `npm run build`.
- [x] Exercise two authenticated test players locally: match, movement, KO, results, XP, weapon unlock, duplicate result protection, and reconnect/disconnect. (Local E2E covers pairing, snapshots, invalid auth, rate limits, disconnect cleanup; unit tests cover settlement, KO, XP/gold and unlock idempotency.)
- [x] Confirm Railway is configured for one replica and the published instance serves `/`, health/catalog, and authenticated WebSocket matches. (Public root/health/catalog succeeded; protected profile returned 401 without auth; deployed WSS rejected an invalid token.)
- [x] Update docs with exact deployed URL/revision and supported limits.

