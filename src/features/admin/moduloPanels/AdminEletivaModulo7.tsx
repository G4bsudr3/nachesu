import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  linhas_count?: number;
  tipos_count?: number;
  primeira_oportunidade?: string;
  primeiro_beneficiario?: string;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    with_named_beneficiary_count: number;
    avg_tipos_diferentes: number;
  };
  tipo_distribution?: Record<string, number>;
  samples?: Sample[];
  error?: string;
};

const TIPO_LABEL: Record<string, string> = {
  material: "material desperdiçado",
  tempo: "tempo perdido",
  energia: "energia gasta à toa",
  potencial: "potencial humano subutilizado",
  informacao: "informação / conhecimento",
};

/**
 * /admin/eletiva/economia-circular/modulo/7
 * agrega as matrizes vazamento → oportunidade do módulo 7.
 */
export default function AdminEletivaModulo7() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m7-matriz-valor-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module7_matriz_valor_stats",
        { _course_slug: "economia-circular", _module_number: 7 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando matrizes da turma…
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
  const dist = data?.tipo_distribution ?? {};
  const totalDist = Object.values(dist).reduce((s, n) => s + n, 0);
  const samples = data?.samples ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55">
            economia circular · módulo 7
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            matrizes vazamento → oportunidade
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            veja o que a turma transformou em oportunidade e quem seriam os beneficiários pagantes.
          </p>
        </header>

        {/* KPIs */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram matriz" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="c/ beneficiário nomeado" value={kpis?.with_named_beneficiary_count ?? 0} />
          <KpiCard label="média de tipos diferentes" value={(kpis?.avg_tipos_diferentes ?? 0).toFixed(1)} />
        </section>

        {/* distribuição por tipo */}
        <section className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-3">
            tipos de vazamento escolhidos pela turma
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
                        <span>{TIPO_LABEL[k] ?? k}</span>
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
                  <header className="flex items-center justify-between">
                    <p className="font-body text-sm font-semibold text-perestroika-preto">
                      {s.nickname}
                    </p>
                    <span className="text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                      {s.linhas_count ?? 0} linhas · {s.tipos_count ?? 0} tipos
                    </span>
                  </header>
                  {s.primeira_oportunidade && (
                    <p className="font-body text-sm text-perestroika-preto/85 flex items-start gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-perestroika-preto/60" aria-hidden />
                      <span>{s.primeira_oportunidade}</span>
                    </p>
                  )}
                  {s.primeiro_beneficiario && (
                    <p className="font-body text-xs text-perestroika-preto/60">
                      beneficia: <strong className="text-perestroika-preto/80">{s.primeiro_beneficiario}</strong>
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
      <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">
        {value}
      </p>
    </div>
  );
}
