## objetivo

eliminar a ambiguidade do "módulo 1 de qual eletiva?" e fechar a primeira trilha de IA na Prática com conteúdo real nos módulos 2 e 3, no mesmo nível editorial do módulo 1.

## parte 1 — rota escopada por slug

### problema atual

`/app/modulo/:number` resolve "qual eletiva" lendo `localStorage("eletiva:active-slug")`. consequências:

- link compartilhado entre estudantes de eletivas diferentes leva pra módulo errado
- ao trocar de eletiva no switcher, atalhos antigos no histórico do navegador apontam pro conteúdo da eletiva anterior
- impossível diferenciar em analytics qual eletiva o aluno está consumindo
- tutor IA e SEO já são por slug, mas o módulo não, o que cria inconsistência

### solução

nova rota canônica: `/app/eletiva/:slug/modulo/:number`. rota antiga `/app/modulo/:number` permanece como **redirect** que resolve o slug ativo via `useActiveEletiva` e faz `<Navigate replace />` pra rota nova. nenhum link existente quebra.

### mudanças

1. **`src/App.tsx`**: adicionar `<Route path="/app/eletiva/:slug/modulo/:number" element={<Modulo />} />`. manter `/app/modulo/:number` apontando pra novo componente `LegacyModuloRedirect` que faz redirect com `replace`.

2. **`src/pages/Modulo.tsx`**: ler `slug` de `useParams`. validar que o módulo pertence ao course com aquele slug; se não, 404 amigável ("esse módulo não faz parte da eletiva X"). passar `courseId` resolvido pra `useEletivaProgress` e pra `scopeModuleNavigation`.

3. **`src/lib/moduleNavigation.ts`**: ajustar `nextModuleHref`/`prevModuleHref` pra incluir `:slug` no path gerado.

4. **`src/components/dashboard/EletivaCard.tsx`** e qualquer outro CTA de módulo: gerar href já com slug (`/app/eletiva/${slug}/modulo/${n}`). buscar usos com `rg "app/modulo/" src/`.

5. **`src/components/eletiva/modulo/ModuloCelebration.tsx`** e `ModuloPillList`: idem, CTAs de "próximo módulo" / "voltar pro mapa" usam slug atual.

6. **`src/lib/seoRoutes.ts`**: registrar pattern `/app/eletiva/:slug/modulo/:n` com mesma policy `noindex` das outras rotas `/app`.

7. **`src/components/SeoRouter.tsx`**: já detecta slug por query/localStorage; estender pra ler slug de `useParams` quando disponível, priorizando-o.

8. **`useActiveEletiva`**: ao montar `Modulo.tsx` com slug na URL, sincronizar `setSlug(slug)` pra manter o resto do app consistente (dashboard, FAB do tutor etc).

### fora de escopo desta parte

- migrar `/app/eletiva/:slug` (já existe e funciona)
- mudar rotas legadas atrás de `ExtrasGate`
- pretty URLs por número nomeado (continua `/modulo/1`, não `/modulo/ia-sem-hype`)

## parte 2 — conteúdo real dos módulos 2 e 3 de IA na Prática

### estrutura herdada do módulo 1 (não muda)

cada módulo = 5 pílulas seguindo a anatomia padrão:

```
pílula A   pilula_editorial      9 min   conceito + vídeo + reflexão
pílula B   pilula_editorial      9 min   técnica + vídeo + reflexão
pílula C   pilula_editorial      8 min   aplicação + vídeo + reflexão
exercício  pbl_estruturado       25 min  mão na massa com prints
registro   checklist_pacto       8 min   síntese + compromissos
```

zero schema novo, zero componente novo. só dados.

### módulo 2 — "prompt como pensamento: como conversar com IA de verdade"

trilha 1 (fundamentos & IA), número 2.

- **pílula A** "o que é prompt (e por que você já sabe fazer)": prompt como pedido contextualizado, comparação com pedir comida pro garçom vs pedir pro robô. vídeo curto YouTube. reflexão: "descreva um pedido seu da última semana que precisou de contexto pra ser bem atendido."
- **pílula B** "as 4 camadas de um bom prompt": papel + tarefa + contexto + formato de saída. exemplo construído ao vivo no texto, partindo de prompt ruim → prompt bom. vídeo de exemplo prático. reflexão: "reescreva um prompt ruim seu usando as 4 camadas."
- **pílula C** "quando o prompt falha (e como corrigir sem culpa)": iteração como conversa, não como acerto único. vídeo. reflexão: "qual foi a última vez que você desistiu de uma IA porque a primeira resposta foi ruim?"
- **exercício PBL** "duelo de prompts": estudante pega uma tarefa real da escola, escreve prompt versão 1 (intuitivo), captura print da resposta, reescreve usando as 4 camadas, captura print, escolhe vencedor e analisa.
- **registro** "meu pacto com prompt": 7 commitments (sempre dar papel à IA, sempre dar contexto, sempre pedir formato, nunca aceitar primeira resposta sem ler, etc) + textarea de outros + reflexão final.

