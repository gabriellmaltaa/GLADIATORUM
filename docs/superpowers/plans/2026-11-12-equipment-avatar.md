# Aparência dinâmica do gladiador

Pedido aprovado pelo usuário: a roupa acompanha os itens equipados e o nível aumenta o brilho/aura. Implementar boneco modular em camadas com base sem equipamento, elmo, couraça, manoplas, grevas, arma, escudo, anel e amuleto vindos de state.equipped. Espaços vazios não exibem equipamentos fictícios. Imagem base original e sobreposições SVG seguem a identidade romana. A imagem do cenário anterior não pode continuar mostrando um conjunto fixo por baixo.

Aura puramente visual: nível 1 sem aura; intensidade crescente a cada nível até 50. Patamares de cor: bronze abaixo de 10, azul no 10, violeta no 20, ouro no 35 e solar no 50. Sem bônus em atributos. Respeitar movimento reduzido, contraste e legibilidade.

- [x] Testar mapeamento por slot e ícone, remoção de equipamento, consumíveis e aura progressiva/bordas.
- [x] Criar aparência derivada, avatar modular e integração com equipamento real.
- [x] Criar base sem equipamento, fundo discreto e aura em CSS/SVG.
- [x] Validar testes, TypeScript, build e troca/remoção no navegador local; revisar.
- [ ] Publicar e verificar sem modificar progresso online.

Ruling: executar no checkout existente em nova branch; reaproveitar a identidade aprovada e manter a limpeza de lançamento intacta. A imagem base será decorativa; cada equipamento visível dependerá exclusivamente do slot correspondente.

Verificação: 40/40 testes passaram, TypeScript e build aprovados. Teste local de equipar elmo, remover couraça e restaurar equipamentos iniciais; fixture isolada com oito slots ao nível 50 e sem itens ao nível 1 (0 overlays). Opacidade da aura: 1 no nível 50, 0 no nível 1. Fixture de teste removida após inspeção; não publicar. Nenhuma ação de teste na conta online.
Arte base: imagegen integrado; gladiador romano adulto frontal, corpo inteiro, fundo transparente, sem armadura/elmo/armas/acessórios, apenas túnica simples na cintura; pose neutra preparada para camadas de equipamento. Arquivo src/assets/images/gladiator-base.png.

Revisão independente: sem achados críticos/importantes; verificados filtros por slot, sobreposições, remoção, limites de aura e ausência de mudanças em persistência/autenticação.
