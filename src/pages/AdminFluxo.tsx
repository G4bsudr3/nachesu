import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Copy, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FLOW_NODES,
  LANES,
  METRIC_ALERT_ABOVE,
  METRIC_LABEL,
  flowToMarkdown,
  nodeById,
  type FlowNode,
} from "@/features/admin/fluxo/flowMap";
import { useFluxoMetrics } from "@/features/admin/fluxo/useFluxoMetrics";
import { FluxoConnections } from "@/features/admin/fluxo/FluxoConnections";

const ACCESS_STYLE: Record<FlowNode["access"], string> = {
  público: "bg-perestroika-azul/15 text-perestroika-preto",
  logado: "bg-perestroika-rosa/20 text-perestroika-preto",
  admin: "bg-perestroika-preto/10 text-perestroika-preto",
};

const AdminFluxo = () => {
  const { data: metrics } = useFluxoMetrics();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? nodeById(selectedId) : null;

  const gargalos = useMemo(() => {
    const vistos = new Set<string>();
    return FLOW_NODES.filter((n) => {
      if (!n.metric || vistos.has(n.metric)) return false;
      const limit = METRIC_ALERT_ABOVE[n.metric];
      if (limit === undefined) return false;
      if ((metrics?.[n.metric] ?? 0) <= limit) return false;
      vistos.add(n.metric);
      return true;
    });
  }, [metrics]);

  const copyMarkdown = () => {
    navigator.clipboard.writeText(flowToMarkdown(metrics)).then(
      () => toast.success("mapa copiado como texto"),
      () => toast.error("não consegui copiar"),
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow text-perestroika-preto/55">visão geral</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.9]">
            fluxo do usuário
          </h1>
          <p className="text-sm text-perestroika-preto/65 max-w-xl">
            o caminho inteiro, do primeiro clique na home até o certificado, com os números
            que mostram onde as pessoas param.
          </p>
        </div>
        <Button variant="outline" onClick={copyMarkdown} className="gap-2">
          <Copy className="w-4 h-4" />
          copiar como texto
        </Button>
      </header>

      {gargalos.length > 0 && (
        <div className="card-surface p-4 space-y-2 border-perestroika-laranja/40">
          <p className="flex items-center gap-2 text-sm font-medium">
            <TriangleAlert className="w-4 h-4 text-perestroika-laranja" />
            pontos com gente parada agora
          </p>
          <ul className="flex flex-wrap gap-2">
            {gargalos.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-perestroika-laranja/20 px-3 py-1.5 text-xs hover:bg-perestroika-laranja/35 transition-colors"
                >
                  <span className="font-semibold tabular-nums">
                    {metrics?.[n.metric!] ?? 0}
                  </span>
                  {METRIC_LABEL[n.metric!]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="hidden lg:flex items-center gap-2 text-[11px] text-perestroika-preto/55">
        <span className="inline-block w-8 border-t border-dashed border-perestroika-preto/40" />
        as setas mostram por onde se chega em cada tela. clique num card pra destacar só as
        conexões dele.
      </p>

      <div ref={gridRef} className="relative grid gap-4 lg:gap-x-14 lg:grid-cols-4">
        <FluxoConnections containerRef={gridRef} selectedId={selectedId} />
        {LANES.map((lane) => (
          <section key={lane.id} className="relative z-10 space-y-3 min-w-0">
            <div className="space-y-0.5">
              <h2 className={cn("font-display uppercase text-2xl leading-none", lane.accent)}>
                {lane.title}
              </h2>
              <p className="text-[11px] text-perestroika-preto/55">{lane.hint}</p>
            </div>

            <ol className="space-y-2">
              {FLOW_NODES.filter((n) => n.lane === lane.id).map((n) => {
                const value = n.metric ? metrics?.[n.metric] : undefined;
                const limit = n.metric ? METRIC_ALERT_ABOVE[n.metric] : undefined;
                const alert = limit !== undefined && (value ?? 0) > limit;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      data-flow-node={n.id}
                      onClick={() => setSelectedId(n.id)}
                      aria-expanded={selectedId === n.id}
                      className={cn(
                        "card-surface relative w-full text-left p-3 space-y-1.5 bg-perestroika-bege transition-colors hover:bg-perestroika-preto/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto",
                        selectedId === n.id &&
                          "bg-perestroika-preto/[0.06] ring-2 ring-perestroika-laranja",
                        alert && "border-perestroika-laranja/50",
                      )}
                    >

                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-tight">{n.title}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                            ACCESS_STYLE[n.access],
                          )}
                        >
                          {n.access}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-perestroika-preto/55 break-all">
                        {n.route}
                      </p>
                      {value !== undefined && (
                        <p
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                            alert
                              ? "bg-perestroika-laranja/25"
                              : "bg-perestroika-preto/[0.06] text-perestroika-preto/70",
                          )}
                        >
                          <span className="font-semibold tabular-nums">{value}</span>
                          {METRIC_LABEL[n.metric!]}
                        </p>
                      )}
                      {n.risco && (
                        <p className="flex items-start gap-1.5 text-[11px] text-perestroika-preto/60">
                          <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0 text-perestroika-laranja" />
                          {n.risco}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {selected && (
        <aside
          className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-perestroika-bege border-l border-perestroika-preto/15 shadow-xl overflow-y-auto p-5 space-y-4"
          aria-label={`detalhes de ${selected.title}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-perestroika-preto/55">{selected.access}</p>
              <h3 className="font-display uppercase text-3xl leading-none">{selected.title}</h3>
              <p className="font-mono text-[11px] text-perestroika-preto/60 mt-1 break-all">
                {selected.route}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="fechar detalhes"
              className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-xl hover:bg-perestroika-preto/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-perestroika-preto/75">{selected.role}</p>

          {selected.metric && (
            <div className="card-surface p-3">
              <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                {METRIC_LABEL[selected.metric]}
              </p>
              <p className="font-display text-4xl leading-none tabular-nums">
                {metrics?.[selected.metric] ?? "—"}
              </p>
            </div>
          )}

          {selected.risco && (
            <div className="card-surface p-3 border-perestroika-laranja/40 text-sm">
              <p className="eyebrow text-perestroika-preto/55">onde trava</p>
              <p className="text-perestroika-preto/80">{selected.risco}</p>
            </div>
          )}

          {(selected.from?.length || selected.to?.length) && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="eyebrow text-perestroika-preto/55">chega de</p>
                {(selected.from ?? []).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className="block text-left text-perestroika-preto/75 underline underline-offset-2 hover:text-perestroika-preto"
                  >
                    {nodeById(id)?.title ?? id}
                  </button>
                ))}
                {!selected.from?.length && (
                  <p className="text-perestroika-preto/50">entrada direta</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="eyebrow text-perestroika-preto/55">leva pra</p>
                {(selected.to ?? []).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className="block text-left text-perestroika-preto/75 underline underline-offset-2 hover:text-perestroika-preto"
                  >
                    {nodeById(id)?.title ?? id}
                  </button>
                ))}
                {!selected.to?.length && (
                  <p className="text-perestroika-preto/50">fim de percurso</p>
                )}
              </div>
            </div>
          )}

          {!selected.route.includes(":") && (
            <Link
              to={selected.route}
              className="inline-flex items-center gap-1.5 text-sm underline underline-offset-2"
            >
              abrir a tela
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </aside>
      )}
    </div>
  );
};

export default AdminFluxo;
