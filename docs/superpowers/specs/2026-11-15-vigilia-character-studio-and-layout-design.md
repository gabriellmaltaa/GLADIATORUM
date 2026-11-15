# Vigília: estúdio de heróis e interface personalizável

## Intenção

Levar o rebrand de Vigília a todas as telas e personagens. Jogadores poderão criar uma identidade visual própria para o herói, ver seu equipamento refletido no corpo e, numa segunda etapa, organizar os painéis da interface. O jogo online continua compatível com as contas e a progressão existentes.

## Abordagens consideradas

1. **Estúdio de aparência** — personalizar o próprio herói, com a aparência visível em perfil, classificação e modos de combate. Resolve a renovação dos personagens e mantém o vínculo com os itens equipados. Escolhida como etapa 1.
2. **Interface rearranjável** — mover/ocultar painéis. Personaliza a tela, mas deixa os personagens antigos. Escolhida como etapa 2.
3. **Arte fixa por arquétipo** — trocar retratos sem opções do jogador. Menor esforço, porém não atende ao pedido de customização e pode divergir do equipamento equipado. Não escolhida.

## Etapa 1 — Estúdio de Herói

- Criar uma tela de personalização com prévia ao vivo, presets de arquétipo, rosto/pele/cabelo, traje-base, cores primária/secundária, máscara e efeito de energia.
- Aparência é cosmética e não altera atributos, raridades, preços, combate ou drops.
- Manter as oito posições de equipamento e renderizar sobre a identidade escolhida os itens realmente equipados; remover equipamento também o remove da prévia.
- Aplicar uma direção de arte original de ficção heroica sci-fi: silhuetas e personagens próprios, navy profundo, ciano, violeta e acentos quentes. Sem personagens, marcas, poses copiadas ou uniformes reconhecíveis de Marvel/DC.
- Atualizar retratos, artes de oponentes e avatares de aliados/NPCs para o mesmo universo, sem confundir NPCs de treino com jogadores reais.
- Persistir a aparência cosmética em saves locais e online; expor somente os campos visuais permitidos nos perfis públicos. Valores devem ser enums/listas controladas pelo servidor. Saves antigos recebem uma aparência-padrão sem perder progresso.
- Testar combinações de traje + equipamentos, atualização/salvamento, retorno ao padrão, perfil público e validação da ação no servidor.

## Etapa 2 — Interface personalizável

- Adicionar um editor de layout com presets (Clássico, Compacto e Imersivo) e controles para reordenar/ocultar cartões informativos do painel inicial.
- Manter as cinco abas principais e as ações essenciais sempre acessíveis; o editor não altera regras, dados ou permissões.
- Salvar preferência por dispositivo/conta sem afetar outros jogadores; providenciar restauração do layout padrão.
- Em telas pequenas, usar organização em coluna e controles de toque; honrar foco de teclado e preferência de movimento reduzido.

## Objetivos e limites

- Aplicar a identidade Vigília de ponta a ponta, inclusive arenas, operações, alianças, inventário, perfis, ranking e telas de conta.
- Preservar contas Firebase, dados de jogo, segurança do servidor, regras atuais e o reset já realizado no lançamento anterior. Esta mudança não deve mudar o `launchId` nem reiniciar progresso novamente.
- Não incluir edição livre de conteúdo, envio de imagem do usuário, monetização cosmética ou mudanças de balanceamento.

## Decisões de implementação deixadas ao executor

- Usar as camadas de avatar existentes quando preservarem alinhamento/encaixe; criar atlas ou retratos originais para a nova direção visual e conferir todas as variantes antes de ligar o conjunto inteiro.
- Persistir layout em preferências do cliente; persistir identidade do herói junto ao estado do jogador e validar campos visuais no servidor.
- Executar lint, build, testes de migração/validação/perfil e revisão visual em desktop e mobile antes de publicar.

## Revisão de construção

- O avatar atual já compõe corpo, armadura, elmo, luvas, botas, arma e escudo a partir de camadas ligadas aos itens equipados; preservar essa relação é requisito de aceite.
- Perfil público hoje entrega apenas equipamento vestido e campos públicos. A nova aparência deve ser explicitamente allowlisted para não expor dados privados.
- A mudança deve permanecer cosmética e não tocar no identificador de lançamento nem causar um novo reset.
