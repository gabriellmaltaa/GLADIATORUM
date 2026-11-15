import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_IDENTITY, getHeroTitle, getHeroicItemName, NAVIGATION_LABELS } from './heroIdentity.ts';

test('public identity names the original Vigília setting and core modes', () => {
  assert.deepEqual(GAME_IDENTITY, {
    name: 'Vigília',
    subtitle: 'Heróis do Limiar',
    tagline: 'O mundo está por um fio. O que você escolhe proteger?',
    description:
      'Um RPG online de heróis e anti-heróis: forme alianças, equipe artefatos, cumpra operações e enfrente rivais em simulações competitivas.',
  });
  assert.deepEqual(NAVIGATION_LABELS, {
    character: 'Herói',
    expeditions: 'Operações',
    arena: 'Simulação',
    inventory: 'Equipamento',
    city: 'Agência',
  });
});

test('hero ranks advance every ten levels and rank one earns the top title', () => {
  assert.equal(getHeroTitle(1, 2), 'Recruta da Vigília');
  assert.equal(getHeroTitle(10, 2), 'Vanguarda');
  assert.equal(getHeroTitle(20, 2), 'Guardião do Limiar');
  assert.equal(getHeroTitle(150, 2), 'Ícone Supremo');
  assert.equal(getHeroTitle(1, 1), 'Lenda do Limiar');
  assert.equal(getHeroTitle(150, 1), 'Lenda do Limiar');
  assert.equal(getHeroTitle(Number.NaN, null), 'Recruta da Vigília');
});

test('equipment display uses original hero-world names without changing stored items', () => {
  assert.equal(getHeroicItemName('Gládio de Ferro do Recruta'), 'Lâmina Cinética de Ferro do Recruta');
  assert.equal(getHeroicItemName('Scutum de Carvalho Reforçado'), 'Barreira de Carvalho Reforçado');
  assert.equal(getHeroicItemName('Lorica Hamata Legionária'), 'Traje Hamata de Vanguarda');
  assert.equal(getHeroicItemName('Elmo Radiante de Sol Invictus'), 'Visor Radiante de Sol Invictus');
  assert.equal(getHeroicItemName('Elixir do Vigor'), 'Elixir do Vigor');
});

