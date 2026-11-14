# Forja da Cidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a City Forge tab that upgrades compatible item bonuses for gold in local and online play.

**Architecture:** Keep forge pricing and item mutation in the game rules layer. CityScreen presents eligible equipped and bag equipment, while App routes local mutations to the rules and online mutations to a new server-authoritative action.

**Tech Stack:** TypeScript, React, Node test runner via esbuild, existing Firebase-backed authoritative action engine.

**Spec:** [2026-11-14-forja-cidade.md](../specs/2026-11-14-forja-cidade.md)

## Global Constraints

- No forge attempt can fail or destroy an item.
- Maximum forge level is 10 per item.
- Price is `ceil(100 × 1.5^n)` at current forge level `n`.
- Damage improves both minimum and maximum by 1; primary attributes by 1; armor by 5; health bonus by 10.
- Online clients cannot choose arbitrary item stats or bypass gold and level checks.

## Review Focus

- Item missing, sold, equipped elsewhere, or consumable: forge rejects it without charging.
- Forged stat not supported by the item: forge rejects it without charging.
- Insufficient gold: no item or balance change.
- Item at level 10: no further upgrade or charge.
- Legacy saved items without `forgeLevel`: treat as level 0.

---

### Task 1: Forge rules and persisted item level

**Files:**
- Modify: `src/game/config.ts`
- Modify: `src/game/rules.ts`
- Test: `src/game/rules.test.ts`

**Interfaces:**
- Produces `ForgeStatKey`, `getForgeUpgradeCost(forgeLevel)`, and `forgeItem(state, itemId, stat)` for local play and the authority engine.
- `GameItem.forgeLevel` remains optional so legacy saves load as level 0.

- [x] Write failing cases for initial cost, increasing cost, maximum level, valid damage/stat improvements, insufficient gold, unknown item, unsupported stat, consumables, and equipped inventory targets.
- [x] Run the focused rules test and confirm the missing behavior fails.
- [x] Implement the shared deterministic forge rule and optional `forgeLevel` field.
- [x] Run the focused rules test and confirm all forge cases pass, including save/reload persistence.

### Task 2: City Forge screen and local interaction

**Files:**
- Modify: `src/components/screens/CityScreen.tsx`
- Modify: `src/design/roman-identity.css`
- Modify: `src/App.tsx`
- Test: `src/game/romanIdentityLayout.test.ts`

**Interfaces:**
- `CityScreenProps.onForgeUpgrade(itemId: string, stat: ForgeStatKey): void`.
- Local actions call `forgeItem`; online actions dispatch `forge_upgrade`.

- [x] Add Forja to the city locations and tab navigation, keeping the location grid balanced on desktop and mobile.
- [x] Render equipment-only selectable items from the bag and equipment slots, valid bonus options, next-level values, cost, balance, and max-level/insufficient-gold disabled states.
- [x] Wire the local handler and success/error feedback through App.
- [x] Run TypeScript lint and production build to verify the new screen and props.

### Final review

- Independent read-only review found no Critical or Important issues. It flagged possible mobile navigation overflow; reduced the mobile row gap from 24px to 10px and added a regression test proving the new layout rule.

### Task 3: Online authority action

**Files:**
- Modify: `src/server/onlineAuthorityEngine.ts`
- Modify: `src/game/onlineAuthorityAndLoad.test.ts`

**Interfaces:**
- Add action type `forge_upgrade` with `itemId` and `stat` parameters.
- Server calls `forgeItem` against its authoritative record and persists the returned state.

- [x] Add server cases proving a valid upgrade persists and invalid stat and insufficient gold are rejected without charging; max level is covered by the shared rule.
- [x] Run the focused online authority test and confirm the new action is rejected as unknown.
- [x] Implement the action dispatch using the shared rule; do not accept bonus amounts or cost from the client.
- [x] Run focused rules and online-authority tests, then `npm run lint` and `npm run build`.
