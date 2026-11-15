import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { shouldConcealRewardItem } from './rewardPresentation';

test('o jackpot Obsidiano permanece selado no painel até resgatar a recompensa', () => {
  assert.equal(shouldConcealRewardItem({ rarity: 'obsidian' }, false), true);
  assert.equal(shouldConcealRewardItem({ rarity: 'obsidian' }, true), false);
  assert.equal(shouldConcealRewardItem({ rarity: 'divine' }, false), false);
});

test('A navegação da Cidade mantém os sete locais dentro da altura mobile do panorama', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/design/roman-identity.css'), 'utf8');
  const mobileCityLayout = css.match(/\.city-panorama \{ min-height: 650px; \}\s*\.city-locations \{[^}]+\}/)?.[0];
  assert.ok(mobileCityLayout, 'as regras mobile da Cidade devem permanecer agrupadas');
  assert.match(mobileCityLayout, /gap: 10px 4px;/);
});

test('Revisão estética e textual mantém CTA Google unificado, raridade textual no slot e ornamento discreto sem estrela animada', () => {
  const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const romanComponentsSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/RomanComponents.tsx'), 'utf8');
  const artworkSource = fs.readFileSync(path.resolve(process.cwd(), 'src/design/ItemArtwork.tsx'), 'utf8');
  const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/design/roman-identity.css'), 'utf8');

  assert.match(appSource, /Conectar conta com Google/);
  assert.doesNotMatch(appSource, /Entrar com Google/);
  assert.match(appSource, /Modo visitante · progresso salvo neste navegador/);
  assert.match(romanComponentsSource, /rarityInfo\.label/);
  assert.match(romanComponentsSource, /Moldura e brilho indicam apenas a raridade visual/);
  assert.match(artworkSource, /item-portrait-ornament/);
  assert.doesNotMatch(artworkSource, /item-portrait-stars/);
  assert.doesNotMatch(cssSource, /\.item-portrait-stars/);
});

