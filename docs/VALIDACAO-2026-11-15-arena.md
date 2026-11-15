# Validação — HEROX Arena 2D

## Implementado localmente

- Tela de incursão inspirada no mockup: menu integrado, timer/extração, mochila com seis espaços, habilidades, vida/energia e ação de extração rápida.
- Arena lateral em canvas com cenário urbano em ruínas, plataformas/rampas de madeira, caixas, moedas/estrelas e roedores heróis com contorno cartunesco.
- Callouts flutuantes para ouro, XP, armas, cura, energia e acertos; atalhos 1/Q disparam o poder disponível, enquanto os outros slots ficam desabilitados até existir comportamento autoritativo.
- Matchmaking 1v1 humano por WebSocket, com autenticação Firebase no primeiro pacote, comandos validados, snapshots e desconexão sem vitória falsa.
- Se a fila permanecer sem outro humano por 12 segundos, o servidor inicia uma luta com rival de treino claramente identificado. Ele não é salvo, ranqueado nem recebe recompensa.
- Movimento e dano autoritativos; força, agilidade, vitalidade e intelecto afetam atributos da partida.
- XP/ouro/armas só são persistidos após extração; derrotas não bancam mochila; ID de partida impede duplicar recompensa.

## Verificações executadas

- `npm test`: 106 testes cliente/jogo aprovados e 2 testes server-side aprovados.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- E2E local por WebSocket: perfis humanos de teste autenticaram e foram pareados; token inválido foi rejeitado; spam de controles foi limitado; desconexão não concedeu vitória falsa e o sobrevivente recebeu rival de treino após o tempo de espera configurado, sem criar perfil de bot no ranking.
- Simulação: agilidade aumentou velocidade, força aumentou dano, vitalidade/nível determinaram PV máximo sem curar perfil ferido, salto respeitou limites, cada pickup carregou 15 XP e 5 ouro, arma coletada equipou durante a partida, saque só foi bancado na extração, KO encerrou a partida, e uma recompensa repetida não alterou o perfil.
- Smoke HTTP local: `/api/herox/health` e `/api/herox/v1/catalog` responderam 200; health reportou `arena: websocket` e persistência `railway-volume`.
- PR #29 foi integrada como commit `079d2a58bebea5de3e36ac4d1a1a4f8d5bc7b0b5`; Railway deploy `d3e9085c-f21c-4bcd-9404-0de3254f99a2` concluiu com status `SUCCESS`.

- Verificação de produção: página HEROX carregou; `/api/herox/health` reportou serviço online, WebSocket e persistência em volume; `/api/herox/v1/catalog` respondeu; `/api/herox/v1/me` negou acesso sem token.

## Figma

- Protótipo existente: [HEROX — Arena 2D](https://www.figma.com/design/JwIKf4G7T9bcPTorWCDGmm).
- A edição do frame para refletir a referência atual foi tentada, mas o Figma MCP recusou a chamada por limite do plano Starter. O código local continua como fonte editável da tela; o frame do Figma não foi atualizado nesta rodada.

## Limites e próximos passos

- A sala de partida é mantida em memória: usar uma réplica Railway; escalar exige serviço compartilhado de salas/matchmaking.
- Este ambiente não tem autenticação de duas contas Google reais para validar tráfego de jogadores reais; os testes usaram identidades efêmeras de servidor e tokens inválidos.
- Atualizar o Figma ainda depende do limite de chamadas do plano Starter; não foi contornado.
- Não houve sessão de duas contas Google reais para disputar a partida; o E2E local usa identidades temporárias e o gateway real de WebSocket.
- A inspeção visual desta rodada foi feita na prévia local em 1280×720 e confirmada pela tela inicial publicada.

