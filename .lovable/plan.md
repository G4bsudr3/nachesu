
# plano: adaptar o hub pra eletiva "ia na prática" (escola do sebrae)

## visão geral

a proposta é uma eletiva online obrigatória, 20 módulos de 50 min liberados 1 por semana, pra alunos de 14-15 anos do 1º ano do ensino médio. cada módulo tem 3 pílulas curtas + 1 exercício pbl + registro de evidência. ao final, cada aluno entrega um app no lovable que resolve um problema real, com pitch e reflexão pra certificação.

o hub atual já tem ~80% do esqueleto que precisamos: auth, perfis, controle por lista de e-mails autorizados, conteúdo modular com progresso, missões/entregáveis, certificado, admin. o trabalho é **podar tudo que é específico do evento chŏra lovable** e **construir o módulo de aula em si** (a unidade central da eletiva).

---

## o que fica (reaproveitar quase como está)

### infra e fundação
- auth com magic link + senha opcional
- `profiles` + `user_roles` + `has_role()` (admin/aluno)
- `invited_participants` como lista de e-mails autorizados (vira "lista do sebrae")
- `ProtectedRoute`, `AdminRoute`, `Pending`, fluxo de onboarding básico
- `HubLayout` + `MobileNav` + `PageShell` (layout responsivo)
- toda a stack visual perestroika (cores, fontes, componentes de marca) – **mas com tom adaptado pra adolescente, ver "ajustes de copy" abaixo**
- edge functions de e-mail (enviar lembrete semanal de novo módulo)
- `chora-bot` como tutor de ia opcional dentro de cada módulo (aluno tira dúvida sobre o tema da aula)

### features que viram outra coisa
- `prework_items` + `prework_progress` → vira **base do sistema de módulos** (estrutura quase idêntica: ordem, título, tipo, duração, obrigatório, progresso por aluno). dá pra renomear ou criar tabela nova reaproveitando o padrão
- `mission_submissions` → vira **registro de evidência / entregável de cada módulo** (link do projeto, texto da reflexão, etc)
- `Tutorial` (a página de 5 etapas pra construir manifesto) → vira referência pra ui da **página de módulo** (1 passo por vez, com seções "começa por aqui" / "vai mais fundo")
- `hub_certificates` + `Certificado` → certificado final da eletiva (16h40)
- `AdminFbi` (estrutura de tabs) → vira admin da eletiva

---

## o que sai (remover ou esconder)

tudo isso é específico do evento presencial chŏra lovable de 2 dias e não faz sentido pra uma eletiva escolar de 20 semanas:

| feature / arquivo | motivo |
|---|---|
| `fbi_responses` + `PublicForm` (formulário fbi de 19 perguntas) | é onboarding de evento, não cabe em eletiva escolar. talvez vire um "diagnóstico inicial" curto opcional, mas a versão atual sai |
| `builder_cards` + `MinhaCarta` + `CartaPublica` + `archetype_artworks` + carta de arquétipo gerada por ia | feature emocional do evento, fora de escopo pedagógico escolar |
| `future_letter_*` (carta pro futuro) | dinâmica do dia 2 do evento |
| `hub_album_photos` (álbum de fotos do evento) | presencial |
| `mascote_votes` + `select-mascote` | dinâmica do evento |
| `project_voting_sessions` + `project_votes` + ranking | competição do evento |
| `hub_event_feedback` + `hub_event_feedback_final` (pesquisa pós-evento) | troca por avaliação por módulo |
| `Countdown` pra 25/04/2026 | data do evento |
| `Onboarding` atual (3 estados baseados em fbi+carta) | reescrever |
| `HubGallery`, `HubProjetos`, `HubProjetosRanking`, `HubAlbum`, `HubTurma` | hub social/festival, não é o foco aqui (talvez **hub turma simplificado** fique como mural opcional, ver "construir") |
| toda copy "naveia / vai lá e cria / chora" e referências ao evento | substituir por copy escolar ainda jovem mas adequada |

---

## o que precisa ser construído

### 1. modelo de dados da eletiva (nova migração)

```sql
-- trilhas (4 trilhas conforme proposta)
trails (id, order_index, title, description, color)

-- módulos (20 módulos)
modules (id, trail_id, order_index, number, title, objective,
         total_minutes, available_from, published, deliverable_description)

-- pílulas dentro de cada módulo (3 a 5 por módulo)
module_pills (id, module_id, order_index, kind ['pilula_a','pilula_b',
              'pilula_c','exercicio_pbl','registro'], title, body_md,
              duration_min_low, duration_min_high, video_url, attachment_url)

-- progresso de pílula (granular)
student_pill_progress (student_id, pill_id, completed_at)

-- progresso do módulo (derivado, mas materializado pra performance)
student_module_progress (student_id, module_id, started_at, completed_at)

-- entregável por módulo (substitui mission_submissions)
module_deliverables (id, student_id, module_id, kind ['link','text',
                     'file','checklist'], content jsonb, submitted_at,
                     reviewed_at, reviewer_id, feedback)

-- avaliação rápida do módulo (substitui pesquisa final)
module_ratings (student_id, module_id, rating 1-5, comment, created_at)
```

regras:
- rls em todas. aluno vê só os próprios dados. admin vê tudo.
- liberação semanal via `available_from` (módulo só aparece pro aluno depois da data) — **importante:** validação no banco via policy, não só no front
- trigger pra recalcular `student_module_progress.completed_at` quando todas as pílulas obrigatórias forem feitas

### 2. página de módulo (a peça central)

