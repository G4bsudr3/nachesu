# Dashboard de turma — /admin/turma/:courseId

Página admin focada num curso só, juntando saúde da turma (riscos), ritmo (tempo médio dos módulos) e ação pendente (entregas aguardando revisão). Reusa `student_engagement_risk` e `student_module_progress`. Sem alterar schema.

## Rota e acesso
- Adicionar lazy import e `<Route path="/admin/turma/:courseId" element={<AdminRoute><AdminTurma /></AdminRoute>} />` em `src/App.tsx`.
- Linkar a partir de `AdminRisco` (filtro de eletiva → botão "abrir dashboard da turma") e do índice admin existente.

## Página `src/pages/AdminTurma.tsx`
Layout em `PageShell` + `PageHeader` (back para `/admin`), `container max-w-5xl`. Estrutura:

1. **Header da turma** — título do curso, nome do professor, contagem de matriculados ativos.
2. **Strip de KPIs (4 cartões)**:
   - matriculados ativos (count em `enrollments` status='active' do curso)
   - em risco agora (medium+high+lost da view filtrada por course_id)
   - entregas aguardando revisão (count `module_deliverables.status='enviado'` join `modules.course_id`)
   - tempo médio por módulo (média geral de `completed_at - started_at` em horas, só rows com `completed_at`)
3. **Tabela de ritmo por módulo** — uma linha por módulo do curso, ordenado por `(trail.order_index, module.order_index)`:
   - nome do módulo + trilha
   - iniciados (qtd)
   - concluídos (qtd)
   - tempo médio (h) — média de `completed_at - started_at` quando concluído
   - barrinha visual de conclusão (% concluídos / iniciados)
4. **Bloco "estudantes em risco nesta turma"** — reaproveita estilo da tabela de `AdminRisco`, filtra `student_engagement_risk` por `course_id`, mostra top 10 ordenados por `days_inactive`. Link "ver todos" → `/admin/risco?course=<id>`.
5. **Bloco "aguardando sua revisão"** — lista top 10 entregas com `status='enviado'` (nome do estudante, módulo, dias parado), link "abrir" → `/admin/aula/:n` (rota existente).

Estados: skeleton enquanto carrega, empty states com personalidade ("turma respirando bem, nada na fila").

## Queries (no client, via supabase-js)
Tudo em paralelo dentro de um único `useEffect`:
- `courses` por id (título, professor)
- `enrollments` count por course_id status active
- `student_engagement_risk` filtrado por course_id
- `module_deliverables` join `modules!inner(course_id, title, trail_id)` filtrado por course_id e status='enviado'
- Tempo por módulo: select `student_module_progress(module_id, started_at, completed_at)` join `modules!inner(course_id, title, order_index, trail_id, trails(order_index, title))` filtrado por course_id. Agregação em memória (média de duração por module_id, contagem iniciados e concluídos).
- Profiles para mostrar nome dos estudantes em risco e na fila de revisão.

RLS já permite: admin tem acesso ALL em `module_deliverables`, `enrollments`, `courses`, e a view está com `GRANT SELECT ... TO authenticated` (filtra por has_role internamente quando aplicável — verificar; se não, usar service via leitura simples e confiar que rota é `AdminRoute`).

## Detalhes de design
- Cartões KPI: rounded-2xl, paleta Perestroika (bege/laranja/vermelho/rosa) consistente com `AdminRisco`.
- Tabela de ritmo: barra de progresso fina em `--primary`, números em League Gothic, label em Urbanist uppercase tracking-wide.
- Lowercase em copy, sem emoji. "estudantes" não "alunos".
- Sem novo componente reutilizável: tabela inline igual `AdminRisco`.

## Não-objetivos
- Sem export CSV, sem gráficos pesados (Recharts), sem realtime.
- Sem mudanças em schema/RLS/edge function.
- Sem mexer em `AdminRisco` além de adicionar 1 link.

## Arquivos
- novo: `src/pages/AdminTurma.tsx`
- editado: `src/App.tsx` (rota + lazy import)
- editado: `src/pages/AdminRisco.tsx` (link contextual "abrir turma" no filtro)
