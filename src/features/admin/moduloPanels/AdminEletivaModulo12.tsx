import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = { nickname: string; ideia_final: string | null; raridade: string | null };

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
    raridade_rara: number;
    raridade_meio_obvia: number;
    raridade_obvia: number;
  };
  samples?: Sample[];
  error?: string;
};

const RARIDADE_LABEL: Record<string, string> = {
  rara: "rara",
  meio_obvia: "meio óbvia",
  obvia: "óbvia",
};

export default function AdminEletivaModulo12() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m12-selecao-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module12_selecao_stats",
        { _course_slug: "economia-circular", _module_number: 12 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando seleções da turma…
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
            economia circular · módulo 12
          </p>
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            seleção da ideia da turma
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
            quantos fecharam a escolha, como se dividiram entre rara/óbvia e qual foi a ideia final de cada um.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="matriculados" value={kpis?.total_students ?? 0} />
          <KpiCard label="concluíram" value={kpis?.completed_count ?? 0} />
          <KpiCard label="entregaram seleção" value={kpis?.submitted_count ?? 0} />
        </section>

        <section>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
            distribuição de raridade
          </p>
          <div className="grid gap-2 grid-cols-3">
            <RaridadeCard label="raras" value={kpis?.raridade_rara ?? 0} />
            <RaridadeCard label="meio óbvias" value={kpis?.raridade_meio_obvia ?? 0} />
            <RaridadeCard label="óbvias" value={kpis?.raridade_obvia ?? 0} />
          </div>
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
                  className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 space-y-1"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="font-body text-sm font-semibold text-perestroika-preto">
                      {s.nickname}
                    </p>
                    {s.raridade && (
                      <span className="rounded-full border-2 border-perestroika-preto/15 px-2 py-0.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/70">
                        {RARIDADE_LABEL[s.raridade] ?? s.raridade}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm text-perestroika-preto/80 leading-snug">
                    {s.ideia_final ?? "—"}
                  </p>
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

function RaridadeCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
        {label}
      </p>
      <p className="font-display text-3xl leading-none text-perestroika-preto tabular-nums">{value}</p>
    </div>
  );
}
