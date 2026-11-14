# GOVERNO VIP Guild Implementation Plan

> **For agentic workers:** Follow the approved design at `docs/superpowers/specs/2026-11-14-governo-vip-design.md`.

**Goal:** Provision the maxed GOVERNO guild for the verified online account displayed as XX MALTA and apply permanent +50% gold and XP to its rewards.

**Architecture:** Persist the VIP entitlement on the authoritative guild record. Provision it idempotently when the matching server account loads. Make each existing reward path read the server-computed guild bonus.

**Tech Stack:** TypeScript, React, Node.js authoritative engine.

**Spec:** `docs/superpowers/specs/2026-11-14-governo-vip-design.md`

## Global Constraints

- Client action parameters cannot set or alter the bonus.
- Existing guild mechanics and unrelated player state stay unchanged.
- Per task instruction, do not add or run tests.

## Review Focus

- Old persisted guild records without VIP fields resolve to zero bonus.
- The VIP bonus is not applied twice to combat or offline reward batches.
- Closed recruitment and max-level buildings are consistent in ranking and member views.
- Contract and item-sale reward paths include gold bonus.
- Guild creation is idempotent across repeated account loads.
- A GOVERNO name conflict is logged without overwriting another guild.

---

### Task 1: Authoritative VIP guild provisioning

**Files:** `src/game/guildsAndRankings.ts`, `src/server/onlineAuthorityEngine.ts`

- [ ] Add optional persistent gold/XP bonus fields to guild records and initialize GOVERNO with the required values and all eight buildings at level 5.
- [ ] Provision or reconcile it idempotently for XXMALTA during account bootstrap; remove the user from any previous guild and keep other members/accounts untouched.

### Task 2: Apply and expose permanent rewards

**Files:** `src/game/guildsAndRankings.ts`, `src/game/rules.ts`, `src/server/onlineAuthorityEngine.ts`, `src/components/screens/GuildScreen.tsx`

- [ ] Include permanent bonus percentages in active guild bonuses, combat wins and losses, offline patrol, overflow sales, contracts, and direct item sales.
- [ ] Display permanent +50% gold and +50% XP on the guild screen.
- [ ] Inspect the changed code and confirm the diff excludes unrelated files. Do not run tests.

