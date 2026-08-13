# dar acesso da julia à eletiva de ia na prática

a conta dela já existe e está ativa (`julia11697@edu.sebrae.com.br`, último login em 30/07), mas ela não tem nenhuma matrícula e não aparece no cadastro da escola. por isso o app mostra "você ainda não está matriculado em nenhuma eletiva".

## o que fazer

1. **matricular** a julia na eletiva `IA na Prática` com status ativo. isso sozinho já libera o acesso dela ao mapa e aos módulos liberados.
2. **cadastrar no roster da escola** com nome completo "Julia Simao Lala de Melo", turma `1F`, dica de curso "inteligência artificial", pra ela aparecer identificada pelo nome no admin, no painel da coordenação e nas entregas, em vez do código `Julia11697`.
3. **ajustar o nome exibido** no perfil dela pra "Julia" (hoje é `Julia11697`), pra saudação do dashboard ficar humana.

nada disso exige que ela faça login de novo: no próximo acesso a eletiva já aparece.

## detalhes técnicos

- insert em `enrollments` (user_id `7d11a930-...`, course_id da `ia-na-pratica`, status `active`)
- insert em `student_roster` (`email_normalized`, `full_name`, `turma`, `course_hint`); RA fica nulo porque não veio na mensagem
- update em `profiles.display_name`; `nickname` fica como está (identificador público)
- tudo via operação de dados, sem mudança de schema nem de código

## fora do escopo

- não mexo nas planilhas oficiais nem em outros estudantes sem matrícula
- se aparecerem mais casos assim, vale uma passada geral comparando `auth.users` sem `enrollments`, mas isso é outra conversa
