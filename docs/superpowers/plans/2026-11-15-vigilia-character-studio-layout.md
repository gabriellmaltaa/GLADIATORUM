# Vigília — estúdio de heróis e layout personalizável

> Approved design: `docs/superpowers/specs/2026-11-15-vigilia-character-studio-and-layout-design.md`.

## Goal
Implement approved hero customization and home-screen layout controls without changing combat, economy, accounts, saved progress or the already-published launch reset.

## Constraints
- Do not change `launchId` or reset production data.
- Appearance is allowlisted cosmetic data. The server validates it and public profiles expose only safe appearance fields.
- Keep equipped items as the source of truth for visible equipment; fixed tabs/actions remain accessible.
- Keep original Vigília art, responsive layout, and backwards-compatible local/online saves.

## Tasks
1. **Customization and migration helper** — [x] Add `HeroAppearance` allowlists/default/normalizer and failing unit tests. Modify `GameState`, initial creation, and save migration to include a default without touching old progress.
2. **Online persistence and public profile** — [x] Add `update_hero_appearance` action; validate each enum on the authoritative server; return allowlisted appearance from profile details; update client profile parser and tests.
3. **Hero Studio UI and character art** — [x] Add live preview and controls for archetype, palette, mask, and energy; render equipped layers; wire local and online save paths; replace character art in self profile, ranking, and portraits with original hero artwork.
4. **Layout customizer** — [x] Add presets, card ordering/visibility controls, accessible controls, local preference save and reset.
5. **Verification and review** — [x] Run all tests, lint, and build; confirm the launchId was not changed by this implementation. [ ] Manual browser visual review could not run: Computer Use could not identify the current Opera URL with confidence, so it stopped before interacting with the window.

## Acceptance checks
- Old save missing appearance loads with safe default and retains level, currencies and items.
- Invalid appearance tokens are rejected by server and cannot grant stats.
- Public profile appearance has only known visual enums; no email or private data.
- Changing equipped items updates preview; changing cosmetics never changes stats.
- Layout preset/reorder/hide persists across reload and can reset; fixed tabs remain available.
- Desktop/mobile build and tests pass; production is not reset by this change.

## Execution notes
- `npm test`: 89 passed, 0 failed. Includes the existing synthetic 1,000-player suite; no load was sent to production.
- `npm run lint`: passed.
- `npm run build`: passed; new hero atlas is 1774×887 RGBA PNG.
- `server.ts` retains the pre-existing `vigilia-public-launch-2026-11-15` value; this feature made no launch-ID change.
- Manual browser visual review could not run because Computer Use could not identify the current Opera URL with confidence; the local UI was not operated.
