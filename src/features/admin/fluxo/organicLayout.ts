import { FLOW_EDGES } from "./flowEdges";
import { FLOW_NODES } from "./flowMap";

export interface Point {
  x: number;
  y: number;
}

export const CARD_W = 196;
export const CARD_H = 92;
export const CANVAS_W = 1680;
export const CANVAS_H = 1180;

/** random determinístico: mesmo mapa toda vez que abre */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/**
 * layout orgânico: força de mola nas conexões + repulsão entre cards.
 * roda uma vez, em memória, sem depender do DOM.
 */
export const ORGANIC_POSITIONS: Record<string, Point> = (() => {
  const rand = seeded(20260821);
  const ids = FLOW_NODES.map((n) => n.id);
  const pos: Record<string, Point> = {};

  // semente em anel, agrupando por lane pra não nascer tudo embolado
  const lanes = ["publico", "entrada", "estudante", "admin"];
  ids.forEach((id) => {
    const node = FLOW_NODES.find((n) => n.id === id)!;
    const laneIdx = Math.max(0, lanes.indexOf(node.lane));
    const angle = (laneIdx / lanes.length) * Math.PI * 2 + rand() * 1.4;
    const radius = 200 + rand() * 300;
    pos[id] = {
      x: CANVAS_W / 2 + Math.cos(angle) * radius * 1.25,
      y: CANVAS_H / 2 + Math.sin(angle) * radius,
    };
  });

  const K_SPRING = 0.012;
  const REST = 300;
  const K_REPULSE = 46000;

  for (let step = 0; step < 600; step++) {
    const force: Record<string, Point> = {};
    ids.forEach((id) => (force[id] = { x: 0, y: 0 }));

    // repulsão
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]];
        const b = pos[ids[j]];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist2 = dx * dx + dy * dy;
        if (dist2 < 1) {
          dx = rand() - 0.5;
          dy = rand() - 0.5;
          dist2 = 1;
        }
        const dist = Math.sqrt(dist2);
        const f = K_REPULSE / dist2;
        force[ids[i]].x += (dx / dist) * f;
        force[ids[i]].y += (dy / dist) * f;
        force[ids[j]].x -= (dx / dist) * f;
        force[ids[j]].y -= (dy / dist) * f;
      }
    }

    // molas nas conexões
    for (const e of FLOW_EDGES) {
      const a = pos[e.from];
      const b = pos[e.to];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const f = (dist - REST) * K_SPRING;
      a.x += (dx / dist) * f;
      a.y += (dy / dist) * f;
      b.x -= (dx / dist) * f;
      b.y -= (dy / dist) * f;
    }

    // gravidade suave pro centro + aplica repulsão amortecida
    const damp = 0.9 * (1 - step / 900);
    for (const id of ids) {
      const p = pos[id];
      p.x += force[id].x * damp * 0.02 + (CANVAS_W / 2 - p.x) * 0.004;
      p.y += force[id].y * damp * 0.02 + (CANVAS_H / 2 - p.y) * 0.004;
    }
  }

  // normaliza pra caber no canvas com margem
  const margin = 60;
  const xs = ids.map((id) => pos[id].x);
  const ys = ids.map((id) => pos[id].y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (CANVAS_W - CARD_W - margin * 2) / Math.max(1, maxX - minX);
  const sy = (CANVAS_H - CARD_H - margin * 2) / Math.max(1, maxY - minY);

  const out: Record<string, Point> = {};
  for (const id of ids) {
    out[id] = {
      x: Math.round(margin + (pos[id].x - minX) * sx),
      y: Math.round(margin + (pos[id].y - minY) * sy),
    };
  }
  return out;
})();

/** curva entre dois cards, saindo da borda mais próxima */
export const organicPath = (a: Point, b: Point): string => {
  const ax = a.x + CARD_W / 2;
  const ay = a.y + CARD_H / 2;
  const bx = b.x + CARD_W / 2;
  const by = b.y + CARD_H / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.max(1, Math.hypot(dx, dy));

  // encolhe as pontas pra seta encostar na borda do card, não no centro
  const shrinkA = Math.min(dist / 2 - 2, Math.abs(dx) > Math.abs(dy) ? CARD_W / 2 + 6 : CARD_H / 2 + 6);
  const shrinkB = shrinkA + 8;
  const x1 = ax + (dx / dist) * shrinkA;
  const y1 = ay + (dy / dist) * shrinkA;
  const x2 = bx - (dx / dist) * shrinkB;
  const y2 = by - (dy / dist) * shrinkB;

  // curvatura perpendicular pra evitar linhas retas sobrepostas
  const bulge = Math.min(70, dist / 6);
  const nx = -(y2 - y1) / dist;
  const ny = (x2 - x1) / dist;
  const cx = (x1 + x2) / 2 + nx * bulge;
  const cy = (y1 + y2) / 2 + ny * bulge;
  return `M ${x1} ${y1} Q ${cx} ${cy}, ${x2} ${y2}`;
};
