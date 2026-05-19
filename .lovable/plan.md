## Plano — 3 primeiras aulas de IA na Prática

Tudo acontece no banco (insert/update em `module_pills`, `modules`, `module_releases`). Zero código novo — a infra de pílula/PBL/registro já tá pronta.

### Módulo 1 — boas-vindas: por que ia agora
Já completo, publicado e liberado. Vou **dar uma revisada leve** no body_md das pílulas pra:
- alinhar tom (você, não tu; remover qualquer em-dash residual)
- garantir que a pílula C de vídeo (oficial Lovable) ainda tem URL válida
- ajustar o exercício PBL pra dizer claramente que o tutor responde dentro da plataforma

Sem mudar estrutura nem tempos.

### Módulo 2 — conversando com a máquina
Já tem o esqueleto das 5 pílulas no banco (sem corpo). Vou escrever:

| pílula | título | conteúdo |
|---|---|---|
| A (4-5 min) | o que é um prompt | texto: prompt como pedido estruturado, comparação prompt vago × prompt preciso, exemplo escolar |
| B (6-7 min) | os 4 pilares de um bom prompt | contexto, papel, tarefa, formato. exemplo guiado refazendo um pedido de redação |
| C (5-6 min) | iteração: prompt nunca nasce pronto | ciclo prompt → análise → refino. 3 versões do mesmo pedido lado a lado |
| PBL (20-25 min) | refazendo um prompt teu | escolhe 1 pedido real (dever, pesquisa, criação de texto), roda o ciclo completo, cola as 3 versões |
| Registro (5-7 min) | o que ficou | resposta curta: qual pilar mais mudou seu resultado |

**Tutor IA aqui faz sentido:** depois que o estudante cola as 3 versões do prompt, o tutor (Gemini 2.5 Flash via Lovable AI) devolve análise no formato "**o que melhorou:** / **ainda dá pra refinar:** / **próximo passo:**". Mesma edge function `tutor-trail-chat` já existe — só plugo `interaction_schema` com o `tutor_prompt` próprio.

### Módulo 3 — comparando modelos
Já tem o esqueleto. Vou escrever:

| pílula | título | conteúdo |
|---|---|---|
| A (5-6 min) | os modelos do mercado | mapa rápido: GPT-5, Gemini 3, Claude 4.7, Llama. famílias, donos, pra que cada um brilha |
| B (6-7 min) | quando usar cada um | tabela de critérios: raciocínio longo, código, criatividade, custo, multimodal |
| C (5-7 min) | multimodal: texto, imagem, voz, código | exemplos curtos do que cada um aceita de entrada/saída |
| PBL (18-22 min) | benchmark pessoal | escolhe 1 pergunta real, roda em pelo menos 2 modelos (recomendo ChatGPT free + Gemini free + opcional Claude), cola as 2 respostas, escolhe vencedora e justifica |
| Registro (6-8 min) | o que ficou | qual modelo virou seu default e por quê |

**Tutor IA aqui não entra** — o exercício já é comparação crítica do próprio estudante. Tutor seria redundante.

### Publicação
Depois de escrever o conteúdo:
- `UPDATE modules SET published=true` nos módulos 2 e 3
- `INSERT INTO module_releases` pra liberar os dois pros alunos matriculados
- Módulo 1 já tá liberado, nada a fazer

### Ordem de execução
1. Revisar body_md das 5 pílulas do M1 (update)
2. Escrever as 5 pílulas do M2 + `interaction_schema` do tutor no PBL (update)
3. Escrever as 5 pílulas do M3 (update)
4. Publicar M2 e M3 + liberar via `module_releases`
5. Eu te aviso e você abre o /app pra conferir as 3 aulas como aluno

### O que vou precisar de você (depois)
- Conferir tom e exemplos dos 3 módulos depois que eu escrever — você ajusta o que não tiver a tua cara
- Se quiser gravar vídeo curto de qualquer pílula depois, é só me passar URL Loom/YouTube e eu plugo

### Detalhes técnicos
- Só uso `supabase--insert` (updates de body_md + publish + module_releases). Sem migração de schema.
- `tutor-trail-chat` edge function já existe e funciona com `interaction_schema.tutor_prompt`.
- Todo conteúdo em lowercase pt-BR, frases 1-3 linhas, zero em-dash/hashtag/emoji, "você" não "tu".
