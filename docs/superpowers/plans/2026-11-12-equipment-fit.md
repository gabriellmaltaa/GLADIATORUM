# Correção do encaixe de equipamentos

Causa: elmo/escudo reutilizavam miniaturas com enquadramento de inventário; arma cobria a mão e apontava contra o braço; couraça e grevas tinham contornos genéricos.

Correção: geometrias no mesmo sistema 300x500 do corpo, elmo aberto preservando rosto, escudo preso ao antebraço, lâmina voltada para fora com dedos à frente, couraça acompanhando ombros/cintura e grevas seguindo canelas. Efeitos de raridade e nível preservados.

Validar visualmente corpo vazio, conjunto inicial e conjunto completo em fixture isolada, mais testes/TypeScript/build e revisão independente antes de publicar.
