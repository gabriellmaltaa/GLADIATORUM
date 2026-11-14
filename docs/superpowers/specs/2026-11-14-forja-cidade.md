# Forja da Cidade — Especificação aprovada

## Objetivo

Adicionar uma Forja à Cidade de Cápua para o jogador investir denários em melhorias permanentes de equipamentos, complementando o treinamento de atributos do gladiador.

## Experiência

- Uma nova localização e aba **Forja** na Cidade.
- A lista inclui itens equipados e equipamentos da mochila; consumíveis não podem ser forjados.
- O jogador seleciona um item e escolhe um bônus já existente naquele item. Dano é uma opção combinada para itens com dano; atributos usam os campos de bônus já suportados pelo jogo.
- A tela mostra estatísticas atuais, melhoria seguinte, nível de forja, limite e custo antes de confirmar.
- A melhoria é garantida, custa ouro, não remove nem destrói o item e atualiza seus atributos imediatamente.

## Regras

- Cada item pode receber até 10 melhorias.
- Custo no nível atual `n`: `ceil(100 × 1.5^n)` denários, começando em 100.
- Uma melhoria de dano aumenta dano mínimo e máximo em 1; atributo primário aumenta em 1; armadura aumenta em 5; vida bônus aumenta em 10.
- Somente itens pertencentes ao jogador e bônus compatíveis com os campos do item podem ser usados.
- A lógica local e a autoridade online compartilham a mesma regra; no online, o servidor valida item, bônus, limite e saldo antes de aplicar o custo e a melhoria.

## Fora de escopo

- Falha aleatória, destruição do item, materiais, moeda paga, bônus novos para itens e mudanças de balanceamento fora da Forja.
