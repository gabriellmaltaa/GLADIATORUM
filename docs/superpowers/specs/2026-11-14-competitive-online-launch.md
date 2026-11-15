# Gladiatorum: lançamento competitivo online

## Objetivo

Preparar o Gladiatorum para crescimento com jogadores reais: competição entre contas autenticadas, mais caminhos de obter equipamentos, progressão reconhecível, atividades de guilda e uma interface de produção sem detalhes operacionais.

## Estado atual

- A Arena oferece uma escada de quatro NPCs; os perfis e rankings online já existem.
- O servidor autoritativo persiste jogadores e guildas em arquivo no volume e serializa mutações.
- Guildas já possuem tesouro, histórico/auditoria e retiradas de itens; ainda não há guerra entre guildas nem retirada de ouro.
- Equipamentos usam atributos e raridades existentes; dano e agilidade já afetam combate. Chance crítica é derivada de habilidade e tem teto atual de 45%.
- A tela de conta ainda mostra Firebase, Firestore, limites de migração, chave local e relatório técnico.

## Experiência proposta

### Linha do tempo de lançamento

1. **Fundação e clareza (agora):** limpar textos e telas internas; definir regras e limites competitivos; atualizar os títulos a cada 10 níveis e o título exclusivo do líder do ranking de Honra.
2. **Arena PvP:** adicionar uma lista paginada de gladiadores reais ativos, desafios validados no servidor, limite diário, proteção contra atacar a si mesmo/alvos repetidos, registro de resultado e recompensa de Honra. A escada NPC permanece como treino separado e claramente rotulado.
3. **Equipamentos especiais:** gerar afixos no servidor em drops existentes e novas recompensas da Arena, expedições e masmorras. Afixos iniciais: Crítico, Cruel (dano) e Veloz (agilidade); nomes, raridade e atributos são persistidos no item, com tetos para PvP.
4. **Guildas em guerra:** desafio e aceite entre líderes, temporada curta com placar, limite de ataques por integrante e prêmio coletivo/individual. Não permitir guerras contra a própria guilda nem múltiplas guerras simultâneas.
5. **Tesouro e operação:** retirada de ouro do tesouro apenas por líder, valor inteiro, saldo validado, limite por operação e auditoria imutável no ledger já existente; confirmação explícita na interface. Executar bateria de testes, build, lint e smoke online antes da publicação.

As etapas são marcos de entrega, não datas fixas; cada fase só avança se as verificações dela passarem.

### Títulos

Um título de nobreza por marco de 10 níveis, do nível 10 ao 150: Cavaleiro, Patrício, Tribuno, Questor, Edil, Pretor, Cônsul, Procônsul, Censor, Senador, Príncipe do Senado, Legado Imperial, César, Imperator e Augusto. O primeiro colocado do ranking de Honra recebe **Augusto Supremo do Coliseu** enquanto mantiver a posição. O servidor calcula títulos ao montar ranking/perfil; nunca salva a posição como título permanente nem concede atributos. Cache de ranking deve ser invalidado ao alterar nível/honra.

### Regras de PvP

- Desafio direto a outro perfil autenticado elegível, usando estado autoritativo mais recente do defensor; batalha calculada no servidor com as regras existentes. Sem oponente inexistente/inativo, ataque próprio, diferença extrema de força ou replays.
- Sem transferir ouro ou equipamento entre contas. Recompensa em Honra limitada por resultado e diferença de poder; sem recompensa em derrota; no máximo 5 desafios PvP/dia UTC e 1 contra cada alvo/dia. A batalha não muda o save do defensor nem conta derrota para ele.
- NPCs continuam em modo treino separado, sem entrar no ranking de jogadores.
- Todos os limites, elegibilidade, cooldown, estado do jogador e recompensa são validados sob a transação autoritativa e protegidos por `opId`.

### Afixos e fontes de itens

