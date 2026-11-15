import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowUpRight, Award, Bolt, LogOut, Shield, Swords, UserRound, Zap } from 'lucide-react';
import {
  actInHeroX,
  bootstrapHeroX,
  loadHeroXCatalog,
  loadHeroXRankings,
  type HeroAttribute,
  type HeroFaction,
  type HeroPlayer,
  type HeroRankingEntry,
  type HeroXCatalog,
} from '../../services/heroxClient';
import { keepPreviousOnRefreshFailure } from '../../services/heroxApi';
import { logoutFirebaseSession, signInWithGooglePopup, subscribeToAuthState, type OnlineSessionUser } from '../../services/firebaseAuth';
import { ArenaGame } from './ArenaGame';

type Section = 'overview' | 'campaign' | 'arena' | 'powers' | 'extraction';

const attributeLabels: Record<HeroAttribute, string> = {
  power: 'Poder',
  agility: 'Agilidade',
  intellect: 'Intelecto',
  vitality: 'Vitalidade',
};

const powerDescriptions: Record<string, string> = {
  'kinetic-burst': 'Concentra força em um golpe direto.',
  'aegis-field': 'Ergue um campo defensivo para virar a luta.',
  'phase-step': 'Deslocamento veloz que confunde o rival.',
  overload: 'Libera energia acumulada em um ataque intenso.',
  'last-stand': 'Transforma a pressão em um contra-ataque decisivo.',
};

function operationId() {
  return `hx_${crypto.randomUUID()}`;
}

