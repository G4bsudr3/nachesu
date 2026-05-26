## visão geral

o documento do Claude entrega bom **conteúdo** mas propõe **reconstruir a plataforma do zero** (rotas `/modulo-1/pilula-a`, paleta Naveia, Recoleta+DM Sans+Caveat, mascote jabuti, Zustand, mock backend). nada disso se aplica: o NachesU já tem rotas `/app/modulo/:n`, tabelas `modules`/`module_pills`/`module_deliverables`, sistema de pílulas com `interaction_schema`, identidade visual oficial (Perestroika + League Gothic + Urbanist + joão-de-barro) e Lovable Cloud com RLS.

vou **aproveitar 100% do conteúdo** (textos, vídeos YouTube, prompts de reflexão, checklist) e **descartar 100% da arquitetura proposta**. o sinal que sobrevive intacto: ritmo editorial scroll-driven, transições cinematográficas entre momentos, signature moment de celebração no fim do módulo.

## o que muda

### 1. seed do módulo 1 no banco

atualizar via migração:

- `modules` (id `47d80af7…`): título → `IA sem hype: o que ela faz bem (e mal)`, summary curto.
- `module_pills`: substituir as 5 placeholders pelos 5 marcos reais. mesma ordem, mesmo `kind`, mas com:
  - **pílulas A, B, C** → novo schema `pilula_editorial` (ver seção 2) com 5 momentos cada (gancho + vídeo YT + texto + reflexão + síntese).
  - **exercício PBL** → novo schema `pbl_estruturado` (ver seção 3) com form rico + uploads.
  - **registro** → novo schema `checklist_pacto` (ver seção 4) com 7 commitments + textarea livre + reflexão final.

durações: 9/9/8/25/8 min conforme o doc.

### 2. novo componente `PillEditorial`

arquivo `src/components/eletiva/pills/PillEditorial.tsx`. renderiza os 5 momentos verticalmente, com scroll suave e reveal Framer Motion (`fade + rise 400ms`, `cubic-bezier(0.16, 1, 0.3, 1)`, respeitando `prefers-reduced-motion`).

shape do `interaction_schema.type = "pilula_editorial"`:

```
{
  type: "pilula_editorial",
  gancho: { md: string, visual_hint?: string },
  video: { title: string, channel: string, url: string, instruction: string, duration_min?: number },
  aprofundamento: { md: string, destaque: string },
  reflexao: { prompt: string, placeholder?: string },   // salva em deliverable.content.reflections[pillId]
  sintese: { frase: string },
  completion: { label: string }                          // "concluir pílula e seguir"
}
```

elementos visuais:

- cabeçalho da pílula em League Gothic uppercase (mantém identidade).
- "momento N" como marcador minúsculo Urbanist tracking-wide, parecido com o que já existe em `ModuloPillList`.
- `PillVideoPlayer` reaproveitado pro embed YouTube (lite-style placeholder já implementado).
- bloco de destaque: card com fundo `--accent`/10 e tipografia display grande, usando paleta NachesU (rosa Perestroika no número/destaque, não lavender).
- textarea de reflexão com autosave via `useDeliverable` (já existe).
- síntese final: frase grande centralizada, view-height generoso, com `<EletivaSymbol pose="thinking" />` discreto ao lado.
- botão de conclusão na base, fluxo igual aos outros pills.

signature moment opcional (custo baixo): ao concluir uma pílula, fade-out de 400ms da síntese antes de redirecionar pro próximo bloco do módulo.

### 3. novo componente `PillPBLEstruturado`

arquivo `src/components/eletiva/pills/PillPBLEstruturado.tsx`. estende a lógica de `PillPBL` mas com form rico:

- bloco contexto (2 parágrafos curtos).
- 5 passos numerados em cards horizontais (display League Gothic no número).
- form de entrega:
  - textarea "pedido versão A (curto)"
  - upload imagem "print resposta A" → via `EvidenceUploader` (já existe, usa storage Lovable Cloud)
  - textarea "pedido versão B (com contexto)"
  - upload imagem "print resposta B"
  - radio "qual ficou melhor" (3 opções)
  - textarea "por quê"
  - textarea "o que aprendi"
- bloco "dica de tour guide" no rodapé.
- botão "entregar e seguir pro registro".

schema `interaction_schema.type = "pbl_estruturado"`:

```
{
  type: "pbl_estruturado",
  contexto_md: string,
  passos: Array<{ titulo: string, descricao: string, links?: Array<{label, url}> }>,
  campos: {
    pedido_a: { label, placeholder },
    print_a: { label },
    pedido_b: { label, placeholder },
    print_b: { label },
    melhor: { label, options: string[] },
    por_que: { label, placeholder },
    aprendi: { label, placeholder }
  },
  dica_md: string,
  completion: { label: string }
}
```

estado salvo em `module_deliverables.content.pbl_estruturado[pillId]` (jsonb), com paths de storage pras imagens.

