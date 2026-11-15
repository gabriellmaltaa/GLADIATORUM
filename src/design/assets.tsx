import React, { useState } from 'react';
import vigiliaKeyArt from '../assets/images/vigilia-key-art.jpg';
import heroAtlas from '../assets/images/vigilia-heroes-atlas.png';
import expeditionRuinsImg from '../assets/images/expedition_ruins_1794015148681.jpg';

/**
 * CATÁLOGO CENTRAL DE RECURSOS GRÁFICOS (ASSETS)
 * Importações estáticas via bundler garantem funcionamento tanto em dev quanto em produção.
 * Todos os ícones de itens compartilham enquadramento 64x64, iluminação de tocha a 35°
 * e acabamento em bronze envelhecido, ferro batido, couro e carmesim romano.
 */

export const IMAGE_ASSETS = {
  titleBackdrop: vigiliaKeyArt,
  playerPortrait: heroAtlas,
  expeditionBanner: expeditionRuinsImg,
} as const;

export type ItemIconId =
  | 'gladius_iron'
  | 'gladius_bronze'
  | 'spatha_imperial'
  | 'pugio_assassin'
  | 'trident_neptune'
  | 'scutum_wood'
  | 'scutum_legion'
  | 'parma_bronze'
  | 'aegis_praetorian'
  | 'galea_recruit'
  | 'galea_murmillo'
  | 'galea_centurion'
  | 'lorica_leather'
  | 'lorica_hamata'
  | 'lorica_segmentata'
  | 'manica_leather'
  | 'manica_bronze'
  | 'manica_iron'
  | 'caligae_leather'
  | 'ocrea_bronze'
  | 'ocrea_imperial'
  | 'anulus_bronze'
  | 'anulus_ruby'
  | 'bulla_mars'
  | 'bulla_jupiter'
  | 'bandage_linen'
  | 'unguent_galen'
  | 'potion_crimson'
  | 'elixir_aesculapius'
  | 'amphora_falernian'
  | 'panacea_apollo';

export type EnemyAvatarId =
  | 'deserter'
  | 'wolf'
  | 'brigand'
  | 'secutor'
  | 'retiarius'
  | 'centurion'
  | 'cultist'
  | 'praetorian_boss';

interface ArtworkImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackType?: 'portrait' | 'banner';
  loading?: 'lazy' | 'eager';
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  className = '',
  fallbackType = 'portrait',
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden bg-[#211711] text-[#B8A686] ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg viewBox="0 0 120 120" className="w-16 h-16 opacity-85">
          <defs>
            <radialGradient id="fallbackGlow" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#947044" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#17120F" stopOpacity="0.95" />
            </radialGradient>
          </defs>
          <rect width="120" height="120" fill="url(#fallbackGlow)" />
          <path
            d="M60 18 L86 34 L82 74 L60 98 L38 74 L34 34 Z"
            fill="#2B2119"
            stroke="#947044"
            strokeWidth="3"
          />
          <path d="M60 28 L60 88 M44 48 L76 48" stroke="#B79552" strokeWidth="2.5" />
        </svg>
        {fallbackType === 'banner' && (
          <span className="mt-1 text-xs font-roman tracking-wider text-[#D6C29A]">{alt}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
};

export const HeroPortrait: React.FC<{ name: string; className?: string; archetype?: 'sentinel' | 'weaver' | 'vanguard' | 'oracle' }> = ({ name, className = '', archetype = 'sentinel' }) => {
  const column = { sentinel: 0, weaver: 1, vanguard: 2, oracle: 3 }[archetype];
  return <div role="img" aria-label={`Retrato de ${name}`} className={`hero-portrait ${className}`} style={{ backgroundImage: `url(${heroAtlas})`, backgroundPosition: `${column * 33.333}% 12%` }} />;
};

/**
 * Ícone pictórico de item com silhuetas imediatamente distinguíveis por categoria
 * (Espadas, Adagas, Escudos, Elmos, Armaduras, Manoplas, Grevas, Anéis e Amuletos).
 */
export { ItemArtwork } from './ItemArtwork';

/**
 * Retrato de inimigo ou oponente mantendo a direção de arte pictórica histórica.
 */
export const EnemyPortrait: React.FC<{
  avatarId: EnemyAvatarId;
  name: string;
  className?: string;
}> = ({ avatarId, name, className = 'w-16 h-16' }) => {
  if (avatarId !== 'wolf') {
    const hero = avatarId === 'brigand' || avatarId === 'deserter' ? 'weaver' : avatarId === 'retiarius' || avatarId === 'cultist' ? 'oracle' : avatarId === 'praetorian_boss' ? 'vanguard' : 'sentinel';
    return <div className={`relative overflow-hidden frame-bronze bg-[#101b2b] ${className}`}><HeroPortrait name={name} archetype={hero} className="w-full h-full"/>{avatarId === 'praetorian_boss' && <div className="absolute inset-0 ring-2 ring-inset ring-violet-300/70 pointer-events-none"/>}</div>;
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden frame-bronze bg-[#101b2b] ${className}`}
      role="img"
      aria-label={name}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full">
        <defs>
          <radialGradient id={`enemyGrad_${avatarId}`} cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#23536c" />
            <stop offset="65%" stopColor="#18273b" />
            <stop offset="100%" stopColor="#09111e" />
          </radialGradient>
        </defs>
        <rect width="80" height="80" fill={`url(#enemyGrad_${avatarId})`} />
        {avatarId === 'wolf' ? (
          <g>
            <path
              d="M20 62 L26 32 L20 16 L33 25 L47 25 L60 16 L54 32 L60 62 Z"
              fill="#516277"
              stroke="#09111e"
              strokeWidth="2"
            />
            <circle cx="33" cy="36" r="2.6" fill="#69e7ff" />
            <circle cx="47" cy="36" r="2.6" fill="#69e7ff" />
            <path d="M34 47 L40 52 L46 47" fill="none" stroke="#EFE2C4" strokeWidth="2" />
          </g>
        ) : (
          <g>
            {/* Silhueta pictórica de combatente romano com elmo e ombreiras */}
            <path
              d="M14 76 C16 54 64 54 66 76 Z"
              fill={avatarId === 'brigand' ? '#37556b' : '#4e3b87'}
              stroke="#09111e"
              strokeWidth="2"
            />
            <path
              d="M25 34 C25 20 55 20 55 34 L56 44 L48 47 L44 39 L36 39 L32 47 L24 44 Z"
              fill="#203c55"
              stroke="#09111e"
              strokeWidth="2"
            />
            <path d="M25 40L29 22L40 17L51 22L55 40L49 47H31Z" fill="none" stroke="#69e7ff" strokeWidth="2" />
            <line x1="28" y1="34" x2="52" y2="34" stroke="#b7f4ff" strokeWidth="1.5" />
            <circle cx="35" cy="37" r="2" fill="#b7f4ff" />
            <circle cx="45" cy="37" r="2" fill="#b7f4ff" />
          </g>
        )}
      </svg>
    </div>
  );
};

