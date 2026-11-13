# Prompt para evoluir Gladiatorum: Arena Aeterna

Copie a partir de “Você é...” e cole no projeto original do Google AI Studio.

Status: proposta de evolução, não implementada. Inspeção pública em 07/11/2026 no modo visitante. Login e PvP entre contas reais não foram testados. O repositório pode estar em uma revisão diferente da versão publicada.

---

Você é responsável por engenharia, game design e qualidade do projeto existente **Gladiatorum: Arena Aeterna**, em https://gladiatorum.ai.studio/, repositório https://github.com/gabriellmaltaa/GLADIATORUM. Evolua o jogo preservando sua identidade romana, interface em português e progresso existente. Quero um RPG idle competitivo, com escolhas de build e PvP justo, viável para uma comunidade inicialmente pequena.

## 1. Primeiro entenda o projeto e corrija falhas

Leia App.tsx, src/game/config.ts, rules.ts, dungeonsAndMedicine.ts, guildActions.ts, guildsAndRankings.ts, src/server/onlineAuthorityEngine.ts, server.ts e serviços de autenticação. Identifique o que já existe antes de adicionar sistemas. O jogo já possui equipamentos em oito slots, oito raridades, treinamento de seis atributos, medicina, expedições, patrulha offline, masmorras, guildas e classificação. Aperfeiçoe esses sistemas em vez de criar duplicatas.

Separe claramente: implementado e verificado; defeito reproduzido; hipótese pendente; nova proposta. Para cada bug registre passos, esperado, observado, causa, correção e teste de regressão. Não declare que corrigiu “todos os bugs” sem evidência.

Há uma correção local preparada para regeneração: a rotina calculateElapsedIdleProgress arredondava regeneração para baixo a cada chamada e atualizava lastSaveTimestampMs; com ticks de 1 segundo, energia e vida nunca acumulavam suas frações. Preserve frações no estado persistido, inclusive depois de recarregar. Garanta 1 energia após 180 segundos e 36 PV após 3 minutos com regeneração base de 12 PV/min, sem antecipar recompensas e mantendo o teto offline de 8h. Confira se essa correção já foi importada antes de refazê-la.

O npm encontrou conflito entre esbuild ^0.25 e o peer de Vite 8.3.6. A correção local usa esbuild ^0.28, lock npm e comando de testes. Preserve compatibilidade com o gerenciador realmente utilizado no AI Studio e atualize seu lock correspondente.

Na inspeção pública, a arena mostrava 30–42 ouro e 32 XP para Titus; o resultado mostrou 55 ouro e 30 XP. O foco Saque (+35% ouro, -15% XP) e inteligência (+12% XP) explicam valores assim. Isso é uma oportunidade de clareza, não prova de bug matemático: mostre recompensa base, cada multiplicador e previsão final na própria arena; use a mesma fórmula na previsão e no crédito. Não confunda essa versão pública com os valores atuais do repositório.

Audite e reproduza: clique duplo em resgate/compra/doação; refresh durante combate; resposta atrasada sobrescrevendo estado recente; duas abas; desconexão; mochila cheia; item único equipado e vendido simultaneamente; energia/PV negativos; relógio retrocedendo; pausa e troca de alvo; limite offline; migração local repetida; permissões de guilda. Confirme que o modo patrulha segue as regras de energia, vida, derrotas e loot anunciadas. Examine o ganho de fama em derrotas e decida explicitamente sua regra, evitando incentivo acidental a perder para subir ranking.

## 2. Direção da jogatina

O ciclo deve ser: escolher alvo e objetivo de farm → obter materiais/equipamentos → montar build → testar contra adversários → entender vitória/derrota → ajustar estratégia → disputar liga.

Mantenha combates automáticos, mas acrescente preparação tática. O jogador escolhe arquétipo, equipamento, uma postura e até três habilidades com ordem de prioridade. Habilidades precisam ter custo ou recarga, gatilhos claros e contrajogo; evite vitória baseada apenas no maior número de poder.

Comece com três estilos inspirados em gladiadores: Murmillo (escudo, bloqueio e contra-ataque, vulnerável a penetração); Retiarius (rede, alcance e controle, frágil quando pressionado); Thraex (mobilidade, crítico e sangramento, vulnerável a defesa e purificação). Defina compatibilidade de armas e slots; a rede pode ser habilidade vinculada ao kit. Use três posturas: agressiva, defensiva e técnica, cada uma com benefício e custo explícitos. Todos os bônus anunciados devem afetar o motor real de combate.

