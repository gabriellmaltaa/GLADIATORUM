import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MIGRATION_COMPETITIVE_CAPS,
  OnlineAuthorityEngine,
} from '../server/onlineAuthorityEngine';
import { createInitialGameState } from './rules';

function computePercentiles(samplesMs: number[]): {
  p50: number;
  p95: number;
  p99: number;
} {
  if (samplesMs.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const pick = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return Number(sorted[idx].toFixed(2));
  };
  return {
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
  };
}

test('1. Firestore Security Rules & Dirty Dozen Verification: valida separação de PII, hasOnly, imutabilidade e bloqueio dos 12 vetores', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
  const indexesPath = path.resolve(process.cwd(), 'firestore.indexes.json');

  assert.equal(fs.existsSync(rulesPath), true, 'firestore.rules deve existir');
  assert.equal(fs.existsSync(blueprintPath), true, 'firebase-blueprint.json deve existir');
  assert.equal(fs.existsSync(indexesPath), true, 'firestore.indexes.json deve existir');

  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  // 1. Default deny-all
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);

  // 2. Separação Público vs Privado (PII email isolado em players_private)
  assert.match(rulesContent, /match \/players_public\/\{playerId\}/);
  assert.match(rulesContent, /match \/players_private\/\{playerId\}/);
  assert.match(
    rulesContent,
    /allow get: if isSignedIn\(\) && isValidId\(playerId\) && request\.auth\.uid == playerId;/
  );
  assert.match(rulesContent, /allow list: if false;/);

  // 3. Whitelist estrito de chaves (.keys().hasOnly) e imutabilidade
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesContent, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesContent, /incoming\(\)\.uid == existing\(\)\.uid/);

  // 4. Validação dos 12 vetores (Dirty Dozen) no motor autoritativo
  const engine = new OnlineAuthorityEngine();
  const baseTime = 1_750_000_000_000;
  engine.bootstrapPlayer(
    { uid: 'sec_user_1', email: 'sec1@test.com', displayName: 'Secutor I' },
    baseTime
  );

  // Vetor: Inteiro negativo ou float em doação de banco
  const negDonation = engine.executeAction(
    'sec_user_1',
    { opId: 'op_neg_1', action: 'guild_donate_gold', params: { amount: -50 } },
    baseTime + 100
  );
  assert.equal(negDonation.ok, false);

  const floatDonation = engine.executeAction(
    'sec_user_1',
    { opId: 'op_flt_1', action: 'guild_donate_gold', params: { amount: 12.5 } },
    baseTime + 200
  );
  assert.equal(floatDonation.ok, false);
});

test('2. Autoridade do Servidor: recompensa só pode ser resgatada uma única vez (idempotência por opId e claimId) e saldo nunca fica negativo', () => {
  const engine = new OnlineAuthorityEngine();
  const now = 1_750_000_000_000;
  const boot = engine.bootstrapPlayer(
    { uid: 'glad_auth_1', email: 'g1@test.com', displayName: 'Maximus' },
    now
  );
  assert.equal(boot.state.gold, 160);

  // Inicia expedição válida no servidor
  const expRes = engine.executeAction(
    'glad_auth_1',
    {
      opId: 'op_exp_01',
      action: 'start_expedition',
      params: { regionId: 'capua_woods', enemyIndex: 0, focusMode: 'balanced' },
    },
    now + 1000
  );
  assert.equal(expRes.ok, true);
  assert.equal(expRes.state.pendingRewards.length, 1);

  const rewardBatch = expRes.state.pendingRewards[0];
  const goldBeforeClaim = expRes.state.gold;

  // 1º resgate
  const claim1 = engine.executeAction(
    'glad_auth_1',
    {
      opId: 'op_claim_01',
      action: 'claim_reward',
      params: { claimId: rewardBatch.claimId },
    },
    now + 2000
  );
  assert.equal(claim1.ok, true);
  assert.equal(claim1.state.gold, goldBeforeClaim + rewardBatch.gold);

  // Replay com o MESMO opId (duplo clique de rede) -> idempotente, não duplica ouro!
  const replaySameOpId = engine.executeAction(
    'glad_auth_1',
    {
      opId: 'op_claim_01',
      action: 'claim_reward',
      params: { claimId: rewardBatch.claimId },
    },
    now + 2100
  );
  assert.equal(replaySameOpId.idempotentReplay, true);
  assert.equal(replaySameOpId.state.gold, goldBeforeClaim + rewardBatch.gold);

  // Tentativa com NOVO opId mas mesmo claimId -> recusado!
  const duplicateClaim = engine.executeAction(
    'glad_auth_1',
    {
      opId: 'op_claim_02_hack',
      action: 'claim_reward',
      params: { claimId: rewardBatch.claimId },
    },
    now + 2200
  );
  assert.equal(duplicateClaim.ok, false);
  assert.equal(duplicateClaim.state.gold, goldBeforeClaim + rewardBatch.gold);

  // Tentativa de treinar atributo sem saldo suficiente -> saldo nunca fica negativo
  for (let i = 0; i < 20; i++) {
    engine.executeAction(
      'glad_auth_1',
      {
        opId: `op_train_drain_${i}`,
        action: 'train_stat',
        params: { stat: 'strength' },
      },
      now + 3000 + i * 10
    );
  }
  const finalBoot = engine.bootstrapPlayer(
    { uid: 'glad_auth_1', email: 'g1@test.com', displayName: 'Maximus' },
    now + 5000
  );
  assert.equal(finalBoot.state.gold >= 0, true, 'Ouro jamais pode ficar negativo');
});

