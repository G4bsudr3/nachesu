import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  total_stake: number;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    avg_stakeholders: number;
    quadrante_alto_alto: number;
    quadrante_alto_baixo: number;
    quadrante_baixo_alto: number;
    quadrante_baixo_baixo: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo10() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m10-stakeholders-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module10_stakeholders_stats",
        { _course_slug: "economia-circular", _module_number: 10 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando mapa de stakeholders da turma…
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
            economia circular · módulo 10
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            mapa de stakeholders da turma
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantos nomes específicos os estudantes trouxeram e como distribuíram na matriz poder × interesse.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram mapa" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="média de nomes" value={kpis?.avg_stakeholders ?? 0} />
        </section>

        <section>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
            distribuição na matriz poder × interesse
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <QuadCard label="alto poder · alto interesse" hint="aliados-chave" value={kpis?.quadrante_alto_alto ?? 0} />
            <QuadCard label="alto poder · baixo interesse" hint="risco de bloqueio" value={kpis?.quadrante_alto_baixo ?? 0} />
            <QuadCard label="baixo poder · alto interesse" hint="advocates em potencial" value={kpis?.quadrante_baixo_alto ?? 0} />
            <QuadCard label="baixo poder · baixo interesse" hint="apenas informar" value={kpis?.quadrante_baixo_baixo ?? 0} />
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
                    {s.total_stake}
                    <span className="text-xs text-perestroika-preto/50"> nomes</span>
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

function QuadCard({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
        {label}
      </p>
      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
        {hint}
      </p>
      <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">{value}</p>
    </div>
  );
}
