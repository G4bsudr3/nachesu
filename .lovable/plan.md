## Reescrever o project knowledge pra NachesU

O knowledge atual ainda fala de "Chŏra Lovable Hub", FBI, carta de arquétipo, evento de 25-26 abril em Porto Alegre, ~40 participantes, Helena/Fernanda admins, formulário de 19 perguntas, etc. Tudo isso é **legado Chŏra**, hoje atrás de `eletiva_extras_enabled`. O produto vivo é **NachesU**, extensão do ensino médio da Naches em parceria com a Escola Sebrae BH.

Vou substituir o knowledge inteiro pelo bloco abaixo. Memory files do projeto (`.lovable/memory/...`) já estão alinhados, então não precisam mudar.

### O que o knowledge novo precisa dizer

**Identidade do produto**
- Nome: **NachesU** (Naches University), plataforma educacional própria
- Parceria: Naches × Escola Sebrae (BH)
- Proponente: Mateus Frattezi (frattz), CEO Naches, ex-aluno Sebrae
- Público: estudantes do 1º ano do Ensino Médio (14-15 anos), cursos técnicos integrados de Administração e Marketing
- Início: março/2026
- Formato: online assíncrono, mobile-first, plataforma própria, acesso por e-mail institucional Sebrae
- Carga: 16h40min por eletiva (1.000 min), 20 módulos semanais de 50 min, 1 liberado por semana
- Metodologia: PBL + microlearning
- Tagline herdada: "vai lá e cria"

**As duas eletivas (estrutura idêntica: 4 trilhas × 5 módulos × 50 min)**

Eletiva 01 — **IA na Prática** (com frattz)
- Pitch: pensar, prototipar e validar soluções reais com IA
- Cada estudante constrói uma plataforma simples no Lovable resolvendo um problema real da rotina escolar/pessoal
- Trilha 1 Fundamentos & IA (mód 1-5): o que IA faz hoje, como conversar com ela, prompt como habilidade cognitiva, regra de ouro "IA ajuda a pensar, não substitui pensar"
- Trilha 2 Problema & Decisão (mód 6-10): achar dor real, definir usuário, proposta de valor, canvas, pitch antes de construir
- Trilha 3 Construção no Lovable (mód 11-15): do briefing ao MVP, MLP (mínimo lovable), simplificação, IA integrada ao produto sem ser decorativa
- Trilha 4 Validação & Evolução (mód 16-20): MVT (mínima tração viável), teste com gente real, iteração com evidência, entrega + reflexão final
- Entregável final: link do projeto V-final + pitch (texto ou áudio) + reflexão registrada pra certificação

Eletiva 02 — **Economia Circular e Negócios Regenerativos** (com Dudu)
- Pitch: desenhar negócio regenerativo do sistema ao protótipo validado, usando a própria Escola Sebrae BH como laboratório
- Trilha 1 Enxergar (encontros 1-5): BH como laboratório regenerativo, diferença linear × circular × regenerativo, pensar em sistemas, escolher problema e fluxo
- Trilha 2 Entender (encontros 6-10): mapear fluxos, princípios da Economia Circular (Ellen MacArthur), stakeholders, oportunidades
- Trilha 3 Criar (encontros 11-15): ideação guiada (20 ideias em 20 min), canvas de proposta de valor regenerativa, modelo de negócio
- Trilha 4 Validar (encontros 16-20): planejar experimento de baixo custo, testar, iterar V2, preparar pitch de impacto, entrega
- Entregável final: Mini-Dossiê de Negócio Regenerativo (digital) + Pitch de 2-3 min

**Anatomia padrão de um módulo (mesma nos dois cursos)**
Pílula A (aula curta) + Pílula B (aula curta) + Pílula C (aula curta) + Exercício PBL (mão na massa, 18-28 min) + Registro/evidência (síntese curta enviada na plataforma). Tempos aproximados, ritmo do estudante manda. Bônus opcional na Economia Circular.

