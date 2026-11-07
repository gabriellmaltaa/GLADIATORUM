import React, { useState } from 'react';
import titleBgImg from '../assets/images/title_bg_1794015146150.jpg';
import gladiatorPortraitImg from '../assets/images/gladiator_portrait_1794015147183.jpg';
import expeditionRuinsImg from '../assets/images/expedition_ruins_1794015148681.jpg';
import enemyChampionImg from '../assets/images/enemy_champion_1794015149273.jpg';

/**
 * CATÁLOGO CENTRAL DE RECURSOS GRÁFICOS (ASSETS)
 * Importações estáticas via bundler garantem funcionamento tanto em dev quanto em produção.
 * Todos os ícones de itens compartilham enquadramento 64x64, iluminação de tocha a 35°
 * e acabamento em bronze envelhecido, ferro batido, couro e carmesim romano.
 */

export const IMAGE_ASSETS = {
  titleBackdrop: titleBgImg,
  playerPortrait: gladiatorPortraitImg,
  expeditionBanner: expeditionRuinsImg,
  championPortrait: enemyChampionImg,
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
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  className = '',
  fallbackType = 'portrait',
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
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
};

/**
 * Ícone pictórico de item com silhuetas imediatamente distinguíveis por categoria
 * (Espadas, Adagas, Escudos, Elmos, Armaduras, Manoplas, Grevas, Anéis e Amuletos).
 */
