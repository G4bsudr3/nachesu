import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PanelHeader } from "./PanelHeader";

type Sample = {
  nickname: string;
  segmento: string | null;
  n_receitas: number;
  n_custos: number;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    com_2_receitas: number;
    autoteste_amarelo: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo14() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m14-bmc-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module14_bmc_stats",
        { _course_slug: "economia-circular", _module_number: 14 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando modelos da turma…
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
        <PanelHeader title={"modelos de negócio da turma"} description={"quantos alunos entregaram o bmc simplificado, quantos têm 2+ fontes de receita e onde o autoteste acendeu amarelo."} />

        <section className="grid gap-3 sm:grid-cols-5">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="2+ receitas" value={kpis?.com_2_receitas ?? 0} />
          <KpiCard label="autoteste amarelo" value={kpis?.autoteste_amarelo ?? 0} />
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
                    <p className="font-body text-sm font-semibold text-perestroika-preto">
                      {s.nickname}
                    </p>
                    <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                      {s.n_receitas} receitas · {s.n_custos} custos
                    </p>
                  </div>
                  {s.segmento && (
                    <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
                      <span className="uppercase tracking-wider text-[11px] text-perestroika-preto/55">segmento · </span>
                      {s.segmento}
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
