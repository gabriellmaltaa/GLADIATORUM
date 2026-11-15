import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HERO_APPEARANCE, normalizeHeroAppearance } from './heroCustomization.ts';
import { createInitialGameState, inspectAndLoadSaveState } from './rules.ts';

test('hero appearance uses an allowlisted default and normalizes invalid values', () => {
  assert.deepEqual(normalizeHeroAppearance({ archetype: 'sentinel', primaryColor: 'cyan', mask: 'visor' }), {
    ...DEFAULT_HERO_APPEARANCE,
    archetype: 'sentinel', palette: 'cyan', mask: 'visor',
  });
  assert.deepEqual(normalizeHeroAppearance({ archetype: '../../hack', palette: '#fff', energy: 'script' }), DEFAULT_HERO_APPEARANCE);
});

test('legacy save gains a default appearance while preserving progression', () => {
  const old = createInitialGameState(1000);
  const loaded = inspectAndLoadSaveState(JSON.stringify({ ...old, level: 12, gold: 4567, heroAppearance: undefined }), 2000);
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.state.level, 12);
  assert.equal(loaded.state.gold, 4567);
  assert.deepEqual(loaded.state.heroAppearance, DEFAULT_HERO_APPEARANCE);
});

test('layout presets and persisted data are constrained and resettable', async () => {
  const { DEFAULT_LAYOUT_PREFERENCES, normalizeLayoutPreferences, createLayoutPreset } = await import('./layoutPreferences.ts');
  assert.deepEqual(normalizeLayoutPreferences({ preset: 'compact', hiddenCards: ['stats', 'unknown'], order: ['stats', 'unknown'] }), {
    ...DEFAULT_LAYOUT_PREFERENCES,
    preset: 'compact', hiddenCards: ['stats'], order: ['stats', 'avatar', 'objective'],
  });
  assert.equal(createLayoutPreset('classic').preset, 'classic');
});