export const ItemArtwork: React.FC<{ iconId: ItemIconId; size?: number; className?: string }> = ({
  iconId,
  size = 44,
  className = '',
}) => {
  const renderWeaponOrGear = () => {
    switch (iconId) {
      case 'gladius_iron':
      case 'gladius_bronze':
      case 'spatha_imperial': {
        const isGold = iconId === 'spatha_imperial';
        const isBronze = iconId === 'gladius_bronze';
        const bladeFill = isGold ? '#E5C170' : isBronze ? '#C89D66' : '#C2C8CE';
        const bladeShadow = isGold ? '#9A7836' : isBronze ? '#7E5A2F' : '#6E767E';
        const hiltFill = isGold ? '#792B28' : '#5E4527';
        return (
          <g>
            {/* Lâmina chanfrada de duplo plano */}
            <polygon points="50,10 54,14 27,41 23,37" fill={bladeFill} stroke="#140F0C" strokeWidth="1.4" />
            <polygon points="54,14 27,41 25,39 50,10" fill={bladeShadow} opacity="0.55" />
            <polygon points="54,10 50,10 54,14" fill="#EFE2C4" />
            {/* Guarda romana em bronze */}
            <rect
              x="17"
              y="35"
              width="14"
              height="4.5"
              rx="1.5"
              transform="rotate(45 24 37)"
              fill="#B79552"
              stroke="#140F0C"
              strokeWidth="1.3"
            />
            {/* Empunhadura torneada e pomo */}
            <path d="M18 41 L23 46 L16 53 L11 48 Z" fill={hiltFill} stroke="#140F0C" strokeWidth="1.3" />
            <circle cx="12" cy="52" r="4" fill="#D4B26A" stroke="#140F0C" strokeWidth="1.3" />
          </g>
        );
      }
      case 'pugio_assassin': {
        return (
          <g>
            {/* Lâmina foliforme larga de Púgio romano */}
            <path
              d="M48 12 C50 20 42 32 28 40 L24 36 C32 22 44 14 48 12 Z"
              fill="#C7CED4"
              stroke="#140F0C"
              strokeWidth="1.5"
            />
            <line x1="46" y1="15" x2="27" y2="37" stroke="#792B28" strokeWidth="1.4" />
            <path d="M19 34 L30 45 L27 48 L16 37 Z" fill="#792B28" stroke="#140F0C" strokeWidth="1.3" />
            <circle cx="13" cy="51" r="3.5" fill="#B79552" stroke="#140F0C" strokeWidth="1.3" />
          </g>
        );
      }
      case 'trident_neptune': {
        return (
          <g>
            <line x1="12" y1="52" x2="42" y2="22" stroke="#6B4E2E" strokeWidth="3.5" />
            <path
              d="M35 13 L49 15 L40 24 M42 9 L54 10 L42 22 M51 15 L49 29 L40 24"
              fill="none"
              stroke="#D4B26A"
              strokeWidth="2.2"
            />
            <circle cx="38" cy="26" r="2.8" fill="#792B28" stroke="#140F0C" strokeWidth="1" />
          </g>
        );
      }
      case 'scutum_wood':
      case 'scutum_legion':
      case 'aegis_praetorian': {
        const isCrimson = iconId === 'scutum_legion';
        const isBlack = iconId === 'aegis_praetorian';
        const bodyFill = isBlack ? '#2B2523' : isCrimson ? '#792B28' : '#63462D';
        const trimStroke = isBlack ? '#D4B26A' : '#B79552';
        return (
          <g>
            <rect
              x="16"
              y="10"
              width="32"
              height="44"
              rx="4"
              fill={bodyFill}
              stroke={trimStroke}
              strokeWidth="2.5"
            />
            <rect
              x="20"
              y="14"
              width="24"
              height="36"
              fill="none"
              stroke="#D6C29A"
              strokeWidth="1"
              opacity="0.45"
            />
            {/* Asas de raio / águia legionária */}
            <path d="M22 22 L42 42 M42 22 L22 42" stroke="#D4B26A" strokeWidth="2" opacity="0.85" />
            <circle cx="32" cy="32" r="6" fill="#B79552" stroke="#140F0C" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="2" fill="#EFE2C4" />
          </g>
        );
      }
      case 'parma_bronze': {
        return (
          <g>
            <circle cx="32" cy="32" r="20" fill="#947044" stroke="#D4B26A" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="14" fill="#6E502E" stroke="#30251A" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="5.5" fill="#EFE2C4" stroke="#140F0C" strokeWidth="1.5" />
          </g>
        );
      }
      case 'galea_recruit':
      case 'galea_murmillo':
      case 'galea_centurion': {
        const hasCrest = iconId !== 'galea_recruit';
        const crestColor = iconId === 'galea_centurion' ? '#8E2A26' : '#D4B26A';
        return (
          <g>
            {hasCrest && (
              <path
                d="M20 17 C24 7 40 7 46 17 L40 23 L24 23 Z"
                fill={crestColor}
                stroke="#140F0C"
                strokeWidth="1.5"
              />
            )}
            <path
              d="M17 32 C17 19 47 19 47 32 L49 46 L40 50 L36 39 L28 39 L24 50 L15 46 Z"
              fill="#A67E4E"
              stroke="#140F0C"
              strokeWidth="1.8"
            />
            <path d="M20 33 L44 33" stroke="#EFE2C4" strokeWidth="1.6" />
            <rect x="23" y="35" width="6" height="6" fill="#140F0C" />
            <rect x="35" y="35" width="6" height="6" fill="#140F0C" />
          </g>
        );
      }
      case 'lorica_leather':
      case 'lorica_hamata':
      case 'lorica_segmentata': {
        const isIron = iconId === 'lorica_hamata';
        const isPlate = iconId === 'lorica_segmentata';
        const fill = isPlate ? '#9A846B' : isIron ? '#777D84' : '#68492E';
        return (
          <g>
            <path
              d="M16 15 L25 13 L32 19 L39 13 L48 15 L52 26 L44 30 L43 51 L21 51 L20 30 L12 26 Z"
              fill={fill}
              stroke="#140F0C"
              strokeWidth="1.8"
            />
            <line x1="22" y1="26" x2="42" y2="26" stroke="#D4B26A" strokeWidth="1.6" />
            <line x1="22" y1="33" x2="42" y2="33" stroke="#D4B26A" strokeWidth="1.6" />
            <line x1="22" y1="40" x2="42" y2="40" stroke="#D4B26A" strokeWidth="1.6" />
            <line x1="32" y1="19" x2="32" y2="50" stroke="#140F0C" strokeWidth="1.2" opacity="0.5" />
          </g>
        );
      }
      case 'manica_leather':
      case 'manica_bronze':
      case 'manica_iron': {
        const fill =
          iconId === 'manica_bronze'
            ? '#A47D4D'
            : iconId === 'manica_iron'
            ? '#7E848C'
            : '#6B4C30';
        return (
          <g>
            <path
              d="M19 15 L41 13 L47 45 L23 49 Z"
              fill={fill}
              stroke="#140F0C"
              strokeWidth="1.8"
            />
            <line x1="20" y1="23" x2="43" y2="21" stroke="#D6C29A" strokeWidth="1.5" opacity="0.75" />
            <line x1="21" y1="31" x2="44" y2="29" stroke="#D6C29A" strokeWidth="1.5" opacity="0.75" />
            <line x1="22" y1="39" x2="45" y2="37" stroke="#D6C29A" strokeWidth="1.5" opacity="0.75" />
          </g>
        );
      }
      case 'caligae_leather':
      case 'ocrea_bronze':
      case 'ocrea_imperial': {
        const fill =
          iconId === 'ocrea_imperial'
            ? '#C29B56'
            : iconId === 'ocrea_bronze'
            ? '#9A7447'
            : '#63462B';
        return (
          <g>
            <path
              d="M23 13 L39 13 L38 38 L49 45 L47 51 L20 51 L20 38 Z"
              fill={fill}
              stroke="#140F0C"
              strokeWidth="1.8"
            />
            <line x1="23" y1="21" x2="38" y2="21" stroke="#D4B26A" strokeWidth="1.5" />
            <line x1="22" y1="30" x2="38" y2="30" stroke="#D4B26A" strokeWidth="1.5" />
          </g>
        );
      }
      case 'anulus_bronze':
      case 'anulus_ruby': {
        const hasRuby = iconId === 'anulus_ruby';
        return (
          <g>
            <circle cx="32" cy="35" r="13" fill="none" stroke="#C29B56" strokeWidth="5" />
            <circle cx="32" cy="35" r="13" fill="none" stroke="#EFE2C4" strokeWidth="1" opacity="0.6" />
            {hasRuby ? (
              <polygon
                points="32,14 39,21 32,27 25,21"
                fill="#9E2A27"
                stroke="#EFE2C4"
                strokeWidth="1.3"
              />
            ) : (
              <rect
                x="27"
                y="18"
                width="10"
                height="5"
                rx="1"
                fill="#947044"
                stroke="#140F0C"
                strokeWidth="1.2"
              />
            )}
          </g>
        );
      }
      case 'bulla_mars':
      case 'bulla_jupiter': {
        const isJupiter = iconId === 'bulla_jupiter';
        return (
          <g>
            <path d="M19 12 Q32 28 45 12" fill="none" stroke="#B79552" strokeWidth="2.2" />
            <circle
              cx="32"
              cy="37"
              r="13"
              fill={isJupiter ? '#B79552' : '#792B28'}
              stroke="#EFE2C4"
              strokeWidth="1.8"
            />
            <path d="M32 28 L36 36 L31 37 L35 45 L27 37 L32 36 Z" fill="#EFE2C4" />
          </g>
        );
      }
      case 'bandage_linen': {
        return (
          <g>
            {/* Rolo de atadura de linho romano com cruz carmesim do Medicus */}
            <rect
              x="14"
              y="22"
              width="36"
              height="22"
              rx="6"
              fill="#D6C29A"
              stroke="#140F0C"
              strokeWidth="1.8"
            />
            <ellipse cx="46" cy="33" rx="4" ry="11" fill="#B8A686" stroke="#140F0C" strokeWidth="1.4" />
            <line x1="22" y1="22" x2="22" y2="44" stroke="#947044" strokeWidth="1.2" opacity="0.6" />
            <line x1="36" y1="22" x2="36" y2="44" stroke="#947044" strokeWidth="1.2" opacity="0.6" />
            <path d="M29 27 L29 39 M23 33 L35 33" stroke="#8F2D2A" strokeWidth="3.2" />
          </g>
        );
      }
      case 'unguent_galen': {
        return (
          <g>
            {/* Pote de terracota e bronze de Unguento de Galeno */}
            <rect x="23" y="14" width="18" height="6" rx="2" fill="#B79552" stroke="#140F0C" strokeWidth="1.5" />
            <path
              d="M19 20 L45 20 L48 34 C48 46 41 51 32 51 C23 51 16 46 16 34 Z"
              fill="#4E7A45"
              stroke="#D4B26A"
              strokeWidth="1.8"
            />
            <path d="M32 27 L32 43 M24 35 L40 35" stroke="#EFE2C4" strokeWidth="2.8" />
          </g>
        );
      }
      case 'potion_crimson': {
        return (
          <g>
            {/* Frasco de vidro soprado romano com Elixir de Mel e Papoula */}
            <rect x="27" y="10" width="10" height="5" fill="#947044" stroke="#140F0C" strokeWidth="1.3" />
            <path d="M28 15 L36 15 L37 23 L46 34 C48 44 42 52 32 52 C22 52 16 44 18 34 L27 23 Z" fill="#8F2D2A" stroke="#D4B26A" strokeWidth="1.8" />
            <path d="M22 36 Q32 40 42 36" fill="none" stroke="#EFE2C4" strokeWidth="1.5" opacity="0.75" />
            <circle cx="28" cy="32" r="2.5" fill="#EFE2C4" opacity="0.7" />
          </g>
        );
      }
      case 'amphora_falernian': {
        return (
          <g>
            {/* Ânfora clássica de Vinho Falerno Medicinal com alças duplas */}
            <path d="M24 14 Q15 20 20 30 M40 14 Q49 20 44 30" fill="none" stroke="#D4B26A" strokeWidth="2.5" />
            <rect x="26" y="10" width="12" height="5" fill="#B79552" stroke="#140F0C" strokeWidth="1.3" />
            <path
              d="M27 15 L37 15 L43 29 C45 39 38 49 32 53 C26 49 19 39 21 29 Z"
              fill="#792B28"
              stroke="#D4B26A"
              strokeWidth="1.8"
            />
            <line x1="22" y1="31" x2="42" y2="31" stroke="#EFE2C4" strokeWidth="1.6" />
          </g>
        );
      }
      case 'elixir_aesculapius': {
        return (
          <g>
            {/* Cálice e Bastão de Esculápio */}
            <line x1="32" y1="10" x2="32" y2="52" stroke="#D4B26A" strokeWidth="3" />
            <circle cx="32" cy="11" r="3.5" fill="#EFE2C4" stroke="#140F0C" strokeWidth="1.2" />
            <path
              d="M22 19 C38 23 20 33 41 38 C28 43 36 48 32 50"
              fill="none"
              stroke="#88B87E"
              strokeWidth="2.8"
            />
            <path d="M18 26 Q32 36 46 26" fill="none" stroke="#B79552" strokeWidth="2" />
          </g>
        );
      }
      case 'panacea_apollo': {
        return (
          <g>
            {/* Relicário Solar da Panaceia Divina de Apolo */}
            <circle cx="32" cy="32" r="20" fill="#103330" stroke="#5EC2B7" strokeWidth="2.2" />
            <circle cx="32" cy="32" r="13" fill="#D4AF37" stroke="#EFE2C4" strokeWidth="1.6" />
            <path d="M32 22 L32 42 M22 32 L42 32" stroke="#103330" strokeWidth="3.2" />
            <circle cx="32" cy="32" r="3" fill="#EFE2C4" />
          </g>
        );
      }
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`slotBg_${iconId}`} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#3E2D1F" />
          <stop offset="65%" stopColor="#211711" />
          <stop offset="100%" stopColor="#120C09" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="3" fill={`url(#slotBg_${iconId})`} />
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="2"
        fill="none"
        stroke="#947044"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      {renderWeaponOrGear()}
    </svg>
  );
};

