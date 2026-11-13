# Auditoria e entrega — 07/11/2026

## Escopo e status

- Site inspecionado: https://gladiatorum.ai.studio/ no modo visitante. Navegação por personagem, arena, inventário, mercado, treinamento, guildas e expedições. Um combate contra Titus Flamma, resgate e consulta posterior ao relatório funcionaram; não reapareceu botão de resgate após coletar.
- Repositório: https://github.com/gabriellmaltaa/GLADIATORUM, branch main, copiado para C:/EASTON POINT/GLADIATORUM. A versão pública mostrou números e inventário inicial diferentes do código atual: não foi estabelecida equivalência de revisão.
- Correções feitas somente na cópia local. Nenhum push, merge, deploy ou alteração de conta real foi realizado.
- Propostas de game design: em PROMPT-GOOGLE-AI-STUDIO.md. Não foram implementadas nesta entrega.
- A nota de governança CORRE indicada no AGENTS.md não existe neste workspace (a pasta EASTON POINT contém apenas .obsidian). Nenhum conteúdo CORRE foi alterado.

## Correções confirmadas

### Regeneração perdida entre atualizações

App.tsx chama calculateElapsedIdleProgress a cada segundo. A função arredondava energia e cura para baixo e avançava o timestamp de referência, perdendo as frações em cada tick. Reproduzido em testes: após 180 atualizações, energia continuava em zero.

Correção: acumular milissegundos de energia e unidades fracionárias de cura em regenerationRemainder, persistido no estado; contabilizar também intervalos inferiores a um segundo. Limpar sobra ao atingir o limite de recurso. Saves antigos aceitam ausência do novo campo. O teto de tempo offline permanece.

Dois testes novos falharam antes da correção e passaram depois: regeneração com ticks de 1s, incluindo salvar/carregar no meio; ticks de 100ms, com energia apenas ao completar 180s. Resultado esperado: 1 energia e 36 PV recuperados em 3 minutos na configuração base.

### Instalação com npm bloqueada

npm install falhou com ERESOLVE: esbuild ^0.25 do projeto era incompatível com o peer aceito por Vite 8.3.6 (^0.27 ou ^0.28). Atualizado para ^0.28 e criado package-lock.json. Adicionado npm test com bundling dos testes por esbuild e execução no test runner nativo do Node. A pasta gerada .test-build fica ignorada.

O repositório também contém bun.lock original; não foi regenerado porque a validação desta entrega usa npm. Para Bun, regenerar e verificar seu lock antes de adotá-lo.

## Verificação executada

- npm install --ignore-scripts --no-audit --no-fund: passou após ajustar dependência.
- npm test: 19 testes, 19 aprovados, zero falhas.
- npm run lint: checagem TypeScript passou.
- npm run build: passou.
- Revisão independente do diff: sem achados acionáveis.

O teste existente de 1.000 jogadores usa o motor local; não comprova capacidade do site hospedado. O teste de regras existente contém verificações de texto e não substitui execução em emulador Firebase.

## Pendências identificadas, sem alegar correção

- Build ainda avisa sobre node:fs/node:path referenciados pelo módulo de servidor alcançado pelo frontend; separar constantes compartilhadas do módulo servidor.
- Build avisa sobre bundle acima de 500kB e futura incompatibilidade de __dirname no carregador nativo do Vite. Tratar em uma etapa de manutenção medida.
- Diferença entre recompensa base e final observada no site é compatível com foco e inteligência. Mostrar modificadores na arena melhora clareza; não foi comprovado erro de cálculo.
- Login, persistência entre dispositivos, regras em emulador, duas contas reais e multiplayer hospedado não foram exercitados.
- Não foi confirmada implementação de PvP entre usuários reais. A arena visitante é explicitamente simulada; ranking e guildas locais também.
- O fluxo de idle ainda usa estimativa/amostragem de combates já existente. Auditar equivalência com a descrição de vida/loot antes de usar seus resultados em competição ranqueada.
