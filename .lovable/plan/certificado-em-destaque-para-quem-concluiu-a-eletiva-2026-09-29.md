# Certificado em destaque para quem concluiu a eletiva

## Objetivo
Todo estudante que fechou os 20 módulos de uma eletiva vê o certificado como o próximo passo óbvio, baixa em 1 toque, com logo NachesU, nome completo oficial e carga horária cumprida. Hoje 100 estudantes fecharam EC e 111 fecharam IA.

## O que muda para o estudante

1. **Tela inicial (`/app`)**
   - Card da eletiva concluída troca "revisar" por um destaque de conquista: "você concluiu. seu certificado tá pronto" + botão principal "baixar certificado" + tempo estimado ("1 min").
   - João-de-barro na pose `celebrating` só nesse card.
   - Se o estudante tiver duas eletivas, a concluída sobe para o topo e a outra continua com o CTA do próximo módulo.
   - Some o texto "aguarde o próximo abrir" para quem já terminou.

2. **Página da eletiva (`/app/eletiva/:slug`)**
   - O bloco "seu certificado tá liberado" que já existe passa a levar direto à página do certificado (sem CTA duplicado com o dashboard; lá vira o atalho, aqui fica o detalhe).

3. **Módulo 20 / Mini-Dossiê**
   - O botão "ver certificado" hoje leva a uma página quebrada. Passa a abrir a página oficial do certificado da eletiva.

4. **Página do certificado (`/app/eletiva/:slug/certificado`)**
   - Nome completo já preenchido a partir da lista oficial Sebrae (ex.: "Marina Lara Ticle" em vez de "Marina11546"), editável uma vez para correção de grafia.
   - Mostra: logo NachesU, nome da eletiva, carga horária cumprida (16h40min, conforme o formato oficial de 1.000 min), período cursado, assinatura "uma realização naches · em parceria com escola sebrae".
   - Botão "baixar pdf" e estado de carregamento/erro seguro ("não rolou gerar agora, tenta de novo").
   - Quem ainda não concluiu vê quantos módulos faltam e quais, com link para o próximo, em vez de tela vazia.

## O que muda para admin e coordenação
- No relatório da turma, coluna "certificado disponível" (sim/não) por eletiva, para responder rápido casos como o da Marina.

## Pergunta em aberto
- Carga horária no certificado: **16h40min** (valor oficial do formato) ou manter **20h** como está hoje no modelo? O plano assume 16h40min.

## Detalhes técnicos
- Regra única de "concluído": reaproveitar `moduleCompletion.ts` (20/20 módulos publicados com `completed_at`) num helper `isEletivaConcluida(courseId)` usado por `EletivasHero`, `EletivaHome` e `CertificadoEletiva`.
- `EletivasHero.tsx`: novo estado `concluida` (label, href para `/app/eletiva/:slug/certificado`, ordenação).
- `PillMiniDossie.tsx`: trocar `dossieUrl + "?certificado=1"` pela rota do certificado. A RPC `get_public_dossier` não existe no banco; o link público do dossiê fica fora deste escopo.
- Nome: nova RPC `get_my_official_name()` (SECURITY DEFINER, retorna só o `full_name` do `student_roster` do próprio usuário por e-mail). `CertificadoEletiva.tsx` usa isso como default, com fallback para `display_name`. Sem sincronizar em massa os 240 perfis.
- `NachesCertificate.tsx`: parametrizar carga horária e período (data da primeira e última conclusão).
- `admin_cohort_report`: adicionar contagem de concluídos (já calcula módulo 20; só expor como "certificado disponível").
- Verificação: Playwright logado como estudante concluído (Marina) e não concluído, conferindo o card, a página e o PDF gerado.
