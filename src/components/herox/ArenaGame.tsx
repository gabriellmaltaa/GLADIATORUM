import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeft, Backpack, Bolt, CircleHelp, Coins, Crosshair, Heart, Package, Shield, Swords, Zap } from 'lucide-react';
import type { HeroPlayer } from '../../services/heroxClient';
import { connectHeroXArena, type ArenaInputState, type ArenaWireMessage, type HeroXArenaConnection } from '../../services/heroxArenaClient';
import { ARENA_WEAPONS } from '../../game/heroxArena';

interface ArenaHeroView {
  uid: string;
  heroName: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  facing: -1 | 1;
  eliminated: boolean;
  extracted: boolean;
  carriedGold: number;
  carriedXp: number;
  carriedWeapons: string[];
  weaponId: string;
}
interface ArenaLootView { id: string; type: string; x: number; y: number; weaponId?: string; amount?: number }
interface ArenaStateView {
  status: 'active' | 'completed';
  remainingMs: number;
  extractionActive: boolean;
  winnerUid: string | null;
  players: Record<string, ArenaHeroView>;
  loot: ArenaLootView[];
}
type ArenaMenuPage = 'home' | 'heroes' | 'inventory' | 'missions';
const emptyInput = (): ArenaInputState => ({ left: false, right: false, jump: false, attack: false, power: false, interact: false });

