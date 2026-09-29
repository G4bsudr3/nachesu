# Módulo 8 de Economia Circular: mostrar o que falta pra entregar

## O que está travando a Natália

Não é erro da plataforma. O botão "definir minhas regras" fica apagado porque um campo está abaixo do mínimo:

- **princípio 2, campo "por que esse":** tem 56 caracteres, o mínimo é 100.
  Texto atual: "A economia e o uso consciente da água ajudam a preservar" (parece cortado no meio).
- Todo o resto já passa: princípios diferentes, exemplos (59 e 139 de 40), R's (recusar + reparar) e "como esses R's ajudam" (132 de 80).

Por isso "fechando o módulo 8" e o bônus aparecem com cadeado: eles só abrem depois desse exercício.

**Orientação imediata pra Júlia:** pedir pra Natália subir até o card "princípio prioritário 2" e completar a frase do "por que esse" até passar de 100 caracteres. O botão acende na hora.

## Por que ela não percebeu

O contador "(56/100)" fica lá em cima, longe do botão. No celular ela só vê o fim da tela, com o botão apagado e sem nenhuma explicação.

## O que ajustar

1. **Aviso logo acima do botão** quando ele estiver apagado, dizendo exatamente o que falta, em linguagem simples. Exemplos:
   - "falta escrever mais 44 letras no 'por que esse' do princípio 2"
   - "escolha 2 princípios diferentes"
   - "escolha 1 ou 2 R's"
2. **Tocar no aviso leva direto ao campo** que falta, já com o cursor nele.
3. **Campo incompleto destacado** com borda de atenção (sem vermelho, falhar precisa parecer seguro).
4. Mesmo padrão aplicado ao módulo 7 (caso da Manuela, "tipos diferentes 2/3"), que tem o mesmo problema de aviso discreto.

## Detalhes técnicos

- `PillRegrasJogo.tsx`: derivar uma lista `missing[]` a partir das mesmas condições de `ready` (p1, p2, sameError, j1/j2 vs `minJust`, e1/e2 vs `minEx`, rs, `como` vs `minComo`), cada item com texto e ref do campo. Renderizar o primeiro item (ou até 2) acima do botão com `aria-live="polite"`; clique faz `scrollIntoView` + `focus`. `PrincipioCard` recebe prop pra borda de atenção quando incompleto e já tocado.
- `PillMatrizValor.tsx`: mesmo bloco "o que falta" perto do botão de entregar.
- Sem mudanças no banco nem nas regras mínimas.
- Verificação: Playwright numa conta de teste no módulo 8, com um campo curto, confirmando o aviso e o foco.
