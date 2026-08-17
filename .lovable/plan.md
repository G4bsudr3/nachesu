# o módulo quebra: diagnóstico confirmado

reproduzi o erro no navegador, logado, em `/app/eletiva/ia-na-pratica/modulo/2`. a tela cai no mesmo "o joão tá pensando" que a julia viu, e o erro real é:

```text
[errorboundary:modulo] Error: cannot add `postgres_changes` callbacks for
realtime:student-feedback-<user_id> after `subscribe()`
```

## a) causa raiz, arquivo e linha

`src/features/hub/useStudentFeedback.ts:47` abre um canal de tempo real com **nome fixo por usuário** (`student-feedback-${user.id}`) e registra o listener depois. o cliente reaproveita o canal já existente quando o nome se repete, então o **segundo componente da mesma página que usa esse hook** tenta registrar o listener num canal já assinado, e isso **lança exceção**, derrubando a página inteira no error boundary.

na página do módulo o hook passou a ser usado duas vezes:

- `src/pages/Modulo.tsx:565` → `ModuloFeedbackCard` (já existia, monta sempre)
- `src/pages/Modulo.tsx:729` → `MobileNav` → `FeedbackBadge` (**adicionado hoje**) → `src/components/dashboard/FeedbackBadge.tsx:8`

ou seja: foi exatamente a `MobileNav` que entrou hoje no render principal do módulo. antes disso o hook só montava uma vez por página e nunca colidia.

## b) as outras suspeitas, uma a uma (todas descartadas)

- **âncora com hash de erro**: `document.getElementById("error=access_denied&...")` não lança, só devolve `null`. o retry para em 40 tentativas. e o hash nem sobrevive: a navegação client-side pro módulo troca a URL sem fragmento. não é o culpado.
- **ModuleRatingPrompt / module_ratings**: a leitura usa `.maybeSingle()` (`useModuleRating.ts:39`), tabela vazia devolve `null` sem erro.
- **botão "tô travado"**: o import de `MessageCircle` em `PillPBLCorfTriplo.tsx:2` está lá, único, e o ramo `pbl_corf_triplo` de `ModuloPillList.tsx:537` recebe `hasTrail` e `onOpenTutor` corretamente. o ramo do corf triplo foi, sim, um dos dois editados.
- **pílula de abertura vazia no módulo 2**: está `published=false`, não chega ao estudante, e `PillAbertura` já trata vídeo ausente. a lista nunca fica vazia (o módulo 2 tem 5 pílulas publicadas).
- **login**: secundário mesmo. a julia entrou com sessão válida; o hash de erro do link não tem relação com a quebra.

## c) alcance (é grave)

a quebra atinge **todos os módulos desbloqueados das duas eletivas**, para qualquer estudante logado, em qualquer largura de tela (a `MobileNav` monta no React independentemente de estar escondida por CSS no desktop). só não quebra a tela de módulo **bloqueado**, que não renderiza o card de feedback. isso explica os relatos de hoje: quem tentou abrir um módulo depois do deploy travou.

## d) log de erro de cliente

não existe. o `RootErrorBoundary` não grava nada, nem em tabela nem em serviço externo: o erro só aparece no console do navegador do estudante. por isso ninguém viu nada no admin.

## a correção que eu faria (não aplicada)

1. **conserto imediato, 1 linha de risco**: em `useStudentFeedback.ts`, dar nome único por instância ao canal (ex: sufixo aleatório por montagem) ou registrar o listener sempre num canal novo. isso remove a colisão em qualquer combinação de componentes, hoje e no futuro.
2. **rede de proteção**: fazer a assinatura de tempo real dentro de `try/catch`, para que falha de tempo real nunca derrube a tela. tempo real é conforto, não pode ser requisito.
3. **verificação**: abrir no navegador módulo 1, 2 e 11 de ia-na-pratica e módulo 2 de economia-circular, logado, e confirmar zero erro no console.
4. **depois disso, opcional**: passar a gravar erro de cliente numa tabela leve, pra próxima quebra aparecer no admin em vez de virar relato de whatsapp.

nada de conteúdo de módulo, nada de banco, nada de fluxo de login nessa correção.