/**
 * Retrato de inimigo ou oponente mantendo a direção de arte pictórica histórica.
 */
export const EnemyPortrait: React.FC<{
  avatarId: EnemyAvatarId;
  name: string;
  className?: string;
}> = ({ avatarId, name, className = 'w-16 h-16' }) => {
  if (avatarId === 'secutor' || avatarId === 'centurion' || avatarId === 'praetorian_boss') {
    return (
      <div className={`relative overflow-hidden frame-bronze bg-[#17120F] ${className}`}>
        <ArtworkImage
          src={IMAGE_ASSETS.championPortrait}
          alt={name}
          className="w-full h-full object-cover"
        />
        {avatarId === 'praetorian_boss' && (
          <div className="absolute inset-0 ring-2 ring-inset ring-[#B79552] pointer-events-none" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden frame-bronze bg-[#211711] ${className}`}
      role="img"
      aria-label={name}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full">
        <defs>
          <radialGradient id={`enemyGrad_${avatarId}`} cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#5E4527" />
            <stop offset="65%" stopColor="#241A14" />
            <stop offset="100%" stopColor="#120D0A" />
          </radialGradient>
        </defs>
        <rect width="80" height="80" fill={`url(#enemyGrad_${avatarId})`} />
        {avatarId === 'wolf' ? (
          <g>
            <path
              d="M20 62 L26 32 L20 16 L33 25 L47 25 L60 16 L54 32 L60 62 Z"
              fill="#4E4842"
              stroke="#140F0C"
              strokeWidth="2"
            />
            <circle cx="33" cy="36" r="2.6" fill="#D4B26A" />
            <circle cx="47" cy="36" r="2.6" fill="#D4B26A" />
            <path d="M34 47 L40 52 L46 47" fill="none" stroke="#EFE2C4" strokeWidth="2" />
          </g>
        ) : (
          <g>
            {/* Silhueta pictórica de combatente romano com elmo e ombreiras */}
            <path
              d="M14 76 C16 54 64 54 66 76 Z"
              fill={avatarId === 'brigand' ? '#5E4527' : '#792B28'}
              stroke="#140F0C"
              strokeWidth="2"
            />
            <path
              d="M25 34 C25 20 55 20 55 34 L56 44 L48 47 L44 39 L36 39 L32 47 L24 44 Z"
              fill="#947044"
              stroke="#140F0C"
              strokeWidth="2"
            />
            <line x1="28" y1="33" x2="52" y2="33" stroke="#EFE2C4" strokeWidth="1.5" />
            <circle cx="35" cy="36" r="2" fill="#EFE2C4" />
            <circle cx="45" cy="36" r="2" fill="#EFE2C4" />
          </g>
        )}
      </svg>
    </div>
  );
};
