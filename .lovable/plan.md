# histórico de acesso no perfil do estudante

## o que existe hoje

- no perfil do estudante o admin vê só **um** dado de acesso: "último acesso" (o último login registrado pela autenticação).
- o log de auditoria da autenticação está **vazio** (retenção desligada), então não dá pra reconstruir "todos os logins de sempre".
- mas existe uma fonte real de histórico: as **sessões** de autenticação. hoje são 147 sessões e 309 registros de renovação, com data de criação e de última atividade, desde 28/05/2026. isso dá um histórico de acesso por estudante já a partir de agora, sem inventar dado.

## o que vou construir

### 1. bloco "histórico de acesso" no perfil do estudante
dentro da seção de comunicação/atividade do perfil, uma linha do tempo com:
- lista de sessões: quando entrou, última atividade naquela sessão, dispositivo (celular ou computador, quando o dado existe) e se a sessão ainda está ativa
- resumo no topo: total de acessos no período, dias distintos com acesso, último acesso e primeiro acesso registrado
- mini gráfico de frequência das últimas 8 semanas, pra bater o olho e ver se o estudante sumiu

### 2. registro próprio a partir de agora
as sessões antigas expiram e somem, então o histórico ficaria sempre curto. vou gravar um registro leve de acesso quando o estudante abre o app (no máximo uma linha por dia por pessoa, sem IP, sem rastreamento fino). assim daqui pra frente o histórico é permanente e não depende da retenção da autenticação.

### 3. coluna "último acesso" na lista de estudantes
na tabela do admin, coluna com o último acesso e destaque discreto pra quem está há mais de 14 dias sem entrar. ajuda a achar quem sumiu sem abrir perfil por perfil.

## detalhes técnicos

- função security definer `admin_access_history(_user_id uuid)` lendo `auth.sessions` (criação, `refreshed_at`, `user_agent`, `not_after`), exposta só pra `admin` via `has_role`
- tabela nova `user_access_log(user_id, access_date, first_seen_at, last_seen_at, device_kind)` com chave única por usuário+dia, RLS: estudante só insere/atualiza a própria linha, admin lê tudo, grants explícitos
- ping de acesso disparado uma vez por sessão no cliente (dedupe local por dia) a partir do provider de auth existente
- UI: novo componente `StudentAccessHistory` seguindo o padrão dos blocos atuais do perfil (bege, badges, listas compactas), consumindo um hook novo ao lado de `useStudentCommunication`

## fora do escopo

- reconstruir logins anteriores a hoje que não estejam nas sessões vivas (esse dado não existe mais)
- registrar IP, geolocalização ou rastrear navegação página a página
- mudar qualquer coisa do fluxo de login
