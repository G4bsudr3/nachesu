import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EletivaFooter } from "@/components/layout/EletivaFooter";

type Sample = {
  nickname: string;
  resultado: string | null;
  decisao: string | null;
  n_mudancas: number;
  updated_at: string;
};

type StatsResponse = {
  module_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    entregas: number;
    pivot: number;
    persevere: number;
    desistir: number;
    media_mudancas: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo18() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m18-changelog-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module18_changelog_stats",
        { _course_slug: "economia-circular", _module_number: 18 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando changelogs da turma…
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
            economia circular · aula 18 · o que mudou
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] text-perestroika-preto">
            versões 2 da turma
          </h1>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quem pivotou, quem perseverou, e quantas mudanças cada estudante justificou com dado.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram" value={kpis?.entregas ?? 0} />
          <KpiCard label="perseveraram" value={kpis?.persevere ?? 0} />
          <KpiCard label="pivotaram" value={kpis?.pivot ?? 0} />
          <KpiCard label="média de mudanças" value={kpis?.media_mudancas ?? 0} />
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
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 flex items-center justify-between gap-3 flex-wrap"
                >
                  <p className="font-body text-sm font-semibold text-perestroika-preto">
                    {s.nickname}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.resultado && (
                      <span className="rounded-full border border-perestroika-preto/20 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                        {s.resultado}
                      </span>
                    )}
                    {s.decisao && (
                      <span className="rounded-full border border-perestroika-preto/20 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                        {s.decisao}
                      </span>
                    )}
                    <span className="rounded-full border border-perestroika-preto/20 bg-white px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                      {s.n_mudancas} mudanças
                    </span>
                  </div>
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