export function HeroXGame() {
  const [user, setUser] = useState<OnlineSessionUser | null>(null);
  const [factionChoice, setFactionChoice] = useState<HeroFaction>('sentinel');
  const [player, setPlayer] = useState<HeroPlayer | null>(null);
  const [catalog, setCatalog] = useState<HeroXCatalog | null>(null);
  const [rankings, setRankings] = useState<HeroRankingEntry[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(setUser);
    void Promise.allSettled([loadHeroXCatalog(), loadHeroXRankings()])
      .then(([catalogResult, rankingsResult]) => {
        if (catalogResult.status === 'fulfilled') setCatalog(catalogResult.value);
        if (rankingsResult.status === 'fulfilled') setRankings(rankingsResult.value);
        const rejected = [catalogResult, rankingsResult].find((result) => result.status === 'rejected');
        if (rejected?.status === 'rejected') {
          setError(rejected.reason instanceof Error ? rejected.reason.message : 'Não foi possível carregar o HEROX.');
        }
      })
      .finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    setPlayer(null);
    setNotice(null);
    setError(null);
    if (!user) return;

    setBusy(true);
    void bootstrapHeroX(factionChoice)
      .then(({ player: serverPlayer, isNewAccount }) => {
        if (sequence !== requestSequence.current) return;
        setPlayer(serverPlayer);
        if (isNewAccount) setNotice(`Bem-vindo à cidade, ${serverPlayer.heroName}. Sua jornada começou.`);
      })
      .catch((reason: unknown) => {
        if (sequence !== requestSequence.current) return;
        setError(reason instanceof Error ? reason.message : 'Não foi possível sincronizar seu herói.');
      })
      .finally(() => {
        if (sequence === requestSequence.current) setBusy(false);
      });
    return () => { requestSequence.current += 1; };
  }, [user, factionChoice]);

  async function runAction(action: Record<string, unknown>, successText: (result?: Record<string, unknown>) => string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await actInHeroX({ ...action, opId: operationId() });
      setPlayer(response.player);
      setNotice(successText(response.result));
      const freshRankings = await keepPreviousOnRefreshFailure(rankings, loadHeroXRankings);
      setRankings(freshRankings);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'A ação não foi concluída.');
    } finally {
      setBusy(false);
    }
  }

  async function connectAccount() {
    setError(null);
    const result = await signInWithGooglePopup();
    if (!result.ok) setError(result.errorMessage ?? 'Não foi possível entrar com Google.');
  }

  async function signOut() {
    await logoutFirebaseSession();
    setPlayer(null);
    setUser(null);
  }

  const factionName = player?.faction === 'outcast' ? 'Dissidente' : 'Sentinela';
  const chapter = catalog?.chapters.find((entry) => entry.id === player?.campaign.chapter);
  const rivalList = rankings.filter((entry) => entry.uid !== player?.uid);

  return (
    <main className="herox-page">
      <div className="herox-shell">
        <header className="herox-topbar">
          <a className="herox-brand" href="/" aria-label="HEROX início">
            <span className="herox-brand-mark"><Bolt size={21} fill="currentColor" /></span>
            <span>HERO<span>X</span><small>CRISE URBANA</small></span>
          </a>
          <div className="herox-top-actions">
            <span className={`herox-server-status ${catalog ? 'online' : loading ? 'pending' : 'offline'}`}><i /> {catalog ? 'SERVIDOR ONLINE' : loading ? 'CONECTANDO' : 'SERVIDOR INDISPONÍVEL'}</span>
            {user ? (
              <button className="herox-user-chip" onClick={() => void signOut()} title="Sair da conta">
                <UserRound size={16} /> {user.displayName.slice(0, 18)} <LogOut size={14} />
              </button>
            ) : <span className="herox-login-hint">ENTRE PARA SALVAR SUA JORNADA</span>}
          </div>
        </header>

        <section className="herox-hero-banner">
          <div className="herox-banner-orb orb-one" /><div className="herox-banner-orb orb-two" />
          <div className="herox-banner-copy">
            <span className="herox-kicker"><span /> TEMPORADA 01 · A CIDADE NÃO ESQUECE</span>
            <h1>A cidade precisa<br /><em>escolher um lado.</em></h1>
            <p>Heróis e anti-heróis disputam o futuro de uma metrópole à beira do colapso.</p>
          </div>
          <div className="herox-banner-stamp"><Bolt size={28} /><span>PROTOCOLO<br />HEROX</span></div>
          <div className="herox-banner-grid" aria-hidden="true" />
        </section>

        {error && <div className="herox-alert error" role="alert">{error}</div>}
        {notice && <div className="herox-alert success" role="status">{notice}</div>}

        {!user ? (
          <section className="herox-onboarding">
            <div className="herox-section-heading">
              <div><span className="herox-kicker">PRIMEIRO PASSO</span><h2>Defina sua postura</h2></div>
              <span className="herox-heading-note">Sua facção define como você encara a cidade.</span>
            </div>
            <div className="herox-faction-grid">
              {(catalog?.factions ?? [
                { id: 'sentinel' as const, name: 'Sentinela', description: 'Protege os distritos e as pessoas da cidade.' },
                { id: 'outcast' as const, name: 'Dissidente', description: 'Enfrenta o sistema e disputa o controle da cidade.' },
              ]).map((faction) => (
                <button key={faction.id} className={`herox-faction-card ${factionChoice === faction.id ? 'selected' : ''}`} onClick={() => setFactionChoice(faction.id)}>
                  <span className="herox-faction-icon">{faction.id === 'sentinel' ? <Shield /> : <Swords />}</span>
                  <span><strong>{faction.name}</strong><small>{faction.description}</small></span>
                  <span className="herox-radio" />
                </button>
              ))}
            </div>
            <button className="herox-primary-button" onClick={() => void connectAccount()} disabled={loading}>
              CONECTAR COM GOOGLE <ArrowUpRight size={17} />
            </button>
            <p className="herox-trust-note">Seu progresso online é validado e salvo pelo servidor HEROX.</p>
          </section>
        ) : (
          <>
            <section className="herox-player-overview">
              {busy && !player ? <div className="herox-loading"><Activity className="spin" /> Sincronizando perfil seguro…</div> : player && (
                <>
                  <div className="herox-player-id">
                    <div className={`herox-avatar ${player.faction}`}><Bolt size={30} /></div>
                    <div><span className="herox-kicker">{factionName.toUpperCase()} · NÍVEL {player.level}</span><h2>{player.heroName}</h2><small>Uma nova força está surgindo nos distritos.</small></div>
                  </div>
                  <div className="herox-stat-pills">
                    <div><span>HONRA</span><strong>{player.honor}</strong></div>
                    <div><span>VITÓRIAS</span><strong>{player.wins}</strong></div>
                    <div><span>ENERGIA</span><strong>{player.energy}<small> / 100</small></strong></div>
                    <div><span>VIDA</span><strong>{player.health}</strong></div>
                  </div>
                </>
              )}
            </section>

            <nav className="herox-tabs" aria-label="Seções do jogo">
              {([
                ['overview', 'Visão geral', <Activity size={16} />],
                ['campaign', 'Campanha', <Shield size={16} />],
                ['arena', 'Arena PvP', <Swords size={16} />],
                ['powers', 'Poderes', <Zap size={16} />],
                ['extraction', 'Incursão 2D', <Swords size={16} />],
              ] as [Section, string, ReactNode][]).map(([id, label, icon]) => (
                <button key={id} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>{icon}{label}</button>
              ))}
            </nav>

            {!player && busy ? <div className="herox-loading"><Activity className="spin" /> Criando ou carregando seu herói…</div> : player && section === 'overview' && (
              <section className="herox-content-grid">
                <article className="herox-card herox-story-card">
                  <span className="herox-kicker">ARCO ATUAL · CAPÍTULO {player.campaign.chapter}</span>
                  <h2>{chapter?.title ?? 'A cidade aguarda sua próxima decisão'}</h2>
                  <p>Distrito: {chapter?.district ?? 'Distrito Zero'}. Avance pelas missões, ganhe experiência e deixe sua marca no conflito.</p>
                  <div className="herox-progress-label"><span>MISSÃO {player.campaign.mission} / {chapter?.missions ?? 10}</span><span>{player.campaign.completed} concluídas</span></div>
                  <div className="herox-progress"><i style={{ width: `${Math.min(100, (((player.campaign.mission - 1) / (chapter?.missions ?? 10)) * 100))}%` }} /></div>
                  <button className="herox-primary-button compact" disabled={busy} onClick={() => void runAction({ action: 'campaign_mission' }, (result) => result?.won ? `Missão concluída · +${result.xp} XP · +${result.honor} honra` : 'A missão falhou. Recupere-se e tente novamente.')}>INICIAR MISSÃO <ArrowUpRight size={16} /></button>
                </article>
                <article className="herox-card herox-attributes-card">
                  <div className="herox-card-heading"><div><span className="herox-kicker">EVOLUÇÃO</span><h2>Atributos</h2></div><span className="herox-points">{player.attributePoints} pontos</span></div>
                  {(Object.keys(attributeLabels) as HeroAttribute[]).map((key) => (
                    <div className="herox-attribute-row" key={key}><span>{attributeLabels[key]}</span><strong>{player.attributes[key]}</strong><button aria-label={`Aumentar ${attributeLabels[key]}`} title={player.attributePoints < 1 ? 'Sem pontos de atributo disponíveis' : `Aumentar ${attributeLabels[key]}`} disabled={busy || player.attributePoints < 1} onClick={() => void runAction({ action: 'allocate_attribute', attribute: key, points: 1 }, () => `${attributeLabels[key]} aumentado.`)}>+</button></div>
                  ))}
                  <p>A cada nível você recebe pontos para personalizar seu estilo de combate.</p>
                </article>
              </section>
            )}

            {player && section === 'campaign' && (
              <section className="herox-card herox-wide-card">
                <span className="herox-kicker">OPERAÇÃO EM ANDAMENTO · 5 DE ENERGIA</span>
                <h2>{chapter?.title ?? 'Temporada concluída'}</h2>
                <p>{chapter ? `${chapter.district} · Missão ${player.campaign.mission} de ${chapter.missions}.` : 'Você concluiu todos os capítulos disponíveis desta temporada.'}</p>
                <div className="herox-chapter-list">{catalog?.chapters.map((entry) => <div key={entry.id} className={entry.id === player.campaign.chapter ? 'active' : entry.id < player.campaign.chapter ? 'complete' : ''}><span>0{entry.id}</span><strong>{entry.title}</strong><small>{entry.district} · Ameaça {entry.threat.toFixed(1)}</small></div>)}</div>
                {chapter && <button className="herox-primary-button compact" disabled={busy} onClick={() => void runAction({ action: 'campaign_mission' }, (result) => result?.won ? `Vitória · +${result.xp} XP · +${result.honor} honra` : 'Você foi derrotado. A cidade ainda não acabou.')}>AVANÇAR NA CAMPANHA <ArrowUpRight size={16} /></button>}
              </section>
            )}

            {player && section === 'arena' && (
              <section className="herox-card herox-wide-card">
                <div className="herox-card-heading"><div><span className="herox-kicker">DUELOS ENTRE JOGADORES</span><h2>Classificação da cidade</h2></div><span className="herox-live-pill"><i /> REAL</span></div>
                <p>Desafie jogadores conectados ao HEROX. Bots não aparecem nem recebem pontos no ranking.</p>
                {rivalList.length === 0 ? <div className="herox-empty-state"><Swords size={25} /><strong>Nenhum rival disponível ainda</strong><span>Quando outros jogadores criarem seus heróis, eles aparecerão aqui.</span></div> : <div className="herox-ranking-list">{rankings.map((entry) => <div className="herox-ranking-row" key={entry.uid}><span className="herox-rank-number">#{entry.rank}</span><div className="herox-rival-avatar"><Bolt size={17} /></div><div className="herox-rival-info"><strong>{entry.heroName}{entry.uid === player.uid ? ' (você)' : ''}</strong><small>{entry.faction === 'sentinel' ? 'Sentinela' : 'Dissidente'} · Nv. {entry.level} · {entry.wins} vitórias</small></div><span className="herox-rival-honor"><Award size={14} /> {entry.honor}</span>{entry.uid !== player.uid && <button disabled={busy || player.energy < 10} title={player.energy < 10 ? 'Energia insuficiente' : `Desafiar ${entry.heroName}`} onClick={() => void runAction({ action: 'arena_challenge', targetUid: entry.uid }, (result) => `${result?.outcome === 'victory' ? 'Vitória' : 'Derrota'} contra ${result?.opponent ?? entry.heroName}.`)}>DESAFIAR</button>}</div>)}</div>}
              </section>
            )}

            {player && section === 'powers' && (
              <section className="herox-card herox-wide-card">
                <div className="herox-card-heading"><div><span className="herox-kicker">ÁRVORE DE HABILIDADES</span><h2>Desperte seus poderes</h2></div><span className="herox-points">{player.powerPoints} pontos</span></div>
                <div className="herox-power-grid">{catalog?.powers.map((power) => {
                  const unlocked = player.powers.includes(power.id);
                  const available = player.level >= power.unlockLevel && player.powerPoints >= power.cost;
                  return <article className={`herox-power-card ${unlocked ? 'unlocked' : ''}`} key={power.id}><span className="herox-power-icon"><Zap size={19} /></span><span className="herox-kicker">{unlocked ? 'DESBLOQUEADO' : `NÍVEL ${power.unlockLevel}`}</span><h3>{power.name}</h3><p>{powerDescriptions[power.id] ?? 'Uma técnica especial para o conflito urbano.'}</p><div><small>DANO</small><strong>{Math.round(power.damage * 100)}%</strong><small>CUSTO</small><strong>{power.cost}</strong></div>{!unlocked && <button disabled={busy || !available} title={available ? 'Desbloquear poder' : 'Nível ou pontos insuficientes'} onClick={() => void runAction({ action: 'unlock_power', powerId: power.id }, () => `${power.name} desbloqueado.`)}>DESBLOQUEAR</button>}</article>;
                })}</div>
              </section>
            )}

            {player && user && section === 'extraction' && (
              <ArenaGame player={player} onPlayerUpdate={setPlayer} onExit={() => setSection('overview')} />
            )}
          </>
        )}

        <footer className="herox-footer"><span>HEROX · CRISE URBANA</span><span>Temporada 01 <i /> Progressão validada pelo servidor</span></footer>
      </div>
    </main>
  );
}

