import { Sparkles, RefreshCw, AlertTriangle, Heart, Zap, Quote } from "lucide-react";
import { useFeedbackDia1Analysis } from "@/features/admin/useFeedbackDia1Analysis";

const PRIORIDADE_STYLE: Record<string, string> = {
  alta: "bg-perestroika-vermelho text-perestroika-bege",
  media: "bg-perestroika-laranja text-perestroika-preto",
  baixa: "bg-perestroika-preto/15 text-perestroika-preto",
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

export const FeedbackDia1Analysis = ({ totalFeedbacks }: { totalFeedbacks: number }) => {
  const { analysis, generatedAt, loading, running, run } = useFeedbackDia1Analysis();

  const canRun = totalFeedbacks >= 3;

  if (loading) {
    return (
      <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-6 mb-8">
        <p className="text-sm text-perestroika-preto/50">carregando análise…</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-dashed border-perestroika-preto/25 bg-perestroika-bege/30 p-8 mb-8 text-center">
        <Sparkles className="w-8 h-8 mx-auto mb-3 text-perestroika-laranja" />
        <h2 className="font-display uppercase text-3xl mb-2">análise coletiva com ia</h2>
        <p className="text-sm text-perestroika-preto/70 mb-5 max-w-md mx-auto">
          {canRun
            ? "cruza todos os feedbacks e devolve o que ajustar pro dia 2, com evidências e prioridade."
            : `precisa de no mínimo 3 feedbacks pra rodar. tem ${totalFeedbacks}.`}
        </p>
        <button
          onClick={run}
          disabled={!canRun || running}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          <Sparkles className="w-4 h-4" />
          {running ? "analisando…" : "rodar análise"}
        </button>
      </div>
    );
  }

  return (
    <section className="mb-10">
      {/* manchete */}
      <div className="rounded-2xl border border-perestroika-preto/15 bg-gradient-to-br from-perestroika-bege to-white/40 p-6 sm:p-8 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-perestroika-laranja">
            <Sparkles className="w-3.5 h-3.5" />
            análise coletiva · ia
          </div>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
            {running ? "rodando…" : "regenerar"}
          </button>
        </div>
        <h2 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] text-perestroika-preto">
          {analysis.manchete}
        </h2>
        <p className="mt-3 text-perestroika-preto/75 font-body text-base sm:text-lg">
          {analysis.subtitulo}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-perestroika-preto/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-perestroika-laranja" />
            temperatura: {analysis.temperatura}
          </span>
          {generatedAt && <span>· analisado {formatRelative(generatedAt)}</span>}
          {analysis.sample_size && <span>· {analysis.sample_size} feedbacks</span>}
        </div>
      </div>

      {/* ajustes dia 2 */}
      {analysis.ajustes_dia2.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display uppercase text-2xl mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-perestroika-vermelho" />
            o que ajustar pro dia 2
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.ajustes_dia2.map((a, i) => (
              <article
                key={i}
                className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/55 p-5"
              >
                <header className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="font-display uppercase text-xl leading-tight">{a.titulo}</h4>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider rounded-full px-2.5 py-1 font-semibold ${
                      PRIORIDADE_STYLE[a.prioridade] ?? PRIORIDADE_STYLE.baixa
                    }`}
                  >
                    {a.prioridade}
                  </span>
                </header>
                <p className="text-xs text-perestroika-preto/55 mb-3">
                  ~{a.quantas_pessoas} {a.quantas_pessoas === 1 ? "pessoa tocou" : "pessoas tocaram"} no tema
                </p>
                {a.evidencias.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {a.evidencias.map((e, j) => (
                      <li
                        key={j}
                        className="text-sm italic text-perestroika-preto/75 border-l-2 border-perestroika-laranja/50 pl-3"
                      >
                        "{e}"
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rounded-lg bg-perestroika-preto/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
                    sugestão
                  </div>
                  <p className="text-sm text-perestroika-preto">{a.sugestao}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* funcionando */}
      {analysis.funcionando.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display uppercase text-2xl mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-perestroika-rosa" />
            o que tá funcionando · não desligar
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.funcionando.map((f, i) => (
              <article
                key={i}
                className="rounded-xl border border-perestroika-rosa/30 bg-perestroika-rosa/5 p-5"
              >
                <h4 className="font-display uppercase text-xl mb-2">{f.titulo}</h4>
                <p className="text-xs text-perestroika-preto/65 mb-3">{f.por_que_importa}</p>
                {f.evidencias.length > 0 && (
                  <ul className="space-y-1.5">
                    {f.evidencias.map((e, j) => (
                      <li
                        key={j}
                        className="text-sm italic text-perestroika-preto/75 border-l-2 border-perestroika-rosa/50 pl-3"
                      >
                        "{e}"
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* tensoes */}
      {analysis.tensoes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display uppercase text-2xl mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-perestroika-azul" />
            tensões internas
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.tensoes.map((t, i) => (
              <article
                key={i}
                className="rounded-xl border border-perestroika-azul/30 bg-perestroika-azul/5 p-5"
              >
                <h4 className="font-display uppercase text-xl mb-2">{t.titulo}</h4>
                <p className="text-sm text-perestroika-preto/80">{t.descricao}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* citacoes */}
      {analysis.citacoes_marcantes.length > 0 && (
        <div>
          <h3 className="font-display uppercase text-2xl mb-3 flex items-center gap-2">
            <Quote className="w-5 h-5 text-perestroika-preto/60" />
            citações marcantes
          </h3>
          <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5 space-y-3">
            {analysis.citacoes_marcantes.map((c, i) => (
              <p
                key={i}
                className="font-display uppercase text-2xl leading-tight text-perestroika-preto/85"
              >
                "{c}"
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
