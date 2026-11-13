# Arte de equipamentos e início público

Usuário solicitou ícones melhores e limpeza do ranking. Após pergunta explícita escolheu: “Apagar todo o progresso e começar todos do zero”. Autorização inclui reiniciar personagens, inventário, moedas, guildas e rankings de jogo; não apagar identidades Google.

- [x] Substituir ícones simplificados por SVGs detalhados em 128px, com materiais, sombras, gemas e silhuetas próprias; ampliar apresentação nos slots.
- [x] Variar iconografia das coleções por família.
- [x] Novo namespace de save local; modo público no servidor sem sementes de jogadores/guildas.
- [x] Migrar dataset antigo para backup no volume antes de iniciar dataset vazio. ID de lançamento persistido impede repetir limpeza em futuros deploys.
- [x] Bloquear importação de saves locais no modo público e iniciar honra/fama online em zero.
- [x] Teste de reset único, backup byte a byte, reinício preservando progresso novo e migração bloqueada. 37 testes aprovados, lint e build aprovados.
- [x] Revisão independente sem achados críticos/importantes.
- [ ] Publicar e conferir backup, personagem inicial e ranking apenas de jogadores reais que entrarem após a limpeza.

Backup fica ao lado do arquivo autoritativo no volume, com sufixo `.prelaunch-TIMESTAMP.json`. Não remover esse arquivo nem retroceder o servidor para uma versão anterior ao marcador de lançamento sem procedimento de restauração: versões antigas não conhecem o marcador.