**Identidade visual**
- Marca atual: `<NachesULogo />` (alias `<EletivaLogo />` mantido pra compat). `<ChoraLogo />` só dentro de fluxo legado atrás de `eletiva_extras_enabled`
- Paleta Perestroika primária (`--primary` rosa, bege #f2e4d8, laranja, vermelho, rosa, azul, preto)
- Accent institucional Sebrae azul #1E2BB8 em assinaturas e elementos institucionais (`--accent`)
- Mascotes mantêm paleta Perestroika mesmo no contexto Sebrae. Não pintar mascote de azul institucional
- Tutor IA: mascote **joão-de-barro** ("o pássaro que constrói", referência direta a "vai lá e cria"). 6 poses narrativas via `<EletivaSymbol pose="..." />`: building, thinking, talking, celebrating, resting, peeking. Nunca repetir a mesma pose em todo lugar
- 6 arquétipos de builder (`builder_archetype` enum) usam outros 6 animais via `archetype_artworks` + `builder_cards` + edge function `generate-archetype-artwork`. Não criar tabela nova pra isso
- Fontes: League Gothic (display) + Urbanist (body). Sem Inter/Roboto
- Componentes assinatura existentes que continuam válidos: `<LagrimaGradient />`, `<BalaoSerrado />`, `<CaixaPrompt />`, `<EstrelaPerestroika />`
- Mood: editorial brasileiro, tipografia protagonista, cor em accent, generoso bege

**Stack**
Lovable Cloud (Postgres + Auth + Edge Functions + AI Gateway). Magic link + senha opcional. React + TS + Tailwind + Framer Motion. Lovable AI pra geração de carta de arquétipo (fluxo legado).

**Personas**
- **Estudante** (nunca "aluno"): 14-15 anos, ensino médio Sebrae BH, cursos técnicos. Mobile-first. Zero a iniciante em tech
- **Educador** (nunca só "professor"): Dudu (Economia Circular), frattz (IA na Prática)
- **Admin** (`is_admin=true` em profiles): frattz. Aprova pendentes, publica módulos, libera via `module_releases`, vê respostas

**Hierarquia de jornada (regra dura, não regredir)**
- `/app` → saudação + switcher (se 2+ matrículas) + EletivaCard com CTA único pro próximo módulo
- `/app/eletiva/:slug` → fallback com 3 atalhos: mapa, tutor IA, materiais
- `/app/modulo/:n` → módulo em si (pílulas + PBL + registro)
- `/app/hub` → redirect, NÃO recriar como página
- Mobile nav fixa em 3 itens: início, trilhas, tutor
- Vocabulário Chŏra (FBI, carta de builder, carta pro futuro, pré-work, missões, tutorial, certificado, pesquisa final) só renderiza atrás de `useEletivaExtras().enabled`. Não trazer pro fluxo NachesU
- Fonte de verdade viva do dashboard: `.lovable/plan.md`

**Tom de voz**
- Lowercase em copy. CSS pode forçar uppercase em display
- **"você"**, não "tu" (regra atualizada pro contexto Sebrae, override do prompt frattz)
- Frases curtas. Zero em-dash, zero hashtag, zero emoji em UI
- Zero corporativês. Sem "prezado", "à disposição"
- Vocabulário Naches: "estudante" não "aluno", "educador" não "professor"
- Microcopy tutorial embutido onde tem fricção, nunca FAQ separado (FAQ na home pública é exceção, já existe)
- Empty states convidam, nunca dizem "vazio"

**Schema relevante (não mexer sem pedir)**
- `profiles`, `user_roles`, `courses`, `trails`, `modules`, `pills`, `module_releases`, `module_progress`, `enrollments`
- Tabelas legado Chŏra (`fbi_responses`, `missions`, `prework_*`, `builder_cards`, `archetype_artworks`) continuam mas só renderizadas atrás da flag
- RLS sempre. Módulo só fica visível pro estudante depois de aparecer em `module_releases`

**Guardrails (regras de não fazer)**
- Não trazer vocabulário Chŏra pro fluxo NachesU
- Não pintar mascote no azul institucional
- Não usar Inter/Roboto/fontes genéricas
- Não usar SaaS genérico (Linear/Arc/shadcn cru)
- Não criar tabela nova pra arquétipo, usar a infra existente
- Não duplicar CTA/progresso entre dashboard e EletivaHome
- Responsivo mobile-first é obrigatório (público acessa de celular)
- Toda nova tabela com RLS habilitada

**Princípios de UX/didática (manter)**
1. 1 próximo passo único em destaque
2. Progressão visível sem gamificação artificial
3. Copy fala com a pessoa, não com "usuário"
4. Microcopy onde tem fricção
5. Empty states com personalidade
6. Estado persistente com reconhecimento
7. Tempo estimado explícito em toda ação
8. Falhar deve parecer seguro (resposta errada não vira tela vermelha)

### O que cai do knowledge antigo
- Toda menção a Chŏra Lovable Hub como produto vivo
- Evento 25-26 abril Porto Alegre Instituto Caldeira, contagem de ~40 participantes
- Helena Kich e Fernanda Vaz como admins
- FBI 19 perguntas em 4 seções, pre-fill da planilha Perestroika
- Carta de arquétipo gerada na submissão do FBI (continua existindo no legado, mas não é o fluxo principal)
- Domínio chora.lovable.app como referência (atual: nachesu.lovable.app)
- "Tu" como regra (vira "você")
- Lista de emojis permitidos em UI (vira zero emoji em UI)

### O que faço nesse plano
Reescrevo o bloco de **project knowledge** completo. Nenhum arquivo de código muda. Memórias do projeto em `.lovable/memory/` já estão coerentes com o knowledge novo, então só preciso garantir que continuem batendo.
