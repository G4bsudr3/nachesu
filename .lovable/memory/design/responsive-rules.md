---
name: Responsive rules
description: Regras anti-regressão de layout, overflow, scrollbar, touch targets, decoração absoluta
type: design
---

# Regras responsivas

## Decoração absoluta (lágrima, estrela, balão)
- Sempre atrás do texto: `z-0` no elemento decorativo + `relative z-10` no container do conteúdo
- `pointer-events-none` sempre
- No mobile, reduzir tamanho ou usar variante menor (ex: lágrima 80px mobile vs 120px desktop) pra não invadir cabeçalho/título
- Nunca posicionar decoração sobre área de leitura sem garantir z-index abaixo

## Layout base
- `min-h-dvh` em vez de `min-h-screen` quando possível
- `overflow-x: clip` global no body pra evitar scroll horizontal de elementos absolutos
- Nunca editar `App.css` fora do reset

## Touch targets
- Mínimo 44x44px em qualquer botão/link clicável no mobile

## Tipografia hero
- Usar `display-clamp-hero` / `display-clamp-section` (clamp responsivo) em títulos display
- Quebra explícita com `<br />` ou `<span className="block">` em headings de impacto
