
# Aula 7 · vazamento vira oportunidade

Mantém o mesmo padrão de Aula 6 (5 blocos, mesma linguagem visual, mesmos componentes-base) e adiciona uma nova pílula interativa: a **matriz Vazamento → Oportunidade**, que puxa automaticamente os vazamentos que o estudante escreveu na Aula 6.

## Anatomia dos 5 blocos

1. **Abertura** (pilula_a, ~3-5 min) — vídeo + transcript colapsável. Headline "onde há vazamento, há valor não capturado".
2. **Conteúdo curado** (pilula_b, ~12-18 min) — 2 cards (7 desperdícios do Lean · case Ambev Zero Aterro) + 3 perguntas-guia (1 múltipla escolha + 2 texto longo). Usa o componente `curated_content_with_questions` já existente.
3. **Missão 7** (exercicio_pbl, ~18-28 min) — nova pílula `matriz_valor` com tabela 5×5, vazamentos pré-preenchidos do módulo 6, dropdown de tipo, validação de diversidade e beneficiário nomeado.
4. **Checagem** (pilula_c, ~5-8 min) — quiz padrão (1 cenário + 1 multi-select + 1 texto longo). Usa o componente `quiz` existente.
5. **Bônus** (registro, ~8-12 min) — podcast Café com ESG, com campo de reflexão. Usa `bonus_text` existente.

## A matriz Vazamento → Oportunidade

Tabela editável de 5 linhas com estas colunas:

```text
| vazamento (auto)   | tipo (dropdown)      | valor perdido | oportunidade | quem se beneficiaria |
|--------------------|----------------------|---------------|--------------|----------------------|
| [do mapa aula 6]   | material/tempo/…     | R$/h/kg/…     | descrição    | pessoa/grupo nomeado |
```

- **Pull automático**: lê `mapa_fluxo_aula6[pill_id].vazamentos` do deliverable do módulo 6 e pré-preenche a coluna "vazamento" (mínimo 5 linhas; se o mapa tiver menos, mostra placeholder "volta ao Encontro 6 e cava mais 3 vazamentos" com link direto).
- **Dropdown Tipo**: material · tempo · energia · potencial humano · informação/conhecimento.
- **Valor perdido**: campo livre curto (aceita "R$ 200/mês", "8 kg/dia", "3 h/semana"…).
- **Oportunidade** e **beneficiário**: textareas curtas.
- **Validações antes de liberar entrega**:
  - 5 linhas com todos os campos preenchidos
  - pelo menos 3 tipos diferentes selecionados (evita "só material")
  - beneficiário bloqueia termos genéricos: "todos", "todo mundo", "sociedade", "comunidade", "as pessoas" (mensagem in-line pedindo nome específico)
- **Autosave** a cada mudança (mesmo padrão da Aula 6).

## Tela de conclusão

Depois de completar todos os itens, aparece `ModuloConclusaoMatrizValor`:
- headline "missão 7 cumprida" + as 5 linhas resumidas em cards visuais.
- destaque da resposta "mais promissora" (P3 da checagem).
- CTA "voltar pra eletiva".

## Dashboard admin

Rota nova `/admin/eletiva/economia-circular/modulo/7` com:
- KPIs: matriculados · concluíram · entregaram matriz · com beneficiário nomeado · nº médio de tipos diferentes
- Distribuição dos tipos de vazamento escolhidos pela turma (barra horizontal)
- Amostras: últimas 20 entregas com nome, 1ª oportunidade e beneficiário

## Detalhes técnicos

**Arquivos novos**
- `src/components/eletiva/pills/PillMatrizValor.tsx` — nova pílula interativa
- `src/components/eletiva/modulo/ModuloConclusaoMatrizValor.tsx` — tela pós-conclusão
- `src/pages/AdminEletivaModulo7.tsx` — dashboard admin

**Arquivos editados**
- `src/components/eletiva/pills/index.ts` — exporta `PillMatrizValor` + tipo `MatrizValorValue`
- `src/components/eletiva/modulo/ModuloPillList.tsx` — registra schema `matriz_valor`
- `src/pages/Modulo.tsx` — monta a tela de conclusão quando `number === 7`
- `src/App.tsx` — registra rota admin

**Schema do deliverable** (segue o mesmo padrão de aula 6, tudo dentro de `module_deliverables.content`):

```json
{
  "matriz_valor_aula7": {
    "<pill_id>": {
      "linhas": [
        { "vazamento": "...", "tipo": "material", "valor_perdido": "...", "oportunidade": "...", "beneficiario": "..." }
      ],
      "mais_promissora_index": 2
    }
  }
}
```

**Interaction schema** da pílula 3 (guarda o módulo-fonte pra pull automático, como já foi feito no `briefing_source_module_id` da Aula 5):

```json
{
  "type": "matriz_valor",
  "mapa_source_module_id": "29e2d414-53ad-494f-8856-3d4a7caed582",
  "min_linhas": 5,
  "min_tipos_diferentes": 3,
  "beneficiario_bloqueio": ["todos","todo mundo","sociedade","comunidade","as pessoas","gente"]
}
```

**RPC admin**
- `admin_module7_matriz_valor_stats(_course_slug, _module_number)` retorna JSONB com `kpis`, `tipo_distribution` e `samples`. `SECURITY DEFINER` com checagem `has_role(auth.uid(),'admin')`, `GRANT EXECUTE ... TO authenticated`.

**Seed em migração**
- Atualiza título e objetivo do módulo 7.
- `DELETE` das pílulas antigas de placeholder e `INSERT` das 5 novas com todo o `interaction_schema` conforme briefing.

## Pontos a confirmar antes de implementar

- **Vídeo da abertura**: mantenho `video_placeholder: true` (mesmo padrão das outras aulas) e o transcript já entra no ar. Você sobe o vídeo depois.
- **Links do conteúdo curado**: uso os que você indicou (Voitto + busca Ambev Zero Aterro) com o mesmo disclaimer que a gente já tem no bônus da Aula 6 ("o link específico pode mudar").
- **Podcast bônus**: search_url pro Spotify + campo de reflexão livre, sem obrigatoriedade.

Se algum desses três pontos merece ajuste, me diz antes de eu partir pra construção.