### módulo 3 — "verificar antes de confiar: lidar com alucinação e viés"

trilha 1, número 3.

- **pílula A** "por que IA inventa": modelo de probabilidade, não banco de fatos. analogia: amigo que sempre tem opinião confiante. vídeo. reflexão: "lembre de uma vez que você acreditou numa info errada porque veio com confiança."
- **pílula B** "checagem em 3 passos": fonte primária, segunda fonte independente, faz sentido no meu contexto. vídeo. reflexão: "qual informação você costuma aceitar sem checar?"
- **pílula C** "viés: o que IA aprendeu (e o que ela esqueceu)": viés de dados, viés cultural, ausência de representação. vídeo. reflexão: "pense numa pergunta onde a resposta 'padrão' provavelmente ignora sua realidade."
- **exercício PBL** "caça à alucinação": estudante pede pra IA uma info verificável (dado histórico, citação, estatística), captura print, checa em 2 fontes externas, registra se bateu ou não, escreve o que aprendeu sobre confiar.
- **registro** "meu pacto com checagem": 7 commitments (nunca copiar dado sem checar, sempre citar fonte primária, etc) + textarea + reflexão.

### conteúdo bruto

vou escrever o texto editorial completo (gancho, aprofundamento, destaque, síntese, prompts de reflexão) na hora da inserção. vídeos do YouTube: vou selecionar 6 vídeos curtos (2-4 min) em português, prioritariamente canais brasileiros de educação (Filipe Deschamps, Diolinux, etc) — se nenhum servir, deixo placeholder com instrução clara pro frattz substituir antes de publicar.

### mudanças

1. **migração**: `UPDATE modules` pra título/summary dos módulos 2 e 3 (que hoje estão como placeholders). publicar (`published = true`). adicionar em `module_releases` com data alinhada à cadência semanal (módulo 2 = 7 dias após módulo 1, módulo 3 = 14 dias).

2. **insert de dados**: `DELETE FROM module_pills WHERE module_id IN (m2, m3)` + `INSERT` das 10 novas pílulas (5 por módulo), cada uma com `interaction_schema` completo seguindo os 3 shapes já implementados.

3. **validação**: abrir `/app/eletiva/ia-na-pratica/modulo/2` e `/modulo/3` no preview, confirmar render das 5 pílulas, vídeos embed funcionando, autosave OK, fluxo de celebração disparando.

## ordem de execução

1. migração de dados (módulos 2 e 3) — sem schema novo
2. inserts de conteúdo das 10 pílulas
3. nova rota `/app/eletiva/:slug/modulo/:number` em `App.tsx` + componente `Modulo.tsx`
4. redirect na rota antiga
5. ajustar `moduleNavigation.ts` e CTAs (`EletivaCard`, `ModuloCelebration`, `ModuloPillList`)
6. ajustar `SeoRouter` e `seoRoutes` pro novo pattern
7. teste manual: dashboard → módulo 1 → conclui → próximo (módulo 2) → conclui → próximo (módulo 3) → conclui → volta pro mapa

## fora de escopo

- módulos 4-20 de IA (próxima leva)
- qualquer módulo de Economia Circular
- visual identity diferenciada por eletiva (heroes, cover illustrations, pose-âncora do mascote) — fica pra ciclo de polimento
- email de notificação "próximo módulo liberado em 7 dias"
- bucket dedicado `pbl-evidencias` (continua reaproveitando `radar-evidences`)
- publicar módulos vazios 4-20 como "in progress" — mantemos `published=false` por enquanto

## detalhes técnicos

- nenhuma mudança de schema (tabelas, RLS, triggers continuam intactas)
- 1 migration só de `UPDATE`/`INSERT`/`module_releases`
- ~5 arquivos editados pra rota: `App.tsx`, `Modulo.tsx`, `moduleNavigation.ts`, `EletivaCard.tsx`, `SeoRouter.tsx` + grep de usos residuais de `/app/modulo/`
- 0 componentes React novos
- compat: rota antiga continua resolvendo via redirect, então links em emails antigos, bookmarks e histórico do navegador seguem funcionando
