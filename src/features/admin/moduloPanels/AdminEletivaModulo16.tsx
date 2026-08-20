import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  metodo: string | null;
  suposicao_key: string | null;
  criterio_sucesso: string | null;
  has_number: boolean;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    com_criterio_numero: number;
    metodo_landing: number;
    metodo_entrevista: number;
  };
  samples?: Sample[];
  error?: string;
};

const METODO_LABEL: Record<string, string> = {
  entrevista: "entrevista",
  prototipo: "protótipo",
  landing: "landing falsa",
  concierge: "concierge",
  fakedoor: "fake door",
};

export default function AdminEletivaModulo16() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m16-plano-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module16_plano_stats",
        { _course_slug: "economia-circular", _module_number: 16 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando planos da turma…
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
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            economia circular · módulo 16 · abertura trilha testar
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            planos de experimento da turma
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantos alunos entregaram plano com critério de sucesso quantitativo e quais métodos escolheram.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="critério c/ número" value={kpis?.com_criterio_numero ?? 0} />
          <KpiCard label="entrevistas" value={kpis?.metodo_entrevista ?? 0} />
          <KpiCard label="landing falsa" value={kpis?.metodo_landing ?? 0} />
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
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.metodo && (
                        <span className="rounded-full border border-perestroika-preto/15 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                          {METODO_LABEL[s.metodo] ?? s.metodo}
                        </span>
                      )}
                      {!s.has_number && s.criterio_sucesso && (
                        <span className="rounded-full border border-perestroika-vermelho/50 bg-perestroika-vermelho/15 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-vermelho">
                          critério sem número
                        </span>
                      )}
                    </div>
                  </div>
                  {s.criterio_sucesso && (
                    <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
                      <span className="uppercase tracking-wider text-[11px] text-perestroika-preto/55">critério · </span>
                      {s.criterio_sucesso}
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
