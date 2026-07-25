import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Category = "linear" | "circular" | "regenerativo";

type DistributionRow = {
  total: number;
  linear: number;
  circular: number;
  regenerativo: number;
};

type Sample = {
  nickname: string;
  category: Category;
  text: string;
};

type StatsResponse = {
  module_id?: string;
  pill_id?: string;
  radar_source_module_id?: string | null;
  fixed_items?: Array<{ id: string; text: string; expected?: Category }>;
  kpis?: {
    total_students: number;
    completed_count: number;
    submitted_count: number;
  };
  distribution?: Record<string, DistributionRow>;
  samples?: Record<string, Sample[]>;
  error?: string;
};

const catMeta: Record<Category, { label: string; bg: string; ink: string }> = {
  linear: { label: "linear", bg: "#9AA0A7", ink: "#1f1f22" },
  circular: { label: "circular", bg: "#75BF9C", ink: "#0f2c22" },
  regenerativo: { label: "regenerativo", bg: "#448FF2", ink: "#0a1e4a" },
};

/**
 * /admin/eletiva/economia-circular/modulo/2
 *
 * distribuição agregada do classificador 3x3 da aula 2.
 * chama a rpc admin_module2_classificador_stats (security definer, só admin).
 */
export default function AdminEletivaModulo2() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ecc-m2-classificador-stats"],
    queryFn: async (): Promise<StatsResponse> => {
      const { data, error } = await supabase.rpc(
        "admin_module2_classificador_stats",
        { _course_slug: "economia-circular", _module_number: 2 },
      );
      if (error) throw error;
      return (data ?? {}) as StatsResponse;
    },
  });

  const rows = useMemo(() => {
    const items = data?.fixed_items ?? [];
    const dist = data?.distribution ?? {};
    return items.map((item) => {
      const d: DistributionRow = dist[item.id] ?? {
        total: 0,
        linear: 0,
        circular: 0,
        regenerativo: 0,
      };
      const total = d.total || 0;
      const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
      const dominant: Category | null = total
        ? (["linear", "circular", "regenerativo"] as Category[]).reduce((a, b) =>
            d[a] >= d[b] ? a : b,
          )
        : null;
      const dominantPct = dominant ? pct(d[dominant]) : 0;
      return {
        id: item.id,
        text: item.text,
        expected: item.expected,
        total,
        linear: d.linear,
        circular: d.circular,
        regenerativo: d.regenerativo,
        pctLinear: pct(d.linear),
        pctCircular: pct(d.circular),
        pctRegenerativo: pct(d.regenerativo),
        dominant,
        dominantPct,
      };
    });
  }, [data]);

  const disagreementRows = useMemo(
    () =>
      [...rows]
        .filter((r) => r.total > 0)
        .sort((a, b) => a.dominantPct - b.dominantPct)
        .slice(0, 5),
    [rows],
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-perestroika-preto/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        carregando distribuição da turma…
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
  const samples = data?.samples ?? {};

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
          eletiva · economia circular · aula 2
        </p>
        <h1
          className="font-display uppercase leading-[0.92]"
          style={{ fontSize: "clamp(28px, 5vw, 44px)" }}
        >
          classificador 3x3 · como a turma vê
        </h1>
      </header>

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard label="matriculados" value={kpis.total_students} />
          <KpiCard label="fecharam a aula 2" value={kpis.completed_count} />
          <KpiCard label="fizeram o classificador" value={kpis.submitted_count} />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display uppercase text-2xl">distribuição por item</h2>
        <p className="font-body text-sm text-perestroika-preto/70">
          cada barra mostra como a turma classificou aquele item. destaque em cinza mais escuro quando
          o gabarito bate com a categoria dominante.
        </p>
        <div className="space-y-2">
          {rows.map((row) => (
            <ItemRow key={row.id} row={row} />
          ))}
        </div>
      </section>

      {disagreementRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display uppercase text-2xl">onde a turma mais divergiu</h2>
          <p className="font-body text-sm text-perestroika-preto/70">
            os 5 itens com menor concentração na categoria dominante. bom material pra abrir a próxima
            aula síncrona.
          </p>
          <div className="space-y-2">
            {disagreementRows.map((row) => (
              <ItemRow key={`div-${row.id}`} row={row} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display uppercase text-2xl">amostra de justificativas</h2>
        <p className="font-body text-sm text-perestroika-preto/70">
          até 3 justificativas mais recentes por item. serve pra entender o raciocínio, não só a
          resposta.
        </p>
        <div className="space-y-4">
          {rows.map((row) => {
            const list = samples[row.id] ?? [];
            if (list.length === 0) return null;
            return (
              <div
                key={`sample-${row.id}`}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2"
              >
                <p className="font-body text-sm text-perestroika-preto">{row.text}</p>
                <ul className="space-y-2">
                  {list.map((s, i) => {
                    const meta = catMeta[s.category] ?? catMeta.linear;
                    return (
                      <li key={i} className="rounded-xl border-l-4 pl-3 py-1.5" style={{ borderColor: meta.bg }}>
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-perestroika-preto/60">
                          <span>{s.nickname}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-white"
                            style={{ backgroundColor: meta.bg }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="font-body text-sm italic text-perestroika-preto/85 leading-snug">
                          “{s.text}”
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
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

type Row = {
  id: string;
  text: string;
  expected?: Category;
  total: number;
  pctLinear: number;
  pctCircular: number;
  pctRegenerativo: number;
  dominant: Category | null;
};

function ItemRow({ row }: { row: Row }) {
  const matchesExpected = row.expected && row.dominant === row.expected;
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-3 sm:p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="font-body text-sm text-perestroika-preto leading-snug flex-1">{row.text}</p>
        <div className="flex items-center gap-2 shrink-0">
          {row.expected && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-white"
              style={{ backgroundColor: catMeta[row.expected].bg }}
              title="gabarito"
            >
              gab: {catMeta[row.expected].label}
            </span>
          )}
          <span className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 tabular-nums">
            {row.total} resp
          </span>
        </div>
      </div>
      {row.total > 0 ? (
        <>
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-perestroika-preto/8">
            <div style={{ width: `${row.pctLinear}%`, backgroundColor: catMeta.linear.bg }} />
            <div style={{ width: `${row.pctCircular}%`, backgroundColor: catMeta.circular.bg }} />
            <div
              style={{ width: `${row.pctRegenerativo}%`, backgroundColor: catMeta.regenerativo.bg }}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-body text-[11px] text-perestroika-preto/70 tabular-nums">
            <span>linear {row.pctLinear}%</span>
            <span>circular {row.pctCircular}%</span>
            <span>regenerativo {row.pctRegenerativo}%</span>
            {matchesExpected && (
              <span className="text-perestroika-preto/85 font-medium">✓ bate com gabarito</span>
            )}
          </div>
        </>
      ) : (
        <p className="font-body text-xs italic text-perestroika-preto/50">sem respostas ainda.</p>
      )}
    </div>
  );
}
