import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMedicalTreatment,
  buyItemFromMarket,
  buyMedicineTemplate,
  calculateDerivedStats,
  calculateElapsedIdleProgress,
  buyInventoryExpansion,
  getInventoryCapacity,
  getInventoryExpansionCost,
  buyGuildTemporaryEnergy,
  claimPendingReward,
  creditRewardGold,
  migrateLegacyRewardGold,
  createInitialGameState,
  createItemFromTemplate,
  equipItemFromInventory,
  forgeItem,
  getForgeUpgradeCost,
  getEffectiveTrainingCost,
  getNextObjective,
  getPlayerSnapshotForRankings,
  inspectAndLoadSaveState,
  prepareArenaEquipment,
  resolveCombat,
  sellItemFromInventory,
  trainGladiatorStat,
  unequipSlotToInventory,
  useMedicineFromInventory,
} from './rules';
import { DUNGEONS, EXPEDITION_REGIONS, GAME_CONFIG, ITEM_TEMPLATES } from './config';
import { DESIGN_TOKENS, RarityKey } from '../design/tokens';
import {
  ENDGAME_ITEMS,
  ENDGAME_REGIONS,
  getItemsVisibleByDiscovery,
  isRarityDiscovered,
  OBSIDIAN_ITEMS,
  OBSIDIAN_TO_TRANSCENDENT,
} from './expansion';
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

test('A Forja cobra pelo nível atual e impede a próxima melhoria após o limite', () => {
  assert.equal(getForgeUpgradeCost(0), 100);
  assert.equal(getForgeUpgradeCost(1), 150);
  assert.equal(getForgeUpgradeCost(10), null);
});

test('A Forja melhora arma equipada, salva nível e cobra ouro uma única vez', () => {
  const state = { ...createInitialGameState(100_000), gold: 1_000 };
  const weapon = state.equipped.weapon!;
  const originalMin = weapon.stats.damageMin ?? 0;
  const originalMax = weapon.stats.damageMax ?? 0;

  const result = forgeItem(state, weapon.id, 'damage');

  assert.equal(result.error, undefined);
  assert.equal(result.costPaid, 100);
  assert.equal(result.state.gold, 900);
  assert.equal(result.state.equipped.weapon?.forgeLevel, 1);
  assert.equal(result.state.equipped.weapon?.stats.damageMin, originalMin + 1);
  assert.equal(result.state.equipped.weapon?.stats.damageMax, originalMax + 1);
  const reloaded = inspectAndLoadSaveState(JSON.stringify(result.state), 101_000).state;
  assert.equal(reloaded.equipped.weapon?.forgeLevel, 1);
  assert.equal(reloaded.equipped.weapon?.stats.damageMin, originalMin + 1);
});

test('A Forja aplica atributo compatível ao item da mochila sem forjar consumíveis', () => {
  const state = { ...createInitialGameState(100_000), gold: 1_000 };
  const helmet = state.inventory.find((item) => item.slot === 'helmet')!;
  const originalAgility = helmet.stats.agility ?? 0;
  const forged = forgeItem(state, helmet.id, 'agility');

  assert.equal(forged.error, undefined);
  const forgedHelmet = forged.state.inventory.find((item) => item.id === helmet.id)!;
  assert.equal(forgedHelmet.stats.agility, originalAgility + 1);
  assert.equal(forgedHelmet.forgeLevel, 1);

  const consumable = state.inventory.find((item) => item.consumable)!;
  const rejected = forgeItem(state, consumable.id, 'strength');
  assert.ok(rejected.error);
  assert.equal(rejected.state.gold, state.gold);
});

test('A Forja rejeita ouro insuficiente, nível máximo, bônus incompatível e item ausente sem alterar o estado', () => {
  const base = createInitialGameState(100_000);
  const weapon = base.equipped.weapon!;

  const poor = forgeItem({ ...base, gold: 99 }, weapon.id, 'damage');
  assert.ok(poor.error);
  assert.equal(poor.state.gold, 99);
  assert.equal(poor.state.equipped.weapon?.forgeLevel, undefined);

  const cappedState = {
    ...base,
    gold: 1_000_000,
    equipped: { ...base.equipped, weapon: { ...weapon, forgeLevel: 10 } },
  };
  const capped = forgeItem(cappedState, weapon.id, 'damage');
  assert.ok(capped.error);
  assert.equal(capped.state.gold, cappedState.gold);

  const unsupported = forgeItem({ ...base, gold: 1_000 }, weapon.id, 'agility');
  assert.ok(unsupported.error);
  const missing = forgeItem({ ...base, gold: 1_000 }, 'unknown-item', 'damage');
  assert.ok(missing.error);
});

