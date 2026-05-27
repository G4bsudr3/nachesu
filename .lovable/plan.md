## objetivo

deixar só o módulo 1 disponível em cada eletiva e fazer as pílulas dentro do módulo abrirem em sequência, pra ter controle claro de onde cada estudante parou.

## estado atual

- **economia-circular**: só módulo 1 publicado. ok.
- **ia-na-pratica**: módulos 1, 2 e 3 publicados. precisa despublicar 2 e 3.
- **pílulas**: hoje o estudante pode marcar qualquer pílula em qualquer ordem (toggle livre em `Modulo.tsx` + `ModuloPillList`). sem trava sequencial.

## o que muda

### 1. travar publicação só no módulo 1
um UPDATE em `modules`: `published=false` pros módulos com `number > 1` da eletiva `ia-na-pratica`. economia-circular já está certo. os módulos 2-20 continuam visíveis no admin (pra preparar conteúdo), mas o estudante só vê o 1.

### 2. liberação progressiva de pílulas
regra: a pílula N só fica "ativa" depois que todas as pílulas obrigatórias anteriores (`required=true`, na ordem `order_index`) estiverem concluídas.

mudanças:

- **`src/pages/Modulo.tsx`**: calcular `unlockedPillIds` a partir de `pills` ordenadas + `completedPillIds`. percorre em ordem: libera a próxima só se a anterior obrigatória estiver feita. pílulas opcionais não bloqueiam o avanço. passa o set pra `ModuloPillList`.
- **`src/components/eletiva/modulo/ModuloPillList.tsx`**: receber `unlockedPillIds`. pílula bloqueada renderiza estado "trancada" (ícone cadeado, opacidade reduzida, hint "termine a pílula anterior"), sem permitir toggle nem abrir conteúdo. mantém visual da lista igual, só adiciona o estado.
- **proteção no toggle**: `togglePillMutation` checa se a pílula está desbloqueada antes de chamar o supabase. se não, toast curto "termine a anterior primeiro".
- admin (`is_admin=true`) ignora a trava — pode marcar/desmarcar qualquer pílula pra testar.

### 3. copy
microcopy no estado trancado: "termine **{título da anterior}** pra abrir essa". sem emoji, lowercase, tom NachesU.

## fora do escopo

- não mexer no desbloqueio entre módulos (já sequencial via `useEletivaProgress`).
- não mexer em schema (sem migration). só UPDATE de dados + ajuste de UI/hook.
- não mexer no fluxo de admin nem em conteúdo de pílulas.

## arquivos tocados

- `src/pages/Modulo.tsx` — calcular `unlockedPillIds`, guardar toggle
- `src/components/eletiva/modulo/ModuloPillList.tsx` — render do estado trancado
- update em `modules` (via insert tool) — despublicar mods 2-3 de ia-na-pratica
