# Personagem pintado a partir da referência do usuário

Objetivo: substituir roupa vetorial por materiais pintados realistas seguindo a imagem Gemini enviada em 12/11/2026.

Implementação: atlas de corpo neutro e três couraças alinhadas; atlas de elmos/armas/escudos; atlas de manoplas/grevas. Renderização SVG usa recortes dos atlas em camadas, condicionados aos oito slots reais. Auras por nível e raridade continuam independentes. Nenhuma alteração em progressão, atributos ou persistência.

- [x] Gerar e inspecionar artes com imagegen integrado a partir da referência.
- [x] Ajustar coordenadas e oclusão de mãos, rosto e roupa.
- [x] Conferir corpo vazio, couro, placas, malha e combinações mistas.
- [x] Rodar testes, TypeScript e build; revisão independente; publicar e verificar.

Prompts: quatro versões idênticas do mesmo homem em pose frontal (neutro/couro/placas/malha), sem equipamentos de outros slots; nove peças de elmos/armas/escudos em grade3x3; seis peças de braços/pernas em grade3x2. Fundo transparente, sem texto, materiais realistas da referência.

Validação:42 testes, TypeScript e build passaram. Revisão independente sem bloqueios. Conferidos conjuntos neutro/couro/placas/malha e combinação de elmo/manoplas/adaga sem couraça. Atlases somam5,44MB. Gerados pela ferramenta imagegen integrada e salvos em src/assets/images/character-{bodies,arms-helmets,limbs}.png. Publicação em andamento.

