# revisão geral pré-lançamento nachesu — plano final

decisões do brief:
- **turma começa amanhã** → seed de `available_from` em cadência semanal a partir de amanhã às 06h (horário de brasília), módulo 1 já liberado hoje
- **smoke test incluso nessa rodada** (com conta de teste de estudante, não admin)
- **domínio oficial: `nachesu.lovable.app`** — atualizar metadata pra esse

estado: 2 cursos × 20 módulos × 100+ pílulas publicadas. só mód 1 com `published=true`. mecânica de progresso (otimistic update, desbloqueio sequencial, trava de conclusão) já sólida do ciclo anterior. essa rodada é polimento + blindagem pra suportar estudantes reais.

---

## etapa 1 — bloqueadores mecânicos

### 1.1 metadata e og
- atualizar `og:url` em `index.html`: `chorahub.lovable.app` → `nachesu.lovable.app`
- conferir `og:image`: se está no bucket `gpt-engineer-file-uploads`, baixar e mover pra `public/og.jpg`, apontar `og:image` pro caminho local
- adicionar `<link rel="canonical" href="https://nachesu.lovable.app/" />`

### 1.2 ErrorBoundary global
- criar `src/components/system/RootErrorBoundary.tsx` (class component, Framer Motion no fallback editorial com joão-de-barro pose `thinking`, copy "algo travou aqui. recarrega que volta", botão "voltar pro início" → `/app`)
- envolver `<App />` em `main.tsx` e adicionalmente um boundary interno por rota crítica em `App.tsx` (Modulo, AppDashboard, Auth) pra falha localizada não derrubar header/nav
- log via `logger.ts` no `componentDidCatch`

### 1.3 lazy-load das rotas restantes
- lazificar em `App.tsx`: `AppDashboard`, `Modulo`, `EletivaHome`, `Eletivas`, `MinhasEletivas`, `Comecar`, `TutorPage`, `Auth`, `Notificacoes`, `Marco`, `Pending`, `Unsubscribe`, todas as `Admin*` e `ChoraBot`
- manter eager só `Index` (landing) e `NotFound`
- garantir que o `<Suspense>` raiz tem fallback que não pisca (skeleton ou nada — não spinner genérico)

### 1.4 seed de `available_from` semanal
- migração que faz `UPDATE modules SET available_from = base + (number-1) * interval '7 days', published = true` pra todos os 40 módulos das duas eletivas
- `base` = amanhã 06:00 BRT (= 09:00 UTC)
- módulo 1 já está publicado e disponível desde hoje — manter como está
- resultado: `WeekCadenceStrip` passa a mostrar countdown real, módulo 2 vira disponível semana que vem, etc

---

## etapa 2 — smoke test executado no browser

executar com conta de estudante de teste (não admin, pra a trava sequencial valer). criar a conta se não existir.

para cada eletiva (`ia-na-pratica` e `economia-circular`), mód 1:
1. login → confirmar redirect pra `/app`
2. dashboard: `EletivaCard` aponta pro próximo módulo? CTA correto?
3. abrir mód 1 → confirmar que pílula 0/1 abre e o resto está visualmente travado
4. completar cada pílula em ordem, dando refresh entre uma e outra pra validar persistência
5. validar campos obrigatórios: tentar concluir pílula sem preencher → botão deve travar
6. tentar abrir `/app/modulo/2` direto pela URL → deve ver `ModuloLockedHero`
7. concluir mód 1 → confirma celebração + toast + redirect (se trilha terminou, vai pro marco)
8. abrir `TutorChat` em uma pílula → confirmar que contexto da pílula chega
9. testar em viewport mobile (375×812) — touch targets, scroll, mobile nav

para cada bug encontrado: registrar no `.lovable/plan.md` com severidade e corrigir no momento ou listar pra etapa 3.

**específico ia-na-pratica mód 1**: confirmar que pílula 0 (bônus opcional, vídeo do loom) NÃO bloqueia pílula 1. confirmar que pílula 1 abre direto pra quem pula o bônus.

**específico economia-circular mód 1**: confirmar que radar_form persiste.

---

## etapa 3 — polimentos de imersividade

### 3.1 acessibilidade mobile
- auditar `Pill*` por touch targets < 44×44 (rg em `text-xs|h-8|h-9|w-8|w-9` dentro de botões)
- padronizar `aria-busy="true"` e label "salvando..." em todos os `Pill*` durante `isCompleting`
- testar contraste de azul Sebrae `#1E2BB8` sobre bege em body text (provavelmente falha AA)

### 3.2 empty states com voz
- auditar `MyCoursesList`, `EletivaHome` (sem módulos), `Notificacoes`, fallback de `Modulo`
- cada um: 1 frase com personalidade + joão-de-barro em pose adequada + 1 caminho de saída

### 3.3 microfeedback no desbloqueio de pílula
- verificar se a animação locked→unlocked do plano anterior está ativa em `ModuloPillList`
- se não estiver: pulso Framer Motion de 600ms + sublabel "agora é a sua vez" por 4s no card recém-aberto, respeitando `prefers-reduced-motion`

---

## fora de escopo

- review de copy completo das 100+ pílulas (papel do educador, ao longo das semanas)
- analytics próprio de cohort (pós dia 1, conforme volume de dados)
- dark mode pro bege (pós dia 1)
- rate limit do tutor IA — verificar se já está no edge function, se não, abrir issue separada
- modo offline / PWA install prompt

---

## ordem de execução

1. **etapa 1** completa (migração + código mecânico, em paralelo onde possível)
2. **etapa 2** smoke test, com correções inline pros bugs pequenos
3. **etapa 3** polimentos
4. fechar com checklist final no `.lovable/plan.md` e sugerir publish

depois da aprovação eu já disparo a migração do 1.4 primeiro (pra ela rodar enquanto eu mexo no código).
