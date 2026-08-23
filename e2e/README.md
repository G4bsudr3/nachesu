# E2E — NachesU (Playwright)

Suíte de testes ponta-a-ponta que cobre a camada visual/navegação (o que testes
unitários e revisão de código não pegam: white-screen, rota quebrada, página vazia).

**Projeto isolado de propósito**: tem `package.json` próprio e **não** mexe nas
dependências nem no build do app (Lovable/Vite). Rodar E2E não afeta o deploy.

## Rodar

```bash
cd e2e
npm install
npm run install:browser   # baixa o Chromium do Playwright (uma vez)
npm test
```

Por padrão roda contra **produção** (`https://sebrae.frattz.com`) — só os testes
**públicos** (GET/leitura, seguro).

Contra o app local:
```bash
# no repo raiz, em outro terminal: npm run dev
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm test
```

Relatório HTML: `npm run report`.

## O que cobre

### Público (`tests/public.spec.ts`) — sempre roda
- landing `/` carrega (anti white-screen)
- `/auth` mostra o formulário + links legais no rodapé
- `/privacidade` renderiza a Política completa (com seções-chave)
- `/termos` renderiza os Termos de Uso
- link do rodapé navega pra `/privacidade`
- rota inexistente não dá tela branca

### Autenticado (`tests/authenticated.spec.ts`) — TODAS as telas, só leitura, desligado por padrão
Só roda se `E2E_ACCESS_TOKEN` (token de **admin**) estiver setado. **Não clica em nada que escreva no banco.**
Cada tela é aberta num navegador real e o teste confere: renderizou, não caiu no login e **não houve erro de JS (crash/tela branca)**.

```bash
E2E_ACCESS_TOKEN="<access_token>" npm test
# opcional: E2E_REFRESH_TOKEN="<refresh>"
```

Como pegar o token: abra a plataforma logada → F12 → Application → Local Storage →
chave `sb-jrzahsjrzaaktuelnsaw-auth-token` (campo `access_token`), ou o `Authorization`
de um *Copy as cURL*. O token expira em ~1h.

Cobre **13 telas do aluno** (dashboard, minhas eletivas, eletiva home dos 2 cursos,
trilhas, notificações, glossário, módulo, certificado, conta, hub, hub materiais, tutor)
e **10 telas de admin** (home, risco, fluxo, notificações, entregas, pulso, respostas,
vídeos, módulos, turma).

## Próximos passos sugeridos
- Conta de teste dedicada (com senha) para automatizar o login de verdade em vez
  de injetar sessão.
- Fluxos de escrita (concluir módulo, reenviar entrega) num ambiente de staging,
  nunca em produção com dados reais de alunos.
