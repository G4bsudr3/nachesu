# vídeos da eletiva ia na prática: auditoria e regra do bônus

## o que eu confirmei no banco

todos os vídeos de terceiro da eletiva vivem em pílulas `pilula_editorial` (bloco "momento 02 · vídeo"), sempre com `required = true`, ou seja, hoje **nenhum vídeo de terceiro é opcional** dentro de uma pílula editorial. o único jeito de algo ficar opcional hoje é ser uma pílula separada do tipo `video_embed` com `required = false` (é assim que os bônus dos módulos 3, 4, 5 e 15 funcionam).

mapa atual dos vídeos obrigatórios:

| mód | pílula | vídeo | encaixe |
| --- | --- | --- | --- |
| 1 | ia tá no seu bolso | glossário básico (investnews) | ok |
| 1 | onde a ia escorrega: viés, erro e alucinação | ia, chatgpt e a economia da intenção (atila) | parcial, o vídeo fala de economia da atenção, não de alucinação |
| 1 | ia ajuda a pensar, não pensa por você | fim dos devs? (investnews) | fora do tema, é carreira em programação |
| 2 | o que é prompt engineering | **como alavancar sua empresa usando ia (pedro burgos)** | fora do tema, é ia pra empresa |
| 2 | a estrutura que muda tudo: corf | chatgpt mais confiável, instruções personalizadas | parcial, é avançado demais pro momento |
| 2 | o mesmo pedido em 3 níveis | qual a melhor ia gratuita | parcial, compara ferramentas, não níveis de prompt |
| 3 | por que ia inventa | nerdologia, por que a ia inventa | ok |
| 3 | checagem em 3 passos | lupa, verificar informação | ok |
| 3 | viés | olhar digital, viés algorítmico | ok |
| 4 | construir sem programar | low-code vs no-code | ok |
| 5 | 3 pílulas | guias de lovable | ok |
| 6 | por que app bonito morre | 5 dicas pra transformar ideia em negócio | parcial |
| 6 | onde os problemas se escondem | sebrae, oportunidades de mercado | ok |
| 8 | jobs to be done | 11:fs explores | ok |
| 9 | mvp / feature creep | dois vídeos de mvp | ok |
| 10 | pitch | dois vídeos de pitch | ok |

## a regra que vou aplicar

vídeo que não ensina exatamente o que a pílula promete não some do curso, mas vira **bônus opcional**: fica fora do tempo dos 50 min, fora do progresso obrigatório e com o selo "bônus opcional, dá pra seguir sem ver".

## o que eu vou fazer

1. **suporte a vídeo opcional dentro da pílula editorial**: o bloco de vídeo passa a aceitar uma marca `optional`. quando marcada, o rótulo do momento muda pra "bônus opcional · fora do tempo", ganha a nota de que dá pra pular, e o tempo dele sai da conta do módulo. nada muda nas pílulas que não têm a marca.

2. **reclassificar os vídeos fora do tema** (só na eletiva ia-na-pratica, via migration de dados):
   - mód 2, pílula de prompt engineering: o vídeo do pedro burgos sobre alavancar empresa vira bônus opcional e o slot de vídeo principal fica **vazio e visível no admin** pra você gravar ou escolher o certo depois. não vou inventar link nenhum.
   - mód 1, pílula "ia ajuda a pensar": "fim dos devs?" vira bônus opcional, slot principal vazio.
   - mód 1 "onde a ia escorrega", mód 2 "corf", mód 2 "3 níveis" e mód 6 "app bonito morre": vídeo continua no lugar, mas marcado como opcional, já que o texto da pílula sustenta o conteúdo sozinho.

3. **recalcular o tempo** das pílulas afetadas, tirando os minutos do vídeo que virou opcional.

4. **nada da eletiva economia circular é tocado**, nenhuma pílula é apagada e nenhum texto é inventado.

## detalhe técnico

- front: `src/components/eletiva/pills/PillEditorial.tsx` (bloco `schema.video`) ganha `video.optional`; `ModuloPillList.tsx` não precisa mudar porque a marca vem do próprio schema.
- dados: migration com `update public.module_pills set interaction_schema = jsonb_set(...)` filtrando por curso `ia-na-pratica` e número do módulo, ajustando `duration_min_low/high`.
- verificação: abrir os módulos 1, 2, 3 e 6 no browser e conferir selo, tempo e que nada quebrou.