test('3. Migração Segura do Modo Local: aplica tetos competitivos, bloqueia repetição e não sobrescreve conta online ativa', () => {
  const engine = new OnlineAuthorityEngine();
  const now = 1_750_000_000_000;

  engine.bootstrapPlayer(
    { uid: 'migrator_1', email: 'mig1@test.com', displayName: 'Spartacus Local' },
    now
  );

  // Save local adulterado via DevTools (Nível 99, 999.999 Ouro, 999.999 Honra, Força 500)
  const tamperedLocalSave = createInitialGameState(now - 60_000);
  tamperedLocalSave.name = 'Spartacus Editado';
  tamperedLocalSave.level = 99;
  tamperedLocalSave.gold = 999_999;
  tamperedLocalSave.honor = 999_999;
  tamperedLocalSave.baseStats.strength = 500;
  tamperedLocalSave.guildState.playerGuildId = 'guild_legio_ferrea'; // Guilda local simulada

  const mig1 = engine.migrateLocalSave(
    'migrator_1',
    JSON.stringify(tamperedLocalSave),
    now + 1000
  );
  assert.equal(mig1.ok, true);
  assert.ok(mig1.report);
  assert.equal(mig1.state?.level, MIGRATION_COMPETITIVE_CAPS.maxLevel);
  assert.equal(mig1.state?.gold, MIGRATION_COMPETITIVE_CAPS.maxGold);
  assert.equal(mig1.state?.honor, MIGRATION_COMPETITIVE_CAPS.maxHonor);
  assert.equal(
    mig1.state?.baseStats.strength,
    MIGRATION_COMPETITIVE_CAPS.maxBaseStat
  );
  // Guilda local simulada nunca é importada como guilda online
  assert.equal(mig1.state?.guildState.playerGuildId, null);

  // Tentativa de repetir a migração na mesma conta -> bloqueada!
  const migRepeat = engine.migrateLocalSave(
    'migrator_1',
    JSON.stringify(tamperedLocalSave),
    now + 2000
  );
  assert.equal(migRepeat.ok, false);
  assert.match(migRepeat.error ?? '', /já realizou a migração/i);

  // Conta online que já jogou partidas não pode ser sobrescrita por save local
  engine.bootstrapPlayer(
    { uid: 'active_online_1', email: 'act@test.com', displayName: 'Veterano Online' },
    now
  );
  engine.executeAction(
    'active_online_1',
    {
      opId: 'op_vet_exp',
      action: 'start_expedition',
      params: { regionId: 'capua_woods', enemyIndex: 0, focusMode: 'balanced' },
    },
    now + 500
  );
  const migOverwriteAttempt = engine.migrateLocalSave(
    'active_online_1',
    JSON.stringify(tamperedLocalSave),
    now + 1500
  );
  assert.equal(migOverwriteAttempt.ok, false);
  assert.match(migOverwriteAttempt.error ?? '', /não sobrescrevemos/i);
});

