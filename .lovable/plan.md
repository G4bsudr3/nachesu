## o que vai mudar

o módulo 1 da eletiva economia circular ("missão 1: abrir o olho") já existe publicado, com 5 pílulas placeholder. vou substituir o conteúdo dessas 5 pílulas pelo briefing do dudu, usando exatamente os schemas de pílula que a plataforma já renderiza, sem inventar componente novo nem mexer em admin/UI. tudo via migration de UPDATE no banco; o admin já consegue editar/visualizar tudo pelo `/admin/aula` porque os schemas são os mesmos usados nos outros módulos editoriais.

guardrails que vou respeitar:
- tom NachesU (lowercase, "você", sem em-dash/emoji em UI, sem corporatês). adapto a copy do dudu ("galerinha", "beleza" etc.) pro tom da plataforma, mantendo a substância
- paleta Perestroika + accent azul Sebrae. a paleta "duduo" (#F25E3D etc.) do briefing NÃO entra: viola o sistema de design. cor do módulo continua vindo da trilha "Enxergar"
- nenhum schema novo, nenhuma tabela nova
- vídeo de abertura: faço upload do `.MOV` pro bucket `pill-attachments` e linko em `video_url` da pílula 1

## mapeamento briefing → schemas existentes

| # | pílula atual | kind | schema usado | vira |
|---|---|---|---|---|
| 1 | abertura | `pilula_a` | `video_with_transcript` (PillAbertura) | vídeo intro do dudu (.MOV no storage) + transcrição em accordion + headline "missão 1: abrir o olho" |
| 2 | conteúdo curado | `pilula_b` | `curated_content_with_questions` (PillConteudoCurado) | 2 cards (vídeo Ellen MacArthur + reportagem Portal Impactto) + 3 perguntas-guia (2 abertas + 1 múltipla escolha) |
| 3 | PBL radar | `exercicio_pbl` | `radar_form` (PillRadar) | briefing "caça ao vazamento" + tabela de mínimo 5 itens, 4 campos (o que vi / onde / fluxo dropdown / evidência), regra anti-óbvio (≥2 fluxos diferentes). PillRadar já valida isso |
| 4 | checagem | `pilula_c` | `quiz` (PillQuiz) | 3 perguntas: P1 múltipla escolha (1 correta), P2 multi-select (3 corretas), P3 texto longo sem feedback (matéria-prima do encontro 5) |
| 5 | bônus | `registro` → muda pra `pilula_c` opcional | `bonus_text` (PillBonus) | card único Kurzgesagt + campo "o dado que mais me chocou foi ___ porque ___", `required=false` |

a pílula 5 atual está como `registro` mas o briefing pede um bônus opcional, não um registro de síntese. troco o `kind` pra `pilula_c` e marco `required=false`. os 3 registros pedagógicos (radar, quiz, bônus) já capturam evidência suficiente — não duplico com um registro extra.

## copy (amostra do tom adaptado)

abertura:
- headline: "missão 1: abrir o olho"
- subheadline: "3 minutos. uma pergunta que vai te perseguir por 20 semanas."

PBL (briefing curto, formatado em markdown):
> sai do computador. pega o celular, dá uma volta de 15 a 20 minutos pela escola, casa ou 2 quarteirões.
> sua missão: caçar **vazamentos de valor** — coisa desperdiçada, subutilizada, descartada rápido demais.
> regra anti-óbvio: pelo menos 2 fluxos diferentes. se sua lista inteira for cantina e reciclagem, faltou olhar.

quiz P1 feedback se acertar: "boa. (c) é comportamento social, não tem recurso saindo do sistema. as outras três têm."

## passos de implementação

1. upload do vídeo `.MOV` pro bucket `pill-attachments` (público) → guardo URL pública
2. migration única que faz `UPDATE module_pills` nas 5 pílulas do módulo (filtro por `module_id` do módulo 1 de economia-circular + `order_index`), setando: `title`, `body_md`, `video_url`, `interaction_schema` (jsonb com o `type` e payload esperado por cada componente), `duration_min_low/high`, `required`, e no caso da pílula 5 também `kind`
3. ajusto `modules.objective` e `modules.total_minutes=50` se estiver vazio/divergente
4. verifico no preview `/app/eletiva/economia-circular/modulo/1` que cada pílula renderiza com o schema certo, e no `/admin/aula` que dá pra editar

## o que NÃO faço nesse passo

- não importo a paleta/tipografia "duduo" do briefing (mantém Perestroika)
- não crio dashboard novo de professor (o admin atual já mostra progresso por aluno/módulo)
- não configuro as notificações 24h/48h de evasão (já existe `check-student-evasion`; ligar essa cadência específica é outro pedido)
- não toco nas pílulas dos módulos 2-20 (continuam unpublished)
- não publico os módulos 2-20

confirma e eu implemento.