**dependência**: bucket de storage `pbl-evidencias` precisa existir com RLS apropriado (user só lê/escreve em pasta `${user_id}/...`). incluído na migração.

### 4. novo componente `PillChecklistPacto`

arquivo `src/components/eletiva/pills/PillChecklistPacto.tsx`. checkboxes estilizados com paleta NachesU (`--primary` rosa quando marcado, não gold). 7 commitments + textarea opcional + textarea de reflexão final + botão de conclusão.

schema `interaction_schema.type = "checklist_pacto"`:

```
{
  type: "checklist_pacto",
  contexto_md: string,
  commitments: string[],
  outros: { label: string, placeholder: string },
  reflexao: { label: string, placeholder: string },
  completion: { label: string }
}
```

estado salvo em `module_deliverables.content.checklist[pillId]`.

### 5. dispatcher

atualizar `src/components/eletiva/modulo/ModuloPillList.tsx` adicionando 3 branches novas no roteador:

- `schemaType === "pilula_editorial"` → `PillEditorial`
- `schemaType === "pbl_estruturado"` → `PillPBLEstruturado`
- `schemaType === "checklist_pacto"` → `PillChecklistPacto`

todos os outros schemas continuam intactos.

### 6. tela de celebração de fim de módulo

ao concluir a última pílula (registro), em vez de só redirecionar, mostrar tela cheia com:

- `<EletivaSymbol pose="celebrating" />` em escala grande
- display League Gothic: "você fechou o módulo 1"
- subtítulo Urbanist: "obrigado por entregar com presença. próximo módulo libera em 7 dias."
- CTA "voltar pro mapa da eletiva" → `/app/eletiva/ia-na-pratica`

implementado em `src/pages/Modulo.tsx` (gate condicional baseado em `is_module_complete`). animação Framer Motion stagger (não usar Lottie por enquanto pra evitar dependência nova — pose celebrating + leve scale-in já dá o efeito).

### 7. seo e copy

- meta title da rota `/app/modulo/1`: dinâmico baseado no título do módulo.
- alt text nas poses do mascote.
- todas as copy lowercase, sem em-dash, sem hashtag, sem emoji em UI, "você" não "tu", "estudante" não "aluno". já há um problema no doc original (vários "Você" capitalizados e "Maiúsculos" em títulos) que vou normalizar.

### 8. ajustes pequenos de tradução tom

- "alucinação" mantida (termo técnico real).
- referência ao "trabalho da escola" mantida (público é ensino médio).
- frases muito longas do doc original quebradas em 2-3 linhas.
- emoji em UI: zero. todos os "✓/☐" trocados por ícones lucide ou phosphor já em uso no projeto (lucide-react já é dependência; manter consistência com o resto).

## o que NÃO muda

- identidade visual (paleta Perestroika + azul Sebrae accent, League Gothic + Urbanist, joão-de-barro).
- rotas (`/app/modulo/:n` continua).
- schema `modules`/`module_pills`/`module_deliverables` (só dados novos, sem mudança estrutural além do bucket de storage e talvez índice).
- `module_releases` (módulo 1 já liberado).
- bloqueio sequencial entre pílulas: NÃO adiciono, conforme alinhamento. progresso visível mas estudante escolhe ritmo.
- gating de pílulas dentro do módulo (todas visíveis).

## ordem de execução

1. **migração**: bucket storage `pbl-evidencias` + RLS + update do módulo 1 (título/summary).
2. **insert de dados**: substituir as 5 placeholders por conteúdo real (pílulas A/B/C com schema `pilula_editorial`, exercício com `pbl_estruturado`, registro com `checklist_pacto`).
3. **componentes**: criar `PillEditorial`, `PillPBLEstruturado`, `PillChecklistPacto`.
4. **dispatcher**: estender `ModuloPillList`.
5. **celebração**: tela de fim de módulo em `Modulo.tsx`.
6. **validação visual**: abrir `/app/modulo/1`, confirmar 5 pílulas renderizando, vídeos embed funcionando, autosave OK, conclusão fluindo.

## fora de escopo (próximas leves)

- módulos 2–20 da eletiva (esse plano é só módulo 1).
- ajustes nas pílulas placeholder dos módulos 2–5.
- conteúdo da eletiva de Economia Circular.
- email de notificação "próximo módulo liberado em 7 dias".
- Lottie animado de check (mascote celebrating já cobre).
- export do entregável em PDF.

## resumo técnico (pra implementação)

- 1 migration: bucket storage + update módulo 1 + (opcional) índice em `module_deliverables(user_id, module_id)`.
- 1 insert grande de dados: 5 linhas em `module_pills` (DELETE das 5 placeholders + INSERT das 5 novas, mesmas posições).
- 3 componentes React novos (~150-250 linhas cada).
- 1 extensão no dispatcher (`ModuloPillList`).
- 1 ajuste em `Modulo.tsx` pra celebração.
- 0 mudanças em rotas, auth, schema base, identidade visual.