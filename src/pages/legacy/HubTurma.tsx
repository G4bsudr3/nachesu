import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useHubGallery, type HubBuilder } from "@/features/hub/useHubGallery";
import { useHubInsights } from "@/features/hub/useHubInsights";
import { useFbiLevels } from "@/features/hub/useFbiLevels";
import { useUserRole } from "@/hooks/useUserRole";
import { useAnalyzeTurma } from "@/features/hub/useAnalyzeTurma";
import { TurmaPanorama } from "@/components/hub/TurmaPanorama";
import { MatchCard } from "@/components/hub/MatchCard";
import { BuilderQuickView } from "@/components/hub/BuilderQuickView";
import { TurmaRedes } from "@/components/hub/TurmaRedes";

const HubTurma = () => {
  const { builders, loading: gLoading } = useHubGallery();
  const { global, mine, loading: iLoading, refresh } = useHubInsights();
  const { byUser: levelByUser } = useFbiLevels();
  const { isAdmin } = useUserRole();
  const { run, running } = useAnalyzeTurma(refresh);
  const [selected, setSelected] = useState<HubBuilder | null>(null);

  const buildersById = useMemo(() => {
    const m = new Map<string, HubBuilder>();
    for (const b of builders) m.set(b.user_id, b);
    return m;
  }, [builders]);

  const myMatches = useMemo(() => {
    if (!mine?.matches) return [];
    return mine.matches
      .map((m) => ({ builder: buildersById.get(m.user_id), reason: m.reason }))
      .filter((x): x is { builder: HubBuilder; reason: string } => Boolean(x.builder));
  }, [mine, buildersById]);

  const loading = gLoading || iLoading;
  const hasInsights = Boolean(global || mine);

  const lastRunLabel = global?.generated_at
    ? new Date(global.generated_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        actions={
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> galeria
          </Link>
        }
      />

      <main className="container max-w-5xl py-8 sm:py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="mb-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
              análise da turma
            </p>
            <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
              quem é<br />essa turma
            </h1>
            <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
              etnografia da turma feita por ia: mascote, paradoxos, padrões silenciosos e provocações pra levar pros 2 dias.
            </p>
            {lastRunLabel && (
              <p className="mt-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/50">
                última análise · {lastRunLabel}
              </p>
            )}
          </div>
          {/* botão admin-only: nunca renderiza pra participante */}
          {isAdmin && (
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto bg-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors hover:bg-transparent hover:text-perestroika-preto disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
              {hasInsights ? "regerar análise" : "rodar análise"}
            </button>
          )}
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-perestroika-preto/5" />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-3xl bg-perestroika-preto/5" />
              <div className="h-64 animate-pulse rounded-3xl bg-perestroika-preto/5" />
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* redes da turma sempre disponível, independente da análise IA */}
            <TurmaRedes />

            {!hasInsights ? (
              <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/40 p-10 text-center">
                <Users className="mx-auto mb-4 h-10 w-10 text-perestroika-preto/30" />
                {isAdmin ? (
                  <p className="mx-auto max-w-md font-body text-base text-perestroika-preto/70">
                    ainda não rodamos a análise. clica em <strong>rodar análise</strong> aí em cima pra ia processar a turma.
                  </p>
                ) : (
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="font-body text-base text-perestroika-preto/80">
                      o panorama tá quase pronto.
                    </p>
                    <p className="font-body text-sm text-perestroika-preto/60">
                      a análise roda assim que a turma toda publicar carta. volta aqui em breve.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <TurmaPanorama
                  builders={builders}
                  levelByUser={levelByUser}
                  aggregates={global?.aggregates ?? null}
                  generatedAt={global?.generated_at ?? null}
                  insightId={global?.id ?? null}
                  isAdmin={isAdmin}
                  onMascoteChanged={refresh}
                />

                {/* matches pessoais */}
                {mine && (
                  <section>
                    <div className="mb-5">
                      <p className="mb-1 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
                        pra ti
                      </p>
                      <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
                        pessoas pra tu conversar
                      </h2>
                      {mine.theme_primary && (
                        <p className="mt-3 font-body text-sm text-perestroika-preto/70">
                          teu tema central é <strong className="font-semibold">{mine.theme_primary}</strong>
                          {mine.theme_tags.length > 0 && (
                            <span className="text-perestroika-preto/50">
                              {" "}· {mine.theme_tags.join(" · ")}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {myMatches.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-perestroika-preto/15 bg-perestroika-bege/40 p-6 font-body text-sm text-perestroika-preto/60">
                        nenhuma sugestão de match pra ti ainda. assim que mais gente publicar carta, isso aparece.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {myMatches.map(({ builder, reason }) => (
                          <MatchCard
                            key={builder.user_id}
                            builder={builder}
                            reason={reason}
                            onOpen={setSelected}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <BuilderQuickView builder={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default HubTurma;