- Afixos são sorteados exclusivamente no servidor após recompensa elegível; o cliente nunca envia raridade/atributos escolhidos. Persistir identidade do afixo em `GameItem.affix` e os bônus em `GameItem.stats.critChancePercent`/atributos atuais.
- Cada item recebe no máximo um afixo: Preciso (+1–3 pontos percentuais de crítico), Cruel (+1–3 dano mínimo/máximo) ou Veloz (+1–4 Agilidade). Chance inicial: expedição/masmorra comum 8%, item raro 20%, PvP 12%, guerra 20%; sem garantia.
- Crítico adicional respeita o teto de combate de 45%; dano e agilidade de equipamentos Obsidianos continuam sob o teto PvP já definido.
- Expedições e masmorras mantêm suas tabelas; Arena humana e guerra podem dar uma caixa de espólios limitada, com chances transparentes e iguais por faixa de nível.

### Guerra e tesouro

- Líder de guilda envia o desafio; o líder adversário aceita. Uma guerra por guilda, duração de 24 horas, até 3 ataques por membro, resultado por vitórias e desempate por Honra conquistada. Saves antigos sem guerra recebem defaults; guerras expiradas são fechadas ao consultar/alterar o estado, sob transação serializada.
- Recompensa vai ao saldo da guilda e aos participantes conforme participação; sem perder itens pessoais/equipados.
- Saque do tesouro é permitido apenas ao líder: máximo de 5.000 denários por retirada e 10.000 por guilda a cada 24 horas. Cada operação grava UID autenticado, `opId`, guilda, valor, horário e saldo antes/depois. O histórico atual é limitado a 50 registros; para trilha append-only, manter um ledger persistido separado e usar as últimas 50 entradas somente como projeção da UI. Débito e crédito de carteira ocorrem atomicamente.

### Privacidade e UI online

- Mostrar ao jogador estado da conta, conexão em linguagem simples, login/logout e passos para recuperar erro.
- Remover da interface pública nomes de projeto, identificadores de Firebase/Firestore, chave local, limites internos, nomes de API/servidor e dados brutos de migração. A rota pública de health também não deve expor IDs de projeto/banco, ambiente ou telemetria; manter telemetria em rota restrita. Manter mensagens de integridade e avisos de migração em linguagem comum.
- Nunca mostrar e-mail, inventário não equipado, saldo, UID, telemetria, credenciais ou configuração operacional em ranking/perfil.

## Abordagens consideradas

1. **Somente documento e balanceamento posterior:** risco baixo, mas não entrega as atividades que o pedido explicitamente quer.
2. **Um único lançamento grande com matchmaking em tempo real:** mais complexo, inclui presença e conexão simultânea que o jogo não tem hoje.
3. **Entrega progressiva em desafios assíncronos autoritativos — escolhida:** reutiliza perfis, ranking, combate e transações existentes; produz PvP sem exigir que os dois jogadores estejam conectados ao mesmo tempo, e permite validar as guildas antes de abrir o modo.

## Critérios de aceite

- Nenhum cliente pode fabricar resultado, prêmio, afixo, saque ou título.
- Duplicar a mesma operação não duplica consumo/recompensa/transferência.
- Jogador não pode atacar a si mesmo, atacar a mesma conta repetidamente no período, ou participar de várias guerras simultâneas pela mesma guilda.
- Tesouro nunca fica negativo; ledger append-only explica cada débito/crédito com UID e saldos antes/depois.
- Perfis públicos seguem mínimos dados já publicados e não expõem campos privados.
- UI funciona em desktop e celular sem mostrar detalhes de operação.
- Testes automatizados, typecheck, build e smoke em fixture/servidor efêmero (sem mutar contas reais) de saúde/autenticação/ações/persistência após reinício são concluídos antes de publicar.
- Cada fase só é liberada quando interface e autoridade server-side da mesma atividade estiverem prontas juntas.

## Não objetivo

Combate síncrono em tempo real, comércio entre jogadores, transferência de ouro entre contas, monetização, redefinição de saves e bônus de atributos por títulos.

