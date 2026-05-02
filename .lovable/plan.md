# próximos passos da eletiva sebrae

## status
- ✅ etapa 1 — progresso por pílula
- ✅ etapa 2 — mapa de trilhas (`/app/trilhas`)
- ✅ etapa 3 — desbloqueio sequencial entre módulos (com toggle "modo livre" no admin)
- ✅ etapa 4 — tutor IA por trilha (joão-de-barro, gemini 2.5 flash)

---

## etapa 4 — tutor IA por trilha (entregue)

**o que ficou pronto:**
- migration: coluna `pbl_prompt` em `trails`, tabela `tutor_conversations` (user_id + trail_id unique, jsonb messages, RLS aluno-vê-próprias + admin-lê-todas).
- edge function `tutor-trail-chat`: streaming SSE via lovable AI gateway (gemini-2.5-flash), sem RAG. system prompt monta contexto da trilha (título, descrição, pbl_prompt) + módulos concluídos pelo aluno + módulo atual. histórico das últimas 20 trocas vai pro modelo, últimas 80 ficam persistidas.
- componente `<TutorChat />` em `Sheet` lateral (drawer desktop, fullscreen mobile). lágrima pulsando como "pensando", bolha do tutor estilo perestroika, textarea com shift+enter pra quebrar linha. carrega histórico do banco ao abrir.
- botão "conversar com tutor" aparece no rodapé das pílulas `kind = exercicio_pbl` (cor da trilha).
- admin: nova seção "tutor IA · problema central" no `AdminTrilha` permite editar o `pbl_prompt` de cada trilha.

**signature moment atual:** lágrima gradient pulsando enquanto o tutor pensa, bolha do user em preto sólido (perestroika preto) vs bolha do tutor em branco translúcido com borda fina. entrada animada das mensagens.

---

## próximas opções (não comprometido ainda)

- conteúdo real nos 20 módulos + PBL prompts populados.
- analytics: ver no admin quantas trocas o aluno teve com o tutor por trilha.
- "modo evento ao vivo" pra quando rodar a eletiva presencial em sala.
