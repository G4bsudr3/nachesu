import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  METRIC_LABEL,
  nodeById,
} from "@/features/admin/fluxo/flowMap";
import { useFluxoMetrics } from "@/features/admin/fluxo/useFluxoMetrics";
import { FluxoMapaView } from "@/features/admin/fluxo/FluxoMapaView";
import { FluxoPaginasView } from "@/features/admin/fluxo/FluxoPaginasView";
import { SEM_ENTRADA, SEM_SAIDA, ILHADAS } from "@/features/admin/fluxo/flowAnalysis";


type ViewId = "paginas" | "fluxo";

const AdminFluxo = () => {
  const { data: metrics } = useFluxoMetrics();
  const [view, setView] = useState<ViewId>("paginas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? nodeById(selectedId) : null;


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
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="visualização">
        {([
          { id: "paginas", label: "páginas" },
          { id: "fluxo", label: "fluxo de páginas" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={view === t.id}
            onClick={() => setView(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto",
              view === t.id
                ? "bg-perestroika-preto text-perestroika-bege"
                : "bg-perestroika-preto/[0.06] hover:bg-perestroika-preto/[0.12]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>


      {view === "paginas" && <FluxoPaginasView onSelect={setSelectedId} />}

      {view === "fluxo" && (
      <>
      <FluxoMapaView selectedId={selectedId} onSelect={setSelectedId} />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "sem entrada", hint: "ninguém aponta pra cá, só link direto ou menu", list: SEM_ENTRADA },
          { title: "sem saída", hint: "beco: a tela não leva a nenhum próximo passo", list: SEM_SAIDA },
          { title: "ilhadas", hint: "sem entrada e sem saída no mapa", list: ILHADAS },
        ].map((bloco) => (
          <div key={bloco.title} className="card-surface p-4 space-y-2">
            <p className="eyebrow text-perestroika-preto/55">{bloco.title}</p>
            <p className="text-[11px] text-perestroika-preto/55">{bloco.hint}</p>
            {bloco.list.length === 0 ? (
              <p className="text-sm text-perestroika-preto/60">nenhuma. rede fechada aqui.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {bloco.list.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className="rounded-full bg-perestroika-preto/[0.06] px-2.5 py-1 text-xs hover:bg-perestroika-preto/[0.12] transition-colors"
                    >
                      {n.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      </>
      )}



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
