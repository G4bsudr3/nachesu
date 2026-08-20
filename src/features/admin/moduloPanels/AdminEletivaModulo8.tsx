import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  principio1?: string;
  principio2?: string;
  rs_taticos?: string[];
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
  };
  principio_distribution?: Record<string, number>;
  rs_distribution?: Record<string, number>;
  samples?: Sample[];
  error?: string;
};

const PRINCIPIO_LABEL: Record<string, string> = {
  eliminar: "eliminar desperdício desde o design",
  circular: "circular no valor mais alto",
  regenerar: "regenerar a natureza",
};

const R_LABEL: Record<string, string> = {
  recusar: "recusar",
  reduzir: "reduzir",
  reusar: "reusar",
  reparar: "reparar",
  recuperar: "recuperar",
  reciclar: "reciclar",
};

export default function AdminEletivaModulo8() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m8-regras-jogo-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module8_regras_jogo_stats",
        { _course_slug: "economia-circular", _module_number: 8 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando regras do jogo da turma…
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
  const pDist = data?.principio_distribution ?? {};
  const rDist = data?.rs_distribution ?? {};
  const pTotal = Object.values(pDist).reduce((s, n) => s + n, 0);
  const rTotal = Object.values(rDist).reduce((s, n) => s + n, 0);
  const samples = data?.samples ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            economia circular · módulo 8
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            regras do jogo escolhidas
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quais 2 princípios EMF a turma priorizou e quais R's escolheram como táticos.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram regras" value={kpis?.submitted_count ?? 0} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <DistCard title="princípios EMF escolhidos" dist={pDist} total={pTotal} labelMap={PRINCIPIO_LABEL} />
          <DistCard title="R's táticos escolhidos" dist={rDist} total={rTotal} labelMap={R_LABEL} />
        </section>

        <section className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            últimas entregas
          </p>
          {samples.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/60">nenhuma entrega ainda.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {samples.map((s, i) => (
                <article
                  key={i}
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 space-y-2"
                >
                  <p className="font-body text-sm font-semibold text-perestroika-preto">{s.nickname}</p>
                  <p className="font-body text-xs text-perestroika-preto/75">
                    <strong>{PRINCIPIO_LABEL[s.principio1 ?? ""] ?? s.principio1 ?? "—"}</strong>
                    {" + "}
                    <strong>{PRINCIPIO_LABEL[s.principio2 ?? ""] ?? s.principio2 ?? "—"}</strong>
                  </p>
                  {(s.rs_taticos ?? []).length > 0 && (
                    <p className="font-body text-xs text-perestroika-preto/60">
                      R's: {(s.rs_taticos ?? []).map((r) => R_LABEL[r] ?? r).join(" · ")}
                    </p>
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
      <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">{value}</p>
    </div>
  );
}

function DistCard({
  title,
  dist,
  total,
  labelMap,
}: {
  title: string;
  dist: Record<string, number>;
  total: number;
  labelMap: Record<string, string>;
}) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-3">
        {title}
      </p>
      {total === 0 ? (
        <p className="font-body text-sm text-perestroika-preto/60">ainda sem dados.</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(dist)
            .sort(([, a], [, b]) => b - a)
            .map(([k, n]) => {
              const pct = Math.round((n / total) * 100);
              return (
                <div key={k}>
                  <div className="flex items-center justify-between font-body text-sm text-perestroika-preto/80 mb-0.5">
                    <span>{labelMap[k] ?? k}</span>
                    <span className="tabular-nums text-perestroika-preto/60">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-perestroika-preto/10 overflow-hidden">
                    <div className="h-full rounded-full bg-perestroika-preto/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
