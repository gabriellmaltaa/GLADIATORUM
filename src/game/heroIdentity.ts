export const GAME_IDENTITY = {
  name: 'Vigília',
  subtitle: 'Heróis do Limiar',
  tagline: 'O mundo está por um fio. O que você escolhe proteger?',
  description:
    'Um RPG online de heróis e anti-heróis: forme alianças, equipe artefatos, cumpra operações e enfrente rivais em simulações competitivas.',
} as const;

export const NAVIGATION_LABELS = {
  character: 'Herói',
  expeditions: 'Operações',
  arena: 'Simulação',
  inventory: 'Equipamento',
  city: 'Agência',
} as const;

const HERO_TITLES = [
  'Vanguarda',
  'Guardião do Limiar',
  'Estrategista',
  'Sentinela',
  'Condutor',
  'Operador Alfa',
  'Protetor',
  'Ícone',
  'Mito Urbano',
  'Herói do Limiar',
  'Lenda Viva',
  'Soberano da Vigília',
  'Farol da Humanidade',
  'Eterno da Vigília',
  'Ícone Supremo',
] as const;

export function getHeroTitle(level: number, rank: number | null): string {
  if (rank === 1) return 'Lenda do Limiar';
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  const milestone = Math.min(HERO_TITLES.length, Math.floor(safeLevel / 10));
  return milestone > 0 ? HERO_TITLES[milestone - 1] : 'Recruta da Vigília';
}

const EQUIPMENT_TERMS: Array<[string, string]> = [
  ['Gládio', 'Lâmina Cinética'],
  ['Gladius', 'Lâmina Cinética'],
  ['Spatha', 'Lâmina Longa'],
  ['Scutum', 'Barreira'],
  ['Parma', 'Escudo Tático'],
  ['Lorica', 'Traje'],
  ['Galea', 'Capacete'],
  ['Elmo', 'Visor'],
  ['Manica', 'Braçadeira'],
  ['Cáligas', 'Botas de Campo'],
  ['Caligae', 'Botas de Campo'],
  ['Ócreas', 'Grevas Táticas'],
  ['Grevas', 'Grevas Táticas'],
  ['Anulus', 'Anel de Energia'],
  ['Bulla', 'Amuleto Neural'],
  ['Legionária', 'de Vanguarda'],
  ['Imperial', 'de Elite'],
];

export function getHeroicItemName(name: string): string {
  return EQUIPMENT_TERMS.reduce(
    (displayName, [original, replacement]) => displayName.replaceAll(original, replacement),
    name
  );
}

