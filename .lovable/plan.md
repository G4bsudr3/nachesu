# nome e sobrenome do estudante no admin

hoje o admin só mostra o apelido gerado do e-mail (ex: `JOAO11522`, `Tassiapmg`). as planilhas de matrícula têm o nome completo, o RA e a turma de cada estudante, então dá sim pra mostrar nome e sobrenome junto do código.

## o que as planilhas têm

- `Lista_eletiva_1º_SEMESTRE_-_Frattz.xlsx`, aba "Inteligência Artificial": 147 linhas com RA, nome completo, turma e e-mail
- `Lista_eletiva_1º_SEMESTRE_-_Dudu.xlsx`, aba "Economia Circular": 118 linhas com os mesmos campos
- o e-mail (`alberto11594@edu.sebrae.com.br`) é a chave que liga a planilha ao perfil já cadastrado

## o que fazer

### 1. guardar o cadastro oficial da escola

nova tabela `student_roster` com e-mail normalizado (chave), nome completo, RA e turma. fica separada de `profiles` porque cobre também quem ainda não se cadastrou na plataforma. RLS: só admin lê e escreve.

### 2. importar as duas planilhas

carga única dos 265 registros das duas abas, normalizando o e-mail e capitalizando o nome (`ALBERTO PINTO COELHO MAIA` vira `Alberto Pinto Coelho Maia`) pra não gritar na tela.

### 3. mostrar o nome onde o admin identifica gente

em todas essas telas o nome completo vira o texto principal e o código/apelido vira a linha de apoio:

- `/admin/usuarios` (lista e busca: buscar por nome, sobrenome, código ou e-mail)
- página do estudante (`joao11522` passa a exibir "João da Silva Reis" no título, com o código abaixo do e-mail, mais RA e turma nos chips)
- `/admin/entregas` (coluna estudante e o drawer de feedback)
- `/admin/risco` e exports CSV, que ganham colunas de nome, RA e turma

quem não estiver na planilha continua aparecendo pelo código, sem quebrar nada.

### 4. manter atualizado

no `/admin/usuarios` entra um botão "importar planilha da escola" que aceita um `.xlsx` no mesmo formato e faz upsert por e-mail, pra próxima lista não depender de mim.

## observações técnicas

- tabela `public.student_roster`: `email_normalized text primary key`, `full_name text not null`, `ra text`, `turma text`, `course_hint text`, `updated_at`. GRANT pra `authenticated` e `service_role`, RLS com policy única `has_role(auth.uid(), 'admin')`
- helper de front `useStudentRoster()` (mapa e-mail → nome) usado pelas telas admin, sem tocar em nada da experiência do estudante
- o import via UI usa edge function `import-student-roster` (parse xlsx no servidor, valida domínio `@edu.sebrae.com.br`, upsert em lote)
- nada muda no fluxo do estudante: `nickname` continua sendo o identificador público dele na plataforma

## fora do escopo

- não altero `profiles.display_name` nem o apelido que o estudante vê
- não mexo em matrícula/`enrollments`, só em identificação visual
