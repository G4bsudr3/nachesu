---
name: artwork-system
description: Sistema de geração de arte por arquétipo (Nano Banana Pro): motifs v3, variáveis procedurais, presets, comportamento make_current, propagação
type: design
---

# Sistema de artwork por arquétipo

## Arquitetura
- 1 arte ativa por arquétipo em `archetype_artworks` (linha única por arquétipo)
- `archetype_artwork_versions` guarda histórico completo, com `is_current` única por arquétipo
- Aluno NUNCA escolhe arte: recebe a `is_current` do arquétipo dele
- Quando `is_current` muda (via gerar com `make_current=true` ou via `restore-archetype-artwork`), propaga `image_url` automaticamente em TODAS `builder_cards` daquele arquétipo
- Modelo: `google/gemini-3-pro-image-preview` (Nano Banana Pro)
- Versionamento de seed: `:v3` (CORE_TEMPLATE + motifs reescritos do documento; não comparar com seeds anteriores)

## Comportamento de geração (importante — mudou)
- Edge function aceita `make_current?: boolean` (default `false`)
- `false`: insere no histórico (`is_current=false`), NÃO atualiza `archetype_artworks`, NÃO propaga pras `builder_cards`. Versão antiga continua ativa intocada.
- `true`: comportamento legado — vira ativa + propaga
- Admin escolhe qual versão (antiga ou nova) vira a ativa pelo botão "definir como ativa" no histórico, que chama `restore-archetype-artwork`

## Motifs corrigidos (versão v3 — fonte de verdade no edge function)
Os 6 motifs completos vivem em `supabase/functions/generate-archetype-artwork/index.ts` em `ARCHETYPE_MOTIFS`. Resumo:
- **Visionário**: lágrima upper-third comprimida + 3 linhas paralelas azuis horizonte + triângulo {accent} pra cima + 7-11 dots pretos lower-third
- **Artesã**: lágrima central maior + lattice hexagonal {accent} estilo quilt (não concêntrico) + alguns outline-only/half-fill/missing + 1 hexágono rosa offset
- **Experimentador**: lágrima tilt 15° + balão serrado vermelho direcional pelo {composition} + splashes {accent} + triângulos laranja
- **Conectora**: lágrima central grande + EXATAMENTE 5 lágrimas menores (orange/red/pink/blue/full-gradient) com breathing space, conectadas por linhas pretas finas + triângulos de relação + círculo azul fino atrás
- **Pragmático**: grid bauhaus 70% (retângulo preto left-third + retângulo laranja middle-horizontal + quadrado vermelho na interseção) + linha azul horizontal + quadradinho {accent}
- **Narradora**: lágrima lower-center + ribbon rosa lower-left→upper-right passando atrás + echo-ribbon {accent} paralelo + trail de dots pretos

Os motifs usam o placeholder `{ACCENT_HEX}` que `buildPrompt` substitui pelo `accent` resolvido.

## Variáveis procedurais (5)
- `composition`: centered / off-center / asymmetric
- `density`: sparse / medium / dense
- `accent`: orange / red / pink / blue (qual cor domina entre os apoios)
- `rotation`: static / tilt / dynamic
- `noise`: subtle / medium / heavy (granulado Risograph)

## Presets
- `ousado`: density=dense, rotation=dynamic, noise=heavy (resto via hash do seed)
- `clean`: density=sparse, rotation=static, noise=subtle (resto via hash do seed)

## Resolução de variáveis (na edge function)
1. `variables` explícito (admin escolheu nos 5 selects) → maior prioridade
2. `preset` aplica overrides em cima da base
3. Base = SHA-256(`${seed}:${archetype}:v3`) → 5 picks
4. Sem `seed` = `crypto.randomUUID()`
5. Sempre salva `seed` + `variables` + `preset` na linha do histórico (pra reproduzir/filtrar)

## Restrições visuais (hard constraints no prompt)
- Paleta: somente os 6 hex Perestroika (bege #f2e4d8 dominante ~60%, laranja #fe7b02, vermelho #fd4644, rosa #f756a6, azul #6f77fc, preto #090909)
- Sem texto, letras, números, logos, watermarks
- Sem rosto humano, sem foto realista, sem 3D
- Sem drop shadow, chrome, glassmorphism, AI-gradient roxo-magenta-ciano
- Sem mandala, tarot, aurora, "spiritual radiance"
- Sem moldura/borda (a carta adiciona o frame)
- Aspect ratio 3:4 vertical (1080×1440 referência)

## Body do edge function
`{ archetype, seed?, variables?, preset?, make_current? }` onde `preset ∈ "ousado" | "clean"` e `make_current` default `false`.

## Fora de escopo
- Não tocar em `generate-builder-card` (texto da carta)
- Não tocar em schema de `builder_cards`
- Não recriar `generate-builder-card-image`
