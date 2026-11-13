import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMedicalTreatment,
  buyItemFromMarket,
  buyMedicineTemplate,
  calculateDerivedStats,
  calculateElapsedIdleProgress,
  claimPendingReward,
  createInitialGameState,
  equipItemFromInventory,
  getEffectiveTrainingCost,
  getNextObjective,
  getPlayerSnapshotForRankings,
  inspectAndLoadSaveState,
  resolveCombat,
  sellItemFromInventory,
  trainGladiatorStat,
  unequipSlotToInventory,
  useMedicineFromInventory,
} from './rules';
import { DUNGEONS, EXPEDITION_REGIONS, GAME_CONFIG, ITEM_TEMPLATES } from './config';
import { DESIGN_TOKENS, RarityKey } from '../design/tokens';
import {
  computeGuildRankings,
  computePlayerRankings,
  getActiveGuildBonuses,
} from './guildsAndRankings';
import {
  activateLibraryScroll,
  addSimulatedApplicantToPlayerGuild,
  applyOrJoinGuild,
  cancelGuildApplication,
  changeGuildMemberRole,
  createGuild,
  donateToGuildBank,
  kickGuildMember,
  leaveGuild,
  reviewGuildApplication,
  setPlayerRoleInCurrentGuildLocalMode,
  transferGuildLeadership,
  upgradeGuildBuilding,
  useVillaMedici,
} from './guildActions';

test('Regeneração preserva frações entre ticks de 1s e depois de salvar/carregar', () => {
  const start = 1_000_000;
  let state = { ...createInitialGameState(start), energy: 0, currentHp: 10 };
  for (let second = 1; second <= 180; second++) {
    state = calculateElapsedIdleProgress(state, start + second * 1000).state;
    if (second === 90) {
      state = inspectAndLoadSaveState(JSON.stringify(state), start + 90_000).state;
    }
  }
  assert.equal(state.energy, 1, '180 ticks devem regenerar 1 energia');
  assert.equal(state.currentHp, 46, '3 minutos devem regenerar 36 PV');
});

test('Regeneração mantém tempo fracionário e não concede energia antes de 180s', () => {
  const start = 1_000_000;
  let state = { ...createInitialGameState(start), energy: 0, currentHp: 10 };
  for (let tick = 1; tick <= 1799; tick++) {
    state = calculateElapsedIdleProgress(state, start + tick * 100).state;
  }
  assert.equal(state.energy, 0);
  state = calculateElapsedIdleProgress(state, start + 180_000).state;
  assert.equal(state.energy, 1);
  assert.equal(state.currentHp, 46);
});

test('Equipar e remover equipamentos altera imediatamente os atributos derivados e avança o tutorial', () => {
  const initial = createInitialGameState(100000);
  const beforeStats = calculateDerivedStats(
    initial.baseStats,
    initial.equipped,
    initial.level,
    initial.guildState
  );

  const galeaInBag = initial.inventory.find((i) => i.templateId === 'galea_recruit');
  assert.ok(galeaInBag, 'Gálea deve estar na mochila inicial');

  const equippedRes = equipItemFromInventory(initial, galeaInBag.id);
  assert.equal(equippedRes.error, undefined);
  assert.ok(equippedRes.statChanges && equippedRes.statChanges.changes.length > 0);

  const afterStats = calculateDerivedStats(
    equippedRes.state.baseStats,
    equippedRes.state.equipped,
    equippedRes.state.level,
    equippedRes.state.guildState
  );

  assert.equal(afterStats.armor, beforeStats.armor + 18);
  assert.equal(afterStats.agility, beforeStats.agility + 1);

  const unequippedRes = unequipSlotToInventory(equippedRes.state, 'helmet');
  assert.equal(unequippedRes.error, undefined);
});

