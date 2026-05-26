## o que existe hoje

a base nasceu como chŏra lovable hub e o fluxo legado (fbi, carta de builder, pré-work, missões, hub da turma, tutorial chŏra) já está gateado atrás de `eletiva_extras_enabled` ou movido pra `src/pages/legacy/`. então o aluno nachesu **não vê** essas páginas — elas continuam intocadas pro caso da flag ser religada.

mas alguns termos legados ainda vazam pra dentro da jornada viva do aluno em copy hardcoded, em rótulos de navegação ("hub") e no microcopy de auth. é exatamente isso que precisa ser revisto.

## escopo (páginas vivas, vistas pelo aluno)

### 1. `src/pages/Auth.tsx`
- `entrar no hub` → `entrar na nachesu`
- `cai direto no hub` (texto pós-envio do link mágico) → `cai direto na sua eletiva`
- branch `fromCarta`: copy fala em "use o email com que você respondeu o fbi". esse fluxo só dispara em link de carta legado, mas a copy ainda renderiza. trocar pra `use o email do convite da escola sebrae.` (mantém o ramo funcionando pra quem ainda tem link antigo)
- chaves de localStorage (`chora.lastEmail`, `chora.fromCartaToken`) ficam — são internas, sem custo de migração e quebrariam sessões salvas se mudasse

### 2. `src/components/auth/FirstTimeChecklist.tsx`
checklist da imagem que o usuário enviou.
- passo 1 desc: `o mesmo do fbi ou do convite` → `o mesmo do convite da escola sebrae`
- passo 3 desc: `cai direto no hub` → `cai direto na sua eletiva`
- `LS_KEY = "chora.authChecklistDone"` fica (key interna)

### 3. `src/pages/Eletivas.tsx` (landing pública das duas eletivas)
descrição da eletiva 01:
- `uma jornada de 20 semanas pra você sair da ideia ao app publicado, com tutor ia provocando builder do seu lado.`
- problema: "jornada" e "builder" são anti-vocabulário; "20 semanas" não bate com formato (16h40min, ~20 módulos semanais mas a leitura de "20 semanas" soa pesada pro aluno do 1º ano).
- substituir por: `20 módulos curtos pra você sair da ideia ao app no ar, com o tutor ia te provocando do seu lado.`

### 4. `src/pages/HubMateriais.tsx`
- breadcrumb topo `← hub` → `← início`, com `to="/app"`
- empty state `voltar pro hub` → `voltar pro início`
- (o nome do arquivo + rota `/app/hub/materiais` ficam — quebrar URL invalida deeplinks; só a copy visível muda)

### 5. comentários internos `src/pages/AppDashboard.tsx`, `src/pages/MinhasEletivas.tsx`
não são visíveis pro aluno, mas o comentário `extras pós-evento Chŏra` e o nome `ChoraBotFab` no JSX continuam. **não mexer** — é nome de componente interno, refator de identidade pura. o que importa é que o FAB renderiza com label `tire sua dúvida` e leva pro `/app/tutor` (já correto).

## fora do escopo (intencional)

- `src/pages/legacy/*` — páginas só renderizam atrás da flag; manter literal o vocabulário chŏra ali é correto, é o produto antigo.
- `src/pages/Onboarding.tsx`, `Missions.tsx`, `Prework.tsx`, `Tutorial.tsx`, `MinhaCarta.tsx` — todas gateadas via `ExtrasGate`. não tocar.
- componentes `HubGateway`, `ArchiveSection`, `JourneyChips`, `NextActionHero` — só renderizam dentro de `{extrasEnabled && (...)}` no AppDashboard. não tocar.
- nomes de arquivos/rotas (`HubMateriais.tsx`, `/app/hub/materiais`, `ChoraBotFab.tsx`, `ChoraLogo.tsx`) — refator de naming interno está fora do pedido ("termos nas páginas"), e renomear rotas quebra links salvos. esses nomes nunca aparecem pro aluno.
- `src/integrations/supabase/types.ts`, schema do banco — não mexer.

## verificação

depois de implementar:
1. abrir `/auth` → checklist da imagem deve mostrar `o mesmo do convite da escola sebrae` e `cai direto na sua eletiva`. h1 deve dizer `entrar na nachesu`.
2. submeter email → tela de "olha o email" deve dizer `cai direto na sua eletiva`.
3. abrir `/eletivas` → card da eletiva 01 não deve mais conter `jornada` nem `builder`.
4. abrir `/app/hub/materiais` (aluno logado, matriculado) → breadcrumb topo diz `← início`, empty state diz `voltar pro início`.
5. rodar `rg -n "\bhub\b|\bbuilder\b|\bfbi\b|\bjornada\b" src/pages/Auth.tsx src/pages/Eletivas.tsx src/pages/HubMateriais.tsx src/pages/AppDashboard.tsx src/pages/MinhasEletivas.tsx src/components/auth/FirstTimeChecklist.tsx` → só deve sobrar referência a rota (`to="/app/hub/materiais"`), não copy visível.
