# Evolução visual e de conteúdo

Status: proposta para aprovação; nenhuma funcionalidade abaixo implementada.

## Intenção

Transformar a apresentação atual, considerada feia e pouco variada pelo criador, em um RPG romano com personagem marcante, coleção desejável e decisões claras de progressão. Preservar contas, inventário, moedas e identidade Gladiatorum.

## Abordagens

Consideradas: interface clássica com pergaminho e tabelas; arena romana cinematográfica com cartões visuais e personagem central. Recomendação do implementador: segunda opção, por favorecer impacto visual e leitura mobile. Não é uma escolha já aprovada pelo criador.

## Primeira entrega proposta

- Direção de arte: carvão e pedra escura, bronze, vermelho romano, luz quente; reduzir superfícies marrons repetitivas e grandes blocos de texto. Ornamentos com moderação e contraste legível.
- Personagem: retrato maior, equipamento disposto ao redor, atributos agrupados, próximo objetivo e ações úteis em destaque. Desktop com navegação lateral; celular com navegação inferior.
- Inventário e mercado: cartões de item maiores, ícones por família, moldura e nome de raridade, comparação de atributos, filtros por slot/nível/raridade e origem de obtenção visível.
- Manter as oito raridades existentes (Comum a Divino), com identidade visual distinta e aquisição distribuída. Não adicionar novas camadas de raridade sem função.
- Ampliar o catálogo com 48 equipamentos adicionais, distribuídos pelos oito slots e progressão de nível. Seis coleções temáticas com armas, proteções e acessórios; bônus mecânicos de conjunto ficam fora desta primeira entrega até balanceamento específico.
- Tornar os novos itens realmente obtíveis: mercado para básicos, tabelas de loot das expedições/masmorras para raros; validar requisitos e evitar catálogo apenas decorativo.
- Adicionar três regiões de expedição com inimigos, desbloqueios e recompensas próprias, aproveitando o motor existente.
- Adicionar contratos com objetivos de combate, coleta e treinamento, progresso persistido e resgate único validado no servidor. Evitar exigir destruição de item raro para concluir objetivos iniciais.
- Adicionar coleção consultável com itens descobertos e pistas de obtenção, sem conceder poder por compra externa.
- Corrigir o tutorial que pede equipamento já vestido e o rótulo de modo local na arena online como parte dos fluxos alterados.

## Limites e segurança de implementação

Não refazer autenticação ou substituir o backend nesta entrega. Não apresentar NPCs como PvP real. Novas recompensas online devem ser calculadas e creditadas pelo servidor; migração de save com padrões para novos campos, sem reset de conta. Itens e contratos não podem depender apenas de estado local adulterável. Banco transacional, PvP real, leilão, guild war e habilidades de conjunto são etapas separadas.

## Verificação

Testes de catálogo, loot, desbloqueios, progresso e resgate idempotente de contratos; regressão dos saves atuais. Testes existentes, TypeScript e build. Conferência visual em 360px, 390px e desktop; comparação, compra, equipamento, recompensa, navegação e estados vazios. Publicar no Railway somente após validar a versão preparada.

## Critério de resultado

As telas principais deixam de parecer listas repetidas; personagem e itens têm hierarquia clara; jogador consegue identificar raridade, melhoria e origem; existem novos alvos e objetivos com progresso real. Nenhum conteúdo é anunciado como implementado antes de código e testes confirmarem.