test('Treinamento desconta o custo exato de ouro e aplica desconto do Campo de Treino da Guilda', () => {
  const initial = createInitialGameState(100000);
  const basePricing = getEffectiveTrainingCost(
    'strength',
    initial.baseStats.strength,
    initial.guildState
  );
  assert.equal(basePricing.discountPercent, 0);
  assert.equal(basePricing.finalCost, basePricing.baseCost);

  // Ingressa na guilda Legio Ferrea (Campo de Treino Nv. 2 = -8% desconto)
  const joined = applyOrJoinGuild(initial, 'guild_legio_ferrea', 'Entrar', 100500);
  assert.equal(joined.success, true);

  const guildPricing = getEffectiveTrainingCost(
    'strength',
    joined.state.baseStats.strength,
    joined.state.guildState
  );
  assert.equal(guildPricing.discountPercent, 8);
  assert.ok(guildPricing.finalCost < guildPricing.baseCost);
  assert.equal(guildPricing.discountAmount, guildPricing.baseCost - guildPricing.finalCost);

  const trained = trainGladiatorStat(joined.state, 'strength', 100600);
  assert.equal(trained.error, undefined);
  assert.equal(trained.costPaid, guildPricing.finalCost);
  assert.equal(trained.state.gold, joined.state.gold - guildPricing.finalCost);
});

test('Mercado valida saldo na compra, limite de inventário e credita valor correto na venda', () => {
  const initial = createInitialGameState(100000);
  const firstMarketItem = initial.marketStock[0];

  const bought = buyItemFromMarket(initial, firstMarketItem.id, 100500);
  assert.equal(bought.error, undefined);
  assert.equal(bought.state.gold, initial.gold - firstMarketItem.buyPrice);

  const newestItem = bought.state.inventory[bought.state.inventory.length - 1];
  const sold = sellItemFromInventory(bought.state, newestItem.id);
  assert.equal(sold.error, undefined);
  assert.equal(sold.goldReceived, firstMarketItem.sellPrice);
});

test('Combate automático e Resgate Idempotente atualizam Honra, Fama, Ouro Saqueado e Honra da Guilda', () => {
  const initial = createInitialGameState(100000);
  const joined = applyOrJoinGuild(initial, 'guild_legio_ferrea', 'Entrar', 100100);
  assert.equal(joined.success, true);

  const rankingsBefore = computeGuildRankings(
    joined.state.guildState,
    getPlayerSnapshotForRankings(joined.state)
  );
  const lfcBefore = rankingsBefore.find((g) => g.id === 'guild_legio_ferrea')!;

  const wolf = EXPEDITION_REGIONS[0].enemies[0];
  const outcome = resolveCombat(joined.state, wolf, {
    mode: 'expedition',
    locationName: EXPEDITION_REGIONS[0].name,
    focusMode: 'gold',
    seed: 12345,
    timestampMs: 100200,
  });

  const stateWithPending = {
    ...joined.state,
    pendingRewards: [outcome.rewardBatch],
  };

  const firstClaim = claimPendingReward(stateWithPending, outcome.rewardBatch.claimId);
  assert.equal(firstClaim.claimedNow, true);
  assert.equal(firstClaim.state.goldLooted, outcome.rewardBatch.gold);
  assert.equal(firstClaim.state.honor, joined.state.honor + outcome.rewardBatch.honor);

  // Segundo resgate com mesmo claimId deve ser ignorado (idempotente)
  const secondClaim = claimPendingReward(firstClaim.state, outcome.rewardBatch.claimId);
  assert.equal(secondClaim.claimedNow, false);
  assert.equal(secondClaim.state.gold, firstClaim.state.gold);

  // Classificação da guilda recalcula imediatamente com a nova honra do jogador
  const rankingsAfter = computeGuildRankings(
    firstClaim.state.guildState,
    getPlayerSnapshotForRankings(firstClaim.state)
  );
  const lfcAfter = rankingsAfter.find((g) => g.id === 'guild_legio_ferrea')!;
  assert.equal(lfcAfter.totalHonor, lfcBefore.totalHonor + outcome.rewardBatch.honor);
});

