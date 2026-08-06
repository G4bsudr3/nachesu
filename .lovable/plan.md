# liberar os 20 módulos da economia circular

## o que está acontecendo hoje

Conferido no banco:

- **IA na prática**: 20 de 20 módulos publicados e liberados. Nada a fazer.
- **Economia circular**: os 20 módulos existem e têm conteúdo montado (5 a 8 pílulas cada), mas só os módulos **1 a 5** estão publicados e liberados. Do 6 ao 20 está `published = false`, então o estudante não vê.

Por isso o painel da coordenação mostra "5 de 5" e vários estudantes aparecem como "concluiu": eles concluíram tudo que estava liberado.

## o que vou fazer

1. Publicar os módulos 6 a 20 da economia circular.
2. Registrar a liberação deles (para o módulo aparecer para o estudante e disparar a notificação de módulo liberado).
3. Conferir depois da mudança que os 20 aparecem liberados e que a contagem do painel passa a ser "de 20".

O desbloqueio sequencial continua valendo: mesmo com tudo publicado, o estudante só abre o módulo seguinte depois de concluir o anterior e enviar a entrega. Ninguém pula etapa.

Na IA na prática não muda nada, já está alinhada com os 20 liberados.

## detalhes técnicos

- Atualização de dados nas tabelas `modules` (`published = true`) e `module_releases` (uma linha por módulo) para os módulos 6 a 20 da trilha da economia circular.
- Os gatilhos de qualidade e escopo que rodam na publicação já foram checados: `module_quality_check_course` para esse curso não retornou nenhum problema, então a publicação não deve ser bloqueada.
- Nenhuma mudança de schema, nenhuma mudança de código de front.
- Efeito colateral esperado: os estudantes matriculados recebem notificação de "módulo liberado" para os novos módulos, conforme o gatilho `notify_module_released` já existente.
