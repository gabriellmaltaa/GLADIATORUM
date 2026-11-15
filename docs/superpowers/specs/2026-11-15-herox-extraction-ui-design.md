# HEROX Extraction Match UI Design

## Intent

Bring the active 2D extraction match closer to the supplied cartoon mockup so new players can read match time, extraction status, hero status, loot, and controls at a glance.

## Goals

- Preserve the existing server-authoritative arena actions and keyboard/touch controls.
- Use a bright, bold, outlined cartoon style with chibi rodent heroes, wooden platforms, urban ruins, supply crates, coin/XP pickups, and visible extraction points.
- Keep the main menu at upper left, timer/extraction status at top center/right, backpack at lower left, and abilities/status/quick-extract at lower right.
- Keep all labels in Portuguese and expose the interactive controls accessibly.
- Create an editable Figma frame that mirrors the implemented screen.

## Non-goals

- Change arena combat, rewards, matchmaking, persistence, or Firebase data.
- Add new powers or monetization behavior as part of a visual pass.
- Use the entire reference screenshot as a flattened Figma deliverable.

## Constraints

- Continue using the existing React UI overlay and Canvas arena renderer.
- Preserve keyboard, pointer, touch, and server input mappings.
- Support narrow screens without hiding match-critical status or controls.
- Do not store credentials or player data in design files or project notes.

## Approaches

1. Rebuild the screen with a single full-screen static image. This would match the reference quickly, but would obscure the live game and make the interface inaccessible and difficult to update.
2. Keep the arena as a Canvas scene and compose the HUD from semantic React controls, improving the scene drawing and responsive styles. This preserves live state, input behavior, and accessibility while allowing the scene and interface to evolve independently. **Selected.**
3. Replace the arena renderer and all overlays with a new game UI framework. This adds migration cost without improving the requested match screen enough to justify it.

## Design

- Canvas: clear sky, distant city ruins, multi-level wooden platforms, ramps/ladders, crates, pickup markers, portal and helicopter cues, and readable rodent heroes with cape/weapon silhouettes and bold outlines.
- Upper-left menu: hero portrait/identity, health and energy, gold and level, plus green Play, blue Heroes, purple Inventory, yellow Shop, and violet Missions actions.
- Top HUD: remaining time and extraction availability with helicopter/portal cues.
- Lower-left backpack: six compact slots for the weapons, gold, and XP actually carried during the run; medkits and energy pickups affect the hero immediately and are not presented as stored loot.
- Lower-right combat panel: selected hero power, four numbered skill slots, health/energy bars, movement/jump/attack actions on touch devices, and a red quick-extract action.
- Responsive layout: desktop overlays retain the reference composition; mobile reflows panels into a readable vertical stack and keeps touch actions available.

## Builder calls

- Keep the existing game state and API contract; visual labels must reflect actual server state.
- Do not make unsupported abilities appear usable. Existing server-supported power behavior remains the active skill; unavailable slots must be visibly unavailable or described as future unlocks.
- Treat the source image as visual guidance only; Figma output must use editable text, shapes, and icons.

