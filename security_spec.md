# Security Specification — GLADIATORUM: Arena Aeterna

## 1. Data Invariants & Master Sources of Truth
1. **Identity & PII Isolation (`/players_private/{playerId}` vs `/players_public/{playerId}`)**:
   - `/players_private/{playerId}` holds `email` (PII) and wallet `gold`. Only `request.auth.uid == playerId` can `get` it; `list` is strictly forbidden (`allow list: if false`).
   - `/players_public/{playerId}` holds non-sensitive gladiator combat and ranking metrics (`name`, `level`, `honor`, `fame`, `wins`, `losses`, `featsCount`, `goldLooted`, `guildId`, `guildTag`).
2. **Master Gate for Subcollections**:
   - `/players_private/{playerId}/inventory_items/{itemId}` requires `exists(/databases/$(database)/documents/players_private/$(playerId))` and `request.auth.uid == playerId`.
   - `/guilds/{guildId}/members/{memberUid}`, `/guilds/{guildId}/applications/{applicantUid}`, and `/guilds/{guildId}/ledger/{txId}` require `exists(/databases/$(database)/documents/guilds/$(guildId))`.
3. **Anti-Self-Promotion & Role Hierarchy**:
   - A user joining `/guilds/{guildId}/members/{memberUid}` can only set `role == 'member'` unless they are the guild's `leaderId`.
   - Only the guild's `leaderId` (`get(/databases/$(database)/documents/guilds/$(guildId)).data.leaderId == request.auth.uid`) can update `role` on a member document.
4. **Economy & Ranking Bounds**:
   - New public profiles must start with `level == 1`, `honor == 20`, `goldLooted == 0`, and `createdAt == request.time`.
   - Updates to `gold`, `honor`, or `treasuryGold` require action-specific `affectedKeys().hasOnly(...)` and strict delta limits, preventing arbitrary balance injection.
5. **Terminal State Locking**:
   - `/guilds/{guildId}/applications/{applicantUid}` can only be updated while `resource.data.status == 'pending'`. Once `'approved'` or `'rejected'`, it is locked.
   - `/guilds/{guildId}/ledger/{txId}` is append-only (`allow update, delete: if false`).

---

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Identity Spoofing on Public Profile)**: Authenticated user `uid_attacker` attempts to create `/players_public/uid_victim` with `uid: "uid_victim"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (PII Leak on Private Account)**: Authenticated user `uid_attacker` attempts `get` on `/players_private/uid_victim` to read `email`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection)**: Owner updates `/players_public/uid_1` including an undeclared field `isAdmin: true`. -> `PERMISSION_DENIED` via `hasOnly()`.
4. **Payload 4 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/players_private/uid_1`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Arbitrary Honor Inflation)**: User attempts to create `/players_public/uid_1` with `honor: 999999`. -> `PERMISSION_DENIED`.
6. **Payload 6 (Cross-Account Inventory Tampering)**: User `uid_attacker` attempts to create or delete `/players_private/uid_victim/inventory_items/item_1`. -> `PERMISSION_DENIED`.
7. **Payload 7 (Self-Promotion in Guild)**: Regular guild member `uid_member` attempts `update` on `/guilds/guild_1/members/uid_member` setting `role: "leader"`. -> `PERMISSION_DENIED`.
8. **Payload 8 (Unauthorized Guild Bank Drain)**: Non-member or regular member attempts `update` on `/guilds/guild_1` setting `treasuryGold: 0` or `campoTreinoLevel: 5`. -> `PERMISSION_DENIED`.
9. **Payload 9 (Terminal State Re-Opening)**: Applicant attempts to update `/guilds/guild_1/applications/uid_1` after `status` is already `'rejected'`. -> `PERMISSION_DENIED`.
10. **Payload 10 (Resource Poisoning / 1MB ID)**: Attacker sends a 500-character document ID or 10KB `description` to `/guilds/{guildId}`. -> `PERMISSION_DENIED` via `isValidId()` and `.size()` checks.
11. **Payload 11 (Forged Client Timestamp)**: Client sends `createdAt: Timestamp(2020, 1, 1)` instead of `request.time`. -> `PERMISSION_DENIED`.
12. **Payload 12 (Ledger Tampering)**: Guild leader attempts to `update` or `delete` `/guilds/guild_1/ledger/tx_1` to erase audit history. -> `PERMISSION_DENIED`.

---

## 3. Red Team Conflict Report
- **`/players_public/{playerId}`**:
  - Identity Spoofing: Blocked (`request.auth.uid == playerId && incoming().uid == request.auth.uid`).
  - Shadow Updates: Blocked (`hasOnly` in `isValidPlayerPublic` and `affectedKeys().hasOnly` in `update`).
  - Value Poisoning: Blocked (`isValidPlayerPublic(incoming())` wraps `allow update`).
- **`/players_private/{playerId}`**:
  - PII Blanket Read: Blocked (`allow get: if isSignedIn() && isValidId(playerId) && request.auth.uid == playerId; allow list: if false;`).
  - Replay / Duplicate Mutation: Blocked (`incoming().lastOpId != existing().lastOpId`).
- **`/guilds/{guildId}` & Subcollections**:
  - Self-Promotion: Blocked (member creation locks `role == 'member'` for non-leaders; role updates require guild `leaderId`).
  - Orphaned Subcollection Writes: Blocked via `exists(/databases/$(database)/documents/guilds/$(guildId))`.