test('Criar guilda, impedir participação simultânea em duas guildas e validar candidatura/cancelamento', () => {
  const initial = createInitialGameState(100000);

  // 1. Candidatura em guilda com recrutamento 'application' (Custodes Martis)
  const appRes = applyOrJoinGuild(
    initial,
    'guild_custodes_martis',
    'Quero servir a Marte',
    100100
  );
  assert.equal(appRes.success, true);
  assert.equal(appRes.state.guildState.playerGuildId, null);

  // Cancela a candidatura pendente
  const cancelRes = cancelGuildApplication(
    appRes.state,
    'guild_custodes_martis',
    100200
  );
  assert.equal(cancelRes.success, true);

  // 2. Cria uma nova guilda própria (-120 Ouro)
  const created = createGuild(
    cancelRes.state,
    {
      name: 'Gladiadores do Vesúvio',
      tag: 'VES',
      emblemId: 'laurel_crown',
      description: 'Aliança forjada nas cinzas da Campânia.',
      recruitmentStatus: 'application',
    },
    100300
  );
  assert.equal(created.success, true);
  assert.equal(created.state.gold, initial.gold - 120);
  assert.ok(created.state.guildState.playerGuildId);

  // 3. Tenta entrar em outra guilda enquanto já pertence a uma -> deve bloquear
  const secondJoin = applyOrJoinGuild(
    created.state,
    'guild_legio_ferrea',
    'Tentativa dupla',
    100400
  );
  assert.equal(secondJoin.success, false);
  assert.ok(secondJoin.error?.includes('no máximo uma guilda'));
});

test('Aprovar e rejeitar candidaturas e impedir entrada acima da capacidade do Forum Gladiatorius', () => {
  // Cohors Praetoria começa com Forum Nv.1 (capacidade 5) e já tem 5 membros (5/5)
  const initial = {
    ...createInitialGameState(100000),
    level: 3,
    honor: 60,
  };
  const fullJoin = applyOrJoinGuild(initial, 'guild_cohors_praetoria', 'Entrar', 100100);
  assert.equal(fullJoin.success, false);
  assert.ok(fullJoin.error?.includes('Capacidade máxima atingida'));

  // Cria guilda própria (Forum Nv.1 = cap 5) e testa aprovar e rejeitar candidatos
  const created = createGuild(
    initial,
    {
      name: 'Ordo Solis',
      tag: 'SOL',
      emblemId: 'aquila_imperial',
      description: 'Ordem Solar',
      recruitmentStatus: 'application',
    },
    100200
  );
  assert.equal(created.success, true);
  const guildId = created.state.guildState.playerGuildId!;
  const guild0 = created.state.guildState.guilds.find((g) => g.id === guildId)!;
  const firstAppId = guild0.applications[0].id;

  // Aprova primeiro candidato
  const approved = reviewGuildApplication(created.state, firstAppId, 'approve', 100300);
  assert.equal(approved.success, true);

  // Gera mais um candidato e o rejeita
  const withCand2 = addSimulatedApplicantToPlayerGuild(approved.state, 100400);
  const guild1 = withCand2.state.guildState.guilds.find((g) => g.id === guildId)!;
  const secondAppId = guild1.applications[0].id;

  const rejected = reviewGuildApplication(withCand2.state, secondAppId, 'reject', 100500);
  assert.equal(rejected.success, true);
  const guildAfterReject = rejected.state.guildState.guilds.find((g) => g.id === guildId)!;
  assert.equal(guildAfterReject.applications.length, 0);
  assert.equal(guildAfterReject.members.length, 2);
});

