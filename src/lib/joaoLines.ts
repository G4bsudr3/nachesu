/**
 * frases do joão-de-barro por contexto. mantém o mascote vivo —
 * cada montagem do componente sorteia uma frase diferente.
 *
 * tom: lowercase, sem em-dash, "você", curtas. metáforas de ninho,
 * barro, galhinho, casinha. nunca "carregando..." genérico.
 */

const LINES = {
  building: [
    "construindo seu ninho...",
    "ajeitando os galhinhos...",
    "preparando o barro...",
    "amassando mais um tijolinho...",
  ],
  thinking: [
    "amassando o barro da resposta...",
    "buscando o galho certo...",
    "pensando com calma...",
  ],
  resting: [
    "tô aqui, no galho, esperando você.",
    "ninho calmo. quando quiser, é só chegar.",
  ],
  celebrating: [
    "ninho pronto.",
    "isso aí. mais um tijolinho no lugar.",
  ],
} as const;

export type JoaoContext = keyof typeof LINES;

/**
 * sorteia uma frase do contexto pedido. estável por mount quando
 * usado dentro de useState/useMemo na call-site.
 */
export function pickJoaoLine(context: JoaoContext): string {
  const arr = LINES[context];
  return arr[Math.floor(Math.random() * arr.length)];
}
