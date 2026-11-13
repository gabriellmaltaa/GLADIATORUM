import React, { useId } from 'react';
import type { ItemIconId } from './assets';

/** Sculpted miniature equipment: shared light, beveled metal and individual silhouettes. */
export function EquipmentArt({ iconId, size = 48, className = '' }: { iconId: ItemIconId; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const ref = (name: string) => `url(#${uid}-${name})`;
  const gold = /imperial|centurion|jupiter|neptune|praetorian|apollo/.test(iconId);
  const bronze = /bronze|recruit/.test(iconId);
  const leather = /leather|wood/.test(iconId);
  const metal = ref(gold ? 'gold' : bronze ? 'bronze' : 'steel');
  const red = '#a53536';
  const edge = '#0b0d12';
  let art: React.ReactNode;
  if (/gladius|spatha|pugio/.test(iconId)) {
    const dagger = iconId === 'pugio_assassin';
    art = <g transform="rotate(34 64 64)">
      <path d={dagger ? 'M64 13 Q82 35 76 62 L68 84H60L52 62Q46 35 64 13Z' : 'M64 4L75 24L72 83L64 90L56 83L53 24Z'} fill={metal} stroke={edge} strokeWidth="2" />
      <path d={dagger ? 'M64 16L65 79L55 61Q50 37 64 16' : 'M64 8L65 85L57 79L56 25Z'} fill="#e5eff2" opacity=".65" />
      <path d="M64 25V75" stroke="#ffffff" strokeOpacity=".65" strokeWidth="1" />
      {gold && <path d="M59 36L64 30L69 36L64 43Z M60 53L64 48L68 53L64 59Z" fill="#b38b42" />}
      <path d="M43 82Q64 75 85 82L86 88Q64 83 42 88Z" fill={ref('gold')} stroke={edge} strokeWidth="2" />
      <path d="M58 88H70L68 112H60Z" fill={ref('leather')} stroke={edge} strokeWidth="2" />
      {[93,99,105].map(y => <path key={y} d={`M59 ${y}L69 ${y-2}`} stroke="#d4b681" strokeWidth="2" />)}
      <ellipse cx="64" cy="115" rx="9" ry="5" fill={ref('gold')} stroke={edge} strokeWidth="2" />
      <circle cx="64" cy="84" r="4" fill={red} stroke="#eed092" />
    </g>;
  } else if (/trident/.test(iconId)) {
    art = <g transform="rotate(27 64 64)"><path d="M61 43H67V120H61Z" fill={ref('leather')} stroke={edge} strokeWidth="2" /><path d="M60 9L64 2L68 9V40Q86 39 86 24L82 15L91 6L96 20Q96 52 68 53V65H60V53Q32 52 32 20L37 6L46 15L42 24Q42 39 60 40Z" fill={ref('gold')} stroke={edge} strokeWidth="2" /><path d="M64 7V60M38 17Q37 47 60 47M90 17Q91 47 68 47" fill="none" stroke="#fff1bd" strokeWidth="1.5" /><circle cx="64" cy="47" r="6" fill="#4ba8a0" stroke="#e6c474" />{[72,88,104].map(y=><path key={y} d={`M60 ${y}H68`} stroke="#d8b36e" strokeWidth="3" />)}</g>;
  } else if (/scutum|aegis|parma/.test(iconId)) {
    const round = iconId === 'parma_bronze';
    art = <g transform="rotate(-9 64 64)">
      {round ? <circle cx="64" cy="63" r="47" fill={ref('bronze')} stroke="#e9cb8a" strokeWidth="3" /> : <path d="M27 14Q64 3 101 14L100 98Q65 123 28 98Z" fill={leather ? ref('leather') : ref('shield')} stroke={ref('gold')} strokeWidth="5" />}
      {round ? <circle cx="64" cy="63" r="37" fill="none" stroke="#71552f" strokeWidth="3" /> : <path d="M34 21Q64 13 94 21L93 94Q64 113 35 94Z" fill="none" stroke="#e2b769" strokeWidth="1.5" />}
      <path d="M59 49L42 30L46 48L33 44L49 59L39 62L55 66M69 49L86 30L82 48L95 44L79 59L89 62L73 66M58 73L43 93L57 86L59 102L65 80L71 102L73 86L87 93L72 73" fill={ref('gold')} stroke="#5d3d24" strokeWidth=".8" />
      <circle cx="64" cy="64" r="16" fill={ref('steel')} stroke="#f0d18a" strokeWidth="3" /><circle cx="61" cy="60" r="5" fill="#eef5ee" opacity=".65" />
      {[28,98].map(y=>[37,91].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#f6dca3" />))}
    </g>;
  } else if (/galea/.test(iconId)) {
    art = <g>
      {iconId !== 'galea_recruit' && <><path d="M36 43Q18 13 63 6Q102 7 97 37L80 41L71 25L49 29L46 45Z" fill={ref('crest')} stroke={edge} strokeWidth="2" />{[39,47,55,63,71,79,87].map(x=><path key={x} d={`M${x} 15L${x+3} 31`} stroke="#ed9c74" strokeOpacity=".6" />)}</>}
      <path d="M28 63Q24 30 63 27Q101 29 100 63L108 86L94 112L75 100L72 73H56L53 100L34 112L20 86Z" fill={metal} stroke={edge} strokeWidth="2.5" />
      <path d="M30 62Q65 48 100 62L100 70Q64 59 28 70Z" fill={ref('gold')} stroke={edge} strokeWidth="1.5" />
      <path d="M39 72L56 69L53 82L38 84ZM72 69L88 72L89 84L75 82Z" fill="#10141c" />
      <path d="M61 65H67L71 96L64 102L57 96Z" fill={ref('gold')} stroke={edge} />
      <path d="M31 53Q32 34 59 33M37 91L40 102M88 91L86 102" fill="none" stroke="#f9e9b7" strokeWidth="2" opacity=".8" />
      <circle cx="64" cy="44" r="6" fill={red} stroke="#edc57f" />
    </g>;
  } else if (/lorica/.test(iconId)) {
    art = <g><path d="M43 13L30 16L12 37L25 53L35 48L32 99L47 115H81L97 99L93 48L104 53L117 37L98 16L84 13L78 28H50Z" fill={leather ? ref('leather') : metal} stroke={edge} strokeWidth="3" />
      <path d="M43 14Q64 45 85 14L80 35H48Z" fill="#0b0e15" stroke={ref('gold')} strokeWidth="3" />
      {[45,58,71,84,97].map((y,i)=><g key={y}><path d={`M35 ${y}Q64 ${y+9} 94 ${y}L93 ${y+9}Q64 ${y+16} 35 ${y+9}Z`} fill={i%2 ? metal : ref('steel')} stroke="#14181d" strokeWidth="1.5" /><path d={`M38 ${y+2}Q64 ${y+9} 91 ${y+2}`} fill="none" stroke="#fbedd2" strokeOpacity=".55" /></g>)}
      <path d="M24 24L43 22L40 39L21 42ZM85 22L104 24L108 42L88 39Z" fill={ref('gold')} stroke={edge} strokeWidth="2" />
      <path d="M34 93H94V103H34Z" fill={ref('leather')} /><rect x="57" y="92" width="14" height="12" rx="2" fill="none" stroke="#e8c078" strokeWidth="3" />
      <path d="M46 104L43 119M56 105L55 123M72 105L73 123M82 104L85 119" stroke={ref('gold')} strokeWidth="6" />
    </g>;
  } else if (/manica/.test(iconId)) {
    art = <g transform="rotate(-18 64 64)"><path d="M36 15L84 15L93 93L79 115L49 113L31 91Z" fill={ref('leather')} stroke={edge} strokeWidth="3" />{[22,39,56,73].map(y=><g key={y}><path d={`M35 ${y}Q60 ${y+7} 87 ${y}L90 ${y+16}Q62 ${y+24} 33 ${y+16}Z`} fill={leather ? ref('bronze') : metal} stroke="#12151a" strokeWidth="2" /><path d={`M39 ${y+3}Q62 ${y+8} 84 ${y+3}`} stroke="#fff0c8" strokeWidth="1.5" fill="none" opacity=".75" /><circle cx="40" cy={y+11} r="2" fill="#e3bb72" /><circle cx="82" cy={y+11} r="2" fill="#e3bb72" /></g>)}<path d="M39 91L49 108H77L85 91" fill={metal} stroke={edge} strokeWidth="2" /><path d="M53 95V107M63 95V108M73 95V106" stroke="#0e1117" strokeWidth="2" /></g>;
  } else if (/caligae|ocrea/.test(iconId)) {
    art = <g transform="rotate(-8 64 64)"><path d="M35 10L81 12L78 78L105 94L101 112L28 112L26 91Z" fill={leather ? ref('leather') : metal} stroke={edge} strokeWidth="3" /><path d="M41 16L72 17L70 70L57 83L36 76Z" fill={ref('gold')} stroke="#5a4329" strokeWidth="2" /><path d="M46 20L49 65L56 73L64 65L67 20" fill="none" stroke="#f5dea6" strokeWidth="1.5" /><path d="M28 95L75 96L98 102L96 109H29Z" fill={ref('leather')} stroke={edge} strokeWidth="2" /><path d="M32 34L77 36M30 56L77 58M28 77L77 79" stroke="#493122" strokeWidth="6" /><rect x="65" y="30" width="12" height="12" fill="none" stroke="#eccb83" strokeWidth="2" /><path d="M29 114H100" stroke="#dfb877" strokeWidth="3" /><circle cx="56" cy="49" r="7" fill={metal} stroke="#efd290" /></g>;
  } else if (/anulus/.test(iconId)) {
    art = <g transform="rotate(-24 64 64)"><ellipse cx="64" cy="77" rx="31" ry="36" fill="none" stroke="#382714" strokeWidth="16" /><ellipse cx="64" cy="75" rx="30" ry="35" fill="none" stroke={ref('gold')} strokeWidth="11" /><path d="M35 71Q38 45 49 42M91 71Q88 45 79 42" stroke="#fae3a6" strokeWidth="2" fill="none" /><path d="M42 25L64 13L87 25L89 48L64 62L40 48Z" fill={ref('gold')} stroke={edge} strokeWidth="2" /><path d="M48 29L64 21L80 29L80 45L64 54L47 45Z" fill={iconId === 'anulus_ruby' ? ref('ruby') : ref('bronze')} stroke="#f8dba1" strokeWidth="2" /><path d="M48 29L64 35L64 54M64 21V35L80 29M64 35L80 45M64 35L47 45" stroke="#ffc8b4" strokeWidth="1" opacity=".65" /><path d="M50 28L59 24" stroke="#fff4d7" strokeWidth="3" /></g>;
  } else if (/bulla/.test(iconId)) {
    art = <g><path d="M28 9Q18 51 64 71Q110 51 100 9" fill="none" stroke="#4f3824" strokeWidth="6" /><path d="M28 9Q18 51 64 71Q110 51 100 9" fill="none" stroke={ref('gold')} strokeWidth="3" strokeDasharray="5 2" /><ellipse cx="64" cy="69" rx="8" ry="11" fill="none" stroke="#e9c37f" strokeWidth="4" /><path d="M64 65L91 79L89 106L64 122L39 106L37 79Z" fill={ref('gold')} stroke={edge} strokeWidth="2" /><circle cx="64" cy="93" r="19" fill={iconId === 'bulla_jupiter' ? '#193947' : '#63212a'} stroke="#e6bd75" strokeWidth="2" /><path d="M69 76L54 94H64L59 111L76 90H65Z" fill={ref('gold')} /><circle cx="49" cy="82" r="2" fill="#fff2ce" /></g>;
  } else {
    const bandage = iconId === 'bandage_linen';
    const amphora = iconId === 'amphora_falernian';
    art = bandage ? <g transform="rotate(-22 64 64)"><path d="M26 36H91V103H26Z" fill="#c5b58e" stroke={edge} strokeWidth="3" /><ellipse cx="58" cy="36" rx="33" ry="17" fill="#f2e5c4" stroke="#79684c" strokeWidth="2" /><ellipse cx="58" cy="36" rx="21" ry="10" fill="#b5a380" stroke="#867454" strokeWidth="2" /><ellipse cx="58" cy="36" rx="9" ry="4" fill="#39312a" />{[53,65,77,89].map(y=><path key={y} d={`M29 ${y}Q58 ${y+10} 89 ${y}`} fill="none" stroke="#f7e9c9" strokeWidth="2" />)}<path d="M88 59Q118 61 101 110L83 116L89 91Z" fill="#e7d8b4" stroke="#8d7958" strokeWidth="2" /></g> : <g>
      {amphora && <path d="M41 34Q13 24 22 62L37 71M87 34Q115 24 106 62L91 71" stroke={ref('gold')} strokeWidth="6" fill="none" />}
      <path d="M51 15H77V39L96 67Q105 105 77 117H51Q23 105 32 67L51 39Z" fill={ref('glass')} stroke="#c4d7d0" strokeWidth="2" />
      <path d="M37 74Q64 66 91 74Q99 103 74 111H54Q31 102 37 74" fill={iconId === 'potion_crimson' ? ref('ruby') : iconId === 'panacea_apollo' ? '#40b9ac' : '#668b55'} opacity=".95" />
      <rect x="48" y="11" width="32" height="11" rx="3" fill={ref('leather')} stroke={ref('gold')} strokeWidth="2" /><path d="M48 37H80M49 32H79" stroke={ref('gold')} strokeWidth="4" /><path d="M43 64Q34 83 40 95M56 25V39" stroke="#f5fff5" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <path d="M51 71H77V98H51Z" fill="#e5d2a4" stroke="#9b743d" strokeWidth="2" /><path d="M64 76V93M56 84H72" stroke="#873e35" strokeWidth="4" />
    </g>;
  }
  return <svg width={size} height={size} viewBox="0 0 128 128" className={`equipment-illustration shrink-0 ${className}`} aria-hidden="true">
    <defs>
      <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2=".8"><stop stopColor="#f1f2dd" /><stop offset=".25" stopColor="#a4b7bd" /><stop offset=".48" stopColor="#e0e8df" /><stop offset=".55" stopColor="#657b89" /><stop offset="1" stopColor="#263746" /></linearGradient>
      <linearGradient id={`${uid}-gold`} x1="0" x2="1" y2=".8"><stop stopColor="#ffecb3" /><stop offset=".3" stopColor="#ddb36b" /><stop offset=".55" stopColor="#8c5b30" /><stop offset=".78" stopColor="#e9c987" /><stop offset="1" stopColor="#715033" /></linearGradient>
      <linearGradient id={`${uid}-bronze`} x1="0" x2="1" y2="1"><stop stopColor="#f0d29c" /><stop offset=".45" stopColor="#bb8954" /><stop offset="1" stopColor="#614535" /></linearGradient>
      <linearGradient id={`${uid}-leather`}><stop stopColor="#9b6540" /><stop offset=".45" stopColor="#563323" /><stop offset="1" stopColor="#221b19" /></linearGradient>
      <linearGradient id={`${uid}-shield`} x1="0" x2="1"><stop stopColor="#3b151d" /><stop offset=".5" stopColor={iconId === 'aegis_praetorian' ? '#3c4554' : '#a83b3a'} /><stop offset="1" stopColor="#351822" /></linearGradient>
      <linearGradient id={`${uid}-crest`} x1="0" x2="1" y2="1"><stop stopColor="#f28b65" /><stop offset=".4" stopColor="#b02d39" /><stop offset="1" stopColor="#401929" /></linearGradient>
      <linearGradient id={`${uid}-ruby`} x1="0" x2="1" y2="1"><stop stopColor="#ffc0ae" /><stop offset=".3" stopColor="#e75353" /><stop offset=".65" stopColor="#a51d3e" /><stop offset="1" stopColor="#3d1631" /></linearGradient>
      <linearGradient id={`${uid}-glass`} x1="0" x2="1"><stop stopColor="#a9d9cf" stopOpacity=".8" /><stop offset=".4" stopColor="#364c50" stopOpacity=".7" /><stop offset="1" stopColor="#8eaba1" stopOpacity=".8" /></linearGradient>
      <filter id={`${uid}-shadow`} x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="1" dy="5" stdDeviation="3" floodColor="#000" floodOpacity=".8" /></filter>
    </defs>
    <g filter={ref('shadow')}>{art}</g>
  </svg>;
}
