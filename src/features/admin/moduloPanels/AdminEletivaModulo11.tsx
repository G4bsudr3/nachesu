import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = { nickname: string; total_ideias: number };

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    avg_ideias: number;
    atingiu_20: number;
    ideias_r1: number;
    ideias_r2: number;
    ideias_r3: number;
    ideias_r4: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo11() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m11-ideacao-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module11_ideacao_stats",
        { _course_slug: "economia-circular", _module_number: 11 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando sprint de ideação da turma…
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
  const samples = data?.samples ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55">
            economia circular · módulo 11
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] text-perestroika-preto">
            sprint de ideação da turma
          </h1>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantas ideias vieram, como se distribuíram entre as 4 rodadas e quem conseguiu chegar às 20.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram sprint" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="média de ideias" value={kpis?.avg_ideias ?? 0} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
              chegaram a 20+ ideias
            </p>
            <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">
              {kpis?.atingiu_20 ?? 0}
            </p>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/45 mt-1">
              de {kpis?.submitted_count ?? 0} entregas
            </p>
          </div>
        </section>

        <section>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
            distribuição por rodada
          </p>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            <RodadaCard label="r1 · scamper" value={kpis?.ideias_r1 ?? 0} />
            <RodadaCard label="r2 · biomimética" value={kpis?.ideias_r2 ?? 0} />
            <RodadaCard label="r3 · deslocamento" value={kpis?.ideias_r3 ?? 0} />
            <RodadaCard label="r4 · analogias" value={kpis?.ideias_r4 ?? 0} />
          </div>
        </section>

        <section className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            últimas entregas
          </p>
          {samples.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/60">nenhuma entrega ainda.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {samples.map((s, i) => (
                <article
                  key={i}
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 flex items-center justify-between gap-3"
                >
                  <p className="font-body text-sm font-semibold text-perestroika-preto">{s.nickname}</p>
                  <span className="font-display text-2xl tabular-nums text-perestroika-preto">
                    {s.total_ideias}
                    <span className="text-xs text-perestroika-preto/50"> ideias</span>
                  </span>
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
      <p className="font-display text-2xl leading-none text-perestroika-preto tabular-nums">{value}</p>
    </div>
  );
}

function RodadaCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
        {label}
      </p>
      <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">{value}</p>
    </div>
  );
}
