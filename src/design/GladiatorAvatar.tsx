import React, { useId } from 'react';
import { getItemRadiance } from '../game/itemRadiance';
import baseBody from '../assets/images/gladiator-base.png';
import { EquipmentArt } from './EquipmentArt';
import { getCharacterAppearance, type EquippedAppearance } from '../game/appearance';

/** The neutral body has no gear baked into it. Every overlay follows its actual slot. */
export function GladiatorAvatar({ equipped, level, name }: { equipped: EquippedAppearance; level: number; name: string }) {
  const { layers, aura } = getCharacterAppearance(equipped, level);
  const id = useId().replace(/:/g, '');
  const ref = (part: string) => `url(#${id}${part})`;
  const material = (icon = '') => /leather|wood/.test(icon) ? ref('leather') : /bronze|recruit|mars/.test(icon) ? ref('bronze') : ref('steel');
  const itemStyle = (rarity: Parameters<typeof getItemRadiance>[0]) => {
    const effect = getItemRadiance(rarity);
    return { '--gear-light': effect.color, '--gear-power': effect.strength, filter: effect.strength ? `drop-shadow(0 0 ${2 + effect.strength * 4}px ${effect.color})` : undefined } as React.CSSProperties;
  };
  const armor = layers.armor;
  const chain = armor?.iconId === 'lorica_hamata';
  const leather = armor?.iconId === 'lorica_leather';
  const weapon = layers.weapon;
  const trident = weapon?.iconId === 'trident_neptune';
  const dagger = weapon?.iconId === 'pugio_assassin';
  const goldWeapon = /bronze|imperial|neptune/.test(weapon?.iconId ?? '');
  const visibleGear = Object.values(layers).map(item => item.name).join(', ');
  return <div className="living-gladiator" data-aura-tier={aura.tier} style={{ '--aura-color': aura.color, '--aura-strength': aura.strength } as React.CSSProperties}>
    <div className="gladiator-aura" aria-hidden="true" />
    <svg viewBox="0 -24 300 524" className="gladiator-body" role="img" aria-label={`${name}, nível ${level}. ${visibleGear ? `Equipado com ${visibleGear}.` : 'Sem equipamentos.'} ${aura.label}.`}>
      <defs>
        <linearGradient id={`${id}steel`}><stop stopColor="#545b61"/><stop offset=".28" stopColor="#c1c8c6"/><stop offset=".5" stopColor="#737b7a"/><stop offset=".7" stopColor="#c7c4af"/><stop offset="1" stopColor="#353c40"/></linearGradient>
        <linearGradient id={`${id}bronze`}><stop stopColor="#604025"/><stop offset=".3" stopColor="#daa251"/><stop offset=".5" stopColor="#9b6d32"/><stop offset=".72" stopColor="#e3b56a"/><stop offset="1" stopColor="#57371c"/></linearGradient>
        <linearGradient id={`${id}leather`}><stop stopColor="#24170e"/><stop offset=".3" stopColor="#7f502a"/><stop offset=".6" stopColor="#54351f"/><stop offset="1" stopColor="#1d130d"/></linearGradient>
        <pattern id={`${id}mail`} width="7" height="6" patternUnits="userSpaceOnUse"><rect width="7" height="6" fill="#343a3b"/><ellipse cx="3.5" cy="3" rx="2.5" ry="2" fill="none" stroke="#a8a99a" strokeWidth="1"/></pattern>
        <filter id={`${id}shadow`} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1" dy="3" stdDeviation="2" floodOpacity=".7"/></filter>
      </defs>
      <ellipse cx="148" cy="486" rx="92" ry="9" fill="#000" opacity=".5"/>
      <image href={baseBody} x="0" y="0" width="300" height="500" preserveAspectRatio="none" />
      <g filter={ref('shadow')}>
        {armor && <g data-equipped-slot="armor" data-icon={armor.iconId} data-rarity={armor.rarity} style={itemStyle(armor.rarity)}>
          <path d="M100 84L122 75Q148 98 177 75L200 84L204 112 189 129 188 199Q148 217 109 199L108 129 94 111Z" fill={chain ? ref('mail') : material(armor.iconId)} stroke="#30241a" strokeWidth="2"/>
          <path d="M111 85L108 129M187 85L189 129M112 198Q148 209 186 198" fill="none" stroke="#d5ad6b" strokeWidth="3"/>
          {!leather && !chain && [114,132,150,168,186].map(y=><path key={y} d={`M109 ${y}Q149 ${y+12} 190 ${y}L189 ${y+12}Q149 ${y+24} 110 ${y+12}Z`} fill={ref('steel')} stroke="#393b35" strokeWidth="1.5"/>)}
          {leather && <><path d="M120 100Q145 116 148 133Q154 112 177 100M115 146Q134 153 147 145Q166 154 184 146M119 168Q149 181 181 168" fill="none" stroke="#bf8e57" strokeWidth="2"/><path d="M132 78L158 201" stroke="#271a11" strokeWidth="10"/><path d="M132 78L158 201" stroke="#a87b45" strokeWidth="2"/></>}
          <path d="M108 198Q149 210 189 198L190 211Q149 223 107 211Z" fill={ref('leather')} stroke="#bc9656" strokeWidth="2"/>
          <rect x="139" y="203" width="20" height="12" rx="2" fill={ref('bronze')} stroke="#e9c880"/>
          {[109,124,139,154,169,184].map((x,i)=><path key={x} d={`M${x} 215L${x+12} 215L${x+14} ${280-Math.abs(i-2.5)*5}L${x-3} ${280-Math.abs(i-2.5)*5}Z`} fill={material(armor.iconId)} stroke="#392719" strokeWidth="1.5"/>)}
        </g>}
        {layers.boots && <g data-equipped-slot="boots" data-icon={layers.boots.iconId} data-rarity={layers.boots.rarity} style={itemStyle(layers.boots.rarity)}>
          {[94,177].map((x,i)=><g key={x} transform={`rotate(${i ? -5 : 5} ${x+15} 385)`}>
            {layers.boots?.iconId !== 'caligae_leather' && <><path d={`M${x-3} 345Q${x+15} 333 ${x+32} 345L${x+26} 440L${x+2} 440Z`} fill={material(layers.boots?.iconId)} stroke="#403321" strokeWidth="2"/><path d={`M${x+14} 345L${x+11} 430`} stroke="#e7d1a0" opacity=".5" strokeWidth="3"/></>}
            <path d={`M${x} 443L${x+25} 443L${x+33} 477Q${x+17} 489 ${x-9} 479Z`} fill={ref('leather')} stroke="#2b1c10" strokeWidth="2"/>
            {[448,457,466].map(y=><path key={y} d={`M${x} ${y}L${x+26} ${y+2}`} stroke="#ba9258" strokeWidth="4"/>)}
          </g>)}
        </g>}
        {layers.gloves && <g data-equipped-slot="gloves" data-icon={layers.gloves.iconId} data-rarity={layers.gloves.rarity} style={itemStyle(layers.gloves.rarity)}>
          <path d="M70 171L95 180L77 237L50 229Z" fill={material(layers.gloves.iconId)} stroke="#342317" strokeWidth="2"/>
          {[179,191,203,215].map(y=><path key={y} d={`M${70-(y-179)*.3} ${y}L${93-(y-179)*.3} ${y+7}`} stroke="#d4ac6d" strokeWidth="3"/>)}
          <path d="M214 180L238 172L253 230L229 237Z" fill={material(layers.gloves.iconId)} stroke="#342317" strokeWidth="2"/>
          {[181,193,205,217].map(y=><path key={y} d={`M${216+(y-181)*.3} ${y}L${240+(y-181)*.3} ${y-7}`} stroke="#d4ac6d" strokeWidth="3"/>)}
        </g>}
        {layers.amulet && <g data-equipped-slot="amulet" data-icon={layers.amulet.iconId} data-rarity={layers.amulet.rarity} style={itemStyle(layers.amulet.rarity)}>
          <path d="M126 83Q128 120 149 132Q171 119 173 83" fill="none" stroke="#edc879" strokeWidth="2"/>
          <circle cx="149" cy="133" r="8" fill={ref('bronze')} stroke="#f4d996" strokeWidth="2"/><path d="M149 127L154 133 149 139 144 133Z" fill={layers.amulet.iconId === 'bulla_jupiter' ? '#66bbe5' : '#c24e32'}/>
        </g>}
        {layers.helmet && <svg x="108" y={layers.helmet.iconId === 'galea_recruit' ? 0 : -15} width="86" height="90" viewBox={layers.helmet.iconId === 'galea_recruit' ? '0 20 128 108' : '0 0 128 128'} data-equipped-slot="helmet" data-icon={layers.helmet.iconId} data-rarity={layers.helmet.rarity} style={itemStyle(layers.helmet.rarity)}><EquipmentArt iconId={layers.helmet.iconId} size={128}/></svg>}
        {layers.ring && <g data-equipped-slot="ring" data-icon={layers.ring.iconId} data-rarity={layers.ring.rarity} style={itemStyle(layers.ring.rarity)}><ellipse cx="60" cy="258" rx="5" ry="2.8" fill="none" stroke="#f5cc70" strokeWidth="3"/>{layers.ring.iconId === 'anulus_ruby' && <circle cx="58" cy="256" r="3" fill="#e7474c" stroke="#f6d88d"/>}</g>}
        {weapon && <g data-equipped-slot="weapon" data-icon={weapon.iconId} data-rarity={weapon.rarity} style={itemStyle(weapon.rarity)} transform="rotate(14 61 257)">
          <path d="M57 247H64V278H57Z" fill={ref('leather')} stroke="#1d140d" strokeWidth="2"/>
          {[253,261,269].map(y=><path key={y} d={`M57 ${y}H64`} stroke="#bd985b" strokeWidth="2"/>)}
          {trident ? <><path d="M59 116H63V249H59Z" fill={ref('bronze')}/><path d="M58 67L61 50 65 67V103Q84 103 84 81L89 67 93 82Q94 115 65 118V128H58V118Q30 115 30 82L35 67 40 81Q40 103 58 103Z" fill={ref('bronze')} stroke="#e8ca88" strokeWidth="1.5"/></> : <><path d={dagger ? 'M61 180L70 201 67 243H54L52 201Z' : 'M61 105L71 127 67 242H54L51 127Z'} fill={goldWeapon ? ref('bronze') : ref('steel')} stroke="#c9c9b4" strokeWidth="1"/><path d={`M61 ${dagger ? 187 : 115}V236`} stroke="#f8f1d5" strokeWidth="2"/><path d="M43 242Q61 235 79 242L78 247Q61 243 44 247Z" fill={ref('bronze')} stroke="#dabb77"/></>}
          <ellipse cx="61" cy="279" rx="6" ry="4" fill={ref('bronze')}/>
        </g>}
        {layers.shield && <svg x="192" y="201" width="108" height="146" viewBox="0 0 128 128" data-equipped-slot="shield" data-icon={layers.shield.iconId} data-rarity={layers.shield.rarity} style={itemStyle(layers.shield.rarity)}><EquipmentArt iconId={layers.shield.iconId} size={128}/></svg>}
      </g>
    </svg>
    <span className="gladiator-aura-caption">{aura.label} <span>· Nível {level}</span></span>
  </div>;
}

