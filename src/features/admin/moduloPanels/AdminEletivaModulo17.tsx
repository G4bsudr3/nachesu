import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  criterio_resultado: string | null;
  n_evidencias: number;
  honestidade_atalho: string | null;
  o_que_fez: string | null;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    entregas: number;
    em_campo: number;
    atingiu: number;
    parcial: number;
    nao_atingiu: number;
    admitiu_atalho: number;
  };
  samples?: Sample[];
  error?: string;
};

const CRIT_LABEL: Record<string, string> = {
  atingiu: "atingiu",
  parcial: "parcial",
  nao_atingiu: "não atingiu",
};

export default function AdminEletivaModulo17() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m17-registro-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module17_registro_stats",
        { _course_slug: "economia-circular", _module_number: 17 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando registros da turma…
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
            economia circular · módulo 17 · mãos à obra
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] text-perestroika-preto">
            registros de experimento
          </h1>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantos estudantes estão em campo, quantos já entregaram resultado e como se saíram frente ao critério.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="em campo" value={kpis?.em_campo ?? 0} />
          <KpiCard label="entregaram" value={kpis?.entregas ?? 0} />
          <KpiCard label="atingiu critério" value={kpis?.atingiu ?? 0} />
          <KpiCard label="parcial" value={kpis?.parcial ?? 0} />
          <KpiCard label="não atingiu" value={kpis?.nao_atingiu ?? 0} />
          <KpiCard label="admitiu atalho" value={kpis?.admitiu_atalho ?? 0} />
        </section>

        <section className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            últimas entregas
          </p>
          {samples.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/60">nenhuma entrega ainda.</p>
          ) : (
            <div className="grid gap-2">
              {samples.map((s, i) => (
                <article
                  key={i}
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-body text-sm font-semibold text-perestroika-preto">{s.nickname}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.criterio_resultado && (
                        <span className="rounded-full border border-perestroika-preto/20 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                          {CRIT_LABEL[s.criterio_resultado] ?? s.criterio_resultado}
                        </span>
                      )}
                      <span className="rounded-full border border-perestroika-preto/20 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                        {s.n_evidencias} evidências
                      </span>
                      {s.honestidade_atalho === "sim" && (
                        <span className="rounded-full border border-perestroika-laranja/50 bg-perestroika-laranja/15 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-laranja">
                          admitiu atalho
                        </span>
                      )}
                    </div>
                  </div>
                  {s.o_que_fez && (
                    <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
                      <span className="uppercase tracking-wider text-[11px] text-perestroika-preto/55">o que fez · </span>
                      {s.o_que_fez}
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
      <p className="font-display text-2xl leading-none text-perestroika-preto tabular-nums">{value}</p>
    </div>
  );
}
