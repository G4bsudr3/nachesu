Reordenar eletivas na tela de acompanhamento

O usuário quer que, na página `/acompanhamento`, a eletiva **Economia Circular & Negócios Regenerativos** apareça primeiro, e a **IA na Prática** apareça em segundo.

## O que está acontecendo

A função edge `supabase/functions/painel-escola/index.ts` devolve o array `eletivas` com a ordem hardcoded:

1. IA na Prática
2. Economia Circular

A página `src/pages/Acompanhamento.tsx` usa esse array para renderizar as abas e os blocos de cada eletiva. Então a ordem vem 100% do backend.

## O que vou fazer

- Inverter a ordem do array `COURSES` na edge function `painel-escola`, colocando Economia Circular antes de IA na Prática.
- Garantir que `src/pages/Acompanhamento.tsx` use o primeiro item do array como aba ativa padrão (já faz isso, mas confirmar se não há fallback hardcoded para "ia-na-pratica").
- Redeployar a edge function `painel-escola`.
- Validar no browser que a aba selecionada por padrão agora é Economia Circular e que o primeiro bloco renderizado é ela.

## Escopo

- Apenas a tela `/acompanhamento`.
- Não alterar a ordem em outras páginas (dashboard, landing page, etc.) nesse plano, a menos que seja necessário para manter consistência dentro do acompanhamento.