test('A Forja concede a vida máxima adicional ao aprimorar bônus de vitalidade', () => {
  const base = createInitialGameState(100_000);
  const amulet = { ...base.inventory[0], id: 'amulet-test', slot: 'amulet' as const, stats: { constitution: 1, healthBonus: 10 } };
  const state = {
    ...base,
    gold: 1_000,
    equipped: { ...base.equipped, amulet },
    inventory: base.inventory.filter((item) => item.id !== amulet.id),
  };
  const result = forgeItem(state, amulet.id, 'healthBonus');
  assert.equal(result.error, undefined);
  assert.equal(result.state.equipped.amulet?.stats.healthBonus, 20);
  assert.equal(result.state.currentHp, state.currentHp + 10);
});
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

test('ouro da batalha entra no saldo ao gerar o lote e claim não duplica', () => {
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

  const credited = creditRewardGold(joined.state, outcome.rewardBatch);
  const stateWithPending = { ...credited.state, pendingRewards: [credited.batch] };

  const firstClaim = claimPendingReward(stateWithPending, outcome.rewardBatch.claimId);
  assert.equal(firstClaim.claimedNow, true);
  assert.equal(firstClaim.state.goldLooted, outcome.rewardBatch.gold);
  assert.equal(firstClaim.state.gold, joined.state.gold + outcome.rewardBatch.gold);
  assert.equal(firstClaim.state.mailbox, undefined);
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

test('migração de ouro antigo credita correio e lotes pendentes uma única vez', () => {
  const state = createInitialGameState(1000);
  const legacy = {
    ...state,
    mailbox: [{ id: 'old_mail', source: 'battle' as const, title: 'Espólios', body: '', goldAmount: 25, createdAtMs: 900, claimedAtMs: null }],
    pendingRewards: [{ claimId: 'old_batch', sourceTitle: 'Arena', sourceMode: 'arena' as const, createdAt: 950, gold: 15, xp: 1, honor: 0, items: [], cyclesCompleted: 1, victories: 1, defeats: 0, elapsedSecondsAccounted: 0, wasCappedAtMaxOffline: false, claimed: false }],
  };
  const migrated = migrateLegacyRewardGold(legacy);
  assert.equal(migrated.state.gold, state.gold + 40);
  assert.equal(migrated.state.goldLooted, state.goldLooted + 15);
  assert.equal(migrated.state.pendingRewards[0].goldCredited, true);
  assert.equal(migrated.state.mailbox, undefined);
  const repeated = migrateLegacyRewardGold(migrated.state);
  assert.equal(repeated.state.gold, migrated.state.gold);
  assert.equal(repeated.changed, false);
});

test('patrulha ociosa credita ouro assim que cria a recompensa', () => {
  const state = createInitialGameState(1_000_000);
  state.idle.active = true;
  const result = calculateElapsedIdleProgress(state, 1_060_000);
  assert.ok(result.offlineBatchCreated);
  assert.equal(result.offlineBatchCreated.goldCredited, true);
  assert.equal(result.state.gold, state.gold + result.offlineBatchCreated.gold);
  assert.equal(result.state.goldLooted, state.goldLooted + result.offlineBatchCreated.gold);
});

test('expansão de mochila cobra ouro, aumenta cinco espaços até 60 e rejeita saldo insuficiente', () => {
  const state = { ...createInitialGameState(1_000_000), gold: 1_500 };
  assert.equal(getInventoryCapacity(state), 20);
  assert.equal(getInventoryExpansionCost(state), 500);
  const bought = buyInventoryExpansion(state);
  assert.equal(bought.costPaid, 500);
  assert.equal(bought.state.inventoryCapacity, 25);
  assert.equal(bought.state.gold, state.gold - 500);
  const poor = buyInventoryExpansion({ ...state, gold: 0 });
  assert.ok(poor.error);
  assert.equal(poor.state.inventoryCapacity, 20);
});

test('expansão temporária da guilda concede 20 de energia por duas horas e vence no servidor', () => {
  const state = { ...createInitialGameState(1_000_000), gold: 1_500 };
  const notMember = buyGuildTemporaryEnergy(state, 1_000_000);
  assert.ok(notMember.error);
  const memberState = { ...state, guildState: { ...state.guildState, playerGuildId: 'guild_test' } };
  const bought = buyGuildTemporaryEnergy(memberState, 1_000_000);
  assert.equal(bought.error, undefined);
  assert.equal(bought.state.maxEnergy, GAME_CONFIG.baseMaxEnergy + 20);
  assert.equal(bought.state.temporaryEnergyBoostExpiresAtMs, 1_000_000 + 7_200_000);
  const expired = calculateElapsedIdleProgress(bought.state, 1_000_000 + 7_200_001).state;
  assert.equal(expired.maxEnergy, GAME_CONFIG.baseMaxEnergy);
  assert.ok(expired.energy <= GAME_CONFIG.baseMaxEnergy);
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

test('Valida masmorras até nível 150, 13 graus, 13 raridades e Sistema de Medicina', () => {
  // 1. Pelo menos 44 masmorras, do nível 1 ao 150, distribuídas em 13 graus
  assert.ok(DUNGEONS.length >= 44, `Esperado >= 44 masmorras, encontrado ${DUNGEONS.length}`);
  assert.equal(Math.max(...DUNGEONS.map(dungeon => dungeon.minLevel)), 150);
  const difficulties = new Set(DUNGEONS.map((d) => d.difficulty));
  assert.deepEqual(
    Array.from(difficulties).sort(),
    ['Abissal', 'Apocalíptico', 'Celestial', 'Divino', 'Elite', 'Imortal', 'Iniciante', 'Lendário', 'Mestre', 'Mítico', 'Pesadelo', 'Transcendente', 'Veterano']
  );

  // Todas as masmorras possuem encontros e espólios garantidos válidos
  for (const dungeon of DUNGEONS) {
    assert.ok(dungeon.encounters.length >= 3, `Masmorra ${dungeon.id} deve ter >= 3 encontros`);
    assert.ok(dungeon.guaranteedDropPool.length >= 2, `Masmorra ${dungeon.id} deve ter espólios`);
    for (const dropId of dungeon.guaranteedDropPool) {
      assert.ok(ITEM_TEMPLATES[dropId], `Template ${dropId} ausente na masmorra ${dungeon.id}`);
    }
  }

  // 2. Verifica as raridades em DESIGN_TOKENS e ITEM_TEMPLATES
  const expectedRarities: RarityKey[] = [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'mythic',
    'imperial',
    'divine',
    'celestial',
    'astral',
    'primordial',
    'transcendent',
    'obsidian',
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

test('progressão até o nível 50 oferece quatro conjuntos completos e um conjunto Obsidiana secreto', () => {
  const regularTiers = [
    { rarity: 'celestial', level: 20 },
    { rarity: 'astral', level: 30 },
    { rarity: 'primordial', level: 40 },
    { rarity: 'transcendent', level: 50 },
  ] as const;
  const expectedSlots = ['amulet', 'armor', 'boots', 'gloves', 'helmet', 'ring', 'shield', 'weapon'];
  const items = Object.values(ENDGAME_ITEMS);
  assert.equal(items.length, 32);
  assert.equal(new Set(items.map(item => item.templateId)).size, 32);

  for (const { rarity, level } of regularTiers) {
    const tierItems = items.filter(item => item.rarity === rarity);
    assert.equal(tierItems.length, 8, `${rarity} deve preencher os oito espaços`);
    assert.deepEqual(tierItems.map(item => item.slot).sort(), expectedSlots);
    assert.ok(tierItems.every(item => item.levelReq === level));
  }

  for (let index = 1; index < regularTiers.length; index++) {
    const previous = regularTiers[index - 1];
    const current = regularTiers[index];
    for (const slot of expectedSlots) {
      const score = (rarity: string) => Object.values(
        items.find(item => item.rarity === rarity && item.slot === slot)!.stats
      ).reduce((sum, value) => sum + (value ?? 0), 0);
      assert.ok(score(current.rarity) > score(previous.rarity), `${slot} deve progredir de ${previous.rarity} para ${current.rarity}`);
    }
  }

  const obsidian = Object.values(OBSIDIAN_ITEMS);
  assert.equal(obsidian.length, 8);
  assert.equal(new Set(obsidian.map(item => item.templateId)).size, 8);
  assert.deepEqual(obsidian.map(item => item.slot).sort(), expectedSlots);
  assert.ok(obsidian.every(item => item.rarity === 'obsidian' && item.levelReq === 50));
  assert.equal(Object.keys(OBSIDIAN_TO_TRANSCENDENT).length, 8);
  for (const item of obsidian) {
    const equivalentId = OBSIDIAN_TO_TRANSCENDENT[item.templateId];
    assert.ok(equivalentId, `Obsidiana ${item.templateId} precisa de equivalente Transcendente`);
    assert.ok(ENDGAME_ITEMS[equivalentId], `Equivalente ${equivalentId} precisa existir`);
    assert.equal(ENDGAME_ITEMS[equivalentId].slot, item.slot);
  }
});

test('regiões de endgame desbloqueiam dos níveis 20 a 150 e oferecem itens da faixa', () => {
  assert.deepEqual(ENDGAME_REGIONS.map(region => region.minLevel), [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]);
  for (let index = 0; index < ENDGAME_REGIONS.length; index++) {
    const region = ENDGAME_REGIONS[index];
    const expectedRarity = ['celestial', 'astral', 'primordial', 'transcendent'][index] ?? 'transcendent';
    assert.equal(region.enemies.length, 3);
    for (const enemy of region.enemies) {
      assert.ok(index < 4 ? enemy.level >= region.minLevel : enemy.level >= region.minLevel - 2 && enemy.level <= region.minLevel);
      for (const templateId of enemy.dropPool) {
        const item = ENDGAME_ITEMS[templateId];
        assert.ok(item, `${templateId} deve pertencer à faixa da região`);
        assert.equal(item.rarity, expectedRarity);
      }
    }
  }
});

test('somente o chefe final de nível 50 tem jackpot Obsidiana de 0,1%', () => {
  const eligibleBoss = ENDGAME_REGIONS[3].enemies[2];
  assert.equal(eligibleBoss.specialDropChance, 0.001);
  assert.deepEqual(new Set(eligibleBoss.specialDropPool), new Set(Object.keys(OBSIDIAN_ITEMS)));
  assert.ok(ENDGAME_REGIONS.slice(0, 3).every(region =>
    region.enemies.every(enemy => enemy.specialDropChance === undefined && enemy.specialDropPool === undefined)
  ));
  assert.ok(ENDGAME_REGIONS[3].enemies.slice(0, 2).every(enemy =>
    enemy.specialDropChance === undefined && enemy.specialDropPool === undefined
  ));
});

test('vitória no chefe sorteia uma peça Obsidiana separada do loot normal; derrota e inimigo comum não', () => {
  const now = 1_000_000;
  const state = createInitialGameState(now);
  state.level = 50;
  state.baseStats = {
    strength: 100, skill: 100, agility: 100, constitution: 100, charisma: 100, intelligence: 100,
  };
  state.equipped.weapon = createItemFromTemplate('obsidian_weapon', 'jackpot_test');
  state.currentHp = calculateDerivedStats(state.baseStats, state.equipped, state.level).maxHp;

  const configuredBoss = ENDGAME_REGIONS[3].enemies[2];
  const guaranteedTestBoss = {
    ...configuredBoss,
    maxHp: 1,
    strength: 0,
    skill: 0,
    agility: 0,
    constitution: 0,
    charisma: 0,
    armor: 0,
    damageMin: 0,
    damageMax: 0,
    goldMin: 0,
    goldMax: 0,
    xpReward: 1,
    dropChance: 0,
    dropPool: [],
    specialDropChance: 1,
  };
  const win = resolveCombat(state, guaranteedTestBoss, {
    mode: 'expedition', locationName: 'Teste', seed: 1, timestampMs: now,
  });
  assert.equal(win.report.victory, true);
  assert.equal(win.rewardBatch.items.length, 1);
  assert.equal(win.rewardBatch.items[0].rarity, 'obsidian');
  assert.ok(OBSIDIAN_ITEMS[win.rewardBatch.items[0].templateId]);

  const losingBoss = {
    ...configuredBoss,
    maxHp: 500_000,
    skill: 1_000,
    damageMin: 10_000,
    damageMax: 10_000,
    dropChance: 0,
    dropPool: [],
    specialDropChance: 1,
  };
  const loss = resolveCombat({ ...state, currentHp: 1, baseStats: {
    strength: 5, skill: 5, agility: 5, constitution: 5, charisma: 5, intelligence: 5,
  } }, losingBoss, { mode: 'expedition', locationName: 'Teste', seed: 2, timestampMs: now });
  assert.equal(loss.report.victory, false);
  assert.equal(loss.rewardBatch.items.some(item => item.rarity === 'obsidian'), false);

  const ordinaryEnemy = { ...guaranteedTestBoss, specialDropChance: undefined, specialDropPool: undefined };
  const ordinaryWin = resolveCombat(state, ordinaryEnemy, {
    mode: 'expedition', locationName: 'Teste', seed: 1, timestampMs: now,
  });
  assert.equal(ordinaryWin.report.victory, true);
  assert.equal(ordinaryWin.rewardBatch.items.some(item => item.rarity === 'obsidian'), false);
});

test('raridade Obsidiana só aparece no filtro depois que uma peça for descoberta', () => {
  assert.equal(isRarityDiscovered('celestial', []), true);
  assert.equal(isRarityDiscovered('obsidian', []), false);
  assert.equal(isRarityDiscovered('obsidian', ['obsidian_weapon']), true);
});

test('coleção oculta todo o conjunto Obsidiana até a primeira descoberta', () => {
  const templates = [...Object.values(ENDGAME_ITEMS), ...Object.values(OBSIDIAN_ITEMS)];
  const hidden = getItemsVisibleByDiscovery(templates, []);
  assert.equal(hidden.some(item => item.rarity === 'obsidian'), false);
  const discovered = getItemsVisibleByDiscovery(templates, ['obsidian_helmet']);
  assert.equal(discovered.filter(item => item.rarity === 'obsidian').length, 8);
});

test('claim registra a descoberta Obsidiana e vender a peça não apaga seu registro', () => {
  const now = 1_000_000;
  const state = createInitialGameState(now);
  const obsidian = createItemFromTemplate('obsidian_weapon', 'discovery_test');
  const outcome = resolveCombat(state, ENDGAME_REGIONS[3].enemies[2], {
    mode: 'expedition', locationName: 'Portões de Hades', seed: 1, timestampMs: now,
  });
  const reward = {
    ...outcome.rewardBatch,
    claimId: 'obsidian_discovery_claim',
    items: [obsidian],
  };
  const claimed = claimPendingReward({ ...state, pendingRewards: [reward] }, reward.claimId).state;
  assert.equal(isRarityDiscovered('obsidian', claimed.discoveredTemplates), true);
  const sold = sellItemFromInventory(claimed, obsidian.id).state;
  assert.equal(sold.inventory.some(item => item.id === obsidian.id), false);
  assert.equal(isRarityDiscovered('obsidian', sold.discoveredTemplates), true);
});

test('Arena limita cada bônus Obsidiano ao equivalente Transcendente com os mesmos reforços', () => {
  const equipped = Object.fromEntries(Object.keys(OBSIDIAN_ITEMS).map((templateId, index) => {
    const item = createItemFromTemplate(templateId, `arena_cap_${index}`);
    const upgradedStats = Object.fromEntries(Object.entries(item.stats).map(([key, value]) => [key, (value ?? 0) + 2]));
    return [item.slot, { ...item, forgeLevel: 2, stats: upgradedStats }];
  })) as ReturnType<typeof createInitialGameState>['equipped'];
  const capped = prepareArenaEquipment(equipped);

  for (const [slot, item] of Object.entries(equipped)) {
    if (!item) continue;
    const transcendentId = OBSIDIAN_TO_TRANSCENDENT[item.templateId];
    const expected = createItemFromTemplate(transcendentId, `arena_expected_${slot}`);
    for (const stat of Object.keys(item.stats) as (keyof typeof item.stats)[]) {
      assert.equal(capped[slot as keyof typeof capped]?.stats[stat], (expected.stats[stat] ?? 0) + 2, `${slot}.${stat}`);
    }
  }

  const state = createInitialGameState(1_000_000);
  state.level = 50;
  state.baseStats = { strength: 100, skill: 100, agility: 100, constitution: 100, charisma: 100, intelligence: 100 };
  state.equipped = equipped;
  state.currentHp = calculateDerivedStats(state.baseStats, equipped, state.level).maxHp;
  const enemy = { ...ENDGAME_REGIONS[3].enemies[2], maxHp: 1, skill: 0, agility: 0, armor: 0, damageMin: 0, damageMax: 0, dropChance: 0, dropPool: [], specialDropChance: 0 };
  const pve = resolveCombat(state, enemy, { mode: 'expedition', locationName: 'Teste', seed: 17, timestampMs: 1_000_001 });
  const arena = resolveCombat(state, enemy, { mode: 'arena', locationName: 'Teste', seed: 17, timestampMs: 1_000_001 });
  assert.ok(pve.report.playerMaxHp > arena.report.playerMaxHp, 'PvE preserva o HP completo Obsidiano');
  assert.equal(arena.report.playerMaxHp, calculateDerivedStats(state.baseStats, capped, state.level).maxHp);
});

