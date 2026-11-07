import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArtworkImage, IMAGE_ASSETS } from './design/assets';
import {
  ARENA_OPPONENTS,
  DUNGEONS,
  EquipmentSlotType,
  EXPEDITION_REGIONS,
  GAME_CONFIG,
  IdleFocusMode,
  PrimaryStatKey,
} from './game/config';
import {
  computeGuildRankings,
  computePlayerRankings,
  getActiveGuildBonuses,
  GuildBuildingId,
  GuildEmblemId,
  GuildRecruitmentStatus,
  GuildRole,
  LibraryScrollId,
} from './game/guildsAndRankings';
import {
  activateLibraryScroll,
  addSimulatedApplicantToPlayerGuild,
  applyOrJoinGuild,
  buyFromGuildInternalMarket,
  cancelGuildApplication,
  changeGuildMemberRole,
  createGuild,
  depositItemToGuildWarehouse,
  dissolveGuild,
  donateToGuildBank,
  kickGuildMember,
  leaveGuild,
  postGuildAnnouncement,
  reviewGuildApplication,
  setPlayerRoleInCurrentGuildLocalMode,
  simulateCouncilDecisionForPlayerApplication,
  transferGuildLeadership,
  updateGuildProfile,
  upgradeGuildBuilding,
  useVillaMedici,
  withdrawItemFromGuildWarehouse,
} from './game/guildActions';
import {
  advanceTutorialIfMatching,
  applyMedicalTreatment,
  buyItemFromMarket,
  buyMedicineTemplate,
  calculateDerivedStats,
  calculateElapsedIdleProgress,
  claimPendingReward,
  CombatReport,
  createInitialGameState,
  createItemFromTemplate,
  equipItemFromInventory,
  GameState,
  getNextObjective,
  getPlayerSnapshotForRankings,
  inspectAndLoadSaveState,
  PendingRewardBatch,
  resolveCombat,
  sellItemFromInventory,
  StatChangeNotification,
  trainGladiatorStat,
  TutorialStepId,
  unequipSlotToInventory,
  useMedicineFromInventory,
} from './game/rules';
import {
  AuthoritativeActionType,
  MIGRATION_COMPETITIVE_CAPS,
  MigrationReport,
} from './server/onlineAuthorityEngine';
import {
  apiBootstrapOnlinePlayer,
  apiExecuteAuthoritativeAction,
  apiMigrateLocalSave,
  logoutOnlineSession,
  OnlineSessionUser,
  signInWithGooglePopup,
  subscribeToAuthState,
  testFirestoreConnection,
} from './services/firebaseClient';
import {
  BottomNavigation,
  CombatPresentationView,
  GameButton,
  GameModal,
  GameShell,
  MainTabId,
  ResourceBar,
  RewardPanel,
} from './components/ui/RomanComponents';
import { CharacterScreen } from './components/screens/CharacterScreen';
import { ExpeditionsScreen } from './components/screens/ExpeditionsScreen';
import { ArenaScreen } from './components/screens/ArenaScreen';
import { InventoryScreen } from './components/screens/InventoryScreen';
import { CityScreen, CitySubTab } from './components/screens/CityScreen';

const PRE_MIGRATION_BACKUP_KEY = 'gladiatorum_pre_online_migration_backup_v4';

interface BootInitialization {
  state: GameState;
  offlineBatch: PendingRewardBatch | null;
  hasExistingSave: boolean;
  corruptedInfo: { raw: string; reason: string } | null;
}

