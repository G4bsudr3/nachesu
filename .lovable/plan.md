# Tela de marco entre trilhas

Hoje só existe um banner inline (`TrailTransitionBanner`) no topo do primeiro módulo da próxima trilha. O signature moment combinado no plano crítico anterior é uma **tela cheia dedicada**, disparada **ao concluir** o último módulo de uma trilha, com mascote em pose `celebrating`. Esta tarefa cria essa tela e mantém o banner como reforço pra quem pular.

## Rota e arquivo
- Nova rota `/app/eletiva/:slug/marco/:trail` (trail = order_index da trilha que acabou: 1 | 2 | 3 | 4) em `src/App.tsx`, protegida por `ProtectedRoute`, lazy import.
- Novo arquivo `src/pages/Marco.tsx`.

## Disparo
Em `src/pages/Modulo.tsx`, no `onSuccess` da `completeMutation` (e também no auto-complete do `togglePillMutation` quando todas as pílulas obrigatórias viram done):
- Após `invalidateQueries`, recalcular se o módulo recém-concluído é o **último** da trilha (maior `order_index` dentro do `trail_id`).
- Se sim e existir próxima trilha (não é a última do curso), `navigate(\`/app/eletiva/${slug}/marco/${trail.order_index}\`, { replace: false })`.
- Se for a última trilha do curso (toda a eletiva completa), navegar pro mesmo path com `trail = 4` mas variante "fim da eletiva" (a página decide pelo conteúdo).

Sem estado novo no banco: a tela apenas exibe; a "memória" de já ter visto continua sendo o `localStorage` (mesma chave do banner, pra banner não reaparecer).

## Tela `Marco.tsx`
- `PageShell` sem `PageHeader` (imersivo). `min-h-dvh`, fundo `bg-perestroika-preto text-perestroika-bege`, faixa colorida no topo com a cor da trilha concluída.
- Sequência com Framer Motion:
  1. Eyebrow `fim da trilha N · {título}` (fade-in 0.1s).
  2. `<EletivaSymbol pose="celebrating" size={220} />` com leve `scale-in` + rotação sutil (0.2s).
  3. H1 League Gothic gigante (até 7xl), mensagem por trilha (reusa o mapa de `trailMessages` já em `TrailTransitionBanner` — extraído pra `src/lib/trailMessages.ts`).
  4. Sub em Urbanist (max-w-lg).
  5. Linha de progresso visual: 4 chips de trilha (preenchidos até a trilha concluída).
  6. Bloco "o que vem a seguir": título + primeira frase da próxima trilha.
  7. CTA primário "começar trilha {N+1}" → navega pro primeiro módulo da próxima trilha. CTA secundário "voltar pro início" → `/app`.
  - Variante "fim da eletiva" (trail = última do curso): mensagem específica, sem "próxima trilha", CTA primário "ver minha eletiva" → `/app/eletiva/:slug`.
- Carregamento: usa `useEletivaProgress(slug)` (hook existente) pra descobrir trilhas, próxima trilha e primeiro módulo dela. Skeleton enquanto carrega.
- Acessibilidade: respeitar `prefers-reduced-motion` (variants curtos). Mascote com `role="img" aria-label="joão-de-barro celebrando"`.
- Marca o `localStorage` `trail-transition-{nextTrailId}` ao montar (pra suprimir o banner duplicado no próximo módulo).

## Refatoração mínima
- Extrair `trailMessages` pra `src/lib/trailMessages.ts` e importar tanto em `TrailTransitionBanner.tsx` quanto em `Marco.tsx` (única fonte de verdade pra copy).

## Não-objetivos
- Sem migration de banco (sem `trail_milestones` table). Persistência só em localStorage, idêntico ao banner.
- Sem confetti/áudio/Lottie (ficaria pra polish posterior). Pose `celebrating` + tipografia gigante já entregam o signature moment.
- Sem alteração no banner existente (continua funcionando como fallback no primeiro módulo da próxima trilha).
- Sem mudança em RLS ou edge function.

## Arquivos
- novo: `src/pages/Marco.tsx`
- novo: `src/lib/trailMessages.ts`
- editado: `src/App.tsx` (rota + lazy import)
- editado: `src/pages/Modulo.tsx` (disparo do navigate no `onSuccess` das duas mutations)
- editado: `src/components/eletiva/modulo/TrailTransitionBanner.tsx` (passar a importar `trailMessages` de `@/lib/trailMessages`)
