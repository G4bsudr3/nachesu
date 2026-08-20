import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Camera, Mic, Link2, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Sample = { nickname: string; sintese: string };

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
  };
  metodo_distribution?: Record<string, number>;
  tipo_distribution?: Record<string, number>;
  real_origin_rate?: number;
  samples?: Sample[];
  error?: string;
};

const METODO_LABEL: Record<string, string> = {
  observacao: "observação estruturada",
  entrevista: "mini-entrevista",
  coleta: "coleta documental",
  mistura: "mistura",
};

const TIPO_ICON: Record<string, typeof Camera> = {
  observacao: Camera,
  entrevista: Mic,
  coleta: Link2,
};

/**
 * /admin/eletiva/economia-circular/modulo/4
 * agrega as evidências entregues no módulo 4.
 */
export default function AdminEletivaModulo4() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m4-evidencias-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_module4_evidencias_stats",
        { _course_slug: "economia-circular", _module_number: 4 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando evidências da turma…
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border-2 border-perestroika-vermelho/40 bg-perestroika-vermelho/[0.08] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-perestroika-vermelho shrink-0 mt-0.5" />
          <div className="font-body text-sm">
            <p className="font-medium">não deu pra carregar as estatísticas.</p>
            <p className="text-perestroika-preto/70">
              {data?.error ?? (error as Error)?.message ?? "erro desconhecido"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const metodo = data?.metodo_distribution ?? {};
  const tipo = data?.tipo_distribution ?? {};
  const samples = data?.samples ?? [];
  const realRate = data?.real_origin_rate ?? 0;

  const metodoTotal = Object.values(metodo).reduce((a, b) => a + b, 0);
  const tipoTotal = Object.values(tipo).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55">
          eletiva · economia circular · módulo 4
        </p>
        <h2
          className="font-display uppercase leading-[1.05] text-2xl sm:text-3xl"
        >
          caça às 3 evidências · prova de realidade
        </h2>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="matriculados" value={kpis.total_students} />
          <KpiCard label="fecharam o módulo 4" value={kpis.completed_count} />
          <KpiCard label="entregaram evidências" value={kpis.submitted_count} />
          <KpiCard
            label="com origem real (foto/áudio/link)"
            value={`${Math.round(realRate * 100)}%`}
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display uppercase text-2xl">método escolhido</h2>
        <p className="font-body text-sm text-perestroika-preto/70">
          método que cada estudante decidiu usar pra investigar (resposta da pílula 02).
        </p>
        <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2">
          {Object.keys(METODO_LABEL).map((k) => {
            const count = metodo[k] ?? 0;
            const pct = metodoTotal ? Math.round((count / metodoTotal) * 100) : 0;
            return (
              <div key={k} className="space-y-1">
                <div className="flex items-center justify-between font-body text-sm">
                  <span className="text-perestroika-preto">{METODO_LABEL[k]}</span>
                  <span className="text-perestroika-preto/60 tabular-nums text-xs">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-perestroika-preto/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-perestroika-preto"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display uppercase text-2xl">tipos de evidência coletados</h2>
        <p className="font-body text-sm text-perestroika-preto/70">
          somando todas as fichas: observações, entrevistas e coletas documentais.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["observacao", "entrevista", "coleta"] as const).map((t) => {
            const Icon = TIPO_ICON[t] ?? Layers;
            const count = tipo[t] ?? 0;
            const pct = tipoTotal ? Math.round((count / tipoTotal) * 100) : 0;
            return (
              <div
                key={t}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {t === "observacao" ? "observação" : t}
                </div>
                <p className="font-display text-3xl tabular-nums leading-none">{count}</p>
                <p className="font-body text-xs text-perestroika-preto/60 mt-1">{pct}% do total</p>
              </div>
            );
          })}
        </div>
      </section>

      {samples.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display uppercase text-2xl">sínteses recentes</h2>
          <p className="font-body text-sm text-perestroika-preto/70">
            últimas 10 sínteses entregues. bom radar pra abrir a próxima aula.
          </p>
          <div className="grid gap-2">
            {samples.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 sm:p-4"
              >
                <p className="text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                  {s.nickname}
                </p>
                <p className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
                  {s.sintese}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
        {label}
      </p>
      <p className="font-display text-3xl tabular-nums leading-none pt-1">{value}</p>
    </div>
  );
}
