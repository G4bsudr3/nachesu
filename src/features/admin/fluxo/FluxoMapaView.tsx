import { useRef, useState } from "react";
import { Minus, Plus, Maximize2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOW_NODES, LANES, nodeById, type FlowNode } from "./flowMap";
import { FLOW_EDGES } from "./flowEdges";
import {
  ORGANIC_POSITIONS,
  LAYOUT_COLUMNS,
  organicPath,
  CANVAS_H,
  CANVAS_W,
  CARD_H,
  CARD_W,
} from "./organicLayout";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const LANE_DOT: Record<FlowNode["lane"], string> = {
  publico: "bg-perestroika-azul",
  entrada: "bg-perestroika-laranja",
  estudante: "bg-perestroika-rosa",
  escola: "bg-perestroika-vermelho",
  admin: "bg-perestroika-preto/70",
};

const ZOOMS = [0.55, 0.7, 0.85, 1];

export const FluxoMapaView = ({ selectedId, onSelect }: Props) => {
  const [zoomIdx, setZoomIdx] = useState(1);
  const zoom = ZOOMS[zoomIdx];
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  const neighbours = selectedId
    ? new Set(
        FLOW_EDGES.filter((e) => e.from === selectedId || e.to === selectedId).flatMap((e) => [
          e.from,
          e.to,
        ]),
      )
    : null;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-flow-node]")) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !drag.current) return;
    el.scrollLeft = drag.current.sl - (e.clientX - drag.current.x);
    el.scrollTop = drag.current.st - (e.clientY - drag.current.y);
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-perestroika-preto/60">
          {LANES.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", LANE_DOT[l.id])} />
              {l.title}
            </span>
          ))}
          <span className="hidden sm:inline">o fluxo corre da esquerda pra direita, clique num card pra isolar</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            disabled={zoomIdx === 0}
            aria-label="diminuir zoom"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl hover:bg-perestroika-preto/[0.06] disabled:opacity-35"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="tabular-nums text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))}
            disabled={zoomIdx === ZOOMS.length - 1}
            aria-label="aumentar zoom"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl hover:bg-perestroika-preto/[0.06] disabled:opacity-35"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomIdx(1);
              scrollRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
            }}
            aria-label="reenquadrar mapa"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl hover:bg-perestroika-preto/[0.06]"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="card-surface relative overflow-auto bg-perestroika-bege touch-pan-x touch-pan-y cursor-grab active:cursor-grabbing"
        style={{ height: "min(72vh, 720px)" }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${zoom})`,
            marginBottom: CANVAS_H * (zoom - 1),
            marginRight: CANVAS_W * (zoom - 1),
          }}
        >
          {LAYOUT_COLUMNS.map((c) => (
            <div
              key={c.x}
              className="absolute top-5 text-[11px] text-perestroika-preto/45"
              style={{ left: c.x, width: CARD_W }}
            >
              <span className="block truncate font-medium">{c.label}</span>
              <span className="block text-[10px] text-perestroika-preto/35">
                {c.count} {c.count === 1 ? "página" : "páginas"}
              </span>
            </div>
          ))}

          <svg
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            width={CANVAS_W}
            height={CANVAS_H}
            fill="none"
          >
            <defs>
              <marker
                id="mapa-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {FLOW_EDGES.map(({ from, to }) => {
              const a = ORGANIC_POSITIONS[from];
              const b = ORGANIC_POSITIONS[to];
              if (!a || !b) return null;
              const active = selectedId === from || selectedId === to;
              const dim = selectedId !== null && !active;
              return (
                <path
                  key={`${from}->${to}`}
                  d={organicPath(a, b)}
                  stroke="currentColor"
                  className={
                    active
                      ? "text-perestroika-laranja"
                      : dim
                        ? "text-perestroika-preto/[0.07]"
                        : "text-perestroika-preto/25"
                  }
                  strokeWidth={active ? 2 : 1}
                  strokeDasharray={active ? undefined : "4 5"}
                  markerEnd="url(#mapa-arrow)"
                />
              );
            })}
          </svg>

          {FLOW_NODES.map((n) => {
            const p = ORGANIC_POSITIONS[n.id];
            if (!p) return null;
            const isSelected = selectedId === n.id;
            const related = neighbours?.has(n.id) ?? false;
            const dim = selectedId !== null && !isSelected && !related;
            return (
              <button
                key={n.id}
                type="button"
                data-flow-node={n.id}
                onClick={() => onSelect(n.id)}
                aria-expanded={isSelected}
                className={cn(
                  "card-surface absolute text-left p-2.5 bg-perestroika-bege space-y-1 transition-all",
                  "hover:bg-perestroika-preto/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto",
                  isSelected && "ring-2 ring-perestroika-laranja bg-perestroika-preto/[0.06]",
                  dim && "opacity-35",
                )}
                style={{ left: p.x, top: p.y, width: CARD_W, minHeight: CARD_H }}
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", LANE_DOT[n.lane])} />
                  <span className="font-medium text-sm leading-tight">{n.title}</span>
                </span>
                <span className="block font-mono text-[10px] text-perestroika-preto/55 break-all">
                  {n.route}
                </span>
                {n.risco && (
                  <span className="flex items-start gap-1 text-[10px] text-perestroika-preto/60">
                    <TriangleAlert className="w-3 h-3 mt-px shrink-0 text-perestroika-laranja" />
                    <span className="line-clamp-2">{n.risco}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedId && (
        <p className="text-[11px] text-perestroika-preto/55">
          mostrando as conexões de{" "}
          <strong className="font-medium">{nodeById(selectedId)?.title}</strong>.
        </p>
      )}
    </div>
  );
};

export default FluxoMapaView;
