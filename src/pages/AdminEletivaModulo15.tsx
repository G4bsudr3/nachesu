import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EletivaFooter } from "@/components/layout/EletivaFooter";

type Sample = {
  nickname: string;
  n_suposicoes: number;
  n_riscos_acao: number;
  primeira_suposicao: string | null;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    com_3_suposicoes: number;
    com_risco_acao: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo15() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m15-supr-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module15_suposicoes_stats",
        { _course_slug: "economia-circular", _module_number: 15 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando mapas da turma…
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
    <div className="min-h-dvh flex flex-col bg-perestroika-bege">
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        <header className="space-y-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> voltar ao painel
          </Link>
          <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55">
            economia circular · módulo 15 · fechamento trilha criar
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] text-perestroika-preto">
            suposições e riscos da turma
          </h1>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantos alunos mapearam as 3 suposições nas dimensões pedidas e quantos têm risco na zona "ação imediata".
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-5">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram" value={kpis?.submitted_count ?? 0} />
          <KpiCard label="3 suposições" value={kpis?.com_3_suposicoes ?? 0} />
          <KpiCard label="risco crítico" value={kpis?.com_risco_acao ?? 0} />
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
                      {s.n_suposicoes} suposições · {s.n_riscos_acao} em ação
                    </p>
                  </div>
                  {s.primeira_suposicao && (
                    <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
                      <span className="uppercase tracking-wider text-[11px] text-perestroika-preto/55">1ª suposição · </span>
                      {s.primeira_suposicao}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <EletivaFooter />
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