export default function App() {
  // TODOS os Hooks (useMemo, useState, useEffect, useCallback) ficam no topo absoluto do componente,
  // antes de qualquer retorno condicional, eliminando de forma definitiva o React Error #310.
  const isAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const [initialBootResult] = useState<BootInitialization>(() => {
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(GAME_CONFIG.saveKey);
      const inspection = inspectAndLoadSaveState(raw, now);

      if (inspection.status === 'corrupted') {
        try {
          if (inspection.rawCorruptedData) {
            window.localStorage.setItem(
              GAME_CONFIG.backupCorruptedKey,
              inspection.rawCorruptedData
            );
          }
        } catch {
          // Ignora falha de backup secundário
        }
        return {
          state: inspection.state,
          offlineBatch: null,
          hasExistingSave: false,
          corruptedInfo: {
            raw: inspection.rawCorruptedData ?? '',
            reason:
              inspection.corruptionError ??
              'Dados de progresso em formato irreconhecível.',
          },
        };
      }

      if (inspection.status === 'loaded') {
        const { state: updated, offlineBatchCreated } = calculateElapsedIdleProgress(
          inspection.state,
          now
        );
        const hasProgress =
          updated.wins > 0 ||
          updated.losses > 0 ||
          updated.level > 1 ||
          updated.gold !== 160 ||
          updated.idle.active ||
          Boolean(updated.guildState.playerGuildId);
        return {
          state: updated,
          offlineBatch: offlineBatchCreated,
          hasExistingSave: hasProgress,
          corruptedInfo: null,
        };
      }

      return {
        state: inspection.state,
        offlineBatch: null,
        hasExistingSave: false,
        corruptedInfo: null,
      };
    } catch {
      return {
        state: createInitialGameState(now),
        offlineBatch: null,
        hasExistingSave: false,
        corruptedInfo: null,
      };
    }
  });

  const [screenMode, setScreenMode] = useState<'title' | 'playing'>(
    isAutostart ? 'playing' : 'title'
  );
  const [activeTab, setActiveTab] = useState<MainTabId>('character');
  const [citySubTab, setCitySubTab] = useState<CitySubTab>('training');
  const [gameState, setGameState] = useState<GameState>(initialBootResult.state);
  const [hasExistingSave, setHasExistingSave] = useState<boolean>(
    initialBootResult.hasExistingSave
  );
  const [corruptedSaveModal, setCorruptedSaveModal] = useState<{
    raw: string;
    reason: string;
  } | null>(initialBootResult.corruptedInfo);
  const [offlineModalBatch, setOfflineModalBatch] = useState<PendingRewardBatch | null>(
    initialBootResult.offlineBatch
  );
  const [inspectedReport, setInspectedReport] = useState<CombatReport | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [lastStatChange, setLastStatChange] = useState<StatChangeNotification | null>(
    null
  );
  const [bannerFeedback, setBannerFeedback] = useState<{
    message: string;
    type: 'info' | 'success' | 'error';
  } | null>(null);

  // Estado de Autenticação Firebase e Autoridade Online
  const [onlineUser, setOnlineUser] = useState<OnlineSessionUser | null>(null);
  const [onlineSyncStatus, setOnlineSyncStatus] = useState<
    'idle' | 'bootstrapping' | 'syncing' | 'error'
  >('idle');
  const [onlineSyncError, setOnlineSyncError] = useState<string | null>(null);
  const [onlinePlayerRank, setOnlinePlayerRank] = useState<number | null>(null);
  const [onlineGuildRank, setOnlineGuildRank] = useState<number | null>(null);
  const [migratedFromLocal, setMigratedFromLocal] = useState<boolean>(false);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [firebaseProjectInfo, setFirebaseProjectInfo] = useState<{
    connected: boolean;
    projectId: string;
    databaseId: string;
  } | null>(null);
  const [pendingRetryAction, setPendingRetryAction] = useState<{
    opId: string;
    action: AuthoritativeActionType;
    params?: Record<string, unknown>;
  } | null>(null);

  const isOnlineMode = Boolean(onlineUser);

  const derivedStats = useMemo(
    () =>
      calculateDerivedStats(
        gameState.baseStats,
        gameState.equipped,
        gameState.level,
        gameState.guildState
      ),
    [gameState.baseStats, gameState.equipped, gameState.level, gameState.guildState]
  );

  const guildBonuses = useMemo(
    () => getActiveGuildBonuses(gameState.guildState),
    [gameState.guildState]
  );

  const playerRankingSnapshot = useMemo(
    () => getPlayerSnapshotForRankings(gameState),
    [gameState]
  );

  const playerRankPosition = useMemo(() => {
    if (isOnlineMode && onlinePlayerRank) {
      return onlinePlayerRank;
    }
    const ranked = computePlayerRankings(
      gameState.guildState,
      playerRankingSnapshot,
      'honor'
    );
    return ranked.find((p) => p.isPlayer)?.rank ?? 1;
  }, [isOnlineMode, onlinePlayerRank, gameState.guildState, playerRankingSnapshot]);

  const guildRankPosition = useMemo(() => {
    if (isOnlineMode && onlineGuildRank !== null) {
      return onlineGuildRank;
    }
    const ranked = computeGuildRankings(
      gameState.guildState,
      playerRankingSnapshot
    );
    return ranked.find((g) => g.isPlayerGuild)?.rank ?? null;
  }, [isOnlineMode, onlineGuildRank, gameState.guildState, playerRankingSnapshot]);

  const nextObjective = useMemo(
    () => getNextObjective(gameState, derivedStats),
    [gameState, derivedStats]
  );

  const screenStateWithoutActiveModalReward = useMemo<GameState>(() => {
    const activeModalClaimIds = new Set<string>();
    if (inspectedReport?.rewardClaimId) {
      activeModalClaimIds.add(inspectedReport.rewardClaimId);
    }
    if (offlineModalBatch?.claimId) {
      activeModalClaimIds.add(offlineModalBatch.claimId);
    }
    if (activeModalClaimIds.size === 0) return gameState;
    return {
      ...gameState,
      pendingRewards: gameState.pendingRewards.filter(
        (b) => !activeModalClaimIds.has(b.claimId)
      ),
    };
  }, [gameState, inspectedReport, offlineModalBatch]);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      setBannerFeedback({ message, type });
    },
    []
  );

  const bootstrapOnlineSession = useCallback(
    async (user: OnlineSessionUser) => {
      setOnlineSyncStatus('bootstrapping');
      setOnlineSyncError(null);
      try {
        const res = await apiBootstrapOnlinePlayer(user);
        setGameState(res.state);
        setOnlinePlayerRank(res.playerRank);
        setOnlineGuildRank(res.guildRank);
        setMigratedFromLocal(res.migratedFromLocal);
        setMigrationReport(res.migrationSummary);
        if (res.offlineBatchCreated) {
          setOfflineModalBatch(res.offlineBatchCreated);
        }
        setOnlineSyncStatus('idle');
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Falha de comunicação ao sincronizar com o servidor.';
        setOnlineSyncStatus('error');
        setOnlineSyncError(msg);
      }
    },
    []
  );

  useEffect(() => {
    void testFirestoreConnection().then((info) => {
      setFirebaseProjectInfo(info);
    });
    const unsub = subscribeToAuthState((user) => {
      setOnlineUser(user);
      if (user) {
        void bootstrapOnlineSession(user);
      } else {
        setOnlinePlayerRank(null);
        setOnlineGuildRank(null);
        setOnlineSyncStatus('idle');
        setOnlineSyncError(null);
      }
    });
    return () => unsub();
  }, [bootstrapOnlineSession]);

  useEffect(() => {
    document.body.dataset.state = screenMode;
  }, [screenMode]);

  useEffect(() => {
    if (screenMode !== 'title') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (helpModalOpen || corruptedSaveModal || accountModalOpen) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setScreenMode('playing');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenMode, helpModalOpen, corruptedSaveModal, accountModalOpen]);

  // Persistência local (apenas quando em Modo Visitante Local para nunca sobrescrever o save local com dados de outra conta)
  useEffect(() => {
    if (corruptedSaveModal || isOnlineMode) return;
    try {
      window.localStorage.setItem(GAME_CONFIG.saveKey, JSON.stringify(gameState));
    } catch {
      // Ignora erro de quota
    }
  }, [gameState, corruptedSaveModal, isOnlineMode]);

  // Ciclo Idle de 1s
  useEffect(() => {
    if (corruptedSaveModal) return;
    const timer = window.setInterval(() => {
      if (isOnlineMode && onlineUser) {
        if (gameState.idle.active) {
          void apiExecuteAuthoritativeAction(onlineUser, {
            opId: `op_tick_${Date.now()}`,
            action: 'sync_idle',
          })
            .then((res) => {
              if (res.ok && res.state) {
                setGameState(res.state);
                if (res.playerRank) setOnlinePlayerRank(res.playerRank);
                if (res.guildRank !== undefined) setOnlineGuildRank(res.guildRank);
              }
            })
            .catch(() => {
              // Ignora oscilação momentânea de rede no tick em segundo plano
            });
        }
        return;
      }
      const now = Date.now();
      setGameState((prev) => {
        const { state: next } = calculateElapsedIdleProgress(prev, now);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [corruptedSaveModal, isOnlineMode, onlineUser, gameState.idle.active]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !corruptedSaveModal) {
        if (isOnlineMode && onlineUser) {
          void bootstrapOnlineSession(onlineUser);
          return;
        }
        const now = Date.now();
        setGameState((prev) => {
          const { state: next, offlineBatchCreated } = calculateElapsedIdleProgress(
            prev,
            now
          );
          if (offlineBatchCreated && offlineBatchCreated.elapsedSecondsAccounted >= 30) {
            setOfflineModalBatch(offlineBatchCreated);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [corruptedSaveModal, isOnlineMode, onlineUser, bootstrapOnlineSession]);

  // Hooks de inspeção determinística para testes (render_game_to_text e advanceTime)
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.render_game_to_text = () =>
      JSON.stringify({
        screenMode,
        activeTab,
        citySubTab,
        isOnlineMode,
        onlineUid: onlineUser?.uid ?? null,
        name: gameState.name,
        level: gameState.level,
        gold: gameState.gold,
        honor: gameState.honor,
        fame: gameState.fame,
        goldLooted: gameState.goldLooted,
        currentHp: gameState.currentHp,
        maxHp: derivedStats.maxHp,
        energy: gameState.energy,
        wins: gameState.wins,
        losses: gameState.losses,
        playerRank: playerRankPosition,
        guildId: gameState.guildState.playerGuildId,
        guildTag: guildBonuses.guildTag,
        guildRank: guildRankPosition,
        trainingDiscountPercent: guildBonuses.trainingDiscountPercent,
        tutorialStep: gameState.tutorial.step,
        idleActive: gameState.idle.active,
        idleFocus: gameState.idle.focusMode,
        inventoryCount: gameState.inventory.length,
        pendingRewardsCount: gameState.pendingRewards.length,
        nextObjective: nextObjective.title,
      });
    win.advanceTime = (ms: number) => {
      const targetNow = Date.now() + ms;
      setGameState((prev) => {
        const { state: next, offlineBatchCreated } = calculateElapsedIdleProgress(
          prev,
          targetNow
        );
        if (offlineBatchCreated) {
          setOfflineModalBatch(offlineBatchCreated);
        }
        return next;
      });
    };
  }, [
    screenMode,
    activeTab,
    citySubTab,
    isOnlineMode,
    onlineUser,
    gameState,
    derivedStats.maxHp,
    playerRankPosition,
    guildBonuses,
    guildRankPosition,
    nextObjective.title,
  ]);

  const openCitySubTab = (sub: CitySubTab) => {
    setCitySubTab(sub);
    setActiveTab('city');
  };

  // Executor central para ações autoritativas quando conectado online
  const executeOnlineAction = useCallback(
    async (
      action: AuthoritativeActionType,
      params?: Record<string, unknown>,
      customOpId?: string
    ) => {
      if (!onlineUser) return;
      const opId =
        customOpId || `op_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setOnlineSyncStatus('syncing');
      setOnlineSyncError(null);
      setPendingRetryAction(null);

      try {
        const res = await apiExecuteAuthoritativeAction(onlineUser, {
          opId,
          action,
          params,
        });
        setOnlineSyncStatus('idle');
        if (!res.ok || res.error) {
          showToast(res.error ?? 'Operação recusada pelo servidor.', 'error');
          if (res.state) {
            setGameState(res.state);
          }
          return;
        }
        setGameState(res.state);
        if (res.playerRank) setOnlinePlayerRank(res.playerRank);
        if (res.guildRank !== undefined) setOnlineGuildRank(res.guildRank);
        if (res.statChanges) {
          setLastStatChange({
            id: `stat_${Date.now()}`,
            summary: res.statChanges.sourceLabel,
            changes: res.statChanges.deltas.map((d) => ({
              label: d.label,
              before: d.before,
              after: d.after,
              diff:
                typeof d.after === 'number' && typeof d.before === 'number'
                  ? d.after - d.before
                  : 1,
            })),
          });
        }
        if (res.combatReport) setInspectedReport(res.combatReport);
        if (action === 'claim_reward' && params?.claimId === offlineModalBatch?.claimId) {
          setOfflineModalBatch(null);
        }
        if (res.message) {
          showToast(res.message, 'success');
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Falha de comunicação com o servidor.';
        setOnlineSyncStatus('error');
        setOnlineSyncError(msg);
        setPendingRetryAction({ opId, action, params });
        showToast(
          'Falha de conexão ao comunicar com o servidor. Você pode tentar novamente sem perder seu progresso.',
          'error'
        );
      }
    },
    [onlineUser, offlineModalBatch, showToast]
  );

  // Handlers de Autenticação Google e Migração de Save Local
  const handleGoogleSignIn = async () => {
    const res = await signInWithGooglePopup();
    if (!res.ok) {
      showToast(res.errorMessage ?? 'Login não concluído.', 'info');
      return;
    }
    showToast(
      `Conectado com sucesso como ${res.user?.displayName ?? 'Gladiador'}!`,
      'success'
    );
  };

  const handleLogoutOnline = async () => {
    await logoutOnlineSession();
    setOnlineUser(null);
    const raw = window.localStorage.getItem(GAME_CONFIG.saveKey);
    const inspection = inspectAndLoadSaveState(raw, Date.now());
    setGameState(inspection.state);
    showToast(
      'Sessão online encerrada. Retornando ao Modo Visitante Local.',
      'info'
    );
  };

  const handleMigrateLocalSaveToOnline = async () => {
    if (!onlineUser) {
      showToast('Faça login em uma conta online antes de migrar seu save local.', 'error');
      return;
    }
    const rawLocal = window.localStorage.getItem(GAME_CONFIG.saveKey);
    if (!rawLocal) {
      showToast('Nenhum save local foi encontrado neste navegador para migrar.', 'error');
      return;
    }
    // Preserva cópia de segurança antes de migrar (Seção 5)
    try {
      window.localStorage.setItem(PRE_MIGRATION_BACKUP_KEY, rawLocal);
    } catch {
      // Ignora erro de quota
    }

    setOnlineSyncStatus('syncing');
    try {
      const res = await apiMigrateLocalSave(onlineUser, rawLocal);
      setOnlineSyncStatus('idle');
      if (!res.ok || res.error) {
        showToast(res.error ?? 'Migração não permitida.', 'error');
        return;
      }
      if (res.state) setGameState(res.state);
      if (res.playerRank) setOnlinePlayerRank(res.playerRank);
      if (res.guildRank !== undefined) setOnlineGuildRank(res.guildRank);
      setMigratedFromLocal(true);
      if (res.report) setMigrationReport(res.report);
      showToast(
        'Progresso local migrado com segurança para sua conta online! Backup local preservado.',
        'success'
      );
    } catch (err: unknown) {
      setOnlineSyncStatus('error');
      showToast(
        err instanceof Error ? err.message : 'Erro ao migrar save local.',
        'error'
      );
    }
  };

  // Handlers de Equipamento e Inventário
  const handleEquipItem = (itemId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('equip_item', { itemId });
      return;
    }
    const res = equipItemFromInventory(gameState, itemId);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    if (res.statChanges) {
      setLastStatChange(res.statChanges);
    }
    showToast('Equipamento vestido! Atributos atualizados imediatamente.', 'success');
  };

  const handleUnequipSlot = (slot: EquipmentSlotType) => {
    if (isOnlineMode) {
      void executeOnlineAction('unequip_slot', { slot });
      return;
    }
    const res = unequipSlotToInventory(gameState, slot);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    if (res.statChanges) {
      setLastStatChange(res.statChanges);
    }
    showToast('Equipamento guardado na mochila.', 'info');
  };

  const handleSellItem = (itemId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('sell_item', { itemId });
      return;
    }
    const res = sellItemFromInventory(gameState, itemId);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    showToast(`Item vendido por +${res.goldReceived} denários de ouro.`, 'success');
  };

  const handleRestoreHealthAtBarracks = () => {
    if (isOnlineMode) {
      void executeOnlineAction('restore_health_barracks');
      return;
    }
    const missing = Math.max(0, derivedStats.maxHp - gameState.currentHp);
    if (missing <= 0) return;
    const cost = Math.max(5, Math.ceil(missing * 0.25));
    if (gameState.gold < cost) {
      showToast(`Ouro insuficiente para o médico (${cost} Ouro).`, 'error');
      return;
    }
    setGameState((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      currentHp: derivedStats.maxHp,
    }));
    showToast('Seus ferimentos foram tratados pelo médico do Ludus!', 'success');
  };

  // Handler de Expedição Manual
  const handleStartManualExpedition = (
    regionId: string,
    enemyIndex: number,
    focusMode: IdleFocusMode
  ) => {
    if (isOnlineMode) {
      void executeOnlineAction('start_expedition', {
        regionId,
        enemyIndex,
        focusMode,
      });
      return;
    }
    const region =
      EXPEDITION_REGIONS.find((r) => r.id === regionId) ?? EXPEDITION_REGIONS[0];
    const enemy = region.enemies[enemyIndex] ?? region.enemies[0];

    if (gameState.level < region.minLevel) {
      showToast(`Requer Nível ${region.minLevel} para explorar ${region.name}.`, 'error');
      return;
    }

    if (gameState.energy < region.energyCost) {
      showToast(
        `Energia insuficiente (${gameState.energy}/${region.energyCost}).`,
        'error'
      );
      return;
    }

    const now = Date.now();
    const { report, rewardBatch, playerRemainingHp } = resolveCombat(gameState, enemy, {
      mode: 'expedition',
      locationName: region.name,
      focusMode,
      timestampMs: now,
    });

    setGameState((prev) => {
      const step1 = advanceTutorialIfMatching(prev.tutorial, 'start_expedition');
      const step2 = advanceTutorialIfMatching(step1, 'choose_next_activity');
      return {
        ...prev,
        energy: Math.max(0, prev.energy - region.energyCost),
        currentHp: playerRemainingHp,
        wins: report.victory ? prev.wins + 1 : prev.wins,
        losses: report.victory ? prev.losses : prev.losses + 1,
        lastSaveTimestampMs: now,
        idle: {
          ...prev.idle,
          focusMode,
        },
        pendingRewards: [...prev.pendingRewards, rewardBatch],
        combatHistory: [report, ...prev.combatHistory.slice(0, 14)],
        tutorial: step2,
      };
    });

    setInspectedReport(report);
  };

  // Handler de Patrulha Automática (Modo Idle)
  const handleToggleIdleActivity = (
    regionId: string,
    enemyIndex: number,
    focusMode: IdleFocusMode
  ) => {
    if (isOnlineMode) {
      void executeOnlineAction('toggle_idle', { regionId, enemyIndex, focusMode });
      return;
    }
    const region =
      EXPEDITION_REGIONS.find((r) => r.id === regionId) ?? EXPEDITION_REGIONS[0];
    if (gameState.level < region.minLevel) {
      showToast(`Requer Nível ${region.minLevel} para patrulhar ${region.name}.`, 'error');
      return;
    }

    const now = Date.now();
    setGameState((prev) => ({
      ...prev,
      lastSaveTimestampMs: now,
      idle: {
        active: true,
        regionId,
        enemyIndex,
        focusMode,
        startedAtMs: now,
        lastUpdatedAtMs: now,
        accumulatedSecondsInCurrentCycle: 0,
        pausedReason: null,
      },
      tutorial: advanceTutorialIfMatching(prev.tutorial, 'choose_next_activity'),
    }));

    showToast(
      `Patrulha Automática ativada em ${region.name}! Seu gladiador combaterá a cada ${region.durationSeconds}s.`,
      'success'
    );
  };

  const handleChangeIdleFocus = (focusMode: IdleFocusMode) => {
    if (isOnlineMode) {
      void executeOnlineAction('change_idle_focus', { focusMode });
      return;
    }
    setGameState((prev) => ({
      ...prev,
      idle: {
        ...prev.idle,
        focusMode,
      },
    }));
  };

  const handleStopIdleActivity = () => {
    if (isOnlineMode) {
      void executeOnlineAction('stop_idle');
      return;
    }
    setGameState((prev) => ({
      ...prev,
      idle: {
        ...prev.idle,
        active: false,
        accumulatedSecondsInCurrentCycle: 0,
        pausedReason: null,
      },
    }));
    showToast('Patrulha Automática pausada.', 'info');
  };

  // Simular +1h Offline (Restrito ao modo DEV na ResourceBar)
  const handleSimulateOfflineHour = () => {
    const now = Date.now();
    const simulatedPastSave = now - 3600 * 1000;
    const statePrepared: GameState = {
      ...gameState,
      lastSaveTimestampMs: simulatedPastSave,
      idle: {
        ...gameState.idle,
        active: true,
        lastUpdatedAtMs: simulatedPastSave,
      },
    };

    const { state: next, offlineBatchCreated } = calculateElapsedIdleProgress(
      statePrepared,
      now
    );
    setGameState(next);
    if (offlineBatchCreated) {
      setOfflineModalBatch(offlineBatchCreated);
    }
  };

  // Handler de Arena Provincial
  const handleChallengeArenaOpponent = (opponentId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('challenge_arena', { opponentId });
      return;
    }
    const opponent =
      ARENA_OPPONENTS.find((o) => o.id === opponentId) ?? ARENA_OPPONENTS[0];
    if (gameState.energy < 1) {
      showToast('Energia insuficiente para desafiar na Arena.', 'error');
      return;
    }

    const now = Date.now();
    const { report, rewardBatch, playerRemainingHp } = resolveCombat(
      gameState,
      opponent,
      {
        mode: 'arena',
        locationName: 'Arena Provincial de Cápua',
        timestampMs: now,
      }
    );

    const enrichedBatch: PendingRewardBatch = {
      ...rewardBatch,
      honor: report.victory ? opponent.honorReward : 0,
    };

    setGameState((prev) => ({
      ...prev,
      energy: Math.max(0, prev.energy - 1),
      currentHp: playerRemainingHp,
      wins: report.victory ? prev.wins + 1 : prev.wins,
      losses: report.victory ? prev.losses : prev.losses + 1,
      lastSaveTimestampMs: now,
      pendingRewards: [...prev.pendingRewards, enrichedBatch],
      combatHistory: [report, ...prev.combatHistory.slice(0, 14)],
      tutorial: advanceTutorialIfMatching(prev.tutorial, 'choose_next_activity'),
    }));

    setInspectedReport(report);
  };

  // Handler de Treinamento na Cidade
  const handleTrainStat = (stat: PrimaryStatKey) => {
    if (isOnlineMode) {
      void executeOnlineAction('train_stat', { stat });
      return;
    }
    const res = trainGladiatorStat(gameState, stat);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    if (res.statChanges) {
      setLastStatChange(res.statChanges);
    }
    showToast(
      res.discountAmount > 0
        ? `Atributo treinado (-${res.costPaid}g com desconto de -${res.discountAmount}g da Guilda)!`
        : `Atributo treinado com sucesso (-${res.costPaid} denários)!`,
      'success'
    );
  };

  // Handler de Compra no Mercado
  const handleBuyMarketItem = (marketItemId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('buy_market_item', { marketItemId });
      return;
    }
    const res = buyItemFromMarket(gameState, marketItemId, Date.now());
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    showToast('Equipamento adquirido no Mercado e enviado para a mochila!', 'success');
  };

  // Handlers de Medicina e Valetudinarium
  const handleUseMedicineItem = (itemId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('use_medicine_item', { itemId });
      return;
    }
    const res = useMedicineFromInventory(gameState, itemId, Date.now());
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    showToast(
      `Medicina consumida: +${res.healedHp} HP${res.restoredEnergy > 0 ? ` e +${res.restoredEnergy} Energia` : ''}!`,
      'success'
    );
  };

  const handleBuyMedicineItem = (templateId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('buy_medicine_item', { templateId });
      return;
    }
    const res = buyMedicineTemplate(gameState, templateId, Date.now());
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    showToast('Medicina adquirida na Farmácia de Galeno e guardada na mochila!', 'success');
  };

  const handleApplyMedicalTreatment = (treatmentId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('apply_medical_treatment', { treatmentId });
      return;
    }
    const res = applyMedicalTreatment(gameState, treatmentId, Date.now());
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    setGameState(res.state);
    showToast(
      `Tratamento concluído (-${res.costPaid}g): +${res.healedHp} HP${res.restoredEnergy > 0 ? ` e +${res.restoredEnergy} Energia` : ''}!`,
      'success'
    );
  };

  // Handler de Masmorra Progressiva
  const handleFightDungeonEncounter = (dungeonId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('fight_dungeon', { dungeonId });
      return;
    }
    const dungeon = DUNGEONS.find((d) => d.id === dungeonId) ?? DUNGEONS[0];
    if (gameState.level < dungeon.minLevel) {
      showToast(`Requer Nível ${dungeon.minLevel} para adentrar ${dungeon.name}.`, 'error');
      return;
    }
    if (gameState.energy < dungeon.energyCost) {
      showToast('Energia insuficiente para avançar na masmorra.', 'error');
      return;
    }

    const currentProg = gameState.dungeonProgress[dungeon.id] ?? {
      dungeonId: dungeon.id,
      currentEncounterIndex: 0,
      completedCount: 0,
    };
    const enemy =
      dungeon.encounters[currentProg.currentEncounterIndex] ?? dungeon.encounters[0];

    const now = Date.now();
    const { report, rewardBatch, playerRemainingHp } = resolveCombat(
      gameState,
      enemy,
      {
        mode: 'dungeon',
        locationName: dungeon.name,
        timestampMs: now,
      }
    );

    const isBoss =
      currentProg.currentEncounterIndex === dungeon.encounters.length - 1;
    const bossDefeated = report.victory && isBoss;

    const finalBatch: PendingRewardBatch = bossDefeated
      ? {
          ...rewardBatch,
          sourceTitle: `${dungeon.name} — Chefe Derrotado (${enemy.name})`,
          gold: rewardBatch.gold + dungeon.completionBonusGold,
          xp: rewardBatch.xp + dungeon.completionBonusXp,
          items: [
            ...rewardBatch.items,
            createItemFromTemplate(
              dungeon.guaranteedDropPool[
                currentProg.completedCount % dungeon.guaranteedDropPool.length
              ],
              `dungeon_boss_${now}`
            ),
          ],
        }
      : rewardBatch;

    const nextEncounterIdx = report.victory
      ? isBoss
        ? 0
        : currentProg.currentEncounterIndex + 1
      : currentProg.currentEncounterIndex;

    setGameState((prev) => ({
      ...prev,
      energy: Math.max(0, prev.energy - dungeon.energyCost),
      currentHp: playerRemainingHp,
      wins: report.victory ? prev.wins + 1 : prev.wins,
      losses: report.victory ? prev.losses : prev.losses + 1,
      lastSaveTimestampMs: now,
      dungeonProgress: {
        ...prev.dungeonProgress,
        [dungeon.id]: {
          dungeonId: dungeon.id,
          currentEncounterIndex: nextEncounterIdx,
          completedCount: bossDefeated
            ? currentProg.completedCount + 1
            : currentProg.completedCount,
        },
      },
      pendingRewards: [...prev.pendingRewards, finalBatch],
      combatHistory: [report, ...prev.combatHistory.slice(0, 14)],
      tutorial: advanceTutorialIfMatching(prev.tutorial, 'choose_next_activity'),
    }));

    setInspectedReport(report);
  };

  const handleResetDungeonRun = (dungeonId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('reset_dungeon', { dungeonId });
      return;
    }
    setGameState((prev) => ({
      ...prev,
      dungeonProgress: {
        ...prev.dungeonProgress,
        [dungeonId]: {
          ...(prev.dungeonProgress[dungeonId] ?? {
            dungeonId,
            completedCount: 0,
          }),
          currentEncounterIndex: 0,
        },
      },
    }));
    showToast('Incursão na masmorra reiniciada para o 1º encontro.', 'info');
  };

  // Resgate Idempotente de Recompensas
  const handleClaimReward = (claimId: string) => {
    if (isOnlineMode) {
      void executeOnlineAction('claim_reward', { claimId }, `op_claim_${claimId}`);
      return;
    }
    const res = claimPendingReward(gameState, claimId);
    if (!res.claimedNow) {
      showToast('Esta recompensa já foi resgatada anteriormente.', 'info');
      return;
    }
    setGameState(res.state);
    if (offlineModalBatch?.claimId === claimId) {
      setOfflineModalBatch(null);
    }
    showToast(
      res.leveledUp
        ? `Recompensas resgatadas! Você alcançou o Nível ${res.state.level}!`
        : 'Espólios de vitória recolhidos para o seu tesouro!',
      'success'
    );
  };

  // Handlers de Guildas e Classificação
  const applyGuildAction = (res: {
    state: GameState;
    success: boolean;
    message: string;
    error?: string;
  }) => {
    if (!res.success || res.error) {
      showToast(res.error ?? 'Operação não concluída.', 'error');
      return;
    }
    setGameState(res.state);
    showToast(res.message, 'success');
  };

  const handleSkipTutorial = () => {
    if (isOnlineMode) {
      void executeOnlineAction('skip_tutorial');
      return;
    }
    setGameState((prev) => ({
      ...prev,
      tutorial: {
        ...prev.tutorial,
        skipped: true,
      },
    }));
  };

  const handleRestartTutorial = () => {
    if (isOnlineMode) {
      void executeOnlineAction('restart_tutorial');
      setHelpModalOpen(false);
      return;
    }
    setGameState((prev) => ({
      ...prev,
      tutorial: {
        step: 'start_expedition',
        skipped: false,
      },
    }));
    setHelpModalOpen(false);
  };

  // TELA DE ABERTURA
  if (screenMode === 'title') {
    const titleDisplayName = guildBonuses.guildTag
      ? `[${guildBonuses.guildTag}] ${gameState.name}`
      : gameState.name;

    return (
      <div className="relative min-h-screen w-full bg-[#17120F] text-[#EFE2C4] flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0">
          <ArtworkImage
            src={IMAGE_ASSETS.titleBackdrop}
            alt="Pátio do Ludus Romano e Coliseu ao entardecer"
            fallbackType="banner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#17120F]/75 via-transparent to-[#17120F]/95" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-6 sm:pt-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 bg-[#17120F]/80 frame-bronze px-3.5 py-2.5">
            <svg
              viewBox="0 0 64 64"
              className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
              aria-hidden="true"
            >
              <polygon
                points="32,4 56,16 52,46 32,60 12,46 8,16"
                fill="#792B28"
                stroke="#B79552"
                strokeWidth="2.5"
              />
              <path d="M32 12 L32 52 M20 26 L44 26" stroke="#EFE2C4" strokeWidth="2.5" />
              <circle cx="32" cy="26" r="6" fill="#B79552" stroke="#17120F" strokeWidth="1.5" />
            </svg>
            <div>
              <span className="text-[10px] sm:text-xs font-roman tracking-widest text-[#D4B26A] uppercase block">
                Cápua & Via Ápia
              </span>
              <h1 className="font-roman font-extrabold text-xl sm:text-3xl text-[#EFE2C4] tracking-wider leading-none">
                GLADIATORUM
              </h1>
              <span className="font-roman font-semibold text-[11px] sm:text-xs text-[#D6C29A] tracking-widest block mt-0.5">
                ARENA AETERNA
              </span>
            </div>
          </div>

          <GameButton
            variant={isOnlineMode ? 'bronze' : 'crimson'}
            size="sm"
            onClick={() => setAccountModalOpen(true)}
          >
            {isOnlineMode
              ? `Conta Online (${onlineUser?.displayName.slice(0, 12)})`
              : 'Conectar Conta / Google'}
          </GameButton>
        </div>

        <div className="relative z-10 flex-1 min-h-[100px]" />

        <div className="relative z-10 w-full max-w-xl mx-auto px-4 pb-6 sm:pb-10">
          <div className="surface-stone frame-bronze p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#5E4527]">
              <span
                className={`px-2 py-0.5 text-[11px] font-roman font-bold border ${
                  isOnlineMode
                    ? 'bg-[#1E2E1C] text-[#88B87E] border-[#4B7A47]'
                    : 'bg-[#2B2119] text-[#D4B26A] border-[#947044]'
                }`}
              >
                {isOnlineMode
                  ? `MODO ONLINE COMPETITIVO (${onlineUser?.displayName})`
                  : 'MODO VISITANTE LOCAL (CONECTE SUA CONTA PARA JOGAR ONLINE)'}
              </span>
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="text-xs text-[#D4B26A] underline hover:text-[#EFE2C4] cursor-pointer"
              >
                {isOnlineMode ? 'Gerenciar Conta / Migração' : 'Entrar com Google'}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#EFE2C4] leading-relaxed">
              Comande a ascensão do seu gladiador nos quartéis de Roma. Equipe armamentos,
              treine com o Doctore, integre uma Guilda compartilhada e dispute o Ranking
              Provincial.
            </p>

            {(hasExistingSave || isOnlineMode) && (
              <div className="flex items-center gap-3 p-2.5 bg-[#17120F] border border-[#947044]">
                <div className="w-12 h-12 shrink-0 frame-bronze overflow-hidden">
                  <ArtworkImage
                    src={IMAGE_ASSETS.playerPortrait}
                    alt={gameState.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-roman font-bold text-xs sm:text-sm text-[#EFE2C4] truncate">
                    {titleDisplayName} · Nível {gameState.level}
                  </div>
                  <div className="text-[11px] text-[#D4B26A] tabular-nums">
                    {gameState.gold} Ouro · {gameState.honor} Honra (#{playerRankPosition}) ·{' '}
                    {gameState.wins} Vitória(s)
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setScreenMode('playing');
                }}
                className="flex-1 min-h-[48px] px-5 py-3 bg-gradient-to-b from-[#8E332F] to-[#611F1C] text-[#EFE2C4] border-2 border-[#B79552] font-roman font-bold text-sm sm:text-base tracking-wider cursor-pointer active:translate-y-[1px]"
              >
                {hasExistingSave || isOnlineMode
                  ? `Continuar (${titleDisplayName} · Nv.${gameState.level})`
                  : 'Iniciar Jornada'}
              </button>
              <GameButton
                variant="bronze"
                size="lg"
                onClick={() => setHelpModalOpen(true)}
              >
                Como Jogar
              </GameButton>
            </div>
          </div>
        </div>

        <GameModal
          open={accountModalOpen}
          title="Conta Online, Firebase & Migração Segura"
          subtitle="Autenticação Persistente, Servidor Autoritativo e Importação do Save Local"
          onClose={() => setAccountModalOpen(false)}
        >
          <OnlineAccountAndMigrationModalContent
            onlineUser={onlineUser}
            firebaseProjectInfo={firebaseProjectInfo}
            hasLocalSave={hasExistingSave}
            migratedFromLocal={migratedFromLocal}
            migrationReport={migrationReport}
            syncStatus={onlineSyncStatus}
            onGoogleSignIn={handleGoogleSignIn}
            onLogout={handleLogoutOnline}
            onMigrateLocalSave={handleMigrateLocalSaveToOnline}
          />
        </GameModal>

        <GameModal
          open={helpModalOpen}
          title="Manual do Ludus — Como Jogar"
          subtitle="Guia de Combate, Guildas, Classificação e Patrulha Idle"
          onClose={() => setHelpModalOpen(false)}
        >
          <HowToPlayModalContent
            onRestartTutorial={handleRestartTutorial}
            onResetSave={() => {
              const fresh = createInitialGameState(Date.now());
              setGameState(fresh);
              setHasExistingSave(false);
              setHelpModalOpen(false);
            }}
          />
        </GameModal>

        <GameModal
          open={Boolean(corruptedSaveModal)}
          title="Aviso de Integridade do Progresso Salvo"
          subtitle="Seu arquivo anterior foi preservado em backup seguro"
          onClose={() => setCorruptedSaveModal(null)}
        >
          {corruptedSaveModal && (
            <div className="space-y-3 text-xs sm:text-sm text-[#EFE2C4]">
              <p className="leading-relaxed text-[#D6C29A]">
                Detectamos que os dados salvos no navegador estavam incompletos ou corrompidos (
                <strong>{corruptedSaveModal.reason}</strong>). Nenhuma exclusão silenciosa foi
                feita.
              </p>
              <div className="p-2.5 bg-[#120D0A] border border-[#5E4527] text-[11px] font-mono text-[#B8A686] max-h-24 overflow-y-auto break-all">
                Backup salvo em: {GAME_CONFIG.backupCorruptedKey}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <GameButton
                  variant="crimson"
                  size="sm"
                  onClick={() => {
                    const fresh = createInitialGameState(Date.now());
                    setGameState(fresh);
                    setCorruptedSaveModal(null);
                  }}
                >
                  Iniciar Novo Gladiador Nível 1
                </GameButton>
              </div>
            </div>
          )}
        </GameModal>
      </div>
    );
  }

  return (
    <>
      <GameShell
        bannerFeedback={bannerFeedback}
        onDismissFeedback={() => setBannerFeedback(null)}
        guidedOnboardingBar={
          onlineSyncStatus === 'error' && onlineSyncError ? (
            <div className="w-full bg-[#541B19] border-b-2 border-[#D4B26A] px-3 py-2 text-xs text-[#EFE2C4]">
              <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Falha de Comunicação Online:</strong> {onlineSyncError} (Seu
                  progresso está preservado).
                </span>
                <div className="flex items-center gap-2">
                  {pendingRetryAction ? (
                    <GameButton
                      variant="bronze"
                      size="sm"
                      onClick={() =>
                        void executeOnlineAction(
                          pendingRetryAction.action,
                          pendingRetryAction.params,
                          pendingRetryAction.opId
                        )
                      }
                    >
                      Tentar Novamente
                    </GameButton>
                  ) : (
                    onlineUser && (
                      <GameButton
                        variant="bronze"
                        size="sm"
                        onClick={() => void bootstrapOnlineSession(onlineUser)}
                      >
                        Reconectar ao Servidor
                      </GameButton>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : !gameState.tutorial.skipped && gameState.tutorial.step !== 'completed' ? (
            <GuidedTutorialBar
              step={gameState.tutorial.step}
              onActionTab={(tab) => setActiveTab(tab)}
              onSkip={handleSkipTutorial}
              onOpenHelp={() => setHelpModalOpen(true)}
            />
          ) : null
        }
        resourceBar={
          <ResourceBar
            name={gameState.name}
            guildTag={guildBonuses.guildTag}
            playerRank={playerRankPosition}
            level={gameState.level}
            gold={gameState.gold}
            honor={gameState.honor}
            currentHp={gameState.currentHp}
            maxHp={derivedStats.maxHp}
            energy={gameState.energy}
            maxEnergy={gameState.maxEnergy}
            idleActive={gameState.idle.active}
            pendingCount={gameState.pendingRewards.length}
            isOnlineMode={isOnlineMode}
            onlineAccountLabel={onlineUser?.displayName}
            onOpenAccountModal={() => setAccountModalOpen(true)}
            onOpenHelp={() => setHelpModalOpen(true)}
            onOpenRankings={() => openCitySubTab('rankings')}
            onSimulateOfflineClick={handleSimulateOfflineHour}
          />
        }
        bottomNav={
          <BottomNavigation
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            inventoryCount={gameState.inventory.length}
            maxInventory={GAME_CONFIG.maxInventorySlots}
            idleActive={gameState.idle.active}
          />
        }
      >
        {activeTab === 'character' && (
          <CharacterScreen
            state={screenStateWithoutActiveModalReward}
            derived={derivedStats}
            nextObjective={nextObjective}
            lastStatChange={lastStatChange}
            onEquipItem={handleEquipItem}
            onUnequipSlot={handleUnequipSlot}
            onSellItem={handleSellItem}
            onUseMedicineItem={handleUseMedicineItem}
            onRestoreHealthAtBarracks={handleRestoreHealthAtBarracks}
            onNavigateTab={setActiveTab}
            onOpenGuildScreen={() => openCitySubTab('guild')}
            onOpenRankingScreen={() => openCitySubTab('rankings')}
          />
        )}

        {activeTab === 'expeditions' && (
          <ExpeditionsScreen
            state={screenStateWithoutActiveModalReward}
            derived={derivedStats}
            onStartManualExpedition={handleStartManualExpedition}
            onToggleIdleActivity={handleToggleIdleActivity}
            onChangeIdleFocus={handleChangeIdleFocus}
            onStopIdleActivity={handleStopIdleActivity}
            onClaimReward={handleClaimReward}
            onInspectCombatReport={(rep) => setInspectedReport(rep)}
          />
        )}

        {activeTab === 'arena' && (
          <ArenaScreen
            state={screenStateWithoutActiveModalReward}
            derived={derivedStats}
            onChallengeArenaOpponent={handleChallengeArenaOpponent}
            onClaimReward={handleClaimReward}
            onInspectCombatReport={(rep) => setInspectedReport(rep)}
            onOpenRankingScreen={() => openCitySubTab('rankings')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryScreen
            state={screenStateWithoutActiveModalReward}
            onEquipItem={handleEquipItem}
            onUnequipSlot={handleUnequipSlot}
            onSellItem={handleSellItem}
            onUseMedicineItem={handleUseMedicineItem}
          />
        )}

        {activeTab === 'city' && (
          <CityScreen
            state={screenStateWithoutActiveModalReward}
            derived={derivedStats}
            isOnlineMode={isOnlineMode}
            onlinePlayerRank={playerRankPosition}
            initialSubTab={citySubTab}
            onSubTabChange={setCitySubTab}
            onTrainStat={handleTrainStat}
            onBuyMarketItem={handleBuyMarketItem}
            onSellInventoryItem={handleSellItem}
            onUseMedicineItem={handleUseMedicineItem}
            onBuyMedicineItem={handleBuyMedicineItem}
            onApplyMedicalTreatment={handleApplyMedicalTreatment}
            onFightDungeonEncounter={handleFightDungeonEncounter}
            onResetDungeonRun={handleResetDungeonRun}
            onClaimReward={handleClaimReward}
            onInspectCombatReport={(rep) => setInspectedReport(rep)}
            onCreateGuild={(input) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_create', input);
                return;
              }
              applyGuildAction(createGuild(gameState, input, Date.now()));
            }}
            onApplyOrJoinGuild={(guildId, message) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_apply_or_join', { guildId, message });
                return;
              }
              applyGuildAction(applyOrJoinGuild(gameState, guildId, message, Date.now()));
            }}
            onCancelApplication={(guildId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_cancel_application', { guildId });
                return;
              }
              applyGuildAction(cancelGuildApplication(gameState, guildId, Date.now()));
            }}
            onSimulateCouncilDecision={(guildId, decision) =>
              applyGuildAction(
                simulateCouncilDecisionForPlayerApplication(
                  gameState,
                  guildId,
                  decision,
                  Date.now()
                )
              )
            }
            onReviewApplication={(applicationId, decision) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_review_application', {
                  applicationId,
                  decision,
                });
                return;
              }
              applyGuildAction(
                reviewGuildApplication(gameState, applicationId, decision, Date.now())
              );
            }}
            onAddSimulatedApplicant={() =>
              applyGuildAction(addSimulatedApplicantToPlayerGuild(gameState, Date.now()))
            }
            onLeaveGuild={() => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_leave');
                return;
              }
              applyGuildAction(leaveGuild(gameState, Date.now()));
            }}
            onTransferLeadership={(targetMemberId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_transfer_leadership', {
                  targetMemberId,
                });
                return;
              }
              applyGuildAction(
                transferGuildLeadership(gameState, targetMemberId, Date.now())
              );
            }}
            onDissolveGuild={(confirmed) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_dissolve', { confirmed });
                return;
              }
              applyGuildAction(dissolveGuild(gameState, confirmed, Date.now()));
            }}
            onChangeMemberRole={(targetMemberId, newRole) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_change_role', {
                  targetMemberId,
                  newRole,
                });
                return;
              }
              applyGuildAction(
                changeGuildMemberRole(gameState, targetMemberId, newRole, Date.now())
              );
            }}
            onKickMember={(targetMemberId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_kick_member', { targetMemberId });
                return;
              }
              applyGuildAction(kickGuildMember(gameState, targetMemberId, Date.now()));
            }}
            onUpdateProfile={(updates) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_update_profile', updates);
                return;
              }
              applyGuildAction(updateGuildProfile(gameState, updates, Date.now()));
            }}
            onPostAnnouncement={(content) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_post_announcement', { content });
                return;
              }
              applyGuildAction(postGuildAnnouncement(gameState, content, Date.now()));
            }}
            onDonateGold={(amount, txId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_donate_gold', { amount }, txId);
                return;
              }
              applyGuildAction(donateToGuildBank(gameState, amount, txId, Date.now()));
            }}
            onUpgradeBuilding={(buildingId, txId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_upgrade_building', { buildingId }, txId);
                return;
              }
              applyGuildAction(
                upgradeGuildBuilding(gameState, buildingId, txId, Date.now())
              );
            }}
            onUseVillaMedici={() => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_use_villa_medici');
                return;
              }
              applyGuildAction(useVillaMedici(gameState, Date.now()));
            }}
            onActivateLibraryScroll={(scrollId, txId) => {
              if (isOnlineMode) {
                void executeOnlineAction(
                  'guild_activate_library_scroll',
                  { scrollId },
                  txId
                );
                return;
              }
              applyGuildAction(
                activateLibraryScroll(gameState, scrollId, txId, Date.now())
              );
            }}
            onDepositWarehouseItem={(inventoryItemId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_deposit_warehouse', {
                  inventoryItemId,
                });
                return;
              }
              applyGuildAction(
                depositItemToGuildWarehouse(gameState, inventoryItemId, Date.now())
              );
            }}
            onWithdrawWarehouseItem={(warehouseItemId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_withdraw_warehouse', {
                  warehouseItemId,
                });
                return;
              }
              applyGuildAction(
                withdrawItemFromGuildWarehouse(gameState, warehouseItemId, Date.now())
              );
            }}
            onBuyInternalMarketItem={(templateId) => {
              if (isOnlineMode) {
                void executeOnlineAction('guild_buy_internal_market', { templateId });
                return;
              }
              applyGuildAction(
                buyFromGuildInternalMarket(gameState, templateId, Date.now())
              );
            }}
            onSetLocalTestRole={(role) =>
              applyGuildAction(
                setPlayerRoleInCurrentGuildLocalMode(gameState, role, Date.now())
              )
            }
          />
        )}
      </GameShell>

      <GameModal
        open={accountModalOpen}
        title="Conta Online, Firebase & Migração Segura"
        subtitle="Autenticação Persistente, Servidor Autoritativo e Importação do Save Local"
        onClose={() => setAccountModalOpen(false)}
      >
        <OnlineAccountAndMigrationModalContent
          onlineUser={onlineUser}
          firebaseProjectInfo={firebaseProjectInfo}
          hasLocalSave={hasExistingSave}
          migratedFromLocal={migratedFromLocal}
          migrationReport={migrationReport}
          syncStatus={onlineSyncStatus}
          onGoogleSignIn={handleGoogleSignIn}
          onLogout={handleLogoutOnline}
          onMigrateLocalSave={handleMigrateLocalSaveToOnline}
        />
      </GameModal>

      <GameModal
        open={Boolean(inspectedReport)}
        title={
          inspectedReport
            ? inspectedReport.victory
              ? `Vitória: ${inspectedReport.locationName}`
              : `Derrota: ${inspectedReport.locationName}`
            : 'Relatório de Combate'
        }
        subtitle={
          inspectedReport
            ? `${gameState.name} vs ${inspectedReport.enemyName} (Nível ${inspectedReport.enemyLevel})`
            : undefined
        }
        onClose={() => setInspectedReport(null)}
      >
        {inspectedReport && (
          <CombatPresentationView
            report={inspectedReport}
            playerName={gameState.name}
            linkedBatch={
              gameState.pendingRewards.find(
                (b) => b.claimId === inspectedReport.rewardClaimId
              ) ?? null
            }
            onClaimReward={handleClaimReward}
            onNavigateRecovery={(targetTab) => {
              setInspectedReport(null);
              setActiveTab(targetTab);
            }}
          />
        )}
      </GameModal>

      <GameModal
        open={Boolean(offlineModalBatch)}
        title="Relatório de Retorno ao Ludus"
        subtitle="Progresso contabilizado em segundo plano por timestamps"
        onClose={() => setOfflineModalBatch(null)}
      >
        {offlineModalBatch && (
          <RewardPanel batch={offlineModalBatch} onClaim={handleClaimReward} />
        )}
      </GameModal>

      <GameModal
        open={helpModalOpen}
        title="Manual do Ludus — Como Jogar"
        subtitle="Regras de Combate, Guildas, Classificação e Patrulha Idle"
        onClose={() => setHelpModalOpen(false)}
      >
        <HowToPlayModalContent
          onRestartTutorial={handleRestartTutorial}
          onResetSave={() => {
            const fresh = createInitialGameState(Date.now());
            setGameState(fresh);
            setHasExistingSave(false);
            setLastStatChange(null);
            setHelpModalOpen(false);
            showToast('Progresso reiniciado para um novo Gladiador Nível 1.', 'info');
          }}
        />
      </GameModal>
    </>
  );
}

const OnlineAccountAndMigrationModalContent: React.FC<{
  onlineUser: OnlineSessionUser | null;
  firebaseProjectInfo: {
    connected: boolean;
    projectId: string;
    databaseId: string;
  } | null;
  hasLocalSave: boolean;
  migratedFromLocal: boolean;
  migrationReport: MigrationReport | null;
  syncStatus: 'idle' | 'bootstrapping' | 'syncing' | 'error';
  onGoogleSignIn: () => void;
  onLogout: () => void;
  onMigrateLocalSave: () => void;
}> = ({
  onlineUser,
  firebaseProjectInfo,
  hasLocalSave,
  migratedFromLocal,
  migrationReport,
  syncStatus,
  onGoogleSignIn,
  onLogout,
  onMigrateLocalSave,
}) => {
  return (
    <div className="space-y-4 text-xs sm:text-sm text-[#EFE2C4]">
      {/* Status do Projeto Firebase Provisionado */}
      <div className="p-3 bg-[#1D1510] border-2 border-[#947044] space-y-1">
        <div className="font-roman font-bold text-[#D4B26A] uppercase">
          Conexão Oficial Firebase & Servidor Autoritativo
        </div>
        <div className="text-[11px] text-[#D6C29A] tabular-nums space-y-0.5">
          <div>
            Projeto Cloud/Firebase:{' '}
            <strong>{firebaseProjectInfo?.projectId ?? 'abstract-bee-901dl'}</strong>
          </div>
          <div>
            Status de Conexão Firestore:{' '}
            <strong className="text-[#88B87E]">
              {firebaseProjectInfo?.connected ? 'Conectado e Regras Ativas' : 'Inicializando'}
            </strong>
          </div>
        </div>
      </div>

      {/* Estado de Login / Sessão */}
      {onlineUser ? (
        <div className="p-3 bg-[#1E2E1C] border-2 border-[#4B7A47] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-roman font-bold text-[#EFE2C4] block">
                Sessão Online Conectada: {onlineUser.displayName}
              </span>
              <span className="text-[11px] text-[#B8A686] font-mono">
                UID: {onlineUser.uid}
              </span>
            </div>
            <GameButton variant="iron" size="sm" onClick={onLogout}>
              Sair da Conta (Logout)
            </GameButton>
          </div>
          <p className="text-[11px] text-[#D6C29A]">
            Seu progresso, combates, doações ao banco da guilda e classificação são
            validados no servidor com proteção idempotente contra cliques duplos.
          </p>
        </div>
      ) : (
        <div className="p-3 surface-parchment frame-parchment text-[#30251A] space-y-2.5">
          <div className="font-roman font-bold text-sm text-[#792B28]">
            Você está em Modo Visitante Local
          </div>
          <p className="text-xs leading-relaxed">
            Conecte sua conta com o Google para salvar seu gladiador na nuvem, recuperar o
            progresso em qualquer navegador, ingressar em Guildas Online compartilhadas e
            disputar a Classificação Competitiva.
          </p>
          <GameButton variant="crimson" size="md" fullWidth onClick={onGoogleSignIn}>
            Entrar com Google (Firebase Auth)
          </GameButton>
        </div>
      )}

      {/* Política e Ação de Migração Segura do Save Local (Seção 5) */}
      <div className="p-3 bg-[#17120F] border border-[#5E4527] space-y-2">
        <div className="font-roman font-bold text-[#D4B26A] uppercase">
          Migração Segura do Save Local (Política Competitiva)
        </div>
        <p className="text-xs text-[#D6C29A] leading-relaxed">
          Para proteger o equilíbrio do ranking online contra edições manuais de{' '}
          <code>localStorage</code>, a importação única de save local preserva um backup
          em <code>{PRE_MIGRATION_BACKUP_KEY}</code>, valida apenas itens oficiais do
          catálogo e aplica os tetos competitivos de entrada: Nível máx.{' '}
          <strong>{MIGRATION_COMPETITIVE_CAPS.maxLevel}</strong>, Ouro máx.{' '}
          <strong>{MIGRATION_COMPETITIVE_CAPS.maxGold}g</strong>, Honra máx.{' '}
          <strong>{MIGRATION_COMPETITIVE_CAPS.maxHonor}</strong> e Atributos base máx.{' '}
          <strong>{MIGRATION_COMPETITIVE_CAPS.maxBaseStat}</strong>. Guildas simuladas
          locais não entram no ranking online.
        </p>

        {migratedFromLocal ? (
          <div className="p-2 bg-[#253B23] border border-[#4B7A47] text-xs text-[#EFE2C4]">
            <strong>Migração já concluída para esta conta.</strong> Repetições de
            importação estão bloqueadas para proteger seu progresso online.
          </div>
        ) : (
          <GameButton
            variant="bronze"
            size="sm"
            fullWidth
            onClick={onMigrateLocalSave}
            disabled={!onlineUser || !hasLocalSave || syncStatus === 'syncing'}
            disabledReason={
              !onlineUser
                ? 'Conecte sua conta online primeiro'
                : !hasLocalSave
                ? 'Nenhum save local com progresso encontrado neste navegador'
                : undefined
            }
          >
            Importar Save Local (Única Vez)
          </GameButton>
        )}

        {migrationReport && (
          <div className="mt-2 p-2.5 bg-[#2B2119] border border-[#947044] text-[11px] space-y-1 tabular-nums">
            <div className="font-bold text-[#D4B26A]">
              Relatório de Migração Competitiva ({migrationReport.backupKey}):
            </div>
            <div>
              Nível: {migrationReport.originalLevel} →{' '}
              <strong>{migrationReport.cappedLevel}</strong> · Ouro:{' '}
              {migrationReport.originalGold}g →{' '}
              <strong>{migrationReport.cappedGold}g</strong> · Honra:{' '}
              {migrationReport.originalHonor} →{' '}
              <strong>{migrationReport.cappedHonor}</strong>
            </div>
            {migrationReport.appliedCaps.length > 0 && (
              <ul className="list-disc pl-4 text-[#D6C29A]">
                {migrationReport.appliedCaps.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const GuidedTutorialBar: React.FC<{
  step: TutorialStepId;
  onActionTab: (tab: MainTabId) => void;
  onSkip: () => void;
  onOpenHelp: () => void;
}> = ({ step, onActionTab, onSkip, onOpenHelp }) => {
  const stepMeta: Record<
    Exclude<TutorialStepId, 'completed'>,
    {
      number: number;
      title: string;
      instruction: string;
      targetTab: MainTabId;
      cta: string;
    }
  > = {
    start_expedition: {
      number: 1,
      title: 'Passo 1/5: Iniciar uma Expedição',
      instruction:
        'Abra a aba Expedições e enfrente o Lobo Cinzento nos Bosques de Cápua.',
      targetTab: 'expeditions',
      cta: 'Ir para Expedições',
    },
    claim_reward: {
      number: 2,
      title: 'Passo 2/5: Receber a Recompensa',
      instruction:
        'Toque em "Resgatar Recompensas" no pergaminho de vitória para guardar seu Ouro e XP.',
      targetTab: 'expeditions',
      cta: 'Ver Recompensa',
    },
    equip_item: {
      number: 3,
      title: 'Passo 3/5: Equipar um Item',
      instruction:
        'Na tela Personagem ou Inventário, selecione a Gálea de Bronze Simples e toque em Equipar.',
      targetTab: 'character',
      cta: 'Ir ao Personagem',
    },
    train_stat: {
      number: 4,
      title: 'Passo 4/5: Treinar um Atributo',
      instruction:
        'Visite a Cidade e use seus denários para treinar +1 ponto de Força ou Habilidade.',
      targetTab: 'city',
      cta: 'Ir ao Treinamento',
    },
    choose_next_activity: {
      number: 5,
      title: 'Passo 5/5: Escolher Próxima Atividade',
      instruction:
        'Ative uma Patrulha Idle nas Expedições, junte-se a uma Guilda ou desafie na Arena.',
      targetTab: 'expeditions',
      cta: 'Escolher Atividade',
    },
  };

  if (step === 'completed') return null;
  const info = stepMeta[step];

  return (
    <div className="w-full bg-[#241A14] border-b-2 border-[#B79552] px-2.5 py-2">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-roman font-bold uppercase px-1.5 py-0.5 bg-[#792B28] text-[#EFE2C4] border border-[#D4B26A]">
              Guia do Doctore ({info.number}/5)
            </span>
            <span className="font-roman font-bold text-xs sm:text-sm text-[#D4B26A] truncate">
              {info.title}
            </span>
          </div>
          <p className="text-xs text-[#EFE2C4] mt-0.5 leading-snug">{info.instruction}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <GameButton
            variant="crimson"
            size="sm"
            onClick={() => onActionTab(info.targetTab)}
          >
            {info.cta}
          </GameButton>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] px-2.5 py-1 text-xs text-[#B8A686] hover:text-[#EFE2C4] underline cursor-pointer"
          >
            Pular Guia
          </button>
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Consultar Como Jogar"
            className="min-h-[44px] min-w-[44px] px-2 py-1 text-xs font-roman font-bold text-[#D6C29A] border border-[#5E4527] cursor-pointer"
          >
            ?
          </button>
        </div>
      </div>
    </div>
  );
};

const HowToPlayModalContent: React.FC<{
  onRestartTutorial: () => void;
  onResetSave: () => void;
}> = ({ onRestartTutorial, onResetSave }) => {
  return (
    <div className="space-y-4 text-xs sm:text-sm">
      <div className="surface-parchment frame-parchment p-3 text-[#30251A] space-y-2.5">
        <h3 className="font-roman font-bold text-sm text-[#792B28]">
          1. O Ciclo do Gladiador
        </h3>
        <p className="leading-relaxed">
          Em <strong>GLADIATORUM: Arena Aeterna</strong>, realize <strong>Expedições</strong>{' '}
          para obter ouro, experiência e armas; <strong>equipe itens</strong> nos 8 slots do
          corpo; e <strong>treine atributos</strong> na Cidade para vencer inimigos superiores.
        </p>

        <h3 className="font-roman font-bold text-sm text-[#792B28] pt-1">
          2. Guildas (Collegia) Compartilhadas & Sede de 8 Edifícios
        </h3>
        <p className="leading-relaxed">
          Na aba <strong>Cidade → Guilda</strong>, você pode ingressar em uma aliança real
          ou fundar a sua. A sede conta com 8 edifícios funcionais: <strong>Forum Gladiatorius</strong>{' '}
          (vagas), <strong>Banco</strong> (tesouro), <strong>Campo de Treino</strong> (desconto
          nos treinos), <strong>Balneário</strong> (+PV/min), <strong>Villa Medici</strong>{' '}
          (cura com espera), <strong>Biblioteca</strong> (pergaminhos temporários de 2h),{' '}
          <strong>Armazém</strong> e <strong>Mercado Interno</strong> (-15%).
        </p>

        <h3 className="font-roman font-bold text-sm text-[#792B28] pt-1">
          3. Classificação Online Paginada por Cursor
        </h3>
        <p className="leading-relaxed">
          Na aba <strong>Cidade → Classificação</strong>, consulte o ranking competitivo de
          Gladiadores (por Honra, Fama, Vitórias, Proezas e Ouro Saqueado) e de Guildas (soma
          exata da Honra dos membros atuais).
        </p>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#5E4527]">
        <GameButton variant="bronze" size="sm" onClick={onRestartTutorial}>
          Reativar Guia Inicial (5 Passos)
        </GameButton>
        <GameButton variant="iron" size="sm" onClick={onResetSave}>
          Reiniciar Jogo Local do Zero
        </GameButton>
      </div>
    </div>
  );
};
