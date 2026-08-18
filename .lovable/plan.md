# conferência vídeo por vídeo, eletiva ia na prática

conferi os 24 vídeos da plataforma contra o próprio youtube (título e canal reais de cada id). economia circular não entra: os 20 vídeos dela são arquivos próprios do dudu, todos ok.

## o que está errado hoje

**vídeo trocado, o que aparece não é o que está escrito**

| onde | está escrito | é de verdade |
|---|---|---|
| mód 3, aula 1 | "por que a ia inventa coisas" · nerdologia | "Why Large Language Models Hallucinate" · IBM Technology, em inglês |
| mód 3, aula 3 | "ia é racista? viés algorítmico" · olhar digital | "Are We Automating Racism?" · Vox, em inglês |

**link morto, o estudante vê um player quebrado**

| onde | está escrito | situação |
|---|---|---|
| mód 3, aula 2 | "como verificar informação em 3 passos" · lupa | vídeo não existe mais no youtube |
| mód 9, aula 2 | "o que é mvp" · bndes garagem | vídeo ficou privado |

**crédito errado ou faltando (o vídeo está certo, a ficha não)**

- mód 4 aula 1: canal em branco, é Léo Andrade
- mód 5 aula 3: escrito "sem codar", é Renato Asse
- mód 5 aulas 1 e 2: canal em branco (Luiz Otávio, Renato Asse)
- mód 6 aula 1: escrito "podsonhar / poder360", é só Poder360
- mód 9 aula 1: canal em branco, é Eric Grassi
- mód 10 aula 2: canal em branco, é Bruna Alice
- mód 2 aula 3: escrito "investnews br (pedro burgos)", o canal é InvestNews BR
- os 6 vídeos de bônus não têm título nem canal registrados

**bônus em português bom sendo desperdiçado**

os bônus são todos do InvestNews, em português, e estão escondidos no fim do módulo enquanto os slots principais estão vazios ou quebrados. o caso mais claro: "ChatGPT mais confiável? o ajuste para reduzir erros da IA" está como bônus no módulo 3, que é justamente o módulo de alucinação e erro.

## o que eu vou fazer

1. **corrigir a ficha de todos os 24 vídeos** com o título e o canal reais, exatamente como estão no youtube. nada inventado, tudo verificado por consulta ao próprio youtube.

2. **subir o bônus certo pro lugar certo, sem inventar nada**
   - módulo 3, aula 1 (alucinação): entra o vídeo do InvestNews "ChatGPT mais confiável? o ajuste para reduzir erros da IA", que já está no curso e é em português. sai o vídeo da IBM em inglês.

3. **esvaziar o que está errado ou morto**, deixando o espaço visível e vazio no admin pra você escolher o vídeo depois:
   - módulo 3 aula 2 (link morto)
   - módulo 3 aula 3 (vídeo da Vox em inglês)
   - módulo 9 aula 2 (vídeo privado)
   - em cada um desses, o texto da aula que cita "assiste o vídeo" é ajustado pra não pedir um vídeo que não existe. só essa frase muda, o resto da aula fica igual.

4. **página de conferência no admin**: `/admin/videos` passa a mostrar, pra cada vídeo, o título e canal cadastrados lado a lado com o título e canal reais do youtube, marcando em vermelho quando não batem e quando o vídeo saiu do ar. assim isso nunca mais passa despercebido.

5. **slots vazios ficam sinalizados**: no admin, aula sem vídeo aparece com selo "falta vídeo", com o link direto pra preencher.

## detalhe técnico

- os vídeos vivem em `module_pills.interaction_schema->'video'` (aulas) e `interaction_schema.embed_url` (bônus). a conferência usa o oembed público do youtube (`/oembed?url=...`), que devolve título e canal reais e responde 404 ou 403 quando o vídeo sumiu.
- a verificação do admin roda numa edge function nova (`check-video-links`), porque o oembed não aceita chamada direta do navegador. sem chave, sem custo.
- nenhuma pílula é apagada. nada da eletiva economia circular é tocado.
