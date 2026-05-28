## 1. Por que o módulo 1 não abriu no mobile

Não é bug de mobile. Conferi o banco: o módulo 1 das duas eletivas está com `available_from = 2026-05-28 09:00 UTC`. O `now()` do servidor quando você testou era `08:30 UTC`. O `useEletivaProgress` trata módulo fora da janela como "não liberado", então qualquer tentativa de abrir caía no `ModuloLockedHero` ("módulo ainda não rolou"). Mesma coisa aconteceria no desktop.

**Correção (migração de dados, não código):**
- `UPDATE modules SET available_from = NULL WHERE number = 1` para ambas as eletivas (sem janela = aberto desde sempre).
- Manter `available_from` dos módulos 2-20 como está (cadência semanal continua valendo).

Bônus de UX no `ModuloLockedHero`: quando faltam menos de 2h pra abrir, mostrar contador em horas em vez de "em 0 dias", pra não dar impressão de bug igual a essa.

## 2. Home estratégica, distinta de /app/trilhas

Hoje a home e a `/app/trilhas` repetem dois sinais: progresso "X de Y" e lista de módulos. A regra dura do projeto já diz "1 próximo passo único em destaque" — vamos levar isso a sério e dar à home um papel diferente do mapa.

**Princípio:** Trilhas = mapa (panorama). Home = painel de comando do dia (decisão).

### Estrutura nova da home (`/app`)

```text
┌─────────────────────────────────────────────┐
│ saudação contextual (sem números repetidos) │
│ + switcher (se 2+ matrículas)               │
├─────────────────────────────────────────────┤
│ HERO ÚNICO: próximo módulo                  │
│  · nome + objetivo + tempo + trilha         │
│  · CTA grande "começar/voltar pro módulo NN"│
│  · "ver mapa completo" como link discreto   │
├─────────────────────────────────────────────┤
│ PAINEL DE COMANDO (3 cards compactos)       │
│  a) cadência da semana                      │
│     "módulo N abre em X dias" ou "aberto    │
│     agora · ~50 min"                        │
│  b) última pílula tocada                    │
│     "continue de onde parou: <pílula>" se   │
│     houver pílula iniciada e não concluída  │
│  c) tutor da eletiva                        │
│     pergunta-semente baseada no módulo      │
│     atual ("posso te ajudar a destravar a   │
│     pílula B?") → abre /app/tutor com       │
│     prompt pré-preenchido                   │
├─────────────────────────────────────────────┤
│ FAIXA "o que vem por aí" (opcional, só se   │
│ módulo atual já está concluído):            │
│  · prévia do próximo módulo bloqueado +     │
│    countdown                                │
└─────────────────────────────────────────────┘
```

### O que sai da home

- "X de Y fechados" sai do `EletivaCard` e do `DashboardGreeting`. Esse número fica em `/app/trilhas` (lá faz sentido, é o mapa).
- `ArchiveSection`, `NextActionHero` legado, `JourneyChips` continuam só atrás do `eletiva_extras_enabled` (já estão).

### O que muda em `/app/trilhas`

Nada estrutural. Continua sendo o mapa completo 4×5 com a contagem total. Vira a única fonte de "panorama".

## 3. Arquivos a tocar

**Dados:**
- Nova migração: zerar `available_from` dos módulos 1 das duas eletivas.

**Home (`src/pages/AppDashboard.tsx`):**
- Remover `WeekCadenceStrip` solto (vira card dentro do novo painel).
- Inserir novo bloco `<DashboardCommandPanel />` abaixo do `EletivaCard`.

**Novo componente `src/components/dashboard/DashboardCommandPanel.tsx`:**
- Lê o mesmo `snapshot` do `useEletivaProgress` (sem refetch).
- 3 cards: cadência, última pílula, atalho tutor.
- Para "última pílula" usa `student_pill_progress` + módulo atual.
- Para "tutor" gera prompt-semente do tipo "tô no módulo NN <título>, me ajuda a destravar" e linka `/app/tutor?seed=...`.

**Limpeza no `EletivaCard.tsx`:**
- Tirar a linha "X de Y fechados" do estado em-andamento (evita duplicar com Trilhas).
- Manter hero do próximo passo intacto.

**`DashboardGreeting.tsx`:**
- Tirar "totalCompleted/totalPublished" da copy. Mantém saudação por horário + dias desde última atividade.

**`TutorPage.tsx`:**
- Aceitar `?seed=...` na URL e injetar como mensagem inicial no input (não envia sozinho, deixa o estudante editar).

**`src/components/eletiva/ModuloLockedHero.tsx`** (se existir lá ou no Modulo.tsx):
- Mostrar horas quando o release está a menos de 24h.

## 4. Fora de escopo

- Não mexer no schema, RLS, edge functions.
- Não mexer no design dos módulos nem na página Trilhas.
- Não trazer vocabulário Chŏra.
- Não adicionar gamificação artificial (streak com chamas, badges).
