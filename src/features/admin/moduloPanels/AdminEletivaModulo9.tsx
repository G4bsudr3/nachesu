import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  planeta_desejado?: string;
  planeta_metrica?: string;
  pessoas_desejado?: string;
  pessoas_metrica?: string;
  prosperidade_desejado?: string;
  prosperidade_metrica?: string;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    metrica_valida_planeta: number;
    metrica_valida_pessoas: number;
    metrica_valida_prosperidade: number;
    tres_dimensoes_validas: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo9() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m9-impactos-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module9_impactos_stats",
        { _course_slug: "economia-circular", _module_number: 9 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando impactos da turma…
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
  const submitted = kpis?.submitted_count ?? 0;
  const pct = (n: number) => (submitted > 0 ? Math.round((n / submitted) * 100) : 0);

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            economia circular · módulo 9
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            matriz antes vs. depois da turma
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantos estudantes escreveram uma métrica de verdade (com número) nas 3 dimensões do triple bottom line.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram matriz" value={submitted} />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="métrica válida · planeta" value={`${kpis?.metrica_valida_planeta ?? 0} · ${pct(kpis?.metrica_valida_planeta ?? 0)}%`} />
          <KpiCard label="métrica válida · pessoas" value={`${kpis?.metrica_valida_pessoas ?? 0} · ${pct(kpis?.metrica_valida_pessoas ?? 0)}%`} />
          <KpiCard label="métrica válida · prosperidade" value={`${kpis?.metrica_valida_prosperidade ?? 0} · ${pct(kpis?.metrica_valida_prosperidade ?? 0)}%`} />
        </section>

        <section>
          <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5">
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              turma com as 3 dimensões válidas
            </p>
            <p className="font-display text-4xl leading-none text-perestroika-preto tabular-nums">
              {kpis?.tres_dimensoes_validas ?? 0}
              <span className="text-xl text-perestroika-preto/50"> · {pct(kpis?.tres_dimensoes_validas ?? 0)}%</span>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            últimas entregas
          </p>
          {samples.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/60">nenhuma entrega ainda.</p>
          ) : (
            <div className="grid gap-3">
              {samples.map((s, i) => (
                <article
                  key={i}
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 space-y-2"
                >
                  <p className="font-body text-sm font-semibold text-perestroika-preto">{s.nickname}</p>
                  <SampleLinha label="planeta" desejado={s.planeta_desejado} metrica={s.planeta_metrica} />
                  <SampleLinha label="pessoas" desejado={s.pessoas_desejado} metrica={s.pessoas_metrica} />
                  <SampleLinha
                    label="prosperidade"
                    desejado={s.prosperidade_desejado}
                    metrica={s.prosperidade_metrica}
                  />
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

function SampleLinha({ label, desejado, metrica }: { label: string; desejado?: string; metrica?: string }) {
  if (!desejado && !metrica) return null;
  return (
    <div className="border-t border-perestroika-preto/15 pt-2">
      <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50">{label}</p>
      {desejado && <p className="font-body text-xs text-perestroika-preto/80">{desejado}</p>}
      {metrica && <p className="font-body text-xs text-perestroika-preto/60 italic">métrica: {metrica}</p>}
    </div>
  );
}
