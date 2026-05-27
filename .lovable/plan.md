# travar conclusão do módulo até todas as obrigatórias estarem feitas

## o problema

no economia-circular dá pra clicar "marcar como concluído" no rodapé do módulo sem ter feito nenhuma pílula. dois fatores:

1. o botão `<ModuloFooter onComplete>` está sempre habilitado. `completeMutation` em `Modulo.tsx` faz upsert direto sem checar progresso das pílulas obrigatórias.
2. quem testou (frattz) é admin, e o `unlockedPillIds` já libera tudo pra admin por design (pra testar fora de ordem). pro **estudante** a trava sequencial já funciona — só o botão "concluir módulo" que escapa.

cada pílula rica (radar, quiz, conteúdo curado, editorial, pbl estruturado, checklist) já bloqueia o próprio botão "concluir pílula" enquanto os campos obrigatórios não estão preenchidos. então o conserto é fechar a única fresta: o botão de fechar o módulo.

## o que muda

### 1. `Modulo.tsx` — calcular `canCompleteModule`

```
canCompleteModule = pills.filter(required).every(p => completedPillIds.has(p.id))
```

passa pro `ModuloFooter`. usado pra:
- habilitar/desabilitar o botão "marcar como concluído"
- mostrar hint do quanto falta ("falta 2 de 4 pílulas obrigatórias")

admin (`isAdmin`) recebe `canCompleteModule = true` sempre, mas o botão troca o label pra "concluir como admin" (deixar claro que está bypassando).

### 2. `Modulo.tsx` — guardar `completeMutation`

no `mutationFn`, antes do upsert:
- se `!isAdmin && !canCompleteModule`, lançar erro "termine as pílulas obrigatórias primeiro" (toast já existe via `onError`)

defesa em profundidade caso alguém burle o botão.

### 3. `ModuloFooter.tsx` — novo prop `canComplete` e copy do estado bloqueado

- prop nova: `canComplete: boolean`, `pillsRemaining: number`, `isAdmin?: boolean`
- quando `!canComplete && !isAdmin`:
  - botão `disabled`, label "termine as pílulas obrigatórias"
  - copy do bloco muda: "ainda falta {n} pílula{s} obrigatória{s}. cada pílula tem o próprio botão de concluir."
- quando admin e ainda faltam pílulas: label "concluir como admin" + nota "bypass de admin: estudante não vê esse botão liberado"
- mantém botão "próximo módulo" como hoje (só aparece quando o próximo já foi liberado, ortogonal)

### 4. auditoria das pílulas (não muda código, só confirma)

revisar rapidamente que toda pílula rica usa `disabled={!ready ...}` no botão de concluir:

- `PillConteudoCurado` ✓ (já tem `!ready`)
- `PillQuiz` ✓
- `PillRadar` ✓ (`!validation.ok`)
- `PillEditorial`, `PillPBLEstruturado`, `PillChecklistPacto` — abrir e confirmar igual padrão. se algum estiver sem trava, aplicar a mesma regra `!ready`.
- `PillBonus` é opcional, não bloqueia
- pílula sem schema (texto simples + vídeo) hoje renderiza um botão "marcar como concluída" livre — pra esse caso manter livre (é leitura/vídeo, validação é "vi"). não é o que está furado.

### 5. teste manual mínimo

depois do build, verificar:

- como estudante (conta não-admin) em `/app/eletiva/economia-circular/modulo/1`: botão "marcar como concluído" sai cinza com "falta 4 obrigatórias". preenche cada pílula → habilita.
- como admin: o botão aparece habilitado com label "concluir como admin".
- auto-conclusão (que já existe em `togglePillMutation.onSuccess`) continua funcionando — quando todas as obrigatórias batem, fecha sozinho e dispara o burst.

## fora do escopo

- não tirar bypass de admin (ele é útil pra testar e revisar conteúdo)
- não mexer na trava sequencial entre pílulas — ela já funciona pro estudante
- não mexer em pílulas sem schema (texto/vídeo simples) — botão "marcar como vista" segue solto, é leitura
- sem migration de dados ou schema

## arquivos tocados

- `src/pages/Modulo.tsx` — `canCompleteModule`, guard no `completeMutation`, props extras pro footer
- `src/components/eletiva/modulo/ModuloFooter.tsx` — props `canComplete`, `pillsRemaining`, `isAdmin`; estado bloqueado
- (talvez) ajuste em uma das 3 pílulas editoriais se faltar a trava `!ready` — confirmar antes de tocar
