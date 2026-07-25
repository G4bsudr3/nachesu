import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Quadrante = { id: string; label: string; hint?: string; accent?: string };

type PerQuadrante = {
  total_atores: number;
  unique_students: number;
  avg_per_student: number | null;
};

type TopAtor = { nome: string; mentions: number; unique_mentions: number };

type SampleGanha = { nickname: string; ator: string; descricao: string };

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  quadrantes?: Quadrante[];
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
  };
  per_quadrante?: Record<string, PerQuadrante>;
  top_atores?: Record<string, TopAtor[]>;
  samples_ganha?: SampleGanha[];
  error?: string;
};

/**
 * /admin/eletiva/economia-circular/modulo/3
 *
 * agrega o mapa de atores 2x2 da aula 3.
 * chama a rpc admin_module3_mapa_atores_stats (security definer, só admin).
 */
export default function AdminEletivaModulo3() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m3-mapa-atores-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await supabase.rpc(
        "admin_module3_mapa_atores_stats",
        { _course_slug: "economia-circular", _module_number: 3 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  const quadrantes = data?.quadrantes ?? [];
  const perQuadrante = data?.per_quadrante ?? {};
  const topAtores = data?.top_atores ?? {};
  const samplesGanha = data?.samples_ganha ?? [];

  const maxMentions = useMemo(() => {
    let m = 0;
    Object.values(topAtores).forEach((list) => {
      list.forEach((a) => {
        if (a.mentions > m) m = a.mentions;
      });
    });
    return m;
  }, [topAtores]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando mapa da turma…
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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      <header className="space-y-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-perestroika-preto/60 hover:text-perestroika-preto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          voltar pra admin
        </Link>
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-perestroika-preto/55">
          eletiva · economia circular · aula 3
        </p>
        <h1
          className="font-display uppercase leading-[0.92]"
          style={{ fontSize: "clamp(28px, 5vw, 44px)" }}
        >
          mapa de atores · quem tá em jogo
        </h1>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard label="matriculados" value={kpis.total_students} />
          <KpiCard label="fecharam a aula 3" value={kpis.completed_count} />
          <KpiCard label="entregaram o mapa" value={kpis.submitted_count} />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display uppercase text-2xl">quadrantes 2x2</h2>
        <p className="font-body text-sm text-perestroika-preto/70">
          top atores citados por quadrante, com número de menções únicas. barra mostra a força
          relativa (comparado ao ator mais citado da turma).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {quadrantes.map((q) => {
            const pq = perQuadrante[q.id];
            const list = topAtores[q.id] ?? [];
            const accent = q.accent ?? "#090909";
            return (
              <div
                key={q.id}
                className="rounded-2xl border-2 bg-perestroika-bege p-4 space-y-3"
                style={{ borderColor: `${accent}55` }}
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="font-display uppercase leading-tight"
                      style={{ color: accent, fontSize: "clamp(18px, 2.6vw, 22px)" }}
                    >
                      {q.label}
                    </p>
                    {q.hint && (
                      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mt-0.5">
                        {q.hint}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl leading-none tabular-nums">
                      {pq?.total_atores ?? 0}
                    </p>
                    <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/55">
                      atores · {pq?.unique_students ?? 0} alunos
                    </p>
                  </div>
                </header>

                {list.length === 0 ? (
                  <p className="font-body text-xs italic text-perestroika-preto/50">
                    sem menções ainda.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.slice(0, 8).map((a, i) => {
                      const width = maxMentions
                        ? Math.max(6, Math.round((a.mentions / maxMentions) * 100))
                        : 0;
                      return (
                        <li key={`${a.nome}-${i}`} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-body text-sm text-perestroika-preto truncate">
                              {a.nome}
                            </span>
                            <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 tabular-nums shrink-0">
                              {a.mentions}× · {a.unique_mentions} alunos
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-perestroika-preto/8 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${width}%`, backgroundColor: accent }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {samplesGanha.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display uppercase text-2xl">quem ganha com o problema · amostras</h2>
          <p className="font-body text-sm text-perestroika-preto/70">
            justificativas recentes do quadrante mais desconfortável. bom material pra abrir a
            próxima aula síncrona.
          </p>
          <div className="grid gap-2">
            {samplesGanha.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 sm:p-4"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1">
                  <span>{s.nickname}</span>
                  <span>·</span>
                  <span className="font-medium text-perestroika-preto/80">{s.ator}</span>
                </div>
                <p className="font-body text-sm italic text-perestroika-preto/85 leading-snug">
                  “{s.descricao}”
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
        {label}
      </p>
      <p className="font-display text-3xl tabular-nums leading-none pt-1">{value}</p>
    </div>
  );
}
