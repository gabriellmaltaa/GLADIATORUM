# Validação para crescimento — 12/11/2026

## Resultado

Base funcional para testes fechados. Ainda não representa liberação de escala, auditoria de segurança completa ou validação de PvP entre pessoas reais.

## Site publicado no Railway

- Sessão XX MALTA autenticada como ONLINE; restaura sessão e progresso após recarregar.
- Equipado elmo: mochila 4→3, armadura 62→80 e agilidade 7→8, com confirmação do servidor.
- Acionado Restart na implantação ativa do Railway. Após retorno, conta mantém 211 ouro, 35 honra, 30 XP, uma vitória e elmo equipado. Não houve deploy de código.
- Expedição contra o lobo concluída; energia 12→11, dano registrado e tutorial avança para resgate.
- Recarregado o jogo antes do resgate: lote pendente sobreviveu; recuperado pela ação Ver Recompensa.
- Resgate creditou 30 ouro, 25 XP, 3 honra e um gládio. Ouro 211→241, honra 35→38 e mochila 3→4. Lote deixou de aparecer.
- Treinamento de força: ouro 241→184 (57 anunciados); força base 8→9. Próximo custo atualizado para 72.
- Diretório online carregou duas guildas com vagas, requisitos e controles de ingresso. Não ingressei nem alterei guildas de terceiros.
- Console do navegador consultado após equipamento: sem erros/avisos capturados naquele momento.
- Estado alterado pelo teste na conta do usuário: elmo equipado, uma expedição e um treino de força. Não consumidos itens raros, não realizada venda nem gasto em guilda.

## Testes locais

27 testes aprovados; TypeScript aprovado; build aprovado (com avisos abaixo). Acrescentados oito testes em src/game/releaseAudit.test.ts:

1. Relógio retrocedendo não concede recursos.
2. 24h offline limitadas a 8h e mesma janela não reprocessada.
3. Combate determinístico com semente e timestamp fixos.
4. Mochila cheia bloqueia compra sem gastar ouro.
5. Item de mercado inexistente não gasta saldo.
6. Medicina com recursos cheios não consome item.
7. Save JSON truncado preserva texto original para recuperação local.
8. Nova instância do motor restaura progresso do disco e não cobra novamente operação já processada.

Os testes anteriores cobrem resgate idempotente, migração limitada, saldo, equipamentos, cargos e transações de guilda, rankings e regressão de regeneração. Não são 27 testes end-to-end do site.

A bateria sintética existente usa 1.000 jogadores no motor local, com estágio de 1.000 operações concorrentes e p95 observado de aproximadamente 120ms. Não é medição HTTP hospedada; não comprova 1.000 usuários simultâneos no Railway. Os contadores globais também incluem rejeições esperadas das verificações de erro.

## Prioridades antes de ampliar divulgação

### Alta: falha de armazenamento silenciosa

src/server/onlineAuthorityEngine.ts: loadFromDisk ignora leitura/JSON inválido e inicia estado limpo; saveToDisk ignora falha de escrita. Um volume conectado não resolve essa condição. Leitura inválida deve interromper inicialização com diagnóstico seguro; escrita deve produzir erro observável, sem anunciar sucesso durável indevidamente. Validar isso em ambiente de teste com falhas induzidas e backup recuperável. Não induzidas falhas no volume real.

### Alta: arquitetura de persistência e escala

Toda base é serializada em arquivo JSON, com gravação síncrona e fila em memória. Manter uma instância enquanto essa arquitetura existir; não aumentar réplicas supondo que compartilham transações. Antes de escalar: banco transacional, migrações, backup automático e teste de restauração, limites de requisição e observabilidade de latência/erros.

### Média: personagens de demonstração parecem jogadores online

O motor chama seedFoundationalOnlineGuilds com perfis iniciais e guildas; o diretório publicado exibe líderes e membros dessas sementes. Revisar os rótulos e participação no ranking para distinguir NPC/demonstração de pessoas reais. Não apaguei registros existentes.

### Média: tutorial não reconhece equipamento antecipado

Elmo equipado antes da primeira expedição; depois do resgate, passo 3 continua instruindo a equipar a Gálea que já está no corpo. Rever avanço por condições já cumpridas, sem exigir desequipar e reequipar.

### Média: interface e atualização online

A arena diz Modo Local apesar de conta ONLINE. Deve dizer arena de NPCs, preservando distinção entre simulação do adversário e modo de salvamento. App.tsx envia sync_idle a cada segundo quando patrulha online está ativa; medir e reduzir frequência com prevenção de sobreposição antes de crescer.

### Desempenho e empacotamento

Build: JS principal ~1,1MB (~320KB gzip), quatro imagens com aproximadamente 0,8–0,9MB cada; avisos de node:fs/node:path alcançados pelo frontend e __dirname no Vite. Separar constantes compartilhadas do módulo de servidor, dividir telas e otimizar imagens. As correções anteriores de regeneração e dependência continuam locais, não foram publicadas nesta sessão.

## Limites da rodada

Não testados: duas contas Google independentes no site; múltiplos dispositivos; concorrência HTTP real e carga hospedada; regras Firebase no emulador; falhas de rede controladas; restauração de backup de produção; sessão nova sem cookies; revisão completa mobile/acessibilidade; PvP real entre usuários; teste de longa duração de regeneração no site. A validação do diretório não valida criação/gestão entre duas contas reais. Segurança não foi certificada.

Próxima sequência recomendada: corrigir persistência silenciosa e publicar regressões locais; separar dados de demonstração; rodar integração de duas contas e testes mobile; preparar banco/backup/monitoramento; então abrir testes para um grupo pequeno e medir antes de aumentar divulgação.
