import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { FLOW_EDGES, edgePath, type Rect } from "./flowEdges";

interface Props {
  containerRef: RefObject<HTMLElement>;
  /** nó em foco: as setas ligadas a ele ficam em destaque */
  selectedId: string | null;
}

interface DrawnEdge {
  from: string;
  to: string;
  d: string;
}

/**
 * camada svg por cima do grid de cards, ligando as páginas com setas.
 * mede os cards pelo atributo data-flow-node, então não precisa de ref por nó.
 */
export const FluxoConnections = ({ containerRef, selectedId }: Props) => {
  const [edges, setEdges] = useState<DrawnEdge[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const rects = new Map<string, Rect>();
    root.querySelectorAll<HTMLElement>("[data-flow-node]").forEach((el) => {
      const id = el.dataset.flowNode;
      if (!id) return;
      const r = el.getBoundingClientRect();
      rects.set(id, { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
    });

    setSize({ w: base.width, h: base.height });
    setEdges(
      FLOW_EDGES.flatMap(({ from, to }) => {
        const a = rects.get(from);
        const b = rects.get(to);
        if (!a || !b) return [];
        return [{ from, to, d: edgePath(a, b) }];
      }),
    );
  }, [containerRef]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    root.querySelectorAll<HTMLElement>("[data-flow-node]").forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, measure]);

  if (!size.w || !edges.length) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      fill="none"
    >
      <defs>
        <marker
          id="fluxo-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <marker
          id="fluxo-arrow-on"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {edges.map(({ from, to, d }) => {
        const active = selectedId === from || selectedId === to;
        const dim = selectedId !== null && !active;
        return (
          <path
            key={`${from}->${to}`}
            d={d}
            stroke="currentColor"
            className={
              active
                ? "text-perestroika-laranja"
                : dim
                  ? "text-perestroika-preto/10"
                  : "text-perestroika-preto/25"
            }
            strokeWidth={active ? 2 : 1}
            strokeDasharray={active ? undefined : "4 5"}
            markerEnd={`url(#${active ? "fluxo-arrow-on" : "fluxo-arrow"})`}
          />
        );
      })}
    </svg>
  );
};

export default FluxoConnections;
