# tempo real das aulas iniciais: diagnóstico e rebalanceamento

## o que os dados mostram

todo módulo promete `50 min` no header, mas a soma das pílulas publicadas conta outra história.

ia na prática, módulos 1 a 5 (piso a teto, em minutos):

```text
mod 1  57 - 66     mod 2  47 - 59     mod 3  56 - 70
mod 4  46 - 64     mod 5  53 - 74
```

economia circular, módulos 1 a 5:

```text
mod 1  50 - 55     mod 2  38 - 70     mod 3  43 - 66
mod 4  48 - 74     mod 5  48 - 74
```

duas conclusões:

1. sim, as aulas iniciais de ia na prática estouram os 50 min já no piso (mod 1, 3 e 5). o estudante que faz tudo na ordem gasta perto de 1h10 nos módulos pesados.
2. economia circular estoura no teto, mas o piso fica em 38-50 porque o bônus está claramente marcado como opcional (`bonus_text`, título com "(opcional, ~10 min)", pílula mostra "opcional" e "você pode pular sem prejuízo"). ia na prática **não tem essa marcação**: os vídeos bônus dos módulos 3, 4 e 5 são `video_embed` com cta "vi, bora pra missão", parecendo obrigatórios e entrando no tempo total.

ou seja: o problema principal não é excesso de conteúdo, é **falta de contrato claro sobre o que é núcleo e o que é referência bônus**.

## proposta

### 1. contrato de tempo explícito (núcleo vs bônus)

- marcar pílula opcional no `interaction_schema` com `optional: true` (mesma convenção pros `bonus_text` da economia circular e pros `video_embed` bônus da ia).
- `ModuloPillList`: badge "bônus" na linha da pílula opcional, tempo em cinza, sem contar no progresso obrigatório.
- `PillVideoEmbed`: recebe estado opcional, ganha rótulo "bônus opcional", microcopy "isso é referência extra, dá pra seguir sem ver" e cta neutro ("pular" ao lado de "já vi").
- `ModuloHeader`: em vez de `50 min` fixo, mostrar `~45 min de núcleo · +12 min de bônus`, calculado das pílulas.

### 2. rebalancear ia na prática 1 a 5 pra caber em 50 min de núcleo

alvo: núcleo (vídeo/editoriais + pbl + fechamento) entre 42 e 50 min. tudo que sobra vira bônus marcado.

- **mod 1**: "quem tá por trás disso" (6-7 min, apresentação do educador) vira bônus opcional. núcleo cai pra ~50-59; ajustar a pbl "duelo de respostas" pra 18-22.
- **mod 3**: vídeo bônus já é bônus, só marcar. pbl "caça à alucinação" 22-28 → 18-24. núcleo ~42-49.
- **mod 4**: vídeo bônus marcado. pbl 20-28 → 18-24. núcleo ~40-48.
- **mod 5**: o mais pesado. a pbl "sua primeira construção publicada" (25-35) é o coração da eletiva, então ela fica; corto uma das 3 editoriais pra 5-7 min cada e movo "bônus: agentes" pra opcional. núcleo ~45-55, com aviso honesto no header de que esse módulo é o mais longo.

### 3. economia circular: só marcação, sem redistribuir

o desenho já está bom. ação: aplicar o mesmo `optional: true` nos 20 `bonus_text` para o cálculo de "núcleo vs bônus" ficar coerente entre as duas eletivas, e padronizar o título tirando o "(opcional, ~10 min)" agora redundante.

### 4. sinal honesto quando o módulo é mais longo

quando o núcleo passar de 50 min mesmo depois do ajuste, o header mostra "~55 min, esse é mais denso" em vez de mentir 50. tempo estimado explícito é regra do projeto; melhor um número verdadeiro que um redondo.

## detalhes técnicos

- migração: `update module_pills set interaction_schema = interaction_schema || '{"optional":true}'` nos bônus, e ajustes de `duration_min_low/high` dos módulos 1-5 de ia.
- `modules.total_minutes` deixa de ser a fonte do header; o header passa a somar as pílulas publicadas (fallback pra `total_minutes` se não houver pílula).
- arquivos tocados: `ModuloHeader.tsx`, `ModuloPillList.tsx`, `PillVideoEmbed.tsx`, `PillBonus.tsx` (só rótulo), e uma migração sql.
- progresso do módulo continua exigindo só as pílulas não opcionais, o que também conserta a sensação de "não fecha 100%".

## fora de escopo

não mexo em conteúdo de texto das pílulas nem na ordem dos módulos da economia circular.
