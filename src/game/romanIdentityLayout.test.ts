import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('A navegação da Cidade mantém os sete locais dentro da altura mobile do panorama', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/design/roman-identity.css'), 'utf8');
  const mobileCityLayout = css.match(/\.city-panorama \{ min-height: 650px; \}\s*\.city-locations \{[^}]+\}/)?.[0];
  assert.ok(mobileCityLayout, 'as regras mobile da Cidade devem permanecer agrupadas');
  assert.match(mobileCityLayout, /gap: 10px 4px;/);
});
