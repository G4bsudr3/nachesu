import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = {
  nickname: string;
  total_palavras: number;
  tem_take: boolean;
  duracao_s: number | null;
  updated_at: string;
};

type StatsResponse = {
  module_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    entregas: number;
    com_take: number;
    media_palavras: number;
    media_duracao_s: number;
  };
  samples?: Sample[];
  error?: string;
};

export default function AdminEletivaModulo19() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m19-pitch-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module19_pitch_stats",
        { _course_slug: "economia-circular", _module_number: 19 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando roteiros da turma…
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
            economia circular · módulo 19 · roteiro de pitch
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            primeiros takes da turma
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quem já entregou roteiro em 6 blocos e mandou o primeiro take. duração média ajuda a calibrar o módulo 20.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram" value={kpis?.entregas ?? 0} />
          <KpiCard label="com take" value={kpis?.com_take ?? 0} />
          <KpiCard label="média palavras" value={kpis?.media_palavras ?? 0} />
          <KpiCard label="duração média" value={formatDur(kpis?.media_duracao_s ?? 0)} />
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
                    <span className="rounded-full border border-perestroika-preto/15 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                      {s.total_palavras} palavras
                    </span>
                    {s.tem_take ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-perestroika-preto/15 bg-white px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/80">
                        <Video className="h-3 w-3" aria-hidden /> take {formatDur(s.duracao_s ?? 0)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-perestroika-preto/15 bg-perestroika-bege px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50">
                        sem take
                      </span>
                    )}
                  </div>
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

function formatDur(s: number) {
  if (!s || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return `${m}:${String(rest).padStart(2, "0")}`;
}
