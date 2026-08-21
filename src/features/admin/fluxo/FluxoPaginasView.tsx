import { Link } from "react-router-dom";
import { ArrowUpRight, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOW_NODES, LANES } from "./flowMap";

interface Props {
  onSelect: (id: string) => void;
}

export const FluxoPaginasView = ({ onSelect }: Props) => {
  return (
    <div className="space-y-10">
      {LANES.map((lane) => {
        const nodes = FLOW_NODES.filter((n) => n.lane === lane.id);
        return (
          <section key={lane.id} className="space-y-3">
            <div className="flex items-baseline gap-3 border-b border-perestroika-preto/10 pb-2">
              <h2 className={cn("font-display uppercase text-2xl leading-none", lane.accent)}>
                {lane.title}
              </h2>
              <p className="text-[11px] text-perestroika-preto/55">{lane.hint}</p>
              <span className="ml-auto text-[11px] tabular-nums text-perestroika-preto/50">
                {nodes.length} {nodes.length === 1 ? "página" : "páginas"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-perestroika-preto/10 bg-perestroika-bege">
              <table className="w-full text-left min-w-[520px] table-fixed">
                <thead>
                  <tr className="border-b border-perestroika-preto/10 bg-perestroika-preto/[0.03]">
                    <th className="w-[40%] px-4 py-3 text-left text-[11px] uppercase tracking-wide text-perestroika-preto/60 font-semibold">
                      página
                    </th>
                    <th className="w-[28%] px-4 py-3 text-left text-[11px] uppercase tracking-wide text-perestroika-preto/60 font-semibold">
                      rota
                    </th>
                    <th className="w-[17%] px-4 py-3 text-center text-[11px] uppercase tracking-wide text-perestroika-preto/60 font-semibold">
                      acesso
                    </th>
                    <th className="w-[15%] px-4 py-3 text-right text-[11px] uppercase tracking-wide text-perestroika-preto/60 font-semibold">
                      ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((n) => {
                    const publica = n.access === "público";
                    const abrivel = !n.route.includes(":");
                    return (
                      <tr
                        key={n.id}
                        className="border-b border-perestroika-preto/10 last:border-b-0 hover:bg-perestroika-preto/[0.02]"
                      >
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => onSelect(n.id)}
                            className="text-left font-medium text-sm leading-tight underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto rounded"
                          >
                            {n.title}
                          </button>
                          <p className="text-[11px] text-perestroika-preto/60 mt-1 leading-snug line-clamp-2">
                            {n.role}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-top font-mono text-[11px] text-perestroika-preto/55 break-all leading-snug">
                          {n.route}
                        </td>

                        <td className="px-4 py-3 align-top text-center">
                          <span
                            className={cn(
                              "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                              publica
                                ? "bg-perestroika-azul/15"
                                : "bg-perestroika-preto/10",
                            )}
                          >
                            {publica ? (
                              <Globe className="w-3 h-3" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                            {publica ? "pública" : n.access === "admin" ? "admin" : "logada"}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          {abrivel ? (
                            <Link
                              to={n.route}
                              className="inline-flex items-center justify-end gap-1.5 text-[12px] underline underline-offset-2 min-h-[44px]"
                            >
                              abrir
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <p className="text-[11px] text-perestroika-preto/45 pt-1">
                              rota com parâmetro
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
};
