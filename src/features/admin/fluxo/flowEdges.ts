import { FLOW_NODES, nodeById } from "./flowMap";

export interface FlowEdge {
  from: string;
  to: string;
}

/** todas as conexões declaradas em `to` e `from`, sem duplicar */
export const FLOW_EDGES: FlowEdge[] = (() => {
  const seen = new Set<string>();
  const edges: FlowEdge[] = [];
  const push = (from: string, to: string) => {
    if (from === to) return;
    if (!nodeById(from) || !nodeById(to)) return;
    const key = `${from}->${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to });
  };
  for (const n of FLOW_NODES) {
    for (const t of n.to ?? []) push(n.id, t);
    for (const f of n.from ?? []) push(f, n.id);
  }
  return edges;
})();

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * desenha uma curva entre dois cards.
 * se os cards estão em colunas diferentes, sai pela lateral.
 * se estão na mesma coluna, contorna pela direita.
 */
export const edgePath = (a: Rect, b: Rect): string => {
  const sameColumn = Math.abs(a.x - b.x) < 8;

  if (sameColumn) {
    const side = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const y2 = b.y + b.h / 2;
    const bulge = 28 + Math.min(48, Math.abs(y2 - y1) / 6);
    return `M ${side} ${y1} C ${side + bulge} ${y1}, ${side + bulge} ${y2}, ${side} ${y2}`;
  }

  const leftToRight = a.x < b.x;
  const x1 = leftToRight ? a.x + a.w : a.x;
  const x2 = leftToRight ? b.x : b.x + b.w;
  const y1 = a.y + a.h / 2;
  const y2 = b.y + b.h / 2;
  const dx = Math.max(32, Math.abs(x2 - x1) / 2);
  const c1 = leftToRight ? x1 + dx : x1 - dx;
  const c2 = leftToRight ? x2 - dx : x2 + dx;
  return `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
};
