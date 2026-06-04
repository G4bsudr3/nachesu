## o que muda

hoje o `PillClassificador3x3` mostra só um banner genérico ("precisa de pelo menos 3 itens no seu radar") quando `radarItems.length < 3`. o aluno não sabe quais slots faltam nem o que já preencheu. vou trocar isso por uma validação visual com slots numerados.

## comportamento novo

no `PillClassificador3x3.tsx`, quando `!hasEnoughRadar` (e o loading já terminou):

1. mantenho o banner vermelho de bloqueio no topo, mas com texto mais específico: "faltam X itens no seu radar da missão 1 pra liberar essa missão" (X = `3 - radarItems.length`).

2. logo abaixo do banner, renderizo um mini-painel "seu radar até agora" com 3 slots numerados (01, 02, 03):
   - slots preenchidos: card com check verde sálvia (`#75BF9C`), número, e o `text` do item do radar.
   - slots vazios: card pontilhado, número apagado, label "faltando — volta na missão 1 e adiciona um item aqui".
   - tipografia League Gothic no número, Urbanist no label, paleta bege NachesU.

3. mantenho o link "voltar pra missão 1" abaixo dos slots (não dentro do banner).

4. a seção de itens (os 10 fixos) continua renderizando, mas com `aria-disabled` e opacity reduzida (já que `ready` continua false e o CTA já está bloqueado). assim o aluno vê a missão completa pra entender, sem conseguir classificar.

quando `hasEnoughRadar` for true, esse bloco some completamente — comportamento atual preservado.

## detalhe técnico

- só edita `src/components/eletiva/pills/PillClassificador3x3.tsx`. nada de schema, hook ou dispatcher.
- o helper `useAula1RadarItems` já retorna até 3 itens; pra mostrar os slots vazios, gero array de 3 posições e mapeio `radarItems[i]` (undefined = vazio).
- enquanto `radarQuery.isLoading`, renderizo skeleton dos 3 slots em vez do estado vazio (evita flash).
- bloqueio dos cards de classificação via wrapper com `pointer-events-none opacity-60` quando `!hasEnoughRadar`.
- copy lowercase + "você", zero em-dash, padrão NachesU.

## fora de escopo

- mudar o que conta como "radar" (continua `content.items[0..2]` da aula 1).
- editar o componente da aula 1 pra empurrar pro radar.
- mensagem do dispatcher / bloqueio sequencial entre pílulas.
