import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Droplet, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  entrada?: string;
  transformacao?: string;
  saida?: string;
  vazamentos?: string[];
  has_image?: boolean;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    with_image_count: number;
    avg_vazamentos: number;
  };
  fluxo_distribution?: Record<string, number>;
  samples?: Sample[];
  error?: string;
};

const FLUXO_LABEL: Record<string, string> = {
  materiais: "materiais e compras",
  alimentacao: "alimentação",
  energia: "energia e clima",
  agua: "água",
  mobilidade: "mobilidade e entorno",
  tecnologia: "tecnologia e eletrônicos",
};

/**
 * /admin/eletiva/economia-circular/modulo/6
 * agrega os mapas de fluxo entregues no módulo 6.
 */
export default function AdminEletivaModulo6() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m6-mapa-fluxo-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module6_mapa_fluxo_stats",
        { _course_slug: "economia-circular", _module_number: 6 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando mapas de fluxo da turma…
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="p-8 flex items-start gap-2 text-sm text-perestroika-preto">
        <AlertTriangle className="h-4 w-4 mt-0.5" />
        <div>
          <p className="font-semibold">erro ao carregar</p>
          <p className="text-perestroika-preto/70">{data?.error ?? (error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const dist = data?.fluxo_distribution ?? {};
  const totalDist = Object.values(dist).reduce((s, n) => s + n, 0);
  const samples = data?.samples ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55">
            economia circular · módulo 6
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            mapas de fluxo da turma
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            veja como cada estudante enxergou entrada, transformação, saída e vazamentos no próprio
            sistema.
          </p>
        </header>

        {/* KPIs */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram mapa" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="com imagem" value={kpis?.with_image_count ?? 0} />
          <KpiCard label="média de vazamentos" value={(kpis?.avg_vazamentos ?? 0).toFixed(1)} />
        </section>

        {/* Distribuição por fluxo */}
        <section className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-3">
            distribuição por fluxo escolhido (briefing módulo 5)
          </p>
          {totalDist === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/60">ainda sem dados.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(dist)
                .sort(([, a], [, b]) => b - a)
                .map(([k, n]) => {
                  const pct = Math.round((n / totalDist) * 100);
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between font-body text-sm text-perestroika-preto/80 mb-0.5">
                        <span>{FLUXO_LABEL[k] ?? k}</span>
                        <span className="tabular-nums text-perestroika-preto/60">
                          {n} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-perestroika-preto/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-perestroika-preto/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* amostras */}
        <section className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            últimos mapas entregues
          </p>
          {samples.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/60">nenhum mapa entregue ainda.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {samples.map((s, i) => (
                <article
                  key={i}
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 space-y-2"
                >
                  <header className="flex items-center justify-between">
                    <p className="font-body text-sm font-semibold text-perestroika-preto">
                      {s.nickname}
                    </p>
                    {s.has_image && (
                      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                        <ImageIcon className="h-3 w-3" aria-hidden /> imagem
                      </span>
                    )}
                  </header>
                  <div className="grid gap-1 font-body text-sm text-perestroika-preto/85">
                    {s.entrada && (
                      <p>
                        <span className="text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                          entrada:
                        </span>{" "}
                        {s.entrada}
                      </p>
                    )}
                    {s.transformacao && (
                      <p>
                        <span className="text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                          transformação:
                        </span>{" "}
                        {s.transformacao}
                      </p>
                    )}
                    {s.saida && (
                      <p>
                        <span className="text-[11px] uppercase tracking-wider text-perestroika-preto/55">
                          saída:
                        </span>{" "}
                        {s.saida}
                      </p>
                    )}
                  </div>
                  {(s.vazamentos ?? []).length > 0 && (
                    <ul className="space-y-1">
                      {(s.vazamentos ?? []).map((v, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-1.5 font-body text-xs text-perestroika-preto/70"
                        >
                          <Droplet className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden />
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
        {label}
      </p>
      <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">
        {value}
      </p>
    </div>
  );
}
