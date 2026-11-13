# Identidade romana ilustrada

Referência escolhida pelo usuário: Gemini_Generated_Image_fz1fd8fz1fd8fz1f.jfif. Pedido: aplicar a identidade às abas do jogo existente.

Direção: arte romana pintada, metal envelhecido, ouro, madeira escura e pergaminho. Abas inferiores ilustradas; cabeçalho com medalhão de personagem, recursos e guia em pergaminho. Personagem em arsenal com equipamento interativo; mapa de expedições com seleção real de regiões; arena ilustrada; inventário com molduras de couro e ficha de pergaminho; cidade panorâmica com acessos reais aos serviços existentes.

Abordagem escolhida na implementação: cenários raster sem textos + componentes HTML/SVG acessíveis. Usar a imagem inteira como interface impediria adaptação e dados dinâmicos. Redesenhar apenas as cores não reproduziria o pedido. Cenários ilustrados combinados com interface real permitem manter legibilidade e responsividade.

Escopo: apresentação e navegação para ações existentes. Preservar login, servidor, progresso e marcador de lançamento. Não criar serviços inexistentes como leilões só por constarem da referência. Todas as ações usam os handlers existentes. Sem novo reset.

Validação: TypeScript, build, testes de regressão; inspeção visual das cinco abas em desktop e celular sem executar ações que alterem o progresso online.
