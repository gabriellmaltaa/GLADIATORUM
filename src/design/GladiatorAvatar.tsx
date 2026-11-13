import React, { useId } from 'react';
import { getItemRadiance } from '../game/itemRadiance';
import baseBody from '../assets/images/gladiator-base.png';
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
        <clipPath id={`${id}grip`}><path d="M54 249Q58 246 63 251L68 261L67 268Q59 270 55 263Z"/></clipPath>
        <linearGradient id={`${id}shield`}><stop stopColor="#21100c"/><stop offset=".35" stopColor="#87432b"/><stop offset=".65" stopColor="#4e241b"/><stop offset="1" stopColor="#160d0b"/></linearGradient>
      </defs>
      <ellipse cx="148" cy="486" rx="92" ry="9" fill="#000" opacity=".5"/>
      <image href={baseBody} x="0" y="0" width="300" height="500" preserveAspectRatio="none" />
      <g filter={ref('shadow')}>
        {armor && <g data-equipped-slot="armor" data-icon={armor.iconId} data-rarity={armor.rarity} style={itemStyle(armor.rarity)}>
          <path d="M88 87Q102 80 124 76Q130 95 149 98Q170 95 177 76Q203 80 215 91L211 111Q199 117 192 133L188 191Q149 206 106 191L104 133Q96 117 80 113L82 96Z" fill={chain ? ref('mail') : material(armor.iconId)} stroke="#30241a" strokeWidth="1.2"/>
          <path d="M124 77Q130 97 149 99Q171 97 177 77M105 132L107 191M192 132L188 191" fill="none" stroke="#c19a61" strokeWidth="1.5"/>
          <path d="M88 88Q104 81 118 80L111 99Q95 100 81 110M181 80Q199 83 212 92L210 108Q194 99 187 99Z" fill={material(armor.iconId)} stroke="#c19a61" strokeWidth="1"/>
          {!leather && !chain && [114,132,150,168,186].map(y=><path key={y} d={`M109 ${y}Q149 ${y+12} 190 ${y}L189 ${y+12}Q149 ${y+24} 110 ${y+12}Z`} fill={ref('steel')} stroke="#393b35" strokeWidth="1.5"/>)}
          {leather && <><path d="M120 100Q145 116 148 133Q154 112 177 100M115 146Q134 153 147 145Q166 154 184 146M119 168Q149 181 181 168" fill="none" stroke="#bf8e57" strokeWidth="2"/><path d="M132 78L158 201" stroke="#271a11" strokeWidth="10"/><path d="M132 78L158 201" stroke="#a87b45" strokeWidth="2"/></>}
          <path d="M106 191Q149 204 188 191L190 209Q149 222 104 209Z" fill={ref('leather')} stroke="#bc9656" strokeWidth="1.2"/>
          <rect x="140" y="199" width="18" height="11" rx="2" fill={ref('bronze')} stroke="#e9c880"/>
          {[104,119,134,149,164,179].map((x,i)=><g key={x}><path d={`M${x} 212L${x+14} 213L${x+19} ${290-Math.abs(i-2.5)*3}Q${x+8} ${296-Math.abs(i-2.5)*3} ${x-6} ${289-Math.abs(i-2.5)*3}Z`} fill={material(armor.iconId)} stroke="#392719" strokeWidth="1"/><path d={`M${x+3} 219L${x+1} 278`} stroke="#deb574" strokeOpacity=".35"/><circle cx={x+7} cy={281-Math.abs(i-2.5)*3} r="2.4" fill={ref('bronze')}/></g>)}
        </g>}
        {layers.boots && <g data-equipped-slot="boots" data-icon={layers.boots.iconId} data-rarity={layers.boots.rarity} style={itemStyle(layers.boots.rarity)}>
          {[false,true].map(right=><g key={String(right)} transform={right ? 'translate(294 0) scale(-1 1)' : undefined}>
            {layers.boots?.iconId !== 'caligae_leather' && <><path d="M94 344Q110 333 124 345Q118 374 111 397L102 445L83 443Q80 414 84 388Z" fill={material(layers.boots?.iconId)} stroke="#403321" strokeWidth="1.2"/><path d="M108 347Q98 384 95 432" fill="none" stroke="#e7d1a0" opacity=".5" strokeWidth="1.5"/><path d="M91 361L118 366M85 397L108 400M84 426L103 429" stroke="#4a3020" strokeWidth="3"/></>}
            <path d="M83 442L102 445L102 464L105 478Q91 491 67 488L65 482L80 462Z" fill={ref('leather')} stroke="#2b1c10" strokeWidth="1.2"/>
            <path d="M82 449L101 451M80 459L101 462M74 470L103 474M68 480L103 483" stroke="#ba9258" strokeWidth="2.5"/>
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
        {layers.helmet && <g data-equipped-slot="helmet" data-icon={layers.helmet.iconId} data-rarity={layers.helmet.rarity} style={itemStyle(layers.helmet.rarity)}>
          {layers.helmet.iconId !== 'galea_recruit' && <><path d="M125 16Q118 -20 149 -22Q178 -19 173 16L160 12Q164 -4 149 -6Q136 -5 139 12Z" fill="#702326" stroke="#bc6a43" strokeWidth="1"/>{[129,135,141,147,153,159,165].map(x=><path key={x} d={`M${x} -12L${x+2} 9`} stroke="#dc7850" strokeOpacity=".4" strokeWidth="1"/>)}</>}
          <path d="M123 32Q118 5 144 2Q173 -1 174 31L169 36Q149 28 127 36Z" fill={material(layers.helmet.iconId)} stroke="#503b25" strokeWidth="1"/>
          <path d="M122 28Q149 20 175 28L175 34Q148 28 122 35Z" fill={ref('bronze')} stroke="#e1bd78" strokeWidth=".8"/>
          <path d="M123 35L130 38L132 58L139 65L130 68L122 54L120 39ZM169 35L163 38L163 58L157 65L166 68L174 53L175 39Z" fill={material(layers.helmet.iconId)} stroke="#c3a268" strokeWidth=".8"/>
          <path d="M128 22Q128 8 145 7M126 43L128 54M170 42L168 54" fill="none" stroke="#e4d7b4" strokeOpacity=".6" strokeWidth="1"/>
          <circle cx="149" cy="25" r="2.2" fill={ref('bronze')} stroke="#e7c57d" strokeWidth=".7"/>
        </g>}
        {weapon && <g data-equipped-slot="weapon" data-icon={weapon.iconId} data-rarity={weapon.rarity} style={itemStyle(weapon.rarity)} transform={`rotate(${trident ? -7 : -18} 63 258)`}>
          <path d="M57 247H64V278H57Z" fill={ref('leather')} stroke="#1d140d" strokeWidth="2"/>
          {[253,261,269].map(y=><path key={y} d={`M57 ${y}H64`} stroke="#bd985b" strokeWidth="2"/>)}
          {trident ? <><path d="M59 116H63V249H59Z" fill={ref('bronze')}/><path d="M58 67L61 50 65 67V103Q84 103 84 81L89 67 93 82Q94 115 65 118V128H58V118Q30 115 30 82L35 67 40 81Q40 103 58 103Z" fill={ref('bronze')} stroke="#e8ca88" strokeWidth="1.5"/></> : <><path d={dagger ? 'M61 180L70 201 67 243H54L52 201Z' : 'M61 105L71 127 67 242H54L51 127Z'} fill={goldWeapon ? ref('bronze') : ref('steel')} stroke="#c9c9b4" strokeWidth="1"/><path d={`M61 ${dagger ? 187 : 115}V236`} stroke="#f8f1d5" strokeWidth="2"/><path d="M43 242Q61 235 79 242L78 247Q61 243 44 247Z" fill={ref('bronze')} stroke="#dabb77"/></>}
          <ellipse cx="61" cy="279" rx="6" ry="4" fill={ref('bronze')}/>
        </g>}
        {layers.shield && <g data-equipped-slot="shield" data-icon={layers.shield.iconId} data-rarity={layers.shield.rarity} style={itemStyle(layers.shield.rarity)} transform="rotate(-9 236 228)">
          {layers.shield.iconId === 'parma_bronze' ? <ellipse cx="236" cy="228" rx="43" ry="49" fill={ref('bronze')} stroke="#c29b5d" strokeWidth="2"/> : <path d="M195 169Q236 156 277 169L275 280Q238 304 197 280Z" fill={layers.shield.iconId === 'scutum_wood' ? ref('leather') : ref('shield')} stroke="#b9985c" strokeWidth="2.5"/>}
          {layers.shield.iconId === 'parma_bronze' ? <ellipse cx="236" cy="228" rx="35" ry="41" fill="none" stroke="#dfbf78" strokeWidth="1.2"/> : layers.shield.iconId === 'scutum_wood' ? [208,222,250,264].map(x=><path key={x} d={`M${x} 173V279`} stroke="#1e130d" strokeWidth="1"/>) : <path d="M229 220L209 190L222 199L218 186L234 213M244 220L264 190L251 199L255 186L239 213M230 239L213 271L228 260L230 279L237 247L244 279L246 260L262 271L244 239" fill={ref('bronze')} stroke="#d6b574" strokeWidth=".7"/>}
          <ellipse cx="236" cy="228" rx="13" ry="16" fill={ref('steel')} stroke="#dec083" strokeWidth="2"/>
          <ellipse cx="232" cy="222" rx="4" ry="6" fill="#e6dfc0" opacity=".55"/>
        </g>}
      </g>
      {weapon && <image href={baseBody} x="0" y="0" width="300" height="500" preserveAspectRatio="none" clipPath={ref('grip')}/>}
      {layers.ring && <g data-equipped-slot="ring" data-icon={layers.ring.iconId} data-rarity={layers.ring.rarity} style={itemStyle(layers.ring.rarity)}><path d="M57 261Q60 263 63 261" fill="none" stroke="#f5cc70" strokeWidth="1.8"/>{layers.ring.iconId === 'anulus_ruby' && <circle cx="60" cy="262" r="1.8" fill="#e7474c" stroke="#f6d88d" strokeWidth=".6"/>}</g>}
    </svg>
    <span className="gladiator-aura-caption">{aura.label} <span>· Nível {level}</span></span>
  </div>;
}

