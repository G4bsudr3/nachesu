# fluxo do usuário no admin

novo item no menu admin que abre um mapa visual de todo o percurso do usuário na plataforma: páginas públicas, autenticação, área do estudante e área admin. serve pra enxergar o projeto inteiro de uma vez e achar gargalo.

## o que entra

**menu**
- novo item "fluxo do usuário" na seção "visão geral" da sidebar admin, logo depois de "início".
- rota `/admin/fluxo`.

**o mapa**
quatro faixas (colunas no desktop, empilhadas no mobile), cada uma com seus nós ligados por setas:

```text
público            entrada             estudante              admin
/                  /auth               /app                   /admin
/eletivas          /comecar            /app/eletivas          entregas
/acompanhamento    /reset-password     /app/eletiva/:slug     turma / aluno
                   /app/pending        /app/eletiva/modulo    módulos
                                       marco / certificado    publicação
                                       tutor, glossário       risco / pulso
                                       notificações, conta    convites
```

cada nó mostra: nome da tela, rota, quem acessa (público, logado, admin) e uma nota curta do papel dela no fluxo. clicar num nó abre um painel lateral com detalhes: de onde se chega, pra onde leva, e o risco conhecido daquela etapa (ex.: e-mail não liberado trava no /auth, perfil pendente para em /app/pending).

**camada de gargalo (números reais)**
sobre os nós principais do funil o mapa mostra contagem vinda do banco, pra o gargalo aparecer sozinho em vez de ser opinião:
- perfis pendentes vs ativos (trava em `/app/pending`)
- matrículas por eletiva
- estudantes que nunca abriram um módulo
- estudantes parados há 7+ dias
- entregas aguardando correção

nó com número em zona de risco ganha destaque em vermelho/laranja, com legenda explicando o critério.

**exportar**
botão pra copiar o mapa como texto (markdown) pra colar em documento ou apresentação.

## detalhes técnicos

- nova página `src/pages/AdminFluxo.tsx`, rota registrada em `src/App.tsx` dentro do bloco `AdminRoute`, e item novo em `ADMIN_NAV_ITEMS` (`src/components/admin/layout/AdminSidebar.tsx`, ícone `Workflow`).
- o mapa é declarativo: um arquivo `src/features/admin/fluxo/flowMap.ts` com os nós e arestas tipados (id, rota, faixa, acesso, descrição, alerta, chave de métrica). renderização em grid + svg leve pras conexões, sem dependência nova.
- métricas via um hook `useFluxoMetrics` que agrega com consultas de contagem nas tabelas já existentes (`profiles`, `enrollments`, `student_module_progress`, `module_deliverables`). só leitura, nenhuma migração.
- estética: `card-surface`, tipografia League Gothic nos títulos de faixa, cor por faixa usando os tokens já centralizados; respeita `prefers-reduced-motion` e é navegável por teclado.
