import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_TOKENS } from '../design/tokens';
import { getItemRadiance } from './itemRadiance';

test('novas raridades têm apresentação legível e brilho próprio acima de Divino', () => {
  const rarities = [
    ['celestial', 'Celestial'],
    ['astral', 'Astral'],
    ['primordial', 'Primordial'],
    ['transcendent', 'Transcendente'],
    ['obsidian', 'Obsidiana Oculta'],
  ] as const;
  const divineStrength = getItemRadiance('divine').strength;

  for (const [rarity, label] of rarities) {
    const style = DESIGN_TOKENS.colors.rarity[rarity];
    assert.equal(style.label, label);
    assert.ok(style.border.length > 0 && style.textOnDark.length > 0 && style.badgeBg.length > 0);
    assert.ok(getItemRadiance(rarity).strength > divineStrength);
    assert.ok(getItemRadiance(rarity).color.length > 0);
  }
  assert.equal(DESIGN_TOKENS.colors.rarity.obsidian.badgeBg, '#08090D');
});