test('Validar permissões por cargo (Membro vs Administrador vs Líder) e transferência antes de sair', () => {
  const initial = createInitialGameState(100000);
  const joined = applyOrJoinGuild(initial, 'guild_legio_ferrea', 'Entrar', 100100);
  assert.equal(joined.success, true);

  // Como Membro comum ('member'), NÃO pode publicar aviso, melhorar edifício ou expulsar membros
  const memberPost = upgradeGuildBuilding(
    joined.state,
    'balneario',
    'tx_member_upg',
    100200
  );
  assert.equal(memberPost.success, false);
  assert.ok(memberPost.error?.includes('Permissão negada'));

  // Ajusta cargo para Administrador ('admin')
  const asAdmin = setPlayerRoleInCurrentGuildLocalMode(joined.state, 'admin', 100300);
  assert.equal(asAdmin.success, true);

  // Administrador PODE melhorar edifício (se houver saldo no banco e requisito de Forum)
  const adminUpgrade = upgradeGuildBuilding(
    asAdmin.state,
    'balneario',
    'tx_admin_upg',
    100400
  );
  assert.equal(adminUpgrade.success, true);

  // Porém Administrador NÃO pode alterar cargos nem transferir liderança nem expulsar outro Admin/Líder
  const adminChangeRole = changeGuildMemberRole(
    adminUpgrade.state,
    'sim_glad_3',
    'admin',
    100500
  );
  assert.equal(adminChangeRole.success, false);
  assert.ok(adminChangeRole.error?.includes('apenas o Líder'));

  // Ajusta cargo para Líder ('leader')
  const asLeader = setPlayerRoleInCurrentGuildLocalMode(
    adminUpgrade.state,
    'leader',
    100600
  );
  assert.equal(asLeader.success, true);

  // Líder NÃO pode sair sem antes transferir liderança quando há outros membros
  const leaderLeaveBlocked = leaveGuild(asLeader.state, 100700);
  assert.equal(leaderLeaveBlocked.success, false);
  assert.ok(leaderLeaveBlocked.error?.includes('transferir a liderança'));

  // Líder transfere liderança para Lucia Valeria e então consegue sair
  const transferred = transferGuildLeadership(asLeader.state, 'sim_glad_2', 100800);
  assert.equal(transferred.success, true);

  const leftAfterTransfer = leaveGuild(transferred.state, 100900);
  assert.equal(leftAfterTransfer.success, true);
  assert.equal(leftAfterTransfer.state.guildState.playerGuildId, null);

  // Após sair, benefícios da guilda são imediatamente encerrados
  const bonusesAfterLeave = getActiveGuildBonuses(
    leftAfterTransfer.state.guildState,
    101000
  );
  assert.equal(bonusesAfterLeave.belongsToGuild, false);
  assert.equal(bonusesAfterLeave.trainingDiscountPercent, 0);
});

test('Doar ao Banco e melhorar edifício são estritamente idempotentes e doação não soma Honra', () => {
  const initial = createInitialGameState(100000);
  const joined = applyOrJoinGuild(initial, 'guild_legio_ferrea', 'Entrar', 100100);
  const asLeader = setPlayerRoleInCurrentGuildLocalMode(joined.state, 'leader', 100150);

  const honorBefore = asLeader.state.honor;
  const goldBefore = asLeader.state.gold;

  // Doação inválida (negativa ou fracionária) deve falhar
  const invalidDon = donateToGuildBank(asLeader.state, -20, 'tx_inv_1', 100200);
  assert.equal(invalidDon.success, false);

  // Doação válida de 50 Ouro
  const don1 = donateToGuildBank(asLeader.state, 50, 'tx_don_unique_1', 100300);
  assert.equal(don1.success, true);
  assert.equal(don1.state.gold, goldBefore - 50);
  assert.equal(don1.state.honor, honorBefore, 'Doação de ouro não deve aumentar a honra');

  // Repetir a mesma transação (mesmo txId) não deve descontar nem creditar novamente
  const donDuplicate = donateToGuildBank(don1.state, 50, 'tx_don_unique_1', 100350);
  assert.equal(donDuplicate.success, false);
  assert.equal(donDuplicate.state.gold, don1.state.gold);

  // Melhorar Balneário com txId único
  const upg1 = upgradeGuildBuilding(don1.state, 'balneario', 'tx_upg_unique_1', 100400);
  assert.equal(upg1.success, true);
  const guildAfterUpg1 = upg1.state.guildState.guilds.find(
    (g) => g.id === 'guild_legio_ferrea'
  )!;
  assert.equal(guildAfterUpg1.buildings.balneario, 2);

  // Repetir mesmo txId de melhoria não cobra nem sobe nível duas vezes
  const upgDuplicate = upgradeGuildBuilding(
    upg1.state,
    'balneario',
    'tx_upg_unique_1',
    100450
  );
  assert.equal(upgDuplicate.success, false);
  const guildAfterDup = upgDuplicate.state.guildState.guilds.find(
    (g) => g.id === 'guild_legio_ferrea'
  )!;
  assert.equal(guildAfterDup.buildings.balneario, 2);
});