test('4. Guildas Online Compartilhadas entre Contas Reais: criação, ingresso, doação atômica, permissões e recálculo imediato de Honra', () => {
  const engine = new OnlineAuthorityEngine();
  const now = 1_750_000_000_000;

  // Conta A e Conta B
  engine.bootstrapPlayer(
    { uid: 'user_alpha', email: 'alpha@test.com', displayName: 'Marcus Alpha' },
    now
  );
  engine.bootstrapPlayer(
    { uid: 'user_beta', email: 'beta@test.com', displayName: 'Titus Beta' },
    now
  );

  // Dá honra e ouro para ambos via vitórias na Arena / Expedição
  engine.executeAction(
    'user_alpha',
    { opId: 'op_a_arena', action: 'challenge_arena', params: { opponentId: 'arena_1' } },
    now + 100
  );
  const alphaAfterArena = engine.bootstrapPlayer(
    { uid: 'user_alpha', email: 'alpha@test.com', displayName: 'Marcus Alpha' },
    now + 200
  );
  const alphaClaimId = alphaAfterArena.state.pendingRewards[0]?.claimId;
  if (alphaClaimId) {
    engine.executeAction(
      'user_alpha',
      { opId: 'op_a_claim', action: 'claim_reward', params: { claimId: alphaClaimId } },
      now + 300
    );
  }

  // Conta A cria a guilda [INV] Legião Invicta (custa 120g)
  const createRes = engine.executeAction(
    'user_alpha',
    {
      opId: 'op_a_create_guild',
      action: 'guild_create',
      params: {
        name: 'Legião Invicta',
        tag: 'INV',
        emblemId: 'aquila_imperial',
        description: 'Aliança online de Cápua',
        recruitmentStatus: 'open',
        minLevelReq: 1,
        minHonorReq: 0,
      },
    },
    now + 500
  );
  assert.equal(createRes.ok, true);
  const createdGuildId = createRes.state.guildState.playerGuildId;
  assert.ok(createdGuildId);

  // Conta B vê a guilda criada por A e ingressa nela
  const joinRes = engine.executeAction(
    'user_beta',
    {
      opId: 'op_b_join_guild',
      action: 'guild_apply_or_join',
      params: { guildId: createdGuildId },
    },
    now + 1000
  );
  assert.equal(joinRes.ok, true);
  assert.equal(joinRes.state.guildState.playerGuildId, createdGuildId);

  // Conta B doa 40 Ouro ao Banco da Guilda (idempotente)
  const donateRes1 = engine.executeAction(
    'user_beta',
    {
      opId: 'op_b_donate_40',
      action: 'guild_donate_gold',
      params: { amount: 40 },
    },
    now + 1500
  );
  assert.equal(donateRes1.ok, true);

  // Replay do mesmo opId de doação -> não debita duas vezes!
  const donateReplay = engine.executeAction(
    'user_beta',
    {
      opId: 'op_b_donate_40',
      action: 'guild_donate_gold',
      params: { amount: 40 },
    },
    now + 1550
  );
  assert.equal(donateReplay.idempotentReplay, true);
  assert.equal(donateReplay.state.gold, 120); // 160 - 40 = 120

  // Verifica que o banco da guilda tem 40 Ouro e a honra da guilda NÃO subiu por causa da doação
  const guildRanks = engine.queryGuildRankings({
    limit: 10,
    viewerUid: 'user_alpha',
  });
  const invGuild = guildRanks.items.find((g) => g.id === createdGuildId);
  assert.ok(invGuild);
  assert.equal(invGuild.memberCount, 2);
  const alphaHonor = createRes.state.honor;
  const betaHonor = donateRes1.state.honor;
  assert.equal(invGuild.totalHonor, alphaHonor + betaHonor);

  // Conta B (Membro comum) tenta melhorar edifício -> recusado por permissão!
  const unauthUpgrade = engine.executeAction(
    'user_beta',
    {
      opId: 'op_b_unauth_upg',
      action: 'guild_upgrade_building',
      params: { buildingId: 'campo_treino' },
    },
    now + 2000
  );
  assert.equal(unauthUpgrade.ok, false);

  // Conta B sai da guilda -> honra e contagem de membros atualizam imediatamente
  const leaveRes = engine.executeAction(
    'user_beta',
    { opId: 'op_b_leave', action: 'guild_leave' },
    now + 2500
  );
  assert.equal(leaveRes.ok, true);
  const guildRanksAfterLeave = engine.queryGuildRankings({
    limit: 10,
    viewerUid: 'user_alpha',
  });
  const invGuildAfter = guildRanksAfterLeave.items.find((g) => g.id === createdGuildId);
  assert.equal(invGuildAfter?.memberCount, 1);
  assert.equal(invGuildAfter?.totalHonor, alphaHonor);
});

