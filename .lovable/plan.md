# vídeos da eletiva ia na prática: mapa completo e correção de posição

## mapa completo (22 vídeos, conferidos no banco)

inclui as 3 fontes possíveis: vídeo dentro de pílula editorial, pílula bônus `video_embed` e a abertura em loom. nenhum vídeo ficou de fora.

| mód | pílula | vídeo | veredito |
| --- | --- | --- | --- |
| 1 | quem tá por trás disso (abertura, loom) | abertura do frattz | ok |
| 1 | ia tá no seu bolso | glossário: ia generativa, llm, prompt | ok |
| 1 | onde a ia escorrega: viés, erro e alucinação | atila, "ia, chatgpt e a economia da intenção" | **fora do lugar**: fala de economia da atenção, não de erro/alucinação |
| 1 | ia ajuda a pensar, não pensa por você | "fim dos devs?" | **fora do tema**: é carreira em programação |
| 2 | o que é prompt engineering | pedro burgos, "como alavancar sua empresa usando ia" | **fora do tema**: ia pra empresa, não prompt |
| 2 | a estrutura que muda tudo: corf | pedro burgos, "como fazer o chatgpt parar de alucinar" | **fora do lugar**: alucinação é o módulo 3 |
| 2 | o mesmo pedido em 3 níveis | "qual a melhor ia gratuita?" | **fora do lugar**: compara ferramentas, não níveis de prompt |
| 3 | por que ia inventa | nerdologia, por que a ia inventa coisas | ok |
| 3 | checagem em 3 passos | lupa, verificar informação | ok |
| 3 | viés | olhar digital, viés algorítmico | ok |
| 3 | bônus (opcional) | como não deixar teu texto com cara de ia | ok, já opcional |
| 4 | construir sem programar | low-code vs no-code | ok |
| 4 | bônus (opcional) | ia agendando tarefas | ok, já opcional |
| 5 | o que é o lovable | guia definitivo lovable | ok |
| 5 | o ciclo prompt/preview/teste | criando um app do começo ao fim | ok |
| 5 | os superpoderes | curso gratuito lovable | ok |
| 5 | bônus (opcional) | pra onde a ia tá indo (agentes) | ok, já opcional |
| 6 | por que app bonito morre | 5 dicas pra transformar ideia em negócio | parcial |
| 6 | onde os problemas se escondem | sebrae, oportunidades de mercado | ok |
| 8 | jobs to be done | 11:fs explores | ok |
| 9 | mvp: o mínimo que já resolve | o que é mvp, exemplos | ok |
| 9 | feature creep | "o que é mvp? mínimo produto viável" | **repetido**: é outro vídeo de mvp, não fala de feature creep |
| 10 | a estrutura dos 60 segundos | pitch de 1 minuto (uber) | ok |
| 10 | história vence lista | elevator pitch em 30 segundos | ok |
| 15 | bônus (opcional) | chega de slides feitos na mão | ok, já opcional |

módulos 7, 11 a 14 e 16 a 20 não têm nenhum vídeo de terceiro. as pílulas de abertura dos módulos 2 a 20 existem, mas estão despublicadas e sem vídeo (esperando sua gravação).

## a regra

vídeo que não ensina exatamente o que a pílula promete não some, mas vira **bônus opcional**: fora do tempo dos 50 min, fora do progresso obrigatório, com o selo "bônus opcional, dá pra pular".

## o que vou fazer

1. **suporte a vídeo opcional dentro da pílula editorial**: o bloco de vídeo aceita a marca `optional`. o rótulo vira "bônus opcional · fora do tempo", ganha a nota de que dá pra pular e o tempo sai da conta do módulo. pílula sem a marca não muda nada.

2. **mover o vídeo de alucinação pro módulo certo**: o "chatgpt parar de alucinar" (pedro burgos) sai do módulo 2 e entra no **módulo 3** como bônus opcional, ao lado do nerdologia. no módulo 2, o slot da pílula corf fica **vazio e visível no admin** pra você escolher ou gravar o vídeo certo.

3. **marcar como bônus opcional, sem tirar do lugar**: módulo 1 (atila, "fim dos devs"), módulo 2 ("qual a melhor ia gratuita"), módulo 6 (5 dicas) e módulo 9 (segundo vídeo de mvp). o texto de cada pílula sustenta o conteúdo sozinho.

4. **módulo 2 fica sem vídeo obrigatório**, com os dois slots vazios sinalizados no admin. não vou inventar link nenhum pra tapar buraco.

5. **recalcular o tempo** das pílulas afetadas, tirando os minutos do vídeo que virou opcional.

6. nada da eletiva economia circular é tocado, nenhuma pílula é apagada, nenhum texto é inventado.

## detalhe técnico

- front: `src/components/eletiva/pills/PillEditorial.tsx` (bloco `schema.video`) passa a ler `video.optional`; `ModuloPillList.tsx` não muda, a marca vem do schema.
- dados: operação de update em `public.module_pills` filtrando por curso `ia-na-pratica` e número do módulo, ajustando `interaction_schema` e `duration_min_low/high`; criação de uma pílula `video_embed` opcional no módulo 3 com o vídeo movido.
- admin: os slots vazios aparecem na tela de detalhe do módulo como "sem vídeo definido".
- verificação: abrir módulos 1, 2, 3, 6 e 9 no browser e conferir selo, tempo e que nada quebrou.