## 3. PvP real em etapas

Priorize **PvP assíncrono 1x1**: desafiar a defesa salva de outra conta real, com simulação e resultado calculados pelo servidor. Isso funciona com poucos jogadores e dispensa presença simultânea. Identifique claramente que a defesa é automática. Preserve a escada de NPCs como treino separado. Nunca apresente NPCs como pessoas reais.

Implemente: perfil público; defesa salva; configurações ofensiva/defensiva separadas; busca de oponentes; histórico de ataques e defesas; relatório reproduzível; revanche casual; ranking sazonal. Sem oponentes reais elegíveis, informe a situação e ofereça treino sem pontuação competitiva.

Crie duas modalidades: Arena Aberta, com progressão normal e faixas de nível; Arena Equalizada, com orçamento de atributos e equipamento normalizados, onde estratégia prevalece e itens raros não compram vantagem. Inicialmente permita compartilhar o mesmo motor e variar regras por modalidade.

Use rating Elo com K inicial 24 e expectativa E=1/(1+10^((ratingAdversário-ratingJogador)/400)); atualização round(K*(resultado-E)), com resultado 1/0,5/0. Rating é separado de honra, fama e vitórias PvE. Faça atualizações dos participantes e do registro de luta atomicamente. Não conceda rating por treino ou NPC. Congele snapshots e versão das regras no início da luta; alterações posteriores de equipamento não mudam o resultado.

Faixas de busca devem considerar rating e, na Arena Aberta, nível. Amplie a busca gradualmente dentro de limites documentados. Evite usar apenas poder exibido, que pode ser manipulado ao desequipar itens. Bloqueie autoataque, repetição do mesmo resultado e farm combinado. Configure cooldown por par e limite de encontros pontuáveis, com valores ajustáveis. Ação repetida por falha de rede deve devolver a mesma luta, sem novo gasto nem novo rating.

Proponha temporadas de 28 dias, ligas Bronze/Prata/Ouro/Platina/Campeão, dez partidas de colocação e reset parcial documentado. Esses números são parâmetros iniciais para testar. Recompensas sazonais devem priorizar cosméticos, títulos e emblemas. Não venda atributos nem vitórias. Não inclua prêmios monetários.

## 4. Itens que criam builds

Mantenha os oito slots e raridades existentes. Primeiro acrescente variedade funcional: armas, armaduras e conjuntos com vantagens e limitações. Crie um primeiro lote de 24 equipamentos bem distribuídos por arquétipo e progressão, incluindo três conjuntos de quatro peças. Não faça raridade superior dominar automaticamente todo item de raridade inferior na Arena Equalizada.

Exemplos de identidades, a balancear por simulação:
- Gládio do Contrapeso: contra-ataque após bloqueio, com recarga.
- Scutum da Guarda: absorção com limite por turno e perda de velocidade.
- Tridente do Caçador: bônus contra alvo controlado, com menor defesa.
- Rede de Cápua: reduz mobilidade por duração curta, com imunidade temporária após expirar.
- Sica Serrilhada: sangramento limitado em acúmulos, com dano direto menor.
- Amuleto do Médico: reduz duração de sangramento, abrindo mão de bônus ofensivo.

Defina atributos secundários úteis: precisão, crítico, resistência a crítico, bloqueio, penetração e velocidade. Estabeleça limites e retornos decrescentes para impedir 100% de esquiva, bloqueio ou cadeias infinitas. Conjuntos com bônus de 2 e 4 peças devem mudar decisões, não só multiplicar tudo. Mostre origem, nível necessário, chance de obtenção, efeitos, recargas e comparação com o equipado.

Adicione bloqueio de favoritos, filtros, ordenação, venda em lote com confirmação e proteção dos itens equipados/favoritos. Para mochila cheia, use caixa de espólios recuperável ou uma regra de conversão explícita e visível; não destrua itens silenciosamente. Introduza desmontagem e forja determinística com materiais, prévia de custo e resultado. Antes de implementar afixos aleatórios, defina limites e probabilidade publicada. Não crie leilão entre jogadores na primeira etapa: ele exige auditoria e controle de duplicação adicionais.

