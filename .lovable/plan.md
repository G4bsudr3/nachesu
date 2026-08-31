# validação das reclamações da turma

checkei uma por uma no banco. resumo: **4 das 6 são fundadas**, e uma delas é um bug que trava toda a entrega final da economia circular.

## veredito por pessoa

| pessoa | reclamação | veredito |
| --- | --- | --- |
| Elisa Souza Dutra (25/jun) | não recebe o link de acesso | **fundada, ainda aberta** |
| Pedro Caldeira Zavaglia (2/jul) | mesmo problema | **fundada na época, resolvido** |
| Maria Forster Gadelha do Vale (1/ago) | evidências do módulo 4 não salvam | **fundada, dados perdidos** |
| Sofia Vieira de Oliveira e Silva (29/ago) | não consegue enviar o vídeo, "duração desconhecida" | **fundada, bug ativo** |
| Maria Eduarda Zamana, Lara Vrandecic, Marianne Ferreira (30/ago) | também não conseguem mandar o vídeo | **fundadas, mesmo bug** |
| Lucas Menegaz Barbosa | dúvida sobre onde enviar o certificado | não é bug, é dúvida (ele já concluiu o módulo 20) |

## o que o banco mostra

**Elisa** teve conta criada em 08/jun no domínio errado (`elisa11712@sebrae.com.br`, sem o `edu`), que nunca foi confirmada. A conta certa (`@edu.sebrae.com.br`) só nasceu em 30/ago e ela já logou em 31/ago, mas **está sem matrícula em nenhuma eletiva**, então continua sem acessar o curso. Ela é da lista da economia circular.

**Pedro** teve conta confirmada em 15/jun e hoje tem 19 entregas: o problema dele era pontual e passou.

**Maria Forster** entregou o módulo 4 em 03/ago, mas o registro dela só tem quiz e respostas guiadas, sem nenhuma evidência salva. Dos 75 estudantes do módulo 4, 71 têm evidências gravadas e ela é uma das 4 sem. As respostas dela realmente não persistiram.

**O vídeo do pitch final (módulo 20)** tem um bug reprodutível: quando o estudante grava dentro da plataforma, a duração é medida e ele consegue confirmar a entrega. Quando ele **envia um arquivo pronto** (celular, computador, WhatsApp), a duração é gravada como nula, cai no aviso "duração desconhecida" e o checkbox de confirmação fica travado pra sempre. Todos os registros com nome de arquivo próprio (`.mp4` do celular) estão com duração nula e sem confirmação; todos os gravados na plataforma (`pitch-final.webm`) estão confirmados. É exatamente o caso da Sofia (vídeo de 1min46, dentro da regra).

Além disso, quem apaga o vídeo enviado **não recupera a tentativa**: o contador de 3 tentativas continua contando, e ao chegar em 3 o botão de gravar e o de enviar ficam desabilitados. Marianne, Mariana11658 e Ana11475 estão nesse estado: 3 tentativas usadas, nenhum vídeo salvo, sem como continuar. É um beco sem saída.

## correções propostas

1. **Ler a duração do arquivo enviado**: ao escolher um vídeo, medir a duração no navegador antes do upload (elemento de vídeo em memória) e salvar junto. Se o navegador não conseguir ler (formato exótico), aceitar a entrega em vez de bloquear, com aviso leve pedindo que o estudante confirme que está entre 90s e 4min.
2. **Desbloquear quem já está preso**: quem tem vídeo enviado sem duração passa a conseguir confirmar; quem zerou as tentativas sem vídeo salvo volta a poder enviar (tentativa só conta quando existe vídeo salvo, e apagar devolve a tentativa).
3. **Mensagem de erro honesta** no upload: hoje, se o upload falha, o estudante só vê o contador subir. Passar a mostrar a causa e manter a tentativa.
4. **Elisa**: matricular a conta `@edu.sebrae.com.br` na economia circular e remover a conta antiga do domínio errado, que nunca foi usada.
5. **Maria Forster**: as evidências do módulo 4 dela não existem mais no banco, não há como recuperar. A correção da validação de evidências já está aplicada hoje, então ela consegue refazer. Proponho reabrir o módulo 4 pra ela e avisá-la.
6. **Lucas**: não é bug. O certificado sai na própria plataforma ao concluir 100%, não precisa enviar em lugar nenhum. Vale um recado pra turma.

## detalhe técnico

- `src/components/eletiva/pills/PillPitchFinal.tsx`: no `input type=file` (linha ~416) a chamada passa `null` como duração; `durationOk` exige `video_duracao_s` entre 90 e 240, então o fluxo de upload nunca fica válido. Medir com `URL.createObjectURL` + `loadedmetadata` e tratar `NaN`/`Infinity` como "não medido" (permitido, não bloqueado).
- `uploadBlob` incrementa `tentativas` só em caso de sucesso, mas `clear()` não decrementa; `podeMais` desabilita gravar e enviar. Ajustar `clear()` e derivar o contador do estado real.
- Correções de dados de Elisa via migração (matrícula em `enrollments`, curso `economia-circular`).
