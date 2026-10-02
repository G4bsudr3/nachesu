# Painel da coordenação: 1º semestre, 2º semestre e certificados

## Objetivo
A coordenação entra com a senha e entende de cara três coisas: quem concluiu no 1º semestre, como está o 2º semestre (a outra eletiva) e onde baixar os certificados, um por um ou todos os selecionados num zip.

## Como fica a página

Topo com 3 abas grandes, nessa ordem:

1. **1º semestre (concluído)**
   - Um bloco por eletiva: quantos foram matriculados, quantos concluíram os 20 módulos, % de conclusão, e quem não concluiu.
   - Lista por turma com nome, RA, turma, data de conclusão.
   - Frase curta explicando: "todos que concluíram uma eletiva agora fazem a outra no 2º semestre".

2. **2º semestre (em andamento)**
   - Mesma visão que existe hoje (status, filtros, busca, turma, último acesso), mas contando só quem entrou na eletiva no 2º semestre.
   - Ex.: quem fez economia circular no 1º semestre aparece em ia na prática aqui.
   - Contadores no topo: não entrou, começou, em andamento, parado, concluiu.

3. **certificados**
   - Uma sub-aba por eletiva, só com quem concluiu os 20 módulos.
   - Busca por nome/RA e filtro por turma.
   - Caixa de seleção por linha e "selecionar todos da lista filtrada".
   - Botões: "baixar selecionados (zip)" e "baixar pdf" em cada linha.
   - Barra de progresso ("gerando 34 de 100") e aviso se algum falhar, sem perder os outros.
   - ZIP igual ao do admin: uma pasta por turma, um PDF por estudante, mais `lista.csv`.
   - Certificado idêntico ao do admin e do estudante (mesmo texto, 16h40min, data real de conclusão, código de verificação).

## Regra de semestre
- Cada matrícula pertence a um semestre pela data em que foi criada.
- 2º semestre começa em **24/09/2026**, dia em que todos receberam acesso à outra eletiva.
- Matrícula antes disso = 1º semestre. A partir dessa data = 2º semestre.
- Conclusões feitas por quem é do 1º semestre contam no 1º semestre, mesmo que tenham terminado depois de 24/09.

## Segurança
- Tudo continua atrás da senha, pela mesma função que já existe.
- Nenhum e-mail sai na resposta, só nome, RA, turma e datas.
- Somente leitura, nada é alterado.

## Detalhes técnicos
- `painel-escola`: busca `enrollments` (user_id, course_id, created_at) e classifica cada estudante por curso em `semestre: 1 | 2` (corte `2026-09-24`). Retorna por eletiva `semestre1` (resumo + alunos) e `semestre2` (resumo + alunos + por_turma, mesmo formato atual), e `certificados[]` com `cert_id` (hash curto do user_id para o código), nome oficial (`student_roster.full_name`, fallback display_name), `ra`, `turma`, `completed_at` (max de `student_module_progress.completed_at`), apenas 20/20 publicados. Inclui `titulo`, `subtitle`, `professor` do curso.
- Código de verificação gerado no servidor com a mesma regra de `certificateCode` para ficar igual ao do admin.
- `Acompanhamento.tsx`: reorganizar em abas (1º semestre, 2º semestre, certificados); reaproveitar `EletivaBloco` para o 2º semestre; nova seção de certificados reaproveitando `renderNachesCertificatePdf`, `slugifyName` e `jszip` (já usado no admin), geração em série.
- Extrair a lógica de lote do `AdminCertificados` para um helper compartilhado (`buildCertificatesZip`) para os dois lugares usarem a mesma coisa.
- Verificação: abrir o painel com Playwright, conferir as três abas e baixar um zip pequeno e um pdf individual.
