import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Sparkles, BarChart3, Flame, TrendingUp, AlertTriangle } from "lucide-react";
import { useAdminMetrics, type CourseMetrics, type ScopeId } from "@/hooks/useAdminMetrics";
import { useAdminInsight } from "@/hooks/useAdminInsight";
import { ActionQueue } from "@/components/admin/home/ActionQueue";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


const sumCourses = (cs: CourseMetrics[]) => ({
  matriculados: cs.reduce((a, c) => a + c.matriculados_ativos, 0),
  pendentes_revisao: cs.reduce((a, c) => a + c.pendentes_revisao, 0),
  em_risco: cs.reduce((a, c) => a + c.em_risco, 0),
  em_risco_critico: cs.reduce((a, c) => a + c.em_risco_critico, 0),
  modulo_proximo: cs
    .map((c) => c.modulo_proximo)
    .filter(Boolean)
    .sort((a, b) => (a!.release_at < b!.release_at ? -1 : 1))[0] ?? null,
});

const AdminHome = () => {
  
  const { data, isLoading } = useAdminMetrics();
  const { insight, regenerate, regenerating } = useAdminInsight();
  const [scope, setScope] = useState<ScopeId>("all");

  const filteredCourses = useMemo(() => {
    if (!data) return [];
    return scope === "all" ? data.courses : data.courses.filter((c) => c.id === scope);
  }, [data, scope]);

  const totals = useMemo(() => sumCourses(filteredCourses), [filteredCourses]);
  const pendentesAprovacao = data?.pendentes_aprovacao ?? 0;

  const queueItems = [
    {
      count: totals.pendentes_revisao,
      label: "entregas esperando revisão",
      to: "/admin/pending",
      tone: "warn" as const,
      hint: totals.pendentes_revisao > 0 ? "estudantes aguardando seu feedback" : undefined,
    },
    {
      count: totals.em_risco_critico,
      label: "estudantes em risco crítico",
      to: "/admin/risco",
      tone: "alert" as const,
      hint: "21+ dias sem aparecer",
    },
    {
      count: Math.max(0, totals.em_risco - totals.em_risco_critico),
      label: "estudantes em risco médio",
      to: "/admin/risco",
      tone: "warn" as const,
      hint: "entre 7 e 21 dias",
    },
    {
      count: scope === "all" ? pendentesAprovacao : 0,
      label: "cadastros aguardando aprovação",
      to: "/admin/pending",
      tone: "neutral" as const,
    },
  ];

  const nextModuleHint = totals.modulo_proximo
    ? `módulo ${totals.modulo_proximo.number} (${totals.modulo_proximo.title.toLowerCase()}) sai ${formatDistanceToNow(new Date(totals.modulo_proximo.release_at), { locale: ptBR, addSuffix: true })}`
    : null;

  const handleRegenerate = async () => {
    try {
      await regenerate();
      toast.success("resumo atualizado");
    } catch (e: any) {
      toast.error("não consegui gerar agora", { description: e?.message?.slice(0, 120) });
    }
  };

  return (
    <div className="text-perestroika-preto font-body">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* banner fixo de risco crítico no topo */}
        {totals.em_risco_critico > 0 && (
          <Link
            to="/admin/risco"
            className="block rounded-2xl border-2 border-perestroika-vermelho bg-perestroika-vermelho/10 px-4 py-3 sm:px-5 sm:py-4 hover:bg-perestroika-vermelho/15 transition-colors"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-perestroika-vermelho shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-display uppercase text-base sm:text-lg leading-tight text-perestroika-vermelho">
                  {totals.em_risco_critico} {totals.em_risco_critico === 1 ? "estudante em risco crítico" : "estudantes em risco crítico"}
                </p>
                <p className="font-body text-xs sm:text-sm text-perestroika-preto/75 mt-0.5">
                  21+ dias sem aparecer. olha quem é e tenta uma ponte humana.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 font-body text-[11px] uppercase tracking-wide text-perestroika-vermelho self-center shrink-0">
                ver lista
              </span>
            </div>
          </Link>
        )}

        {/* scope chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScope("all")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs uppercase tracking-wide border transition-colors",
              scope === "all"
                ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                : "bg-white/60 border-perestroika-preto/15 hover:border-perestroika-preto/40",
            )}
          >
            todas as eletivas
          </button>
          {(data?.courses ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setScope(c.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs uppercase tracking-wide border transition-colors",
                scope === c.id
                  ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                  : "bg-white/60 border-perestroika-preto/15 hover:border-perestroika-preto/40",
              )}
            >
              {c.title.toLowerCase()}
            </button>
          ))}
          {nextModuleHint && (
            <span className="font-body text-[11px] text-perestroika-preto/55 ml-auto hidden sm:block">
              {nextModuleHint}
            </span>
          )}
        </div>

        {/* action queue */}
        <ActionQueue items={queueItems} loading={isLoading} />

        {/* AI insight */}
        <section className="rounded-3xl border border-perestroika-preto/10 bg-white/60 backdrop-blur p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-perestroika-preto/60">
              <Sparkles className="w-4 h-4" />
              <span className="font-body text-[10px] uppercase tracking-[0.18em]">
                resumo da semana · gerado por ia
              </span>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto disabled:opacity-40"
            >
              <RefreshCw className={cn("w-3 h-3", regenerating && "animate-spin")} />
              {insight ? "regenerar" : "gerar"}
            </button>
          </div>
          {insight ? (
            <>
              <p className="font-body text-base sm:text-lg text-perestroika-preto leading-relaxed whitespace-pre-wrap">
                {insight.summary_md}
              </p>
              <p className="font-body text-[11px] text-perestroika-preto/45 mt-3">
                gerado {formatDistanceToNow(new Date(insight.generated_at), { locale: ptBR, addSuffix: true })}
                {insight.model && ` · ${insight.model.split("/")[1] ?? insight.model}`}
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-perestroika-preto/15 bg-perestroika-bege/40 p-6 text-center">
              <p className="font-body text-sm text-perestroika-preto/65">
                {regenerating ? "lendo a semana e escrevendo um resumo…" : "nenhum resumo gerado ainda. clica em gerar pra ver o pulso da semana em 1 parágrafo."}
              </p>
            </div>
          )}
        </section>

        {/* visualizations grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* funil de ativação */}
          <Tile icon={TrendingUp} title="funil de ativação">
            {filteredCourses.length === 0 ? (
              <EmptyTile />
            ) : (
              <div className="space-y-4">
                {filteredCourses.map((c) => {
                  const f = c.funnel;
                  const max = f.matriculados || 1;
                  const steps = [
                    { label: "matriculados", v: f.matriculados },
                    { label: "ativaram", v: f.primeiro_login },
                    { label: "abriram módulo 1", v: f.modulo_1 },
                    { label: "completaram trilha 1", v: f.trilha_1 },
                    { label: "entregaram final", v: f.final },
                  ];
                  return (
                    <div key={c.id}>
                      {filteredCourses.length > 1 && (
                        <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
                          {c.title.toLowerCase()}
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {steps.map((s) => {
                          const pct = Math.round((s.v / max) * 100);
                          return (
                            <div key={s.label} className="flex items-center gap-3">
                              <span className="font-body text-[11px] text-perestroika-preto/65 w-32 shrink-0">
                                {s.label}
                              </span>
                              <div className="flex-1 h-5 bg-perestroika-preto/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-body text-xs tabular-nums text-perestroika-preto w-16 text-right">
                                {s.v} · {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tile>

          {/* calor de módulos */}
          <Tile icon={BarChart3} title="conclusão por módulo">
            {filteredCourses.length === 0 ? (
              <EmptyTile />
            ) : (
              <div className="space-y-4">
                {filteredCourses.map((c) => (
                  <div key={c.id}>
                    {filteredCourses.length > 1 && (
                      <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
                        {c.title.toLowerCase()}
                      </p>
                    )}
                    {c.modules.length === 0 ? (
                      <p className="font-body text-xs text-perestroika-preto/50">sem progresso ainda</p>
                    ) : (
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {c.modules.map((m) => (
                          <Link
                            key={m.id}
                            to={`/admin/aula/${m.number}`}
                            title={`módulo ${m.number} – ${m.title}: ${m.completed}/${m.started} (${m.pct}%)${m.avg_rating !== null ? ` · nota ${m.avg_rating}` : ""}`}
                            className="aspect-square rounded-lg flex items-center justify-center font-display text-sm tabular-nums hover:scale-110 transition-transform"
                            style={{
                              backgroundColor: heatColor(m.pct, m.started),
                              color: m.pct > 60 ? "#fff" : "#090909",
                            }}
                          >
                            {m.number}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <Legend />
              </div>
            )}
          </Tile>

          {/* engajamento 14d */}
          <Tile icon={Flame} title="atividade 14 dias">
            {filteredCourses.length === 0 ? (
              <EmptyTile />
            ) : (
              <Sparkline courses={filteredCourses} />
            )}
          </Tile>

          {/* distribuição de risco */}
          <Tile icon={AlertTriangle} title="distribuição de risco">
            {filteredCourses.length === 0 ? (
              <EmptyTile />
            ) : (
              <RiskBars courses={filteredCourses} />
            )}
          </Tile>
        </div>

        {/* secondary nav – links pras seções existentes */}
        <section className="pt-2">
          <p className="font-body text-[10px] uppercase tracking-[0.18em] text-perestroika-preto/50 mb-2">
            ir para
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/admin/eletivas", label: "eletivas · cursos" },
              { to: "/admin/review", label: "revisão de eletiva" },
              { to: "/admin/trilha", label: "trilha · módulos" },
              { to: "/admin/tutor", label: "tutor ia" },
              { to: "/admin/feedback", label: "feedback · inbox" },
              { to: "/admin/materiais", label: "materiais" },
              { to: "/admin/usuarios", label: "usuários" },
              { to: "/admin/nudges", label: "nudges" },
              { to: "/admin/rubricas", label: "rubricas" },
              { to: "/admin/eletiva", label: "settings" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full bg-white/60 border border-perestroika-preto/15 px-3 py-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/70 hover:border-perestroika-preto/40 hover:text-perestroika-preto transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

// --- helpers visuais ---

const Tile = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-3xl border border-perestroika-preto/10 bg-white/60 backdrop-blur p-5 sm:p-6">
    <div className="flex items-center gap-2 text-perestroika-preto/60 mb-4">
      <Icon className="w-4 h-4" />
      <span className="font-body text-[10px] uppercase tracking-[0.18em]">{title}</span>
    </div>
    {children}
  </section>
);

const EmptyTile = () => (
  <p className="font-body text-sm text-perestroika-preto/55 py-8 text-center">
    sem dados ainda.
  </p>
);

function heatColor(pct: number, started: number): string {
  if (started === 0) return "rgba(9,9,9,0.05)";
  // gradient: vermelho perestroika (#fd4644) → laranja (#fe7b02) → primary rosa (hsl(var(--primary)))
  if (pct < 30) return "rgba(253,70,68,0.85)";
  if (pct < 60) return "rgba(254,123,2,0.8)";
  if (pct < 85) return "rgba(247,86,166,0.85)";
  return "rgba(9,9,9,0.85)";
}

const Legend = () => (
  <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-perestroika-preto/55 pt-1">
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded" style={{ background: "rgba(253,70,68,0.85)" }} />
      &lt;30%
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded" style={{ background: "rgba(254,123,2,0.8)" }} />
      30-60
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded" style={{ background: "rgba(247,86,166,0.85)" }} />
      60-85
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 rounded" style={{ background: "rgba(9,9,9,0.85)" }} />
      85+
    </span>
  </div>
);

const Sparkline = ({ courses }: { courses: CourseMetrics[] }) => {
  const days = courses[0]?.engajamento_14d ?? [];
  const w = 360;
  const h = 100;
  const max = Math.max(
    1,
    ...courses.flatMap((c) => c.engajamento_14d.map((d) => d.ativos)),
  );
  const colors = ["hsl(var(--primary))", "hsl(var(--accent))"];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
        {courses.slice(0, 2).map((c, idx) => {
          const pts = c.engajamento_14d
            .map((d, i) => {
              const x = (i / Math.max(1, c.engajamento_14d.length - 1)) * w;
              const y = h - (d.ativos / max) * (h - 6) - 3;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={c.id}
              points={pts}
              fill="none"
              stroke={colors[idx]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-wide text-perestroika-preto/55">
        <span>{days[0]?.date.slice(5).replace("-", "/")}</span>
        <span>pico {max} ativos/dia</span>
        <span>hoje</span>
      </div>
      {courses.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {courses.slice(0, 2).map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5 text-[11px] text-perestroika-preto/70">
              <span className="w-3 h-0.5" style={{ background: colors[i] }} />
              {c.title.toLowerCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const RISK_TONE = [
  { key: "em_chama", label: "em chama", color: "rgba(247,86,166,0.85)", hint: "ativo <3d" },
  { key: "em_ritmo", label: "em ritmo", color: "rgba(111,119,252,0.75)", hint: "4-7d" },
  { key: "lento", label: "desacelerou", color: "rgba(254,123,2,0.7)", hint: "7-14d" },
  { key: "em_risco", label: "em risco", color: "rgba(253,70,68,0.85)", hint: "14-21d" },
  { key: "dormente", label: "dormente", color: "rgba(9,9,9,0.7)", hint: "21+d" },
] as const;

const RiskBars = ({ courses }: { courses: CourseMetrics[] }) => {
  const sum = courses.reduce(
    (acc, c) => ({
      em_chama: acc.em_chama + c.risk_dist.em_chama,
      em_ritmo: acc.em_ritmo + c.risk_dist.em_ritmo,
      lento: acc.lento + c.risk_dist.lento,
      em_risco: acc.em_risco + c.risk_dist.em_risco,
      dormente: acc.dormente + c.risk_dist.dormente,
    }),
    { em_chama: 0, em_ritmo: 0, lento: 0, em_risco: 0, dormente: 0 },
  );
  const total = Object.values(sum).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-perestroika-preto/5">
        {RISK_TONE.map((t) => {
          const v = sum[t.key as keyof typeof sum];
          const pct = (v / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={t.key}
              style={{ width: `${pct}%`, background: t.color }}
              title={`${t.label}: ${v}`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {RISK_TONE.map((t) => {
          const v = sum[t.key as keyof typeof sum];
          return (
            <div key={t.key} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="text-perestroika-preto/80 flex-1">{t.label}</span>
              <span className="text-perestroika-preto/55 text-[10px] uppercase tracking-wide">{t.hint}</span>
              <span className="font-display tabular-nums text-perestroika-preto w-8 text-right">{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHome;
