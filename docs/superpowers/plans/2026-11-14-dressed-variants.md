# Personagens vestidos — implementação

**Objetivo:** corrigir a montagem de equipamentos usando versões do mesmo personagem já vestindo e segurando cada item, conforme solicitação do usuário.

**Diagnóstico:** os atlas anteriores continham objetos isolados, sem mãos, distorcidos por escalas diferentes. Reposicionamentos não corrigem a perspectiva nem a empunhadura.

**Design:** personagem ilustrado de RPG romano, proporções fortes, pose frontal fixa. Gerar corpos com e sem couraças; variantes vestidas de cabeça, braços/armas, escudos e pernas. Recortar regiões anatômicas dessas versões em um espaço de coordenadas comum. A arma inclui sua própria mão fechada. Sem equipamento, usar região do corpo neutro. Não modificar dados de jogadores, combate ou inventário. Auras permanecem cosméticas.

**Execução:** implementação na branch atual, preservando arquivos anteriores; revisão independente ao final.

- [ ] Gerar e inspecionar variantes vestidas com transparência usando imagegen integrado; registrar prompts e caminhos.
- [ ] Substituir montagem em GladiatorAvatar.tsx; mapear cada iconId conhecido e preservar remoção e combinações parciais.
- [ ] Validar cobertura dos itens e ausência de mutação; testes, TypeScript e build.
- [ ] Conferir visualmente corpo vazio, itens individuais e conjuntos mistos no navegador, incluindo arma e manoplas juntas.
- [ ] Revisar e publicar; confirmar versão online.

**Riscos a revisar:** junção de ombro e punho, elmo com rosto duplicado, pernas recortadas, arma sem empunhadura, peças fantasmas em slots vazios.

## Evidências e prompts

Ferramenta: imagegen integrado, transparência real, preservando os PNGs originais. Estilo: personagem romano ilustrado de RPG, pose frontal fixa, mãos fechadas e peças desenhadas no corpo.

- `src/assets/images/dressed-bodies.png`: quatro cópias do mesmo personagem, sem couraça, couro, placas e malha; sem outros equipamentos.
- `src/assets/images/dressed-weapons.png`: cinco versões completas empunhando gládio de ferro, gládio de bronze, spatha, pugio e tridente, com dedos envolvendo os cabos; demais slots vazios.
- `src/assets/images/dressed-wear.png`: versões completas com elmos, manoplas e calçados de couro/bronze/aço, e referência de joias; mesma identidade e pose. Joias pequenas continuam desenhadas diretamente no componente para não trazer pele sobre a couraça.
- `src/assets/images/dressed-shields.png`: quatro versões completas portando escudos de madeira, legião, parma e pretoriano no braço esquerdo.

Os prompts exigiram fundo transparente, nenhuma legenda, nenhum cenário, corpo completo e invariantes de anatomia/identidade. Regiões de personagens vestidos são recortadas no SVG, sem girar ou esticar objetos isolados. Empunhaduras incluem a mão pintada. Contornos impedem personagens vizinhos de vazarem do atlas.

Verificado: 44 testes passaram; TypeScript e build passaram. Conferência no navegador: quatro conjuntos, corpo vazio, gládio de ferro + manoplas sem couraça, gládio de bronze sozinho, adaga + escudo pretoriano + grevas + joias, remoção de todos os slots. Captura: `docs/previews/dressed-combinations.jpg`. Progresso online não foi editado.

Revisão independente: encontrou emenda nos joelhos quando se equipavam grevas sem couraça. Reproduzido visualmente e corrigido usando toda a região inferior a partir do tecido da cintura, com registro uniforme do personagem vestido e couraça sobreposta. Captura final atualizada. Nenhum outro bloqueador encontrado.
