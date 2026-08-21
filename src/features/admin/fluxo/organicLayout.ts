import { FLOW_EDGES } from "./flowEdges";
import { FLOW_NODES, LANES, type LaneId } from "./flowMap";

export interface Point {
  x: number;
  y: number;
}

export const CARD_W = 196;
export const CARD_H = 92;

const COL_GAP = 92;
const ROW_GAP = 26;
const MARGIN_X = 48;
const MARGIN_TOP = 74;
const MARGIN_BOTTOM = 48;

const COL_STEP = CARD_W + COL_GAP;
const ROW_STEP = CARD_H + ROW_GAP;

const LANE_ORDER: LaneId[] = ["publico", "entrada", "estudante", "escola", "admin"];
const laneIndex = (l: LaneId) => Math.max(0, LANE_ORDER.indexOf(l));

/**
 * layout em camadas (esquerda -> direita): cada coluna é uma etapa do fluxo.
 * a etapa vem da maior distância a partir das páginas de entrada,
 * então toda seta anda pra frente e o caminho fica legível.
 * dentro da coluna os cards ficam agrupados por faixa.
 */
const build = () => {
  const ids = FLOW_NODES.map((n) => n.id);
  const laneOf = new Map(FLOW_NODES.map((n) => [n.id, n.lane] as const));
  const outgoing = new Map<string, string[]>(ids.map((id) => [id, []]));
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));

  for (const e of FLOW_EDGES) {
    outgoing.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  // rank = caminho mais longo desde uma entrada, com guarda contra ciclos
  const rank = new Map<string, number>(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const e of FLOW_EDGES) {
      const next = (rank.get(e.from) ?? 0) + 1;
      if (next > (rank.get(e.to) ?? 0) && next < ids.length) {
        rank.set(e.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // nós sem conexão nenhuma vão pro fim, agrupados por faixa
  const maxRank = Math.max(...ids.map((id) => rank.get(id) ?? 0));
  for (const id of ids) {
    const isolated = (indeg.get(id) ?? 0) === 0 && (outgoing.get(id)?.length ?? 0) === 0;
    if (isolated) rank.set(id, maxRank + 1);
  }

  const columns = new Map<number, string[]>();
  for (const id of ids) {
    const r = rank.get(id) ?? 0;
    if (!columns.has(r)) columns.set(r, []);
    columns.get(r)!.push(id);
  }

  const sortedRanks = [...columns.keys()].sort((a, b) => a - b);
  const positions: Record<string, Point> = {};
  const tallest = Math.max(...sortedRanks.map((r) => columns.get(r)!.length));
  const contentH = tallest * ROW_STEP - ROW_GAP;

  sortedRanks.forEach((r, colIdx) => {
    const members = columns.get(r)!.sort((a, b) => {
      const la = laneIndex(laneOf.get(a)!);
      const lb = laneIndex(laneOf.get(b)!);
      if (la !== lb) return la - lb;
      return a.localeCompare(b);
    });
    const colH = members.length * ROW_STEP - ROW_GAP;
    const top = MARGIN_TOP + (contentH - colH) / 2;
    members.forEach((id, i) => {
      positions[id] = {
        x: Math.round(MARGIN_X + colIdx * COL_STEP),
        y: Math.round(top + i * ROW_STEP),
      };
    });
  });

  const cols = sortedRanks.map((r, colIdx) => {
    const members = columns.get(r)!;
    const counts = new Map<LaneId, number>();
    for (const id of members) {
      const l = laneOf.get(id)!;
      counts.set(l, (counts.get(l) ?? 0) + 1);
    }
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return {
      x: Math.round(MARGIN_X + colIdx * COL_STEP),
      label:
        r > maxRank
          ? "sem conexão mapeada"
          : `${colIdx + 1}. ${LANES.find((l) => l.id === dominant)?.title ?? ""}`,
      count: members.length,
    };
  });

  return {
    positions,
    cols,
    width: MARGIN_X * 2 + sortedRanks.length * COL_STEP - COL_GAP,
    height: MARGIN_TOP + contentH + MARGIN_BOTTOM,
  };
};

const LAYOUT = build();

export const ORGANIC_POSITIONS: Record<string, Point> = LAYOUT.positions;
export const LAYOUT_COLUMNS = LAYOUT.cols;
export const COLUMN_WIDTH = CARD_W;
export const CANVAS_W = LAYOUT.width;
export const CANVAS_H = LAYOUT.height;

/** curva entre dois cards: sai pela lateral, sempre no sentido da seta */
export const organicPath = (a: Point, b: Point): string => {
  const sameColumn = Math.abs(a.x - b.x) < 4;
  const ay = a.y + CARD_H / 2;
  const by = b.y + CARD_H / 2;

  if (sameColumn) {
    const side = a.x + CARD_W;
    const bulge = 34 + Math.min(60, Math.abs(by - ay) / 5);
    return `M ${side} ${ay} C ${side + bulge} ${ay}, ${side + bulge} ${by}, ${side} ${by}`;
  }

  const forward = a.x < b.x;
  const x1 = forward ? a.x + CARD_W : a.x;
  const x2 = forward ? b.x : b.x + CARD_W;
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  const c1 = forward ? x1 + dx : x1 - dx;
  const c2 = forward ? x2 - dx : x2 + dx;
  return `M ${x1} ${ay} C ${c1} ${ay}, ${c2} ${by}, ${x2} ${by}`;
};
