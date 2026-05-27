## polish geral — 1 sweep cirúrgico

foco: visual + motion + copy. sem refactor, sem mexer em business logic. tudo dentro dos tokens existentes (perestroika rosa + accent sebrae azul, league gothic + urbanist, lowercase pt-br).

### 1. dashboard (`AppDashboard.tsx`)
- header: trocar `oi, {nick}` cru por chip mais discreto (`text-perestroika-preto/65 font-body text-sm` + ponto separador), respeitar `display: none` em mobile como já tá mas dar `truncate max-w-[140px]`.
- footer: copy atual "eletiva sebrae · escola sebrae · 1º ano EM" → trocar pra "nachesu · uma plataforma naches · em parceria com escola sebrae" (alinhar com EletivaFooter já existente; importar e usar `<EletivaFooter />` em vez de footer custom).
- fade-up escalonado: envolver as seções principais (greeting, week cadence, eletiva card, switcher) em `motion.div` com `staggerChildren` leve (delay 0/80/160/240ms, ease `[0.22,1,0.36,1]`, 350ms). respeita `prefers-reduced-motion` via tailwind `motion-safe`.

### 2. eletiva home (`EletivaHome.tsx`)
- hero: barra de progresso já tem motion. adicionar shimmer sutil de 1s no fim da animação (overlay gradient `from-transparent via-white/20 to-transparent` correndo 1x).
- "próximo passo" card: ícone `Sparkles` atual fica meio decorativo. trocar por `EletivaSymbol pose="building" size={28}` inline antes do label "próximo passo" (signature moment — mascote aparece já no CTA principal). cor mascote intacta (paleta perestroika).
- atalhos (tutor IA / materiais): copy do tutor está ok; o de materiais "leituras, slides, referências dessa eletiva." → "tudo que rola na eletiva: leitura, slide, link." (mais frattz, menos enciclopédia).
- estado "acesso restrito": pose atual `resting` ok. copy → "essa eletiva não tá na sua lista. fala com o educador se isso parece errado." (mais humano que "você não está matriculado").

### 3. módulo (`Modulo.tsx`)
- toast de conclusão: "módulo concluído. bom demais." → "fechou esse. próximo te espera." (mantém energia, evita "bom demais" repetitivo).
- toast desbloqueio: padronizar pra "módulo NN liberado. quando quiser." (some o ponto final isolado).
- link "voltar pra eletiva" no topo: hoje é texto chip pequeno. adicionar `hover:-translate-x-0.5 transition-transform` na seta (micro-feedback consistente com cards).
- "módulo não encontrado": copy → "esse módulo ainda não rolou ou o número não bate." (corta jargão "liberado pela escola sebrae", já é óbvio pelo contexto).

### 4. auth (`Auth.tsx`)
- subtítulo atual: "tem senha? coloca os dois campos. se não, deixa só o email que a gente manda um link mágico." → quebra em 2 linhas mais curtas: "tem senha? preenche os dois. se não, só o email basta — a gente manda o link." (mais ritmo, frase curta).
- placeholder do password "senha (opcional)" duplicado com aria-label. limpar pra placeholder vazio quando email tem foco; manter aria-label.
- estado sent: copy "clica no link e você cai direto na sua eletiva. (talvez precise olhar a caixa de spam.)" → "abre o link e cai direto na eletiva. olha o spam se demorar." (corta parêntese, fica mais direto).
- mascote `peeking` no canto já é signature. adicionar respiração leve via `motion.div` com `animate={{ y: [0, -4, 0] }}` infinito 3s (override do `animate-pulse-soft` que é genérico).

### 5. admin (`AdminFbi.tsx`)
- header: já tem `NachesULogo` + badge admin. copy "hub" no link de volta → "início" (mais claro, "hub" é vocabulário Chŏra legado).
- breadcrumb: ok. botão "copiar link da aba" muito visível pra ação rara — reduzir pra `text-perestroika-preto/50 hover:text-perestroika-preto` e remover background, deixar puro texto + ícone (densidade admin).
- TabsList principal: hoje todos os triggers têm o mesmo peso visual. dar tratamento ativo mais forte via shadcn data-state (border-bottom 2px perestroika-rosa quando ativo — checa se shadcn já entrega, senão wrapper css curto em `index.css`).
- legacy collapse: "ferramentas Chŏra (legado)" → manter, mas adicionar `text-perestroika-preto/40` por padrão e separador `border-t border-dashed` acima pra criar respiração entre op atual e legado.

### 6. micro-consistência global
- todos os botões pretos pill com `hover:scale-105 active:scale-95` checados — já consistente.
- garantir `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` em todos os botões custom desses 5 arquivos (alguns têm, outros não — auditoria visual).

### fora de escopo (não entra nesse sweep)
- a11y profunda, performance, novos componentes, tabelas/RLS, edge functions, novas rotas, redesign de seção inteira.
- páginas não listadas (admin turma, risco, tutor page, hub materiais) — se quiser, abrimos sweep dedicado depois.

### entregável
edits em 5 arquivos: `AppDashboard.tsx`, `EletivaHome.tsx`, `Modulo.tsx`, `Auth.tsx`, `AdminFbi.tsx`. zero migração, zero dep nova. ~30 min.
