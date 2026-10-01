# Certificados em massa para a secretaria

## Objetivo
A secretaria da escola recebe os certificados de todos os estudantes que concluíram, sem depender de cada estudante emitir o seu. O admin abre uma página, vê quem concluiu cada eletiva e baixa tudo num ZIP, com 1 PDF por estudante.

## O que muda

1. **Nova página no admin: "certificados"** (item na barra lateral)
   - Uma aba por eletiva (economia circular, ia na prática).
   - Lista de quem concluiu os 20 módulos: nome completo oficial, RA, turma, data de conclusão.
   - Busca por nome/RA e filtro por turma.
   - Contador: "100 estudantes concluíram".
   - Estudantes sem nome na lista oficial aparecem marcados ("sem nome oficial, vai sair o apelido"), para conferência antes de baixar.
   - Botões: "baixar todos (zip)", "baixar selecionados" e "baixar pdf" em cada linha.
   - Barra de progresso durante a geração ("gerando 34 de 100") e aviso seguro se algum falhar, sem perder os outros.

2. **Arquivo ZIP**
   - Nome: `certificados-economia-circular-2026.zip`.
   - Dentro, uma pasta por turma, e um PDF por estudante: `1F-ADM/marina-lara-ticle-11546.pdf`.
   - Uma planilha simples junto (`lista.csv`) com nome, RA, turma, eletiva e data de conclusão, para o arquivo da secretaria.

3. **Revisão do conteúdo do certificado** (vale também para o que o estudante baixa)
   - Carga horária única: **16h40min**, no texto e nos dados (hoje aparece "20H" no texto e "16h40min" embaixo).
   - Texto principal reescrito com tom formal e correto:
     "certificamos que **[nome completo]** concluiu a eletiva **[nome da eletiva]**, com carga horária de 16h40min, cursada na modalidade online no 1º ano do ensino médio técnico da escola sebrae, em 2026."
   - Tirar "100%" e "de prática em turma online" (informal/impreciso).
   - Data: data real de conclusão (último módulo concluído), não a data do download. Assim o certificado é igual sempre que for gerado.
   - Educador nomeado como "educador responsável: [nome]".
   - Código de verificação curto no rodapé (ex.: `NU-EC-11546`), para a secretaria identificar o documento.
   - Nome completo sempre da lista oficial Sebrae; se não houver, apelido e marcação no admin.
   - Mantém logo NachesU, assinatura "uma realização naches · em parceria com escola sebrae" e o joão-de-barro.

4. **Verificação**
   - Gerar um ZIP real de uma eletiva, abrir alguns PDFs e conferir nome, carga horária, data e acentos.
   - Entregar o ZIP de cada eletiva também nos seus arquivos, pronto para mandar para a Adriana.

## Detalhes técnicos
- Nova RPC `admin_certificate_candidates(course_id)` (SECURITY DEFINER, exige `has_role(auth.uid(),'admin')`): retorna user_id, email, full_name (student_roster), ra, turma, display_name, completed_at (max de `student_module_progress.completed_at`), apenas quem tem 20/20 módulos publicados concluídos (mesma regra de `moduleCompletion.ts`).
- Nova página `src/pages/AdminCertificados.tsx`, rota `/admin/certificados`, item na `AdminSidebar`.
- Geração no navegador reaproveitando `NachesCertificate` + o pipeline de `useCertificateDownload` (render offscreen, html-to-image, jsPDF), em série para não travar a aba; ZIP com `jszip`.
- `NachesCertificate`: novas props `completedAt`, `verificationCode`; texto revisado; remove "20H" fixo; `CertificadoEletiva` passa a data de conclusão real.
- Sem mudar regras de conclusão nem dados de estudantes.
