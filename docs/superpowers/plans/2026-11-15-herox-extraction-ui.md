# HEROX Extraction Match UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the live HEROX extraction arena UI to the supplied colorful 2D mockup while preserving real arena state and controls.

**Architecture:** Keep the existing Canvas renderer for the world and React for the semantic HUD. Improve the world illustration and overlay styling in place, add small testable display helpers only where needed, then capture the live page and recreate it as editable Figma layers.

**Tech Stack:** React, TypeScript, Canvas 2D, CSS, Vite, Figma MCP.

**Spec:** `docs/superpowers/specs/2026-11-15-herox-extraction-ui-design.md`

## Global Constraints

- Do not change server-authoritative combat, rewards, matchmaking, persistence, or Firebase data.
- Keep desktop and narrow-screen controls operable and accessible.
- Figma output is editable; the screenshot is only a temporary visual reference.
- Keep supported ability behavior truthful; do not imply unavailable powers are usable.

## Review Focus

- Narrow viewport layout: controls and extraction status remain visible.
- Empty backpack: slots remain legible and clearly empty.
- Active versus inactive extraction: status/portal cues agree with server state.
- Queue and result overlays: remain readable without covering all controls.
- Keyboard and touch input: visual redesign does not swallow game inputs.

## File Map

- Modify `src/components/herox/ArenaGame.tsx` for Canvas art and semantic HUD details.
- Modify `src/components/herox/herox.css` for the desktop/mobile visual system.
- Add or extend focused tests under `src/game/` only for extracted display helpers; retain existing arena socket tests for authoritative behavior.
- Update `docs/HEROX-BACKEND.md` only if the interface description changes materially.
- Update the existing HEROX Figma design with an editable match-screen frame.

### Task 1: Refine the match world and HUD

**Files:**
- Modify: `src/components/herox/ArenaGame.tsx`
- Modify: `src/components/herox/herox.css`
- Test: focused helper tests if new display logic is extracted

- [ ] Compare the current 1600×900 arena to the reference and list visual gaps.
- [ ] Add readable outlined cartoon scenery and hero silhouettes without changing world coordinates or server mechanics.
- [ ] Refine menu, top match HUD, backpack, skill panel, and extraction action to match the reference hierarchy.
- [ ] Preserve existing input event handlers and add ARIA labels/states to the new controls.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Inspect a desktop and narrow-screen render and correct clipping/overlap.

### Task 2: Update the Figma match-screen design

**Files:**
- Update: existing HEROX Figma design file

- [ ] Inspect the current file's pages and library conventions.
- [ ] Capture the live screen as temporary layout reference.
- [ ] Build/update the match screen with editable text, vector shapes, and icons.
- [ ] Compare the editable frame to the live capture; delete the temporary flattened capture.
- [ ] Verify frame hierarchy, viewport bounds, labels, and screenshot.

### Task 3: Publish and verify

**Files:**
- Update project documentation if necessary

- [ ] Commit the focused UI changes on a feature branch and open a PR.
- [ ] Merge the reviewed change and wait for Railway's deployment to succeed.
- [ ] Verify production health, static assets, and arena route without mutating live player data.
- [ ] Report the deployed URL, commit, checks, and any verification limits.

