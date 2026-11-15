# HEROX client integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the public app to the live server-authoritative HEROX API and verify the client build and HTTP contract.

**Architecture:** Add a pure bearer-request helper, wrap it with the existing Firebase auth token provider, and mount a responsive HEROX client by default. Keep the existing client available with `?legacy=1`.

**Tech Stack:** React, TypeScript, Firebase Auth, Express API, Node test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-11-15-herox-client-integration-design.md`

## Global Constraints

- No bot accounts, client-authoritative rewards, secrets in browser bundles, or silent offline progression.
- Do not erase Auth or Firestore data without a verified backup.
- Use existing Firebase Auth and same-origin `/api/herox/v1` routes.

## Review Focus

- Missing/expired authentication: protected requests fail clearly and never omit the bearer token.
- Backend error or non-JSON response: surface a useful error and do not overwrite the profile.
- Returning player: bootstrap preserves the server faction and progression.
- Empty ranking and self-only ranking: PvP controls show an empty state and never target self.
- Mobile viewport: main actions remain usable without horizontal overflow.

---

### Task 1: Authenticated HEROX API client

**Files:**
- Create: `src/services/heroxApi.ts`
- Create: `src/services/heroxClient.ts`
- Test: `src/services/heroxApi.test.ts`
- Modify: `src/services/firebaseClient.ts`
- Modify: `package.json`

**Interfaces:** `requestHeroX<T>(path, token, init?, fetchImpl?)`; `getFirebaseIdToken()` delegates to the current Firebase/test session token.

- [ ] Write tests for bearer header, missing token, HTTP error extraction, and malformed JSON.
- [ ] Run the targeted test and confirm the expected failures.
- [ ] Implement the pure request helper and Firebase-auth wrapper.
- [ ] Run targeted test and existing game tests.

### Task 2: HEROX gameplay client

**Files:**
- Create: `src/components/herox/HeroXGame.tsx`
- Create: `src/components/herox/herox.css`
- Modify: `src/main.tsx`
- Modify: `src/index.css`

**Interfaces:** The page subscribes to the existing Firebase session and uses `heroxClient` for catalog, bootstrap, rankings, and actions. Render the previous app only when query parameter `legacy=1` is set.

- [ ] Build the signed-out faction/login view and signed-in dashboard.
- [ ] Add server-backed campaign, attribute, power, ranking, and real-player arena actions with unique `opId` values.
- [ ] Add loading, empty, error, and responsive states; preserve profile state on failed actions.
- [ ] Run TypeScript check and production build.

### Task 3: Deployment verification

**Files:**
- Modify: this plan ledger only.

- [ ] Run the full test suite and production build.
- [ ] Verify the live catalog and health endpoints; verify unauthenticated protected routes remain 401.
- [ ] Record that authenticated actions require a real Firebase session and cannot be asserted without one.
- [ ] Confirm database cleanup remains untouched because the Firestore clone permission is missing and no existing backups are available.