## 5. Conteúdo e retenção

Melhore as masmorras existentes com chefes de mecânicas distintas, preparação recomendada e materiais ligados a builds. Inclua contratos semanais com alternativas de PvE/PvP e objetivos curtos para sessões de 5–10 minutos. Não force presença contínua para competir.

Depois do PvP 1x1 validado, acrescente chefe cooperativo de guilda com contribuição calculada pelo servidor e recompensa por participação. Guerra de guildas fica para uma etapa posterior, com tamanho de equipe normalizado e limites de participação para evitar que só número de membros determine a vitória. PvP ao vivo 3x3 também fica para depois de validar população, latência e custo.

## 6. Interface e feedback

Preserve o estilo romano e a navegação mobile. Na arena, mostre modalidade, adversário real/NPC, rating, faixa de nível, defesa usada, custo, cooldown e regra de recompensa antes de confirmar. O resultado deve explicar acertos, esquivas, bloqueios, mitigação, dano de efeitos e motivo da derrota. Mostre equipamento novo e diferenças de atributos com clareza.

Use carregamento, botões bloqueados enquanto a operação está pendente, erros com ação de recuperação e indicação de salvamento. Teste em 360px, 390px e desktop, incluindo teclado, foco de modal, contraste e alvos de toque. Não dependa só da cor para raridade ou ganho/perda.

## 7. Servidor, segurança e desempenho

Reaproveite a autoridade de servidor existente e verifique sua persistência real, implantação e comportamento com múltiplas instâncias antes de chamá-la de pronta para produção. Não aceite do cliente ouro, dano final, resultado de combate, rating, tempo decorrido ou inventário como fatos confiáveis. O cliente envia intenção; o servidor valida identidade, estado, custo e resultado.

Use relógio do servidor, RNG com semente gerada no servidor, versionamento das regras, idempotência por operação e transações ou controle de revisão. Salve um registro mínimo auditável por combate. Perfil público deve conter apenas dados necessários ao jogo, sem email ou tokens. Saves locais não podem conceder rating online; preserve sua migração limitada separada da competição verificada.

Audite tokens de teste para garantir que não sejam aceitos em produção. Verifique autorização de cada operação e campos de gravação. Não enfraqueça regras para fazer a interface funcionar. Valide índices e paginação. Evite requisição de sincronização a cada segundo por jogador e requisições concorrentes sobrepostas; atualize animação localmente e sincronize em intervalos controlados e nas ações importantes.

O build atual avisa sobre importação de node:fs/node:path no frontend através do módulo de servidor. Examine as dependências de App.tsx e mova constantes compartilhadas para um módulo seguro para browser, mantendo tipos como imports de tipo. Analise divisão do bundle e compressão das imagens; meça antes/depois. Não trate benchmark em memória/local como prova de capacidade hospedada.

## 8. Ordem de entrega e critérios

Entregue em fases pequenas: (A) bugs reproduzidos e salvamento; (B) motor e builds; (C) PvP assíncrono real e ranking separado; (D) itens e forja; (E) temporadas e conteúdo cooperativo. Em cada fase apresente arquivos alterados, comportamento, testes executados, limitações e próxima etapa. Implemente e teste a fase antes de dizer que está pronta; não troque o jogo por telas estáticas ou dados fictícios.

Critérios mínimos: dois usuários reais conseguem disputar uma luta válida; repetir a requisição não duplica resultado; atualizar a página não perde espólios; duas abas não duplicam compra/resgate; defesa fica congelada por luta; NPC não afeta Elo; Arena Equalizada respeita normalização; derrota/empate seguem regras documentadas; coleção e save antigo migram sem perda; recarregar preserva frações de regeneração; 8h continuam sendo o máximo offline; testes de autorização e concorrência passam.

Rode npm test, checagem de tipos e build (ou equivalentes do gerenciador adotado). Rode testes de integração contra o backend real de teste e regras em emulador quando aplicável. Simule confrontos com sementes variadas e ordem de iniciativa alternada; reporte taxas por matchup e intervalo de incerteza, procurando uma combinação dominante sem forçar todo matchup a 50%. Ajuste parâmetros pelos resultados. Declare separadamente o que foi testado localmente e o que foi confirmado na versão publicada.
