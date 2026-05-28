# Diagnóstico + auditoria mobile

## o que provavelmente aconteceu no seu login

A combinação "joão tá pensando" + "precisa publicar o projeto" ao recarregar é um sintoma clássico do **ambiente de preview do Lovable em mobile**, não do código do app:

- "joão tá pensando" = `RootErrorBoundary` capturou uma exceção JS (provavelmente no `signInWithPassword` ou em algo que tentou rodar logo após o login)
- "precisa publicar o projeto" = mensagem do **wrapper do preview** (`id-preview--...lovable.app`), não da nossa aplicação. Acontece quando o iframe perde estado em mobile

O auth real em `nachesu.lovable.app` (URL publicada) costuma funcionar nesse cenário. Antes de qualquer fix, **plano passo 1 = reproduzir no domínio publicado pra separar bug de app vs bug de preview**.

## o plano

### 1. reproduzir e isolar (sem mexer em código ainda)
- Abrir `https://nachesu.lovable.app` no mobile (não o preview), tentar login com `mateusfrattezi@gmail.com`
- Se funcionar: era preview-only, seguimos só com a auditoria de UX
- Se quebrar de verdade: capturar a stack via logs do Supabase (`auth_logs` + Edge logs) e do RootErrorBoundary (já loga via `logger.error`)
- Os logs de auth recentes mostram login 200 OK com seu user às 08:07, então **a request em si está passando** — o crash é client-side pós-login

### 2. auditoria mobile sistemática (842x682 hoje, mas testar 375x812 e 414x896)
Rotas críticas a validar visualmente + funcionalmente no viewport mobile:

```text
público
 ├─ /                     index/landing
 ├─ /auth                 login + magic link
 ├─ /reset-password       fluxo recuperação
 └─ /pending              conta aguardando aprovação

aluno
 ├─ /app                  dashboard (hero + switcher + cadência)
 ├─ /app/eletivas         lista de matrículas
 ├─ /app/eletiva/:slug    fallback eletiva
 ├─ /app/modulo/:n        módulo (pílulas + PBL + registro)
 ├─ /app/trilhas          mapa de trilhas
 ├─ /app/tutor            chat joão-de-barro
 ├─ /app/notificacoes     avisos
 └─ /app/conta            settings
```

Checks por tela: nav mobile fixa não cobre conteúdo (padding-bottom respeitado), touch targets ≥ 44px, scrollbar sem overflow horizontal, decoração absoluta atrás do texto, headings legíveis, CTAs alcançáveis com polegar, sem flash de loading infinito.

### 3. blindar o caminho de login no client
Mesmo que o crash venha do preview, vale endurecer o que rodar **após** o `signInWithPassword` no `Auth.tsx`:
- Garantir try/catch em volta de qualquer fetch pós-login (perfil, role, enrollments) pra não derrubar a tela inteira via boundary
- Confirmar que `useProfileStatus` + `useUserRole` lidam com `null` sem throw
- Verificar redirect pós-login em mobile (window.location vs navigate)

### 4. signature moment do erro (sem mexer no copy se já estiver bom)
O `RootErrorBoundary` atual já tem joão thinking + 2 CTAs (recarregar / voltar pro início). Validar que renderiza bem em 375px e que o link "voltar pro início" não cai num loop se o erro for no próprio `/app`.

### 5. entregáveis ao final
- Lista de bugs mobile encontrados + correção de cada (commit por área: auth, dashboard, módulo, nav)
- Confirmação se o crash original foi preview-only ou app real
- Print do dashboard mobile pós-fix pra você validar

## fora de escopo
- Refazer design mobile do zero
- Mudar fluxo de auth (magic link vs senha) — só blindar o que existe
- Mexer em RLS, schema ou edge functions (a menos que apareça erro real lá)

## perguntas antes de começar
1. Quer que eu já reproduza no `nachesu.lovable.app` via browser tool (mobile viewport) **agora** pra confirmar se o bug original é preview-only? (recomendo sim — economiza horas de caça-fantasma)
2. Algum fluxo mobile que você sabe que tá especialmente ruim e quer priorizar? (ex: módulo, tutor, switcher de eletiva)
