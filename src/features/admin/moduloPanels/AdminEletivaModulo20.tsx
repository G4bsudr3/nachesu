import { useQuery } from "@tanstack/react-query";
import { Loader2, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * admin da MÓDULO 20 — fechamento da eletiva.
 * distribuição das 5 dimensões, notas, palavra-resumo (nuvem simples),
 * lista de projetos "candidatos a piloto".
 */

type Stats = {
  total_alunos: number;
  entregas_completas: number;
  dim_medias: { dim_conhecimento: number; dim_confianca: number; dim_pesquisa: number; dim_teste: number; dim_coragem: number } | null;
  nota_media: number | null;
  palavras: Array<{ palavra: string; n: number }>;
  feedbacks: Array<{ aluno: string; funcionou: string; mudaria: string; nota: number; palavra: string }>;
  candidatos_piloto: Array<{ aluno_id: string; nome: string; frase_ancora: string | null; hook: string | null; dim_coragem: number | null; nota_geral: number | null }>;
};

export default function AdminEletivaModulo20() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-m20-stats"],
    queryFn: async (): Promise<Stats> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_module20_stats");
      if (error) throw error;
      return (data as Stats) ?? {
        total_alunos: 0, entregas_completas: 0, dim_medias: null, nota_media: null,
        palavras: [], feedbacks: [], candidatos_piloto: [],
      };
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
            módulo 20 · fechamento
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70">
            economia circular e negócios regenerativos · dashboard final
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-perestroika-preto/50" aria-hidden /></div>
        ) : !data ? (
          <p className="font-body text-sm text-perestroika-preto/60">sem dados ainda.</p>
        ) : (
          <>
            {/* KPIs topo */}
            <section className="grid gap-3 sm:grid-cols-3">
              <Kpi label="alunos matriculados" valor={data.total_alunos} />
              <Kpi label="entregas completas" valor={data.entregas_completas} sublabel={data.total_alunos ? `${Math.round((data.entregas_completas / data.total_alunos) * 100)}% da turma` : ""} />
              <Kpi label="nota média" valor={data.nota_media != null ? data.nota_media.toFixed(1) : "—"} />
            </section>

            {/* 5 dimensões */}
            <section className="space-y-3">
              <h2 className="font-display uppercase text-xl tracking-wide text-perestroika-preto">auto-avaliação · 5 dimensões</h2>
              {data.dim_medias ? (
                <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4 space-y-2">
                  {[
                    { k: "dim_conhecimento", l: "conhecimento circular/regenerativo" },
                    { k: "dim_confianca", l: "confiança pra propor" },
                    { k: "dim_pesquisa", l: "pesquisar antes de propor" },
                    { k: "dim_teste", l: "testar antes de construir" },
                    { k: "dim_coragem", l: "coragem de mostrar em público" },
                  ].map((d) => {
                    const v = (data.dim_medias as Record<string, number>)[d.k] ?? 0;
                    return (
                      <div key={d.k} className="flex items-center gap-3">
                        <p className="font-body text-sm text-perestroika-preto flex-1">{d.l}</p>
                        <div className="w-40 h-2 rounded-full bg-perestroika-preto/10 overflow-hidden">
                          <div className="h-full bg-[#F25E3D]" style={{ width: `${(v / 10) * 100}%` }} />
                        </div>
                        <span className="font-display text-lg text-perestroika-preto w-10 text-right">{v.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="font-body text-sm text-perestroika-preto/50">sem auto-avaliações ainda.</p>}
            </section>

            {/* Palavra-nuvem simples */}
            <section className="space-y-3">
              <h2 className="font-display uppercase text-xl tracking-wide text-perestroika-preto">palavras-resumo</h2>
              {data.palavras.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.palavras.map((p) => (
                    <span
                      key={p.palavra}
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-perestroika-preto/15 px-3 py-1"
                      style={{ fontSize: `${Math.min(20, 12 + p.n * 2)}px` }}
                    >
                      <span className="font-display uppercase tracking-wide text-perestroika-preto">{p.palavra}</span>
                      <span className="font-body text-[10px] text-perestroika-preto/50">×{p.n}</span>
                    </span>
                  ))}
                </div>
              ) : <p className="font-body text-sm text-perestroika-preto/50">sem palavras ainda.</p>}
            </section>

            {/* candidatos a piloto */}
            <section className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display uppercase text-xl tracking-wide text-perestroika-preto">candidatos a piloto real</h2>
                <span className="font-body text-[11px] text-perestroika-preto/50">coragem ≥ 7 + nota ≥ 8</span>
              </div>
              {data.candidatos_piloto.length > 0 ? (
                <div className="space-y-2">
                  {data.candidatos_piloto.map((c) => (
                    <article key={c.aluno_id} className="rounded-xl border-2 border-[#F25E3D]/40 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="font-display uppercase text-base tracking-wide text-perestroika-preto">{c.nome}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[11px] text-perestroika-preto/60">coragem {c.dim_coragem} · nota {c.nota_geral}</span>
                          <a href={`/dossie/${c.aluno_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-1 font-body text-[11px] uppercase tracking-wider">
                            <Star className="h-3 w-3" aria-hidden /> ver dossiê
                          </a>
                        </div>
                      </div>
                      {c.frase_ancora && <p className="font-body text-sm text-perestroika-preto/75 mt-1 italic">"{c.frase_ancora}"</p>}
                      {c.hook && <p className="font-body text-xs text-perestroika-preto/60 mt-1">hook: {c.hook}</p>}
                    </article>
                  ))}
                </div>
              ) : <p className="font-body text-sm text-perestroika-preto/50 flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />nenhum candidato identificado ainda.</p>}
            </section>

            {/* feedbacks completos */}
            <section className="space-y-3">
              <h2 className="font-display uppercase text-xl tracking-wide text-perestroika-preto">feedbacks completos</h2>
              {data.feedbacks.length > 0 ? (
                <div className="space-y-2">
                  {data.feedbacks.map((f, i) => (
                    <article key={i} className="rounded-xl border border-perestroika-preto/15 bg-white p-3 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <p className="font-display uppercase text-sm tracking-wide text-perestroika-preto">{f.aluno}</p>
                        <span className="font-body text-[11px] text-perestroika-preto/50">nota {f.nota} · "{f.palavra}"</span>
                      </div>
                      <p className="font-body text-xs text-perestroika-preto"><strong className="text-perestroika-preto/50 uppercase tracking-wider text-[10px]">funcionou:</strong> {f.funcionou}</p>
                      <p className="font-body text-xs text-perestroika-preto"><strong className="text-perestroika-preto/50 uppercase tracking-wider text-[10px]">mudaria:</strong> {f.mudaria}</p>
                    </article>
                  ))}
                </div>
              ) : <p className="font-body text-sm text-perestroika-preto/50">sem feedbacks ainda.</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, valor, sublabel }: { label: string; valor: string | number; sublabel?: string }) {
  return (
    <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4">
      <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">{label}</p>
      <p className="font-display text-4xl leading-none text-perestroika-preto mt-1">{valor}</p>
      {sublabel && <p className="font-body text-[11px] text-perestroika-preto/50 mt-1">{sublabel}</p>}
    </div>
  );
}
