# Validação — HEROX Arena 2D

## Implementado localmente

- Tela de incursão com menu integrado, status do herói, mochila de saque, poderes, vida/energia, timer e extração.
- Arena lateral canvas com plataformas, caixas, pickups e personagens de roedores heróis originais.
- Matchmaking 1v1 humano por WebSocket, com autenticação Firebase no primeiro pacote, comandos validados, snapshots e desconexão sem vitória falsa.
- Movimento e dano autoritativos; força, agilidade, vitalidade e intelecto afetam atributos da partida.
- XP/ouro/armas só são persistidos após extração; derrotas não bancam mochila; ID de partida impede duplicar recompensa.

## Verificações executadas

- `npm test`: 102 testes cliente/jogo aprovados e 2 testes server-side aprovados.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- E2E local por WebSocket: dois perfis humanos de teste autenticaram, entraram na fila, receberam a mesma partida e snapshots; token inválido foi rejeitado; spam de controles foi limitado; desconexão cancelou sem prêmio e permitiu que o jogador restante voltasse à fila.
- Simulação: agilidade aumentou velocidade, força aumentou dano, vitalidade/nível determinaram PV máximo sem curar perfil ferido, salto respeitou limites, cada pickup carregou 15 XP e 5 ouro, arma coletada equipou durante a partida, saque só foi bancado na extração, KO encerrou a partida, e uma recompensa repetida não alterou o perfil.
- Smoke HTTP local: `/api/herox/health` e `/api/herox/v1/catalog` responderam 200; health reportou `arena: websocket` e persistência `railway-volume`.

## Figma

- Protótipo criado: [HEROX — Arena 2D](https://www.figma.com/design/JwIKf4G7T9bcPTorWCDGmm).
- O frame `HEROX · Incursão 2D · Menu e extração` contém a base editável 1920×1080, menu, barras, plataformas, loot HUD e extração. O limite de chamadas MCP do plano Starter bloqueou a adição dos personagens vetoriais finais ao frame; os heróis originais já estão renderizados no cliente canvas.

## Limites antes de publicação

- A sala de partida é mantida em memória: publicar com uma réplica Railway; escalar exige serviço compartilhado de salas/matchmaking.
- Este ambiente não tem autenticação de duas contas Google reais para validar tráfego de jogadores reais; os testes usaram identidades efêmeras de servidor e tokens inválidos.
- O Figma está incompleto quanto às ilustrações vetoriais finais por limite do plano.
- A visualização final da partida com dois jogadores reais e duas contas Firebase não foi possível nesta sessão; o E2E local usa identidades temporárias e o gateway real de WebSocket.
- A publicação em Railway ainda depende da criação do commit/PR e validação do deploy depois do merge.

