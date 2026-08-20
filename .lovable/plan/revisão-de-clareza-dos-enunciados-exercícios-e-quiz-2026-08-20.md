# revisão de clareza dos enunciados (exercícios e quiz)

objetivo: nenhum estudante deve travar por não entender o que a tela pede. a revisão é de enunciado, não de conteúdo pedagógico: nada de mudar tema, resposta correta ou ordem dos módulos.

## o que a auditoria encontrou

varri as 108 perguntas de quiz e conteúdo curado e os 84 campos de exercício das duas eletivas:

- 12 perguntas de múltipla escolha (marcar várias) não avisam que dá pra marcar mais de uma opção
- 18 perguntas de escolha não têm feedback de erro, então errar não ensina nada
- 33 perguntas de texto aberto não têm exemplo de resposta no campo
- 7 campos de exercício também estão sem exemplo
- 3 enunciados passam de 110 caracteres numa linha só, difícil de ler no celular
- 9 links de conteúdo curado apontam pra uma busca no YouTube em vez de um vídeo específico
- 1 enunciado cita "Rodada 1" sem dizer onde essa rodada aparece

## o que vou corrigir

1. toda pergunta de marcar várias passa a dizer, no próprio enunciado, quantas opções marcar (ex: "marque todas que se aplicam, são 3").
2. toda pergunta de escolha ganha feedback de erro que reencaminha o raciocínio, no tom já usado nas outras ("repensa: ..."). errar continua sendo seguro.
3. todo campo aberto ganha um exemplo curto e concreto como placeholder, no formato já usado ("ex: ...", "antes eu achava... agora...").
4. enunciados longos viram frase curta + linha de apoio, em vez de um bloco só.
5. referências soltas ganham contexto ("na rodada 1 do exercício desta pílula").
6. os 9 links de busca: troco por link direto quando existir equivalente confiável em português. onde não existir, o card passa a dizer com todas as letras que é uma busca e o que procurar, em vez de fingir que é um vídeo específico.

## o que não muda

- respostas corretas, notas, progresso e desbloqueio de módulo
- estrutura das pílulas, ordem dos módulos, componentes de UI
- vocabulário e tom já aprovados: lowercase, "você", "estudante", sem travessão, sem emoji

## técnico

- tudo em `interaction_schema` das linhas de `module_pills`, aplicado por migração idempotente, um bloco por eletiva e por tipo de correção
- sem alteração de schema, sem coluna nova, sem componente novo
- revisão manual pílula a pílula (não regex cego) pra não quebrar `correct`, `id` das opções nem markdown
- checagem final: rodar de novo as mesmas consultas de auditoria e confirmar zero ocorrência em cada categoria, mais uma passada no navegador em um quiz, um pbl e um conteúdo curado de cada eletiva no mobile

## entrega

relatório final com a lista das pílulas tocadas, por eletiva e módulo, e o antes/depois de cada enunciado alterado.