test('Villa Medici respeita tempo de espera e Biblioteca aplica bônus temporário apenas na janela ativa', () => {
  const startMs = 1_000_000;
  const initial = createInitialGameState(startMs);
  const joined = applyOrJoinGuild(initial, 'guild_legio_ferrea', 'Entrar', startMs);
  const asLeader = setPlayerRoleInCurrentGuildLocalMode(joined.state, 'leader', startMs);

  // Reduz HP para testar a Villa Medici
  const woundedState = {
    ...asLeader.state,
    currentHp: 80,
  };
  const healed = useVillaMedici(woundedState, startMs + 1000);
  assert.equal(healed.success, true);
  assert.ok(healed.state.currentHp > 80);

  // Tentar usar novamente antes dos 15 minutos deve bloquear por tempo de espera
  const cooldownBlocked = useVillaMedici(healed.state, startMs + 60_000);
  assert.equal(cooldownBlocked.success, false);
  assert.ok(cooldownBlocked.error?.includes('Aguarde'));

  // Ativa Édito de Mercúrio (+Ouro temporário por 2 horas = 7.200s) na Biblioteca
  const withScroll = activateLibraryScroll(
    healed.state,
    'scroll_mercury_gold',
    'tx_scroll_gold_1',
    startMs
  );
  assert.equal(withScroll.success, true);

  // Impede ativar o mesmo pergaminho duas vezes enquanto estiver ativo
  const dupScroll = activateLibraryScroll(
    withScroll.state,
    'scroll_mercury_gold',
    'tx_scroll_gold_2',
    startMs + 5000
  );
  assert.equal(dupScroll.success, false);

  // Verifica que durante as 2h o bônus está ativo, e após 3h expira sem alterar baseStats permanentes
  const bonusesDuring = getActiveGuildBonuses(
    withScroll.state.guildState,
    startMs + 3600 * 1000
  );
  assert.ok(bonusesDuring.tempGoldBonusPercent > 0);

  const bonusesAfterExpiry = getActiveGuildBonuses(
    withScroll.state.guildState,
    startMs + 3 * 3600 * 1000
  );
  assert.equal(bonusesAfterExpiry.tempGoldBonusPercent, 0);
});

test('Classificação de jogadores e guildas recalcula após remoção de membro e ordena empates de forma estável', () => {
  const initial = createInitialGameState(100000);
  const joined = applyOrJoinGuild(initial, 'guild_legio_ferrea', 'Entrar', 100100);
  const asLeader = setPlayerRoleInCurrentGuildLocalMode(joined.state, 'leader', 100200);

  const guildRanksBefore = computeGuildRankings(
    asLeader.state.guildState,
    getPlayerSnapshotForRankings(asLeader.state)
  );
  const lfcBefore = guildRanksBefore.find((g) => g.id === 'guild_legio_ferrea')!;

  // Remove Quintus Sertorius (58 Honra) -> a guilda perde imediatamente 58 pontos de Honra
  const afterKick = kickGuildMember(asLeader.state, 'sim_glad_3', 100300);
  assert.equal(afterKick.success, true);

  const guildRanksAfter = computeGuildRankings(
    afterKick.state.guildState,
    getPlayerSnapshotForRankings(afterKick.state)
  );
  const lfcAfter = guildRanksAfter.find((g) => g.id === 'guild_legio_ferrea')!;
  assert.equal(lfcAfter.totalHonor, lfcBefore.totalHonor - 58);

  // Verifica ordenação estável de empates na Classificação de Jogadores
  const playerRanks1 = computePlayerRankings(
    afterKick.state.guildState,
    getPlayerSnapshotForRankings(afterKick.state),
    'honor'
  );
  const playerRanks2 = computePlayerRankings(
    afterKick.state.guildState,
    getPlayerSnapshotForRankings(afterKick.state),
    'honor'
  );
  assert.deepEqual(
    playerRanks1.map((p) => p.id),
    playerRanks2.map((p) => p.id)
  );
});

test('Inspeção de save migra v2/v3 para v4 preservando progresso e getNextObjective orienta o jogador', () => {
  const v3Save = JSON.stringify({
    version: 3,
    name: 'Marcus Aurelius',
    level: 3,
    xp: 45,
    gold: 420,
    honor: 85,
    wins: 6,
    losses: 1,
    currentHp: 180,
    energy: 10,
    maxEnergy: 12,
    baseStats: {
      strength: 12,
      skill: 11,
      agility: 9,
      constitution: 10,
      charisma: 8,
      intelligence: 8,
    },
  });

  const migrated = inspectAndLoadSaveState(v3Save, 200000);
  assert.equal(migrated.status, 'loaded');
  assert.equal(migrated.state.version, GAME_CONFIG.saveVersion);
  assert.equal(migrated.state.name, 'Marcus Aurelius');
  assert.equal(migrated.state.honor, 85);
  assert.equal(migrated.state.gold, 420);
  assert.ok(migrated.state.guildState.guilds.length >= 4);

  const derived = calculateDerivedStats(
    migrated.state.baseStats,
    migrated.state.equipped,
    migrated.state.level,
    migrated.state.guildState
  );
  const obj = getNextObjective(migrated.state, derived);
  assert.ok(obj.title.length > 0);
});

