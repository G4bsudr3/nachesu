## Home neutra com dois CTAs no hero

Hoje o hero da home se "veste" da eletiva ativa: kicker, parágrafo e botão único trocam pra ia na prática ou economia circular conforme o seletor. Isso confunde quem cai na home pela primeira vez — parece que a página é só de uma das duas.

A mudança deixa o hero **neutro** (fala das duas) e mantém **dois botões fixos**, um pra cada eletiva. O resto da página (seção `#eletivas` com cards, comparação lado a lado, `#facilitadores`, `#trilhas`) continua igual e segue respondendo ao seletor.

### O que muda no hero (`src/pages/Index.tsx`, ~315-362)

**Kicker** — em vez de "sua escolha · ia na prática · com frattz", mostra os dois rótulos com bolinhas de cor:
- bolinha rosa + "ia na prática · com frattz"
- separador
- bolinha azul + "economia circular · com dudu"

**Título** — mantém "duas eletivas. um nachesu." (já é neutro, ✓).

**Subtítulo** — vira fixo, sem `AnimatePresence`/troca por aba:
> duas portas, mesmo combinado: 20 semanas, tutor ia do lado e um projeto seu no ar no fim. escolha por onde quer entrar.

**CTAs** — dois botões lado a lado (empilham no mobile), cada um com a cor da própria eletiva:
- rosa "entrar em ia na prática →" (rosa `#f756a6`)
- azul "entrar em economia circular →" (azul `#6f77fc`)
- link secundário "comparar as duas ↓" rolando pra `#eletivas` (em vez do "ver as 4 trilhas" atual, porque a comparação faz mais sentido como próximo passo neutro)

Cada botão, no hover/focus, ainda atualiza o `activeTab` (via `setActiveTab`) pra que se o usuário voltar pra cima depois de explorar uma eletiva o seletor reflita a última intenção. Mas a navegação principal (`/auth`) é a mesma — quem clica vai pro fluxo de entrada.

### O que NÃO muda

- Seletor de eletiva no header sticky (mobile + desktop) continua existindo. Ele agora serve pras seções de baixo (`#eletivas` cards, comparação, `#facilitadores`, `#trilhas`), não pro hero.
- Mascote `celebrating` no canto superior direito do hero, fixo.
- Todas as outras seções continuam reagindo ao `activeTab` como hoje.

### Arquivo tocado

```text
edit: src/pages/Index.tsx  (apenas o bloco do hero, linhas ~315-362)
```

Sem mudanças de schema, rotas, componentes novos ou copy fora do hero.