rota `/aula/:moduleNumber` com layout inspirado no `Tutorial.tsx` atual:
- header com número do módulo, trilha, objetivo, tempo total
- timeline vertical das pílulas (a, b, c, exercício pbl, registro)
- cada pílula expansível: título, duração, conteúdo (md/vídeo), botão "marcar como visto"
- exercício pbl: bloco destacado com instrução + ações (abrir lovable, abrir chatgpt, etc)
- registro de evidência: form de entregável (input dependendo do tipo: link, textarea, upload, checklist)
- após registro, mostra "módulo concluído" e libera link pro próximo (se já disponível) ou conta dias até liberar

### 3. dashboard do aluno (substitui `AppDashboard` atual)

simplificar drasticamente:
- saudação + próximo módulo em destaque (com cta grande)
- timeline horizontal compacta dos 20 módulos: feito / em andamento / disponível / bloqueado (com data)
- atalho pra "meu projeto" (link da v1/v2/v3 que o aluno foi publicando)
- atalho pro chora-bot (rebatizado, ver "ajustes de copy")

### 4. admin da eletiva

novo tab dentro do `/admin`:
- **módulos**: cadastrar/editar trilhas, módulos, pílulas. setar `available_from`. publicar/despublicar
- **alunos**: importar lista do sebrae (csv → `invited_participants`), ver progresso de cada um, aprovar pendings
- **entregáveis**: feed de submissões pra revisar, dar feedback, marcar revisado
- **avaliações**: agregação simples de `module_ratings` por módulo
- pra primeira aula: precisa só do cadastro de módulo + pílulas + libera. revisão de entregável pode vir depois

### 5. liberação semanal automática

- não precisa de cron real. basta o `available_from` no módulo + filtro nas queries + ui mostrando contagem ("libera em 3 dias")
- e-mail semanal opcional usando a infra existente (`process-email-queue` + template novo "novo módulo disponível")

### 6. chora-bot virando "tutor de ia"

- renomear pra algo tipo "ajudante" ou "tutor". manter motor (`chora-bot-chat` edge function + lovable ai)
- ajustar system prompt: "você é tutor de uma eletiva de ia pra alunos de 14-15 anos. tom acessível, sem jargão. nunca dá resposta pronta de exercício, faz perguntas socráticas pra o aluno chegar lá."
- ingerir o conteúdo das pílulas como contexto rag (já existe `chora_bot_chunks` + `chora-bot-ingest`)

### 7. ajustes de copy e tom

o tom atual é "frattz/naveia" (lowercase agressivo, gírias, "vai lá e cria"). pra adolescente em contexto escolar:
- manter lowercase como assinatura visual
- tirar gírias muito específicas ("vai lá e cria", "manda bala")
- linguagem acessível mas não infantilizada — falar com adolescente como gente
- zero corporativês, zero "prezado aluno"
- exemplos sempre de rotina escolar/pessoal (organizar estudos, revisar prova, planejar role com amigos)

### 8. certificação da eletiva

- usar `hub_certificates` existente, adaptar template pra "16h40 — eletiva ia na prática — escola do sebrae"
- gerar quando aluno: completou 20 módulos + entregou projeto final + reflexão final

---

## pra **conseguir liberar a primeira aula** (mvp mínimo)

ordenei do que é bloqueante pra liberar **só a aula 1**:

1. **migração**: criar `trails`, `modules`, `module_pills`, `student_pill_progress`, `student_module_progress`, `module_deliverables` + rls
2. **podar**: remover rotas/páginas/tabelas do evento (lista acima em "o que sai"). manter o que é infra
3. **admin mínimo**: tela pra cadastrar módulo + pílulas (form simples; depois vira ui rica). seedar trilha 1 e módulo 1 direto via migração já é suficiente pra testar
4. **conteúdo do módulo 1**: você me passa o conteúdo das 3 pílulas + exercício + registro do módulo 1 (ou eu rascunho a partir da proposta) e eu faço seed
5. **página `/aula/:n`**: renderizar pílulas, marcar progresso, submeter entregável
6. **dashboard novo**: timeline 20 módulos + cta pro próximo
7. **import de alunos**: csv pra `invited_participants` (já existe a tabela, falta o uploader no admin)
8. **copy global**: trocar "chŏra lovable" por "ia na prática" no header, rodapé, auth, e-mails
9. **smoke test**: criar conta com e-mail autorizado, abrir aula 1, completar pílulas, submeter entregável, ver dashboard atualizar

itens que ficam pra depois sem bloquear o lançamento da aula 1:
- chora-bot reconfigurado (continua funcionando como está, só ajustar copy)
- e-mail semanal de novo módulo
- avaliação por módulo
- certificado final
- revisão de entregáveis pelo admin (aluno entrega, admin lê depois)

---

## perguntas antes de começar a implementar

pra evitar retrabalho, quando você aprovar o plano vou precisar confirmar:

1. **conteúdo do módulo 1**: você passa pronto (texto das 3 pílulas + instruções) ou quer que eu rascunhe a partir da proposta pra você revisar?
2. **identidade visual**: mantém a paleta perestroika + league gothic + urbanist, ou a escola do sebrae tem manual de marca próprio que precisa entrar?
3. **hub social**: descarta totalmente (galeria/turma/projetos), ou mantém uma versão mínima como "mural da eletiva" pros alunos verem projetos uns dos outros?
4. **vídeos das pílulas**: as pílulas vão ter vídeo gravado (url externa tipo youtube/vimeo) ou só texto + imagens?

quando aprovar, atacamos os passos 1-9 do mvp na ordem.
