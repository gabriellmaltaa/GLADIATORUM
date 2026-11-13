import test from 'node:test';
import assert from 'node:assert/strict';
import { getItemRadiance } from './itemRadiance';

test('aura de item depende da raridade e cresce sem afetar atributos', () => {
  assert.equal(getItemRadiance('common').strength, 0);
  assert.equal(getItemRadiance('uncommon').strength, 0);
  const rarities = ['rare', 'epic', 'legendary', 'mythic', 'imperial', 'divine'] as const;
  const effects = rarities.map(getItemRadiance);
  effects.forEach((effect, index) => {
    assert.ok(effect.strength > (index ? effects[index - 1].strength : 0));
    assert.ok(effect.strength <= 1);
    assert.match(effect.color, /^#[0-9a-f]{6}$/i);
  });
  assert.equal(new Set(effects.map(e => e.color)).size, 6);
  assert.equal(getItemRadiance(undefined).strength, 0);
});
