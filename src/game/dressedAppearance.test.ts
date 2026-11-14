import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_TEMPLATES, type GameItem } from './config';
import { getDressedParts } from './dressedAppearance';

test('cada equipamento do catálogo possui uma variante vestida independente', () => {
  for (const template of Object.values(ITEM_TEMPLATES).filter(item => !item.consumable)) {
    const item: GameItem = { ...template, id: 'visual-test' };
    const parts = getDressedParts({ [item.slot]: item });
    assert.equal(parts.length, 1, item.templateId);
    assert.equal(parts[0].item, item);
    assert.equal(parts[0].slot, item.slot);
    assert.ok(parts[0].variant >= 0, item.iconId);
  }
});

test('combinações não criam equipamentos extras e remover tudo restaura corpo vazio', () => {
  const templates = Object.values(ITEM_TEMPLATES).filter(item => !item.consumable);
  const equipped = Object.fromEntries(templates.map(item => [item.slot, { ...item, id: item.templateId }]));
  const snapshot = JSON.stringify(equipped);
  assert.equal(getDressedParts(equipped).length, 8);
  assert.equal(getDressedParts({ weapon: equipped.weapon, gloves: equipped.gloves }).length, 2);
  assert.deepEqual(getDressedParts({}), []);
  assert.equal(JSON.stringify(equipped), snapshot);
  assert.deepEqual(getDressedParts({ helmet: equipped.weapon }), []);
});
