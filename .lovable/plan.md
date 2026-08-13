# painel de acompanhamento: ordenação padrão por atividade e filtros mais úteis

## o que muda

1. **ordem padrão vira "atividade"**: no topo aparece quem mais concluiu módulos; empate desempata por acesso mais recente; depois nome. hoje o padrão é nome (com status crítico primeiro), o que joga quem nunca entrou pro topo.
2. **novo controle de ordenação** com quatro opções visíveis: atividade (padrão), progresso, último acesso, nome. clicar de novo inverte a direção, como já funciona hoje.
3. **filtros funcionando de forma clara**:
   - busca passa a considerar nome e turma (hoje só nome), sem acento e sem diferenciar maiúscula.
   - select de turma e select de status continuam, mas ganham indicação do número de resultados e o botão "limpar filtros" fica sempre visível quando há filtro ativo.
   - chips de turma e cards de status continuam funcionando como atalho de filtro e ficam sincronizados com os selects.
4. **contagem honesta**: "mostrando X de Y estudantes" reflete o filtro aplicado, e quando o filtro zera resultados o estado vazio sugere a ação de limpar.

## detalhe técnico

Arquivo único: `src/pages/Acompanhamento.tsx` (componente `EletivaBloco`).

- adicionar `"atividade"` ao tipo `Ordem` e usar como estado inicial (`asc = false`).
- comparador de atividade: `modulos_concluidos` desc → `ultimo_acesso` desc (null por último) → `nome` asc.
- normalizar texto da busca com `normalize("NFD").replace(/\p{Diacritic}/gu, "")` e aplicar sobre `nome` e `turma`.
- nenhuma mudança na edge function `painel-escola` nem no banco; é tudo ordenação e filtro no cliente sobre os dados já retornados.