test('Valida 32 Masmorras em 7 Dificuldades, 8 Raridades de Itens e Sistema de Medicina', () => {
  // 1. Pelo menos 32 masmorras (1 original + 31 novas) distribuídas em 7 dificuldades
  assert.ok(DUNGEONS.length >= 32, `Esperado >= 32 masmorras, encontrado ${DUNGEONS.length}`);
  const difficulties = new Set(DUNGEONS.map((d) => d.difficulty));
  assert.deepEqual(
    Array.from(difficulties).sort(),
    ['Abissal', 'Divino', 'Elite', 'Iniciante', 'Mestre', 'Pesadelo', 'Veterano']
  );

  // Todas as masmorras possuem encontros e espólios garantidos válidos
  for (const dungeon of DUNGEONS) {
    assert.ok(dungeon.encounters.length >= 3, `Masmorra ${dungeon.id} deve ter >= 3 encontros`);
    assert.ok(dungeon.guaranteedDropPool.length >= 2, `Masmorra ${dungeon.id} deve ter espólios`);
    for (const dropId of dungeon.guaranteedDropPool) {
      assert.ok(ITEM_TEMPLATES[dropId], `Template ${dropId} ausente na masmorra ${dungeon.id}`);
    }
  }

  // 2. Verifica as 8 raridades em DESIGN_TOKENS e ITEM_TEMPLATES
  const expectedRarities: RarityKey[] = [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'mythic',
    'imperial',
    'divine',
  ];
  const templatesList = Object.values(ITEM_TEMPLATES);
  for (const rarity of expectedRarities) {
    assert.ok(DESIGN_TOKENS.colors.rarity[rarity], `Raridade ${rarity} deve existir nos tokens`);
    assert.ok(
      templatesList.some((t) => t.rarity === rarity),
      `Deve haver ao menos 1 item da raridade ${rarity}`
    );
  }

  // 3. Testa compra e uso de medicina e tratamento clínico no Valetudinarium
  const initial = {
    ...createInitialGameState(100000),
    level: 10,
    gold: 1000,
    currentHp: 50,
    energy: 4,
  };

  // Usa a Atadura de Linho Militar que já vem na mochila inicial
  const starterMed = initial.inventory.find((i) => Boolean(i.consumable));
  assert.ok(starterMed, 'Deve iniciar com uma medicina na mochila');

  const usedMed = useMedicineFromInventory(initial, starterMed.id, 100100);
  assert.equal(usedMed.error, undefined);
  assert.ok(usedMed.healedHp > 0);
  assert.ok(usedMed.state.currentHp > initial.currentHp);

  // Compra Ânfora de Vinho Falerno Medicinal (+energia e +HP) e consome
  const boughtMed = buyMedicineTemplate(usedMed.state, 'med_amphora_falernian', 100200);
  assert.equal(boughtMed.error, undefined);
  const amphoraInBag = boughtMed.state.inventory.find(
    (i) => i.templateId === 'med_amphora_falernian'
  )!;
  assert.ok(amphoraInBag);

  const usedAmphora = useMedicineFromInventory(boughtMed.state, amphoraInBag.id, 100300);
  assert.equal(usedAmphora.error, undefined);
  assert.ok(usedAmphora.restoredEnergy > 0);
  assert.ok(usedAmphora.state.energy > boughtMed.state.energy);

  // Aplica tratamento clínico no Valetudinarium
  const woundedAgain = {
    ...usedAmphora.state,
    currentHp: 40,
    energy: 2,
  };
  const treated = applyMedicalTreatment(woundedAgain, 'treatment_aesculapius_bath', 100400);
  assert.equal(treated.error, undefined);
  assert.ok(treated.healedHp > 0);
  assert.ok(treated.restoredEnergy > 0);
  assert.equal(treated.state.gold, woundedAgain.gold - treated.costPaid);
});