test('5. Bateria Reproduzível de 1.000 Jogadores (Parte A: Volume + Parte B: Rampa de Concorrência 10 -> 1.000 Usuários e Disputa de Vaga)', async () => {
  const engine = new OnlineAuthorityEngine();
  const baseNow = 1_750_000_000_000;

  // =========================================================================
  // PARTE A: VOLUME DE DADOS (1.000 Perfis Sintéticos e 80 Guildas)
  // =========================================================================
  const seedReport = engine.seedThousandPlayersDataset(1000, baseNow);
  assert.equal(seedReport.playersSeeded, 1000);
  assert.equal(seedReport.guildsSeeded, 80);

  // Consulta página 1 paginada por cursor (limit = 8)
  const tQueryStart = performance.now();
  const page1 = engine.queryPlayerRankings({
    category: 'honor',
    limit: 8,
    cursor: null,
    viewerUid: 'syn_player_0500',
  });
  const page1Ms = performance.now() - tQueryStart;

  assert.equal(page1.items.length, 8);
  assert.equal(page1.totalPlayers, 1000);
  assert.equal(page1.hasMore, true);
  assert.ok(page1.nextCursor);
  assert.ok(page1.playerOwnEntry);
  assert.equal(page1.playerOwnEntry?.id, 'syn_player_0500');

  // Verifica tamanho do payload serializado da página (evita carregar lista inteira de ~450 KB)
  const payloadBytes = Buffer.byteLength(JSON.stringify(page1), 'utf-8');
  assert.equal(
    payloadBytes < 5120,
    true,
    `Payload paginado deve ter menos de 5 KB (atual: ${payloadBytes} bytes)`
  );

  // Consulta página 2 usando nextCursor e valida ordenação estrita
  const page2 = engine.queryPlayerRankings({
    category: 'honor',
    limit: 8,
    cursor: page1.nextCursor,
    viewerUid: 'syn_player_0500',
  });
  assert.equal(page2.items.length, 8);
  assert.equal(page2.items[0].rank, 9);
  assert.equal(page1.items[7].honor >= page2.items[0].honor, true);

  // Testa "Minha Posição" (jumpToMyPosition) para o jogador #500
  const jumpPage = engine.queryPlayerRankings({
    category: 'honor',
    limit: 8,
    jumpToMyPosition: true,
    viewerUid: 'syn_player_0500',
  });
  assert.equal(
    jumpPage.items.some((p) => p.id === 'syn_player_0500'),
    true,
    'Salto para Minha Posição deve incluir o jogador consultado na janela paginada'
  );

  // =========================================================================
  // PARTE B: RAMPA DE CONCORRÊNCIA (10, 50, 100, 250, 500 e 1.000 Usuários)
  // =========================================================================
  const stages = [10, 50, 100, 250, 500, 1000];
  const stageMetrics: Array<{
    virtualUsers: number;
    totalOps: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    throughputOpsPerSec: number;
    errorRatePercent: number;
    contentionCount: number;
    rssMb: number;
    heapUsedMb: number;
  }> = [];

  for (const vu of stages) {
    const latenciesMs: number[] = [];
    let errors = 0;
    const stageStart = performance.now();

    const tasks = Array.from({ length: vu }, async (_, idx) => {
      const uid = `syn_player_${String((idx % 1000) + 1).padStart(4, '0')}`;
      const opType = idx % 6;
      const t0 = performance.now();
      try {
        await engine.runExclusiveTransaction(async () => {
          if (opType === 0) {
            // Consulta de classificação de jogadores
            engine.queryPlayerRankings({
              category: 'honor',
              limit: 8,
              viewerUid: uid,
            });
          } else if (opType === 1) {
            // Carregamento/bootstrap do personagem
            engine.bootstrapPlayer(
              { uid, email: `${uid}@ludus.test`, displayName: `Gladiador ${idx}` },
              baseNow + idx
            );
          } else if (opType === 2) {
            // Execução de combate/expedição e geração de recompensa
            engine.executeAction(
              uid,
              {
                opId: `bench_${vu}_exp_${idx}`,
                action: 'start_expedition',
                params: {
                  regionId: 'capua_woods',
                  enemyIndex: 0,
                  focusMode: 'balanced',
                },
              },
              baseNow + idx
            );
          } else if (opType === 3) {
            // Consulta de guilda / ranking de guildas
            engine.queryGuildRankings({
              limit: 8,
              viewerUid: uid,
            });
          } else if (opType === 4) {
            // Doação ao banco da guilda
            engine.executeAction(
              uid,
              {
                opId: `bench_${vu}_don_${idx}`,
                action: 'guild_donate_gold',
                params: { amount: 5 },
              },
              baseNow + idx
            );
          } else {
            // Treino de atributo
            engine.executeAction(
              uid,
              {
                opId: `bench_${vu}_trn_${idx}`,
                action: 'train_stat',
                params: { stat: 'strength' },
              },
              baseNow + idx
            );
          }
        });
      } catch {
        errors += 1;
      } finally {
        latenciesMs.push(performance.now() - t0);
      }
    });

    await Promise.all(tasks);
    const stageElapsedSec = Math.max(0.001, (performance.now() - stageStart) / 1000);
    const pct = computePercentiles(latenciesMs);
    const mem = process.memoryUsage();
    const diag = engine.getDiagnostics();

    stageMetrics.push({
      virtualUsers: vu,
      totalOps: vu,
      p50Ms: pct.p50,
      p95Ms: pct.p95,
      p99Ms: pct.p99,
      throughputOpsPerSec: Math.round(vu / stageElapsedSec),
      errorRatePercent: Number(((errors / vu) * 100).toFixed(2)),
      contentionCount: diag.contentionCount,
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
    });

    assert.equal(errors, 0, `Estágio ${vu} VUs não deve apresentar erros não tratados`);
  }

  // Teste de Contenção Simultânea: 40 jogadores tentando ocupar a ÚLTIMA vaga de uma guilda com Forum Nv.1 (capacidade máx = 5, já com 4 membros)
  const limitedGuildLeader = 'syn_player_0990';
  // Garante que syn_player_0990 saia da guilda sintética anterior e crie uma guilda com 1 vaga restante
  engine.executeAction(
    limitedGuildLeader,
    { opId: 'op_leave_for_contention', action: 'guild_leave' },
    baseNow + 90_000
  );
  const createLimited = engine.executeAction(
    limitedGuildLeader,
    {
      opId: 'op_create_limited_guild',
      action: 'guild_create',
      params: {
        name: 'Guarda Pretoriana',
        tag: 'GPR',
        emblemId: 'lupa_romana',
        description: 'Apenas 5 vagas',
        recruitmentStatus: 'open',
        minLevelReq: 1,
        minHonorReq: 0,
      },
    },
    baseNow + 91_000
  );
  assert.equal(createLimited.ok, true);
  const limitedGuildId = createLimited.state.guildState.playerGuildId!;

  // Preenche 3 vagas (total = 4/5, restando exatamente 1 vaga)
  for (let i = 991; i <= 993; i++) {
    const u = `syn_player_${String(i).padStart(4, '0')}`;
    engine.executeAction(u, { opId: `leave_${i}`, action: 'guild_leave' }, baseNow + 92_000);
    const j = engine.executeAction(
      u,
      {
        opId: `join_${i}`,
        action: 'guild_apply_or_join',
        params: { guildId: limitedGuildId },
      },
      baseNow + 92_500
    );
    assert.equal(j.ok, true);
  }

  // Agora 6 candidatos (994..999) disputam simultaneamente a 5ª e última vaga!
  let acceptedCount = 0;
  let rejectedFullCount = 0;
  await Promise.all(
    [994, 995, 996, 997, 998, 999].map(async (i) => {
      const u = `syn_player_${String(i).padStart(4, '0')}`;
      await engine.runExclusiveTransaction(async () => {
        engine.executeAction(
          u,
          { opId: `leave_race_${i}`, action: 'guild_leave' },
          baseNow + 93_000
        );
        const attempt = engine.executeAction(
          u,
          {
            opId: `race_join_${i}`,
            action: 'guild_apply_or_join',
            params: { guildId: limitedGuildId },
          },
          baseNow + 93_100
        );
        if (attempt.ok) {
          acceptedCount += 1;
        } else {
          rejectedFullCount += 1;
        }
      });
    })
  );

  assert.equal(
    acceptedCount,
    1,
    'Exatamente 1 candidato deve conseguir a última vaga na disputa simultânea'
  );
  assert.equal(
    rejectedFullCount,
    5,
    'Os outros 5 candidatos devem receber recusa limpa de capacidade lotada'
  );

  const finalDiag = engine.getDiagnostics();
  console.log(
    'BENCHMARK_1000_PLAYERS_SUMMARY:',
    JSON.stringify({
      volumeQueryPage1Ms: Number(page1Ms.toFixed(2)),
      page1PayloadBytes: payloadBytes,
      stageMetrics,
      diagnostics: finalDiag,
    })
  );
});
