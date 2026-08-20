import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";

const FLUXO_LABELS: Record<string, string> = {
  materiais: "Materiais e Compras",
  alimentacao: "Alimentação",
  energia: "Energia e Clima",
  agua: "Água",
  mobilidade: "Mobilidade e Entorno",
  tecnologia: "Tecnologia e Eletrônicos",
};

type Stats = {
  module_id?: string;
  pill_id?: string;
  kpis?: {
    total_students?: number;
    completed_count?: number;
    briefing_count?: number;
    troca_rate?: number;
  };
  fluxo_distribution?: Record<string, number>;
  semaforo?: { verde?: number; amarelo?: number; vermelho?: number };
  samples?: Array<{ nickname?: string; titulo?: string; hmw?: string; fluxo?: string }>;
  error?: string;
};

export default function AdminEletivaModulo5() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-module5-briefing-stats"],
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)("admin_module5_briefing_stats", {
        _course_slug: "economia-circular",
        _module_number: 5,
      });
      if (error) throw error;
      return (data ?? {}) as Stats;
    },
  });

  const k = data?.kpis ?? {};
  const dist = data?.fluxo_distribution ?? {};
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const sem = data?.semaforo ?? { verde: 0, amarelo: 0, vermelho: 0 };
  const semTotal = (sem.verde ?? 0) + (sem.amarelo ?? 0) + (sem.vermelho ?? 0) || 1;

  return (
    <div className="min-h-dvh bg-perestroika-bege">
      <PageHeader layout="split" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.22em] text-perestroika-preto/55 mb-1">
            economia circular · módulo 5
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-none">
            briefing · fechamento trilha 1
          </h1>
        </div>

        {isLoading && <p className="font-body text-sm text-perestroika-preto/60">carregando…</p>}
        {data?.error && (
          <p className="font-body text-sm text-perestroika-preto/60">erro: {data.error}</p>
        )}

        {!isLoading && !data?.error && (
          <>
            <section aria-label="kpis" className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "matriculadas", value: k.total_students ?? 0 },
                { label: "concluíram módulo 5", value: k.completed_count ?? 0 },
                { label: "briefings entregues", value: k.briefing_count ?? 0 },
                {
                  label: "% trocou de problema",
                  value: `${Math.round((k.troca_rate ?? 0) * 100)}%`,
                },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border-2 border-perestroika-preto/15 p-4">
                  <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                    {kpi.label}
                  </p>
                  <p className="font-display text-4xl leading-none">{kpi.value}</p>
                </div>
              ))}
            </section>

            <section aria-label="semaforo">
              <h2 className="font-display uppercase text-2xl mb-3">semáforo dos 4 filtros</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { key: "verde", label: "verde · pronto", icon: CheckCircle2, color: "#75BF9C", count: sem.verde ?? 0 },
                  { key: "amarelo", label: "amarelo · refinar", icon: AlertTriangle, color: "#F2C94C", count: sem.amarelo ?? 0 },
                  { key: "vermelho", label: "vermelho · trocar", icon: XCircle, color: "#fd4644", count: sem.vermelho ?? 0 },
                ].map((s) => {
                  const Icon = s.icon;
                  const pct = Math.round(((s.count ?? 0) / semTotal) * 100);
                  return (
                    <div key={s.key} className="rounded-2xl border-2 p-4" style={{ borderColor: s.color }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" style={{ color: s.color }} aria-hidden />
                        <p className="font-body text-sm font-medium">{s.label}</p>
                      </div>
                      <p className="font-display text-3xl leading-none">{s.count} <span className="text-perestroika-preto/50 text-lg">· {pct}%</span></p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-label="distribuicao fluxos">
              <h2 className="font-display uppercase text-2xl mb-3">distribuição de fluxos escolhidos</h2>
              <div className="space-y-2">
                {Object.keys(FLUXO_LABELS).map((key) => {
                  const count = dist[key] ?? 0;
                  const pct = Math.round((count / distTotal) * 100);
                  return (
                    <div key={key} className="rounded-xl border-2 border-perestroika-preto/15 p-3">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="font-body text-sm font-medium">{FLUXO_LABELS[key]}</p>
                        <p className="font-body text-xs text-perestroika-preto/60">
                          {count} · {pct}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-perestroika-preto/10">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#F25E3D" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-label="amostras">
              <h2 className="font-display uppercase text-2xl mb-3">HMWs recentes</h2>
              {(data?.samples ?? []).length === 0 ? (
                <p className="font-body text-sm text-perestroika-preto/55">ainda nenhum briefing entregue.</p>
              ) : (
                <ul className="space-y-2">
                  {(data?.samples ?? []).map((s, i) => (
                    <li key={i} className="rounded-xl border-2 border-perestroika-preto/15 p-3">
                      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                        {s.nickname ?? "estudante"} · fluxo {FLUXO_LABELS[s.fluxo ?? ""] ?? s.fluxo ?? "?"}
                      </p>
                      <p className="font-display text-lg leading-tight mb-1">{s.titulo || "(sem título)"}</p>
                      <p className="font-body text-sm">{s.hmw}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
