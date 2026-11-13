# Equipamentos ilustrados e auras por raridade

Objetivo: substituir miniaturas vetoriais de equipamentos por 25 ilustrações romanas detalhadas e aplicar efeitos cosméticos pela raridade verdadeira. Preservar consumíveis, slots, atributos, contas e aura de nível.

- [ ] Criar atlas original 5x5 e mapear os 25 iconIds de equipamentos na ordem documentada.
- [ ] Centralizar intensidades das oito raridades, testando progressão e ausência de aura em comuns/incomuns.
- [ ] Propagar raridade a inventário, lojas, coleção e equipamentos; efeitos locais também no personagem.
- [ ] Respeitar redução de movimento, evitar flashes e manter legibilidade.
- [ ] Verificar testes, TypeScript, build, revisão independente e navegador; publicar.

Verificação: 41 testes passaram; TypeScript e build passaram. Revisão independente corrigiu seletor da coleção que atingia a nova miniatura. Atlas original gerado com ferramenta integrada imagegen em src/assets/images/equipment-atlas.png, 25 ilustrações; nenhum dado de jogador alterado. Brilho dos oito slots inspecionado em fixture isolada. Prompt: atlas 5x5 de equipamentos romanos realistas, fundo carvão, sem texto, metais gravados e couro; ordem canônica em ItemArtwork.tsx. Amostragem recua 4% das bordas para impedir vazamento de células vizinhas.
