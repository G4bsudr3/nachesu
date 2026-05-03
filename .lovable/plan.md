## decisões fechadas

1. **matrícula = manual por convite.** admin importa lista de emails por eletiva. aluno só vê eletivas em que foi convidado.
2. **liberação de módulo = manual pelo admin.** acabou o desbloqueio sequencial automático e o cron de `available_from`. admin clica "liberar módulo X" e pronto.
3. **1 professor por eletiva.** dudu = economia circular. frattz = ia na prática. fim.
4. **tutor IA escopado por eletiva.** prompt-base diferente, histórico separado.

## arquitetura

camada nova **`courses`** acima de `trails`. mudança mínima no resto: `trails` ganha `course_id`, `tutor_conversations` ganha `course_id`. `enrollments` controla acesso. `module_releases` registra liberação manual.

```text
courses
 ├─ slug, title, subtitle
 ├─ professor_name, professor_bio_md, professor_avatar_url
 ├─ theme jsonb { palette, fonts, doodles, accent, tutor_system_prompt }
 ├─ order_index, published, hero_image_url

course_invites (convite por email, antes do signup)
 └─ course_id, email_normalized, invited_at, claimed_at

enrollments (matrícula efetiva, depois do signup)
 └─ user_id, course_id, enrolled_at, status ('active'|'paused')

module_releases (liberação manual)
 └─ module_id, released_at, released_by

trails        + course_id (nova fk)
tutor_conversations + course_id (nova fk)
modules / module_pills / module_deliverables / student_module_progress
              → inalterados, escopam por trail.course_id
```

**RLS chave:**
- `courses`: select autenticado se publicado **e** aluno matriculado, ou admin.
- `modules`: select se aluno matriculado no course do trail **e** existe `module_releases` desse módulo, ou admin.
- `enrollments`: select próprio + admin gerencia.
- `course_invites`: só admin.

**hook de signup:** ao confirmar email, trigger procura `course_invites` por email e cria `enrollments` correspondentes, marca `claimed_at`.

## ondas

### onda 1 — fundação multi-eletiva
- migrations: `courses`, `enrollments`, `course_invites`, `module_releases`, add `trails.course_id`, add `tutor_conversations.course_id`.
- seed 2 courses: `ia-na-pratica` (frattz) e `economia-circular` (dudu) com tema completo.
- backfill: 4 trilhas atuais → ia-na-pratica. cria 4 trilhas novas (enxergar/entender/criar/validar) em economia-circular.
- move o módulo 1 atual ("abrir o olho" / radar) pra trilha "enxergar" da economia circular (é dele).
- RLS por matrícula + liberação manual.
- trigger `claim_invites_on_signup`.
- aposenta a flag `eletiva_sequential_unlock` (passa a ser sempre manual).

### onda 2 — seed conteúdo dudu
- 20 módulos da economia circular conforme pdf (título, objetivo, deliverable_description).
- 5 pílulas por módulo no padrão pdf (abertura · conteúdo curado · atividade prática PBL · checagem rápida · bônus opcional) com `interaction_schema` populado.
- todos `published=false` no seed; admin libera quando quiser.
- módulo 1 já existe → só reassocia.
- 19 módulos da IA na Prática mantêm o que tem (placeholders); refino fica pra rodada futura.

### onda 3 — admin: convites + liberação
- nova rota `/admin/eletivas` (lista courses + cards rápidos).
- `/admin/eletivas/:slug/convites`: textarea/colar emails, importa em massa, mostra status (convidado / matriculado / removido).
- `/admin/eletivas/:slug/modulos`: lista os 20 módulos com toggle "liberado / bloqueado" (escreve em `module_releases`). mostra quem está em cada módulo.
- `/admin/eletivas/:slug/editar`: edita título, professor, tema, prompt do tutor.
- `/admin/aula/:n` continua, agora filtra por course do módulo automaticamente.

### onda 4 — dashboard + catálogo do aluno
- `AppDashboard.tsx`: lê matrículas. 1 matrícula → vê só ela. 2+ → cards lado a lado dos próximos passos por eletiva, com switcher.
- nova rota `/app/eletiva/:slug` = home da eletiva (constellation view escopada, header com identidade do course, professor em destaque, progresso por trilha).
- `EletivaCard.tsx` vira `CourseCard.tsx` reutilizável.
- `MobileNav` ganha switcher quando há 2+ matrículas.
- aluno sem matrícula: tela "ainda não tem eletiva liberada" com instrução de contato.

### onda 5 — identidade visual escopada
- generaliza `<DuduoTheme>` em `<CourseTheme courseSlug>` que lê `courses.theme` e aplica css-vars locais.
- páginas-aluno escopadas (`/app/eletiva/:slug/*`, `/app/modulo/:n`) ficam dentro do provider do course do módulo.
- `/app` raiz mantém identidade Sebrae+Perestroika neutra.
- IA na Prática usa o tema atual (perestroika+sebrae). Economia Circular usa o tema duduo (Sora 800, bege quente, doodles, accent #F25E3D).
- header de página mostra Sebrae + nome da eletiva + professor.

### onda 6 — tutor IA escopado
- `tutor-trail-chat` recebe `course_slug` no body, carrega `theme.tutor_system_prompt` do course.
- prompts iniciais:
  - **ia-na-pratica:** mentor builder (frattz vibe), foco prompt eng / mvp / lovable / iteração.
  - **economia-circular:** mentor investigativo (dudu vibe), foco pensamento sistêmico / fluxos / regeneração / validação leve.
- `tutor_conversations` escopado por course → cada eletiva tem seu próprio histórico.

### onda 7 — entregável final por eletiva
- IA: módulo 20 = link app lovable + pitch (texto/áudio).
- Economia Circular: módulo 20 = mini-dossiê (problema+evidências, personas, mapa de fluxo, proposta de valor, modelo, validação, próximos passos) + pitch 2-3min (vídeo).
- página `/app/eletiva/:slug/dossie` (só economia-circular) renderiza o dossiê em formato editorial.
- certificado: cada course tem template próprio assinado pelo professor da eletiva. arquétipos do builder card seguem iguais.

### onda 8 — copy, QA, regressão
- copy estático "eletiva sebrae" → "minhas eletivas" / nome do course.
- testes: tema vaza só dentro do escopo do course; aluno sem matrícula não vê módulos do outro course; convite cria enrollment ao signup.
- QA mobile dos dois temas em paralelo.

## o que NÃO vou fazer
- renomear `chora`, `hub`, `missions` no código (regra do projeto).
- duplicar tabelas de módulos.
- tocar nas páginas Chŏra legadas (atrás da flag).
- escrever conteúdo das pílulas IA do frattz nessa rodada.
- suportar liberação automática (cron) — admin libera manual e fim.
- catálogo público de eletivas — só aluno convidado vê.

## ordem de entrega segura

1. **onda 1 (db + RLS)** — backfill cuidadoso, ninguém perde acesso. enquanto não tem ui de matrícula, dou matrícula automática a todos os alunos atuais nas duas eletivas (one-shot no migration) pra não cortar acesso de quem já está no ar.
2. **onda 2 (seed dudu)** em paralelo, só dados.
3. **onda 3 (admin)** pra você conseguir gerenciar convites e liberar módulos.
4. **onda 4 (dashboard aluno)** — mudança visível.
5. **onda 5 (tema escopado)** — Dudu para de ser "intruso" na cara da Naches.
6. **ondas 6-8** — refinamento.

posso começar pela **onda 1 + 2** (db + seed dudu), que destrava todo o resto?