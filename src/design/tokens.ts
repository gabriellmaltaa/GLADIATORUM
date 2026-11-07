/**
 * SISTEMA VISUAL CENTRALIZADO — FONTE ÚNICA DE VERDADE
 * Inspirado na estética clássica de RPG de navegador (Gladiatus) adaptada para dispositivos móveis.
 */

export const DESIGN_TOKENS = {
  colors: {
    bgDeep: '#17120F',
    panelDark: '#2B2119',
    panelWood: '#33251B',
    panelLeather: '#211711',
    parchment: '#D6C29A',
    parchmentDark: '#C2AB7E',
    bronze: '#947044',
    bronzeDark: '#5E4527',
    iron: '#5A524C',
    goldAged: '#B79552',
    goldBright: '#D4B26A',
    crimsonRoman: '#792B28',
    crimsonDark: '#541B19',
    textOnDark: '#EFE2C4',
    textMutedOnDark: '#B8A686',
    textOnParchment: '#30251A',
    textMutedOnParchment: '#5C4935',
    semantic: {
      health: '#8F2D2A',
      healthTrail: '#C4514E',
      xp: '#B79552',
      energy: '#4B7A47',
      danger: '#9E332E',
      success: '#3E6B3A',
      warning: '#B78338',
    },
    rarity: {
      common: {
        id: 'common',
        label: 'Comum',
        border: '#6E6256',
        textOnDark: '#D8CBB8',
        textOnParchment: '#4A3B2C',
        badgeBg: '#3A312A',
      },
      uncommon: {
        id: 'uncommon',
        label: 'Incomum',
        border: '#4E7A45',
        textOnDark: '#88B87E',
        textOnParchment: '#295221',
        badgeBg: '#23381F',
      },
      rare: {
        id: 'rare',
        label: 'Raro',
        border: '#496B8C',
        textOnDark: '#87B0D6',
        textOnParchment: '#1F4263',
        badgeBg: '#1E2F40',
      },
      epic: {
        id: 'epic',
        label: 'Épico',
        border: '#7D4E8D',
        textOnDark: '#C394D4',
        textOnParchment: '#512361',
        badgeBg: '#311D38',
      },
      legendary: {
        id: 'legendary',
        label: 'Lendário',
        border: '#B79552',
        textOnDark: '#E5C170',
        textOnParchment: '#7A5414',
        badgeBg: '#3D2E14',
      },
      mythic: {
        id: 'mythic',
        label: 'Mítico',
        border: '#C84B31',
        textOnDark: '#FF9B85',
        textOnParchment: '#7A200E',
        badgeBg: '#3D1610',
      },
      imperial: {
        id: 'imperial',
        label: 'Imperial',
        border: '#D4AF37',
        textOnDark: '#FFE484',
        textOnParchment: '#664B00',
        badgeBg: '#3B2E0C',
      },
      divine: {
        id: 'divine',
        label: 'Divino',
        border: '#5EC2B7',
        textOnDark: '#8CF0E5',
        textOnParchment: '#115952',
        badgeBg: '#103330',
      },
    },
  },
  typography: {
    fontDisplay: "'Cinzel', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    scale: {
      xs: '0.75rem',     // 12px
      sm: '0.8125rem',   // 13px
      base: '0.875rem',  // 14px
      md: '1rem',        // 16px
      lg: '1.125rem',    // 18px
      xl: '1.375rem',    // 22px
      xxl: '1.75rem',    // 28px
    },
  },
  spacing: {
    px4: '4px',
    px8: '8px',
    px12: '12px',
    px16: '16px',
    px24: '24px',
    px32: '32px',
  },
  frames: {
    borderThin: '1px',
    borderStandard: '2px',
    radiusSharp: '2px',
    radiusSmall: '4px',
  },
  iconSizes: {
    sm: 18,
    md: 24,
    lg: 36,
    slot: 56,
  },
  zIndex: {
    base: 1,
    stickyBar: 20,
    bottomNav: 30,
    modalBackdrop: 40,
    modalContent: 50,
    notification: 60,
  },
} as const;

export type RarityKey = keyof typeof DESIGN_TOKENS.colors.rarity;

/**
 * Registro transparente do que foi derivado da tradição visual clássica de Gladiatus
 * versus o que foi proposto especificamente para esta adaptação mobile idle.
 * Nota de transparência: Nenhuma imagem ou captura externa veio anexada na mensagem inicial,
 * portanto documentamos explicitamente os padrões clássicos observados na referência histórica
 * do gênero e as propostas de adaptação para tela vertical e progressão idle.
 */
export const VISUAL_SYSTEM_AUDIT = {
  transparencyNotice:
    'Nota de Transparência: Nenhuma captura de tela externa foi recebida como anexo na requisição. Os padrões abaixo diferenciam rigorosamente as convenções visuais clássicas de Gladiatus (RPG de navegador) das soluções propostas para a composição mobile vertical e camada idle.',
  observedConventions: [
    'Contraste estrutural entre fundo de pedra escura (#17120F / #2B2119) e áreas de leitura em pergaminho envelhecido (#D6C29A).',
    'Molduras retangulares chanfradas em bronze (#947044) e ferro com cantoneiras pregueadas, sem bordas arredondadas estilo SaaS moderno.',
    'Disposição clássica de "paper-doll" na tela de Personagem: retrato pictórico central ladeado por slots quadrados de equipamento e tabela densa de atributos abaixo.',
    'Relatórios de combate tabulares com comparação de atributos lado a lado e registro turno a turno de ataques, bloqueios e críticos.',
    'Iconografia pictórica consistente sobre fundo de couro escuro nos slots de inventário e mercado.',
  ],
  proposedAdaptations: [
    'Barra superior compacta (ResourceBar) consolidando Nível, Ouro, Vida e Energia de Expedição/Arena sem ultrapassar o limite ergonômico mobile.',
    'Navegação inferior persistente (BottomNavigation) com 5 destinos de toque >= 44x44px (Personagem, Expedições, Arena, Inventário, Cidade).',
    'Agrupamento de Treinamento, Mercado e Masmorras sob a aba Cidade com sub-abas em placas de bronze.',
    'Painel de Comando Idle nas Expedições e Masmorras: ciclo automático baseado em timestamps reais, limite offline de 8 horas e resgate idempotente.',
  ],
};