function drawHero(context: CanvasRenderingContext2D, hero: ArenaHeroView, isSelf: boolean) {
  if (hero.eliminated || hero.extracted) return;
  context.save();
  context.translate(hero.x, hero.y);
  context.scale(hero.facing, 1);
  context.shadowColor = isSelf ? '#3be8ff' : '#ff475b';
  context.shadowBlur = 18;
  context.fillStyle = isSelf ? '#198ce0' : '#d9394a';
  context.beginPath(); context.ellipse(0, -45, 27, 39, 0, 0, Math.PI * 2); context.fill();
  context.shadowBlur = 0;
  context.fillStyle = '#aa5e39';
  context.beginPath(); context.ellipse(-15, -103, 15, 20, -.2, 0, Math.PI * 2); context.ellipse(16, -103, 15, 20, .2, 0, Math.PI * 2); context.fill();
  context.fillStyle = isSelf ? '#f1b874' : '#dcaa80';
  context.beginPath(); context.ellipse(0, -84, 30, 30, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = isSelf ? '#113d6a' : '#641a29';
  context.beginPath(); context.roundRect(-27, -91, 54, 14, 6); context.fill();
  context.fillStyle = '#fff'; context.beginPath(); context.arc(8, -83, 3.5, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#151b2b'; context.beginPath(); context.arc(9, -83, 1.5, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#ef354d'; context.beginPath(); context.moveTo(-18, -55); context.lineTo(-48, 7); context.lineTo(9, -3); context.closePath(); context.fill();
  context.fillStyle = isSelf ? '#168ef4' : '#f04a4e'; context.beginPath(); context.roundRect(-20, -61, 40, 57, 12); context.fill();
  context.fillStyle = '#3a2731'; context.fillRect(-16, -4, 12, 24); context.fillRect(5, -4, 12, 24);
  context.fillStyle = '#33eaff'; context.shadowColor = '#20dfff'; context.shadowBlur = 14; context.fillRect(27, -57, 27, 7); context.fillRect(49, -61, 10, 16); context.shadowBlur = 0;
  if (isSelf) {
    context.fillStyle = '#0b1730'; context.beginPath(); context.roundRect(-27, -142, 54, 21, 9); context.fill();
    context.fillStyle = '#8df8ff'; context.font = 'bold 12px Inter, sans-serif'; context.textAlign = 'center'; context.fillText('VOCÊ', 0, -128);
  }
  context.restore();
}

function drawArena(context: CanvasRenderingContext2D, state: ArenaStateView | null, uid: string, previewName: string) {
  const sky = context.createLinearGradient(0, 0, 0, 620); sky.addColorStop(0, '#5fc2ec'); sky.addColorStop(1, '#b9edff');
  context.fillStyle = sky; context.fillRect(0, 0, 1600, 620);
  context.fillStyle = '#fff9';
  for (const [x, y] of [[130, 82], [610, 132], [1040, 70], [1430, 154]]) {
    context.beginPath(); context.arc(x, y, 31, 0, Math.PI * 2); context.arc(x + 30, y - 10, 38, 0, Math.PI * 2); context.arc(x + 69, y + 2, 26, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#738b91';
  for (let x = 0; x < 1600; x += 150) { const h = 185 + (x * 37 % 110); context.fillRect(x, 520 - h, 132, h); }
  context.fillStyle = '#566b72';
  for (let x = 30; x < 1600; x += 150) for (let y = 375; y < 500; y += 57) context.fillRect(x, y, 34, 29);
  const platforms = [[0, 520, 550], [315, 402, 260], [660, 320, 270], [1030, 402, 270], [1310, 440, 290]];
  for (const [x, y, w] of platforms) {
    context.fillStyle = '#653819'; context.fillRect(x, y, w, 26); context.fillStyle = '#a56a32'; context.fillRect(x, y, w, 6);
    context.strokeStyle = '#4a2a16'; context.lineWidth = 2;
    for (let sx = x + 52; sx < x + w; sx += 67) { context.beginPath(); context.moveTo(sx, y + 8); context.lineTo(sx, y + 25); context.stroke(); }
  }
  context.fillStyle = '#6c4628'; context.fillRect(585, 420, 11, 100); context.fillRect(676, 420, 11, 100);
  for (let y = 434; y < 520; y += 20) context.fillRect(585, y, 102, 7);
  for (const [x, y] of [[475, 464], [1205, 364], [1460, 462]]) {
    context.fillStyle = '#9b5c2a'; context.fillRect(x, y, 74, 48); context.fillStyle = '#da9a40'; context.fillRect(x + 4, y + 4, 66, 11); context.fillStyle = '#ffd36a'; context.fillRect(x + 32, y + 8, 10, 38);
  }
  const extractionActive = state?.extractionActive ?? false;
  context.save(); context.globalAlpha = extractionActive ? .95 : .35; context.shadowColor = '#4ffff0'; context.shadowBlur = extractionActive ? 32 : 8;
  context.strokeStyle = '#4af5e7'; context.lineWidth = 12;
  for (const portalX of [85, 1515]) { context.beginPath(); context.ellipse(portalX, 470, 42, 50, 0, 0, Math.PI * 2); context.stroke(); }
  context.restore();
  if (state) {
    for (const loot of state.loot) {
      if (loot.type === 'gold') { context.fillStyle = '#ffd142'; context.beginPath(); context.arc(loot.x, loot.y, 14, 0, Math.PI * 2); context.fill(); context.fillStyle = '#a35d11'; context.font = 'bold 16px sans-serif'; context.textAlign = 'center'; context.fillText('$', loot.x, loot.y + 6); }
      else if (loot.type === 'xp') { context.fillStyle = '#b26cff'; context.beginPath(); context.arc(loot.x, loot.y, 14, 0, Math.PI * 2); context.fill(); context.fillStyle = '#fff'; context.font = 'bold 9px sans-serif'; context.textAlign = 'center'; context.fillText('XP', loot.x, loot.y + 3); }
      else { context.fillStyle = loot.type === 'weapon' ? '#3bf3ff' : '#9ce978'; context.fillRect(loot.x - 12, loot.y - 12, 24, 24); }
    }
    for (const hero of Object.values(state.players)) drawHero(context, hero, hero.uid === uid);
  } else {
    const preview: ArenaHeroView = { uid, heroName: previewName, x: 410, y: 520, health: 100, maxHealth: 100, energy: 100, maxEnergy: 100, facing: 1, eliminated: false, extracted: false, carriedGold: 0, carriedXp: 0, carriedWeapons: [], weaponId: 'pulse-ion' };
    drawHero(context, preview, true);
  }
  context.fillStyle = '#14263acc'; context.font = 'bold 13px Inter, sans-serif'; context.textAlign = 'center'; context.fillText('RUÍNAS DO DISTRITO ZERO', 800, 28);
}

export function ArenaGame({ player, onPlayerUpdate, onExit }: { player: HeroPlayer; onPlayerUpdate: (player: HeroPlayer) => void; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const connectionRef = useRef<HeroXArenaConnection | null>(null);
  const inputRef = useRef<ArenaInputState>(emptyInput());
  const stateRef = useRef<ArenaStateView | null>(null);
  const [snapshot, setSnapshot] = useState<ArenaStateView | null>(null);
  const [phase, setPhase] = useState<'lobby' | 'connecting' | 'queued' | 'playing' | 'result'>('lobby');
  const [notice, setNotice] = useState('Escolha entrar na fila para enfrentar outro herói real.');
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<ArenaWireMessage | null>(null);
  const [menuPage, setMenuPage] = useState<ArenaMenuPage>('home');
  const [mobileControl, setMobileControl] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const receive = useCallback((message: ArenaWireMessage) => {
    if (message.type === 'queued') { setPhase('queued'); setNotice('Na fila da incursão · aguardando outro jogador real.'); }
    if (message.type === 'match_found') { setPhase('playing'); setError(null); setNotice(`Rival encontrado: ${String(message.opponent ?? 'Herói desconhecido')}. Recolha o saque e encontre uma saída.`); }
    if (message.type === 'snapshot' && message.state && typeof message.state === 'object') {
      const next = message.state as ArenaStateView;
      stateRef.current = next; setSnapshot(next); setRemainingMs(next.remainingMs);
    }
    if (message.type === 'event' && message.event && typeof message.event === 'object') {
      const event = message.event as Record<string, unknown>;
      if (event.type === 'loot_collected') setNotice('Saque coletado. Extraia para guardá-lo.');
      if (event.type === 'hit') setNotice(`Acerto! ${String(event.damage ?? 0)} de dano.`);
      if (event.type === 'extracted') setNotice('Extração confirmada. Seu saque foi guardado.');
      if (event.type === 'eliminated' && event.uid === player.uid) setNotice('Você foi derrotado. O saque desta incursão foi perdido.');
    }
    if (message.type === 'match_result') {
      setReward(message); setPhase('result'); setNotice(message.outcome === 'extracted' ? 'Extração confirmada · itens e recompensas salvos.' : message.outcome === 'victory' ? 'Vitória na incursão.' : 'Incursão encerrada.');
      if (message.player && typeof message.player === 'object') onPlayerUpdate(message.player as HeroPlayer);
    }
    if (message.type === 'match_cancelled') { setPhase('lobby'); setNotice(String(message.message ?? 'Partida cancelada.')); stateRef.current = null; setSnapshot(null); }
    if (message.type === 'error') setError(String(message.message ?? 'O servidor recusou essa ação.'));
    if (message.type === 'closed') { connectionRef.current = null; if (phaseRef.current !== 'result') setPhase('lobby'); }
  }, [onPlayerUpdate, player.uid]);

  async function joinQueue() {
    setError(null); setReward(null); setSnapshot(null); stateRef.current = null; setPhase('connecting');
    try {
      if (!connectionRef.current) connectionRef.current = await connectHeroXArena(receive);
      connectionRef.current.queue();
    } catch (reason) {
      connectionRef.current = null; setPhase('lobby'); setError(reason instanceof Error ? reason.message : 'Não foi possível conectar à arena.');
    }
  }

  function setInput(key: keyof ArenaInputState, value: boolean) {
    inputRef.current = { ...inputRef.current, [key]: value };
    if (!value && mobileControl === key) setMobileControl(null);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let animation = 0;
    const render = () => { context.setTransform(1, 0, 0, 1.45, 0, 0); drawArena(context, stateRef.current, player.uid, player.heroName); animation = requestAnimationFrame(render); };
    render();
    return () => cancelAnimationFrame(animation);
  }, [player.uid, player.heroName]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (phase === 'playing') connectionRef.current?.updateInput(inputRef.current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const keyMap: Record<string, keyof ArenaInputState> = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', ' ': 'jump', arrowup: 'jump', j: 'attack', q: 'power', e: 'interact' };
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(); const action = keyMap[key];
      if (!action) return;
      event.preventDefault(); setInput(action, true);
    };
    const keyUp = (event: KeyboardEvent) => { const action = keyMap[event.key.toLowerCase()]; if (action) setInput(action, false); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); inputRef.current = emptyInput(); };
  }, [phase]);

  useEffect(() => () => connectionRef.current?.leave(), []);

  const ownArenaHero = snapshot?.players[player.uid];
  const equippedWeaponName = ARENA_WEAPONS.find((weapon) => weapon.id === ownArenaHero?.weaponId)?.name ?? 'Pulso de Íon';
  const timeLabel = remainingMs === null ? '08:42' : `${String(Math.floor(remainingMs / 60_000)).padStart(2, '0')}:${String(Math.floor((remainingMs % 60_000) / 1_000)).padStart(2, '0')}`;
  const buttonAction = (key: keyof ArenaInputState) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => { event.preventDefault(); setMobileControl(key); setInput(key, true); },
    onPointerUp: () => setInput(key, false), onPointerCancel: () => setInput(key, false),
  });

  return (
    <section className="hxa-shell" aria-label="Incursão 2D HEROX">
      <header className="hxa-header"><div><span className="hxa-logo"><Bolt size={18} fill="currentColor" /> HEROX</span><small>INCURSÃO · RUÍNAS DO DISTRITO ZERO</small></div><span className={`hxa-status ${phase === 'playing' ? 'live' : ''}`}><i />{phase === 'playing' ? 'PARTIDA ATIVA' : phase === 'queued' ? 'NA FILA' : phase === 'connecting' ? 'CONECTANDO' : 'ARENA HUMANA · 1v1'}</span><button className="hxa-exit" onClick={() => { connectionRef.current?.leave(); connectionRef.current = null; onExit(); }}><ArrowLeft size={15} /> Voltar</button></header>
      <div className="hxa-stage">
        <canvas ref={canvasRef} width={1600} height={900} aria-label="Arena de plataforma lateral com heróis, caixas de saque e portal de extração" onPointerDown={(event) => { if (phase === 'playing') { event.preventDefault(); setInput('attack', true); } }} onPointerUp={() => setInput('attack', false)} onPointerCancel={() => setInput('attack', false)} />
        <aside className="hxa-lobby">
          <div className="hxa-lobby-heading"><span>MENU PRINCIPAL</span><button title="Voltar ao jogo" onClick={() => setMenuPage('home')}><CircleHelp size={15} /></button></div>
          <div className="hxa-profile"><div className="hxa-avatar"><span>✦</span></div><div><strong>{player.heroName}</strong><small>HERÓI · NÍVEL {player.level}</small></div></div>
          <div className="hxa-meter"><span><Heart size={12} /> VIDA</span><i><b style={{ width: `${Math.min(100, player.health / Math.max(1, 100 + player.level * 12) * 100)}%` }} /></i></div>
          <div className="hxa-meter"><span><Zap size={12} /> ENERGIA</span><i className="energy"><b style={{ width: `${player.energy}%` }} /></i></div>
          <div className="hxa-wallet"><span><Coins size={14} /> OURO</span><strong>{(player.gold ?? 0).toLocaleString('pt-BR')}</strong><span>XP · NÍVEL {player.level}</span></div>
          <div className="hxa-menu-actions">
            <button className="start" onClick={() => void joinQueue()} disabled={phase === 'connecting' || phase === 'queued' || phase === 'playing'}>JOGAR <small>INICIAR INCURSÃO</small></button>
            <button onClick={() => setMenuPage('heroes')}><Shield size={15} /> HERÓIS</button>
            <button onClick={() => setMenuPage('inventory')}><Package size={15} /> INVENTÁRIO / EQUIPAMENTOS</button>
            <button onClick={() => setNotice('As lojas e missões permanecem no menu principal do HEROX.')}><Coins size={15} /> LOJA</button>
            <button onClick={() => setMenuPage('missions')}><Crosshair size={15} /> MISSÕES</button>
          </div>
          {menuPage !== 'home' && <div className="hxa-menu-detail"><strong>{menuPage === 'heroes' ? 'SEU HERÓI' : menuPage === 'inventory' ? 'ARMAS EQUIPADAS' : 'MISSÕES'}</strong><span>{menuPage === 'heroes' ? `Agilidade ${player.attributes.agility} · Força ${player.attributes.power} · Vitalidade ${player.attributes.vitality}` : menuPage === 'inventory' ? (player.weapons ?? ['pulse-ion']).map((id) => id.replaceAll('-', ' ').toUpperCase()).join(' · ') : 'Extraia com saque para ganhar ouro, XP e armas.'}</span></div>}
          <p className="hxa-menu-note">{phase === 'queued' ? 'Aguardando um rival humano…' : phase === 'playing' ? 'Movimente-se, lute, recolha o saque e extraia.' : 'Bots não entram no PvP nem no ranking.'}</p>
        </aside>
        <div className="hxa-match-hud"><div><span>TEMPO RESTANTE</span><strong>{timeLabel}</strong></div><i /> <div><span>PONTOS DE EXTRAÇÃO</span><strong>{snapshot?.extractionActive ? 'ATIVOS' : 'ABREM EM BREVE'}</strong></div><span className="hxa-heli">✦</span></div>
        <div className="hxa-toast" role="status">{error ?? notice}</div>
        {phase === 'queued' && <button className="hxa-cancel-queue" onClick={() => { connectionRef.current?.cancelQueue(); setPhase('lobby'); }}>CANCELAR FILA</button>}
        {phase === 'result' && <div className="hxa-result" role="status"><strong>{reward?.outcome === 'extracted' ? 'EXTRAÇÃO CONCLUÍDA' : reward?.outcome === 'victory' ? 'VITÓRIA' : 'INCURSÃO ENCERRADA'}</strong><span>+{String(reward?.xp ?? 0)} XP · +{String(reward?.gold ?? 0)} ouro{reward?.weaponUnlocked ? ` · arma: ${String(reward.weaponUnlocked)}` : ''}</span><button onClick={() => void joinQueue()}>JOGAR DE NOVO</button></div>}
        <div className="hxa-extract-indicator"><span className={snapshot?.extractionActive ? 'active' : ''} />{snapshot?.extractionActive ? 'PORTAL ATIVO · PRESSIONE E' : 'PONTOS DE EXTRAÇÃO ATIVAM EM BREVE'}</div>
        <section className="hxa-backpack"><div><Backpack size={16} /><strong>MOCHILA · SAQUE DA INCURSÃO</strong></div><small>{ownArenaHero ? 'Extraia para guardar o que coletou' : 'Armas · kit médico · munição · ouro'}</small><div className="hxa-loot-slots">{Array.from({ length: 5 }, (_, index) => {
          const item = ownArenaHero?.carriedWeapons[index] ?? (index === 0 && ownArenaHero?.carriedGold ? `ouro ×${ownArenaHero.carriedGold}` : index === 1 && ownArenaHero?.carriedXp ? `+${ownArenaHero.carriedXp} XP` : 'Vazio');
          return <span key={index} className={item === 'Vazio' ? 'empty' : ''}>{item === 'Vazio' ? <Package size={17} /> : item.replaceAll('-', ' ').toUpperCase()}</span>;
        })}</div></section>
        <section className="hxa-combat-hud"><div className="hxa-weapon-label"><Swords size={14} /> {equippedWeaponName.toUpperCase()} · ARMA ATUAL</div><div className="hxa-power-slots">{['RAJADA','ESCUDO','DASH','SUPERNOVA'].map((label, index) => <button key={label} className={index === 0 ? 'selected' : ''} title={`${label} · tecla ${index + 1}`} onPointerDown={() => index === 0 && setInput('power', true)} onPointerUp={() => setInput('power', false)}><span>{index + 1}</span><small>{label}</small></button>)}</div><div className="hxa-status-bars"><span><i className="life" style={{ width: `${Math.max(0, Math.min(100, (ownArenaHero?.health ?? player.health) / Math.max(1, ownArenaHero?.maxHealth ?? player.health) * 100))}%` }} /></span><span><i className="energy" style={{ width: `${ownArenaHero?.energy ?? 100}%` }} /></span></div><div className="hxa-action-row"><button className="hxa-touch-key" {...buttonAction('left')}>◀</button><button className="hxa-touch-key" {...buttonAction('right')}>▶</button><button className="hxa-touch-key" {...buttonAction('jump')}>PULAR</button><button className="hxa-touch-key" {...buttonAction('attack')}>ATACAR</button><button className="hxa-extract-now" onClick={() => { setInput('interact', true); window.setTimeout(() => setInput('interact', false), 250); }}>EXTRAIR · E</button></div></section>
        {mobileControl && <span className="hxa-control-live">CONTROLE: {mobileControl.toUpperCase()}</span>}
      </div>
      <footer className="hxa-footer">A/D ou ←/→ mover · Espaço pular · J ou clique atacar · Q poder · E extrair <span>Agilidade = velocidade · Força = dano</span></footer>
    </section>
  );
}

