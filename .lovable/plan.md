# 4 vídeos InvestNews como pílulas bônus

## O que muda pro estudante

4 novas pílulas bônus opcionais em módulos da Eletiva de IA. Não bloqueiam, não somam obrigação, ficam ao final de cada módulo com um selo de "bônus".

## Mapeamento (definido com você)

| vídeo | módulo | por que ali |
|---|---|---|
| ia no dia a dia — tarefas agendadas do chatgpt | **T1 mód 4** (no-code e low-code) | mostra ia como rotina, não como ferramenta pontual |
| humanizar textos, cara de ia | **T1 mód 3** (verificar antes de confiar) | reforça prompt como habilidade, casa com o clima de "não copia sem pensar" do módulo |
| chatgpt work / agentes da openai | **T1 mód 5** (apresentando o lovable) | fecha fundamentos abrindo horizonte pra construção |
| slides com ia | **T3 mód 15** (teste de fumaça) | utilitário direto pra montar apresentação do MVP |

## Como fica na tela

Cada bônus vira uma pílula extra no fim da lista do módulo, com:
- rótulo "bônus opcional" (não bloqueia conclusão)
- vídeo embedado do youtube
- 1 pergunta curta de reflexão (opcional, salva se responder)
- microcopy: "não precisa. mas se sobrar 5 minutos, vale."

Módulos 3, 4 e 5 já estão publicados. Bônus opcional não afeta quem já concluiu (aparece como novo item disponível, sem redefinir status).

## Detalhes técnicos

- 4 inserts em `module_pills` via migração de dados.
- `kind = 'pilula_c'` (enum não tem "bonus"; mesmo padrão já discutido pros Karnal).
- `order_index = 6` (após os 5 slots atuais 1-5).
- `required = false`.
- `interaction_schema = { type: 'video_embed', provider: 'youtube', embed_url: 'https://www.youtube.com/embed/<id>' }`.
- Renderiza via `PillVideoEmbed` já existente em `src/components/eletiva/pills/`.
- Título de cada pílula começa com "bônus:" pra ficar claro na lista.
- `published = true` nos 4 registros.

Nenhuma mudança de código, componente ou schema. Só data.

## Reflexão sugerida por vídeo (você pode ajustar antes de eu rodar)

- **mód 3 — humanizar:** "qual dica te fez pensar 'preciso fazer isso' quando for usar ia?"
- **mód 4 — tarefas agendadas:** "que rotina sua daria pra automatizar com ia?"
- **mód 5 — agentes:** "se ia vira agente que faz tarefa sozinha, o que muda no que você quer construir?"
- **mód 15 — slides:** "qual parte do teu pitch tu quer testar com uma dessas ferramentas?"

*(se preferir sem campo de reflexão, uso só `PillVideoEmbed` puro, mais leve.)*

## Verificação depois

- Query nos 4 módulos confirmando 6 pílulas cada.
- Abrir mód 3 e mód 15 no preview, checar que o bônus aparece separado, não trava conclusão e o iframe carrega.
