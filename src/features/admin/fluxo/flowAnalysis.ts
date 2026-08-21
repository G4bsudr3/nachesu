import { FLOW_EDGES } from "./flowEdges";
import { FLOW_NODES } from "./flowMap";

export interface NodeDegree {
  id: string;
  in: number;
  out: number;
}

export const NODE_DEGREES: Record<string, NodeDegree> = (() => {
  const map: Record<string, NodeDegree> = {};
  for (const n of FLOW_NODES) map[n.id] = { id: n.id, in: 0, out: 0 };
  for (const e of FLOW_EDGES) {
    if (map[e.from]) map[e.from].out += 1;
    if (map[e.to]) map[e.to].in += 1;
  }
  return map;
})();

/** telas que ninguém aponta: só se chega por link direto ou menu */
export const SEM_ENTRADA = FLOW_NODES.filter((n) => NODE_DEGREES[n.id].in === 0);

/** telas que não levam a lugar nenhum declarado: beco sem saída */
export const SEM_SAIDA = FLOW_NODES.filter((n) => NODE_DEGREES[n.id].out === 0);

/** telas soltas: sem entrada e sem saída */
export const ILHADAS = FLOW_NODES.filter(
  (n) => NODE_DEGREES[n.id].in === 0 && NODE_DEGREES[n.id].out === 0,
);
