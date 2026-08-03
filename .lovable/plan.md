# pulso: checkpoints de 5 estrelas + leitura com IA no admin

## a ideia em uma frase

depois de fechar um módulo-chave, o estudante vê um card curto: cinco estrelas e um campo de comentário opcional. dois toques e acabou. nunca bloqueia, nunca repete.

## onde aparece (e onde não aparece)

o card entra dentro da celebração de conclusão do módulo, logo abaixo do "você fechou o módulo XX". não é modal, não é popup, não interrompe.

só em 5 dos 20 módulos por eletiva:

- módulo 1 (primeira impressão)
- módulo 5, 10, 15 (fim de cada trilha)
- módulo 20 (fechamento do curso)

isso dá no máximo 5 pedidos em 16h de curso. o resto dos módulos fecha com a celebração limpa, como hoje.

regras anti-spam:

- se a pessoa ignorar, o card some ao sair da página e não volta naquele módulo (fica um link discreto "avaliar este módulo" no rodapé do módulo, caso ela mude de ideia)
- se já avaliou, o card vira uma linha de confirmação: "você deu 4 estrelas aqui · editar"
- comentário é sempre opcional, o envio acontece na hora que ela toca a estrela

## como é o card

```text
como foi este módulo pra você?
   ★ ★ ★ ★ ☆
[ quer contar o porquê? (opcional) ]        [ enviar ]
agora não
```

- estrelas grandes (touch 44x44), cor da trilha do módulo
- ao tocar a estrela, a nota já é salva e um microcopy de agradecimento aparece na hora ("valeu, isso ajuda a gente a melhorar")
- o campo de comentário só abre depois da nota, com placeholder que muda conforme a estrela: nota baixa pergunta "o que travou?", nota alta pergunta "o que funcionou melhor?"
- nota baixa nunca gera tela de erro nem tom de cobrança; ela abre um segundo caminho: "quer falar com seu educador?" com link pro tutor

## admin: uma página só, "pulso"

nova seção na sidebar, dentro de "entregas dos estudantes": **pulso** (`/admin/pulso`).

topo, quatro números de leitura rápida:

- nota média geral e variação vs. período anterior
- respostas no período e taxa de resposta (avaliações / conclusões de módulo elegíveis)
- % de notas 1-2 (detratores) e % de 4-5
- quantidade de comentários novos não lidos

depois, três blocos:

1. **por eletiva e por trilha**: barra com média e volume, para ver onde a experiência cai. lilás para economia circular, rosa/laranja para ia na prática, seguindo a paleta já usada
2. **ranking de módulos**: tabela `AdminTable` com módulo, média, nº de respostas, distribuição das estrelas e drop de conclusão ao lado. ordenável por pior média. clique abre o módulo no admin
3. **comentários**: lista cronológica com nota, nome real do estudante (via roster), turma, módulo e texto. filtros por nota, eletiva, módulo e período, busca e export csv. link direto pro perfil do estudante

## análise com IA

botão **analisar com ia** no topo da página, junto com "gerado há X". roda sobre os comentários e as notas do período selecionado e devolve um bloco de leitura:

- o que está funcionando (com trechos reais citados)
- as 3 principais fricções, cada uma com quantas pessoas mencionaram e em quais módulos
- alertas: módulo com queda de nota, comentário que sugere pessoa travada ou desmotivada, com link pro perfil
- 3 ações sugeridas, concretas, na ordem de impacto

o resultado fica salvo, com data e período, então abrir a página não gasta chamada nova. reanalisar é sempre explícito.

## detalhes técnicos

- **sem tabela nova**: `module_ratings` já existe (`user_id`, `module_id`, `rating` 1-5, `comment`, RLS por `auth.uid()`, admin lê tudo). só falta a UI. migration única: confirmar `GRANT` para `authenticated`/`service_role` e criar índice por `module_id` e `created_at`
- **quais módulos pedem avaliação**: derivado do `number` do módulo (1, 5, 10, 15, 20), sem coluna nova e sem config
- **estudante**: novo `src/components/eletiva/modulo/ModuloRatingCard.tsx` + hook `src/features/hub/useModuleRating.ts` (upsert em `module_ratings`). renderizado por `ModuloCelebration` em `src/pages/Modulo.tsx`. o "agora não" persiste em localStorage via o helper `nsKey` já usado no projeto
- **admin**: `src/pages/AdminPulso.tsx` + `src/features/admin/usePulso.ts` (agregados por curso/trilha/módulo e lista de comentários), reaproveitando `AdminTable`, os filtros inline e o export csv já padronizados, e `useStudentRoster` para nome/turma. rota em `src/App.tsx` e item em `AdminSidebar.tsx`
- **IA**: nova edge function `analyze-pulso` no padrão de `admin-insight-digest` (Lovable AI, admin-only via `has_role`, valida o body, trata 429/402 com toast claro). grava em `admin_insights` com `scope = 'pulso'`, sem tabela nova. envia só nota, módulo e comentário; sem e-mail nem id pessoal no prompt
- **verificação**: fluxo completo no browser em mobile e desktop (fechar um módulo elegível, avaliar, ignorar, reabrir) e a página de admin com dados reais + uma rodada de análise

## fora de escopo agora

- pedir avaliação por e-mail ou notificação push
- avaliação de pílula individual (granular demais, vira spam)
- resposta pública do educador ao comentário
