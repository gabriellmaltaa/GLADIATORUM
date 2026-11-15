# Lançamento competitivo online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lançar progressão competitiva assíncrona, recompensas de equipamento, guerra e finanças de guilda, com privacidade e equilíbrio validados no servidor.

**Architecture:** Reusar a autoridade online em `src/server/onlineAuthorityEngine.ts` e estado serializado em JSON; declarar contratos compartilhados no domínio de jogo; buscar/listar jogadores e guerras por rotas autenticadas. Toda ação mutável passa pela transação serializada e pelo `opId`. A UI continua em React e separa claramente treino NPC de PvP real.

**Tech Stack:** TypeScript, React, Express, Node test runner/esbuild, Firebase Auth já existente.

**Spec:** `docs/superpowers/specs/2026-11-14-competitive-online-launch.md`

## Global Constraints

- O servidor decide combates, recompensas, afixos, posições de título e movimentos de tesouro.
- Usar `opId` para impedir repetição de operações.
- Não zerar nem migrar dados de jogadores durante estas entregas.
- Não expor e-mail, UID, ouro, inventário não equipado, telemetria ou configuração interna em perfil público.
- Usar os limites de atributos e críticos já existentes no combate PvP.
- UI e textos em português, adaptados a celular.

## Review Focus

1. Duas requisições concorrentes de desafio ao mesmo alvo: provar limite de alvo e consumo de energia.
2. Recompensa/replay para operações com mesmo `opId`: provar idempotência.
3. Saves antigos sem novos campos: provar hidratação e persistência compatíveis.
4. Jogador desconectado/sem perfil público: não bloquear Arena nem quebrar tela.
5. Saque com valor negativo, fracionado, maior que saldo/limite ou repetido: negar sem mutação parcial.

## Linha do tempo de lançamento

Estimativas relativas de execução, não datas prometidas. A sequência mantém o jogo jogável desde a primeira entrega e permite acompanhar os sistemas após cada deploy.

| Etapa | Janela estimada | Entrega e critério para avançar |
|---|---:|---|
| 0. Fundação e privacidade | 0,5–1 dia | Remover dados técnicos da interface pública; preservar saves existentes; fechar contratos de ranking e títulos. |
| 1. Arena PvP entre jogadores | 1–2 dias | Desafios online autoritativos, limite diário/alvo, faixa de nível e poder, recompensa e replay idempotente validados. |
| 2. Caçadas e itens especiais | 0,5–1 dia | Afixos de crítico, dano e agilidade em expedições, masmorras, Arena e guerra; limites aplicados pelo servidor. |
| 3. Guerra e tesouro de guilda | 1–2 dias | Convite/aceite, batalhas por membros, placar, recompensa; saque apenas pelo líder, com limite e livro de auditoria. |
| 4. Estabilização online | 0,5–1 dia | Testes automatizados, lint/build, smoke de API, inspeção do diff e confirmação do deploy e health público. |

Ao publicar, manter uma janela inicial de observação de 24–48 horas para acompanhar erros, economia e fila de matchmaking antes de aumentar limites ou recompensas.

---

## Decomposição de entregas

### Plano A — Títulos, afixos e PvP humano

**Arquivos:** `src/game/competitiveProgression.ts` (novo); `src/game/config.ts`; `src/game/rules.ts`; `src/game/rules.test.ts`; `src/server/onlineAuthorityEngine.ts`; `server.ts`; `src/services/firebaseClient.ts`; `src/components/screens/ArenaScreen.tsx`; `src/App.tsx`; `src/game/onlineAuthorityAndLoad.test.ts`.

- [x] Testes dos marcos de nível, título exclusivo rank #1, limites de desafio e afixos válidos.
- [x] Ação `challenge_player` com 5/dia, 1/alvo/dia, 1 energia, proteção de conta inativa e verificação de poder.
- [x] Calcular defensor pelo save autoritativo e resolver combate via `resolveCombat`.
- [x] Aplicar Honra limitada, recompensa elegível com afixo e replay idempotente.
- [x] Exibir jogadores reais na Arena; manter NPCs como treino.
- [ ] Verificar testes/tipos/build.

### Plano B — Guerra de guildas e tesouro

**Arquivos:** `src/game/guildsAndRankings.ts`; `src/game/guildActions.ts`; `src/server/onlineAuthorityEngine.ts`; `server.ts`; `src/services/firebaseClient.ts`; `src/components/screens/GuildScreen.tsx`; testes de regras e autoridade.

- [x] Testar convite/aceite, limite de ataques, placar e encerramento/recompensa.
- [x] Implementar ações autoritativas de iniciar/aceitar guerra e `guild_withdraw_gold`.
- [x] Validar líder, inteiro positivo, limite por operação/dia, saldo e idempotência.
- [x] Registrar ledger/auditoria antes/depois; exibir saque com confirmação apenas ao líder.
- [x] Exibir estado da guerra e contribuições sem revelar dados privados.
- [ ] Verificar testes/tipos/build.

### Plano C — Higiene da experiência de produção

**Arquivos:** `src/App.tsx`; componentes de conta/ranking/arena; testes de renderização/contratos relevantes.

- [x] Cobrir a regra de que detalhes Firebase, nomes de banco, chaves locais e métricas não aparecem na UI do jogador.
- [x] Remover detalhes operacionais; manter status de conta e instruções humanas para erro/migração.
- [x] Marcar claramente NPC como treino e perfis reais como PvP.
- [ ] Verificar layout móvel e typecheck/build.

### Plano D — Validação e publicação

**Arquivos:** testes e `docs/VALIDACAO-2026-11-14.md`.

- [ ] Executar `npm test`, `npm run lint`, `npm run build`.
- [ ] Smoke HTTP: health, bloqueio de ação anônima, bootstrap, arena PvP, transação de guilda e replay idempotente em fixture limpa.
- [ ] Inspecionar diff, não alterar dados existentes em produção e confirmar deploy ativo no endereço público.

