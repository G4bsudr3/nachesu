import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock, Clock, Map, Sparkles } from "lucide-react";
import type { EletivaSnapshot } from "@/hooks/useEletivaProgress";

interface Props {
  snapshot: EletivaSnapshot | null | undefined;
  /** título da eletiva ativa, pra contextualizar a pergunta-semente do tutor */
  courseTitle?: string;
}

/**
 * painel de comando da home. complementa o hero do próximo módulo
 * sem repetir o CTA principal: dá ao estudante 3 portas auxiliares —
 * cadência da semana, conversa com o tutor IA, e a porta pro mapa
 * completo (que vive em /app/trilhas).
 *
 * regra: não duplica "X de Y" como copy de progresso aqui. esse número
 * é função do mapa em /app/trilhas.
 */
export const DashboardCommandPanel = ({ snapshot, courseTitle }: Props) => {
  if (!snapshot) return null;
  const { modules, unlockedModuleIds, progressByModuleId, currentModule } = snapshot;

  // cadência: módulos abertos pendentes + próximo release
  const unlockedPending = modules.filter(
    (m) => unlockedModuleIds.has(m.id) && !progressByModuleId[m.id]?.completed_at,
  );
  const totalMinutes = unlockedPending.reduce(
    (acc, m) => acc + (m.total_minutes ?? 50),
    0,
  );
  const now = Date.now();
  const nextLocked = modules
    .filter((m) => m.published && !unlockedModuleIds.has(m.id))
    .sort((a, b) => a.number - b.number)
    .find((m) => m.available_from && new Date(m.available_from).getTime() > now);
  const nextReleaseDate = nextLocked?.available_from
    ? new Date(nextLocked.available_from)
    : null;
  const msUntilNext = nextReleaseDate ? nextReleaseDate.getTime() - now : null;
  const hoursUntilNext = msUntilNext !== null ? Math.ceil(msUntilNext / (1000 * 60 * 60)) : null;
  const daysUntilNext = msUntilNext !== null ? Math.ceil(msUntilNext / (1000 * 60 * 60 * 24)) : null;

  const cadenceHeadline = unlockedPending.length > 0
    ? `~${totalMinutes} min abertos`
    : nextReleaseDate
      ? "tudo em dia"
      : "respira";
  const cadenceLine = unlockedPending.length > 0
    ? unlockedPending.length === 1
      ? "1 módulo aberto pra você fechar."
      : `${unlockedPending.length} módulos abertos pra fechar no seu ritmo.`
    : nextReleaseDate && hoursUntilNext !== null && daysUntilNext !== null
      ? hoursUntilNext <= 24
        ? `módulo ${String(nextLocked!.number).padStart(2, "0")} abre em ~${hoursUntilNext}h.`
        : `módulo ${String(nextLocked!.number).padStart(2, "0")} abre em ${daysUntilNext} dias.`
      : "você fechou tudo o que tinha. avisamos quando abrir o próximo.";

  // tutor: prompt-semente contextual ao módulo atual
  const currentNum = currentModule ? String(currentModule.number).padStart(2, "0") : null;
  const tutorPrompt = currentModule
    ? `tô no módulo ${currentNum} "${currentModule.title}". me ajuda a destravar o pensamento aqui?`
    : courseTitle
      ? `tô começando a eletiva ${courseTitle.toLowerCase()}. por onde a gente começa a pensar?`
      : "tô começando agora. por onde a gente começa?";
  const tutorHref = `/app/tutor?prompt=${encodeURIComponent(tutorPrompt)}`;

  // mapa: linka pro mapa da eletiva (única fonte do panorama "X de Y")
  const mapHref = "/app/trilhas";

  return (
    <section
      aria-label="painel de comando"
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
    >
      {/* cadência */}
      <div className="rounded-2xl border-2 border-perestroika-preto/12 bg-perestroika-bege/40 p-5 flex flex-col">
        <div className="flex items-center gap-2 text-perestroika-preto/55 mb-3">
          {nextReleaseDate && unlockedPending.length === 0 ? (
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="font-body text-[10px] uppercase tracking-[0.22em]">
            cadência da semana
          </span>
        </div>
        <p className="font-display uppercase text-2xl sm:text-3xl leading-none text-perestroika-preto tabular-nums mb-2">
          {cadenceHeadline}
        </p>
        <p className="font-body text-sm text-perestroika-preto/70 mt-auto">
          {cadenceLine}
        </p>
      </div>

      {/* tutor IA */}
      <Link
        to={tutorHref}
        className="group rounded-2xl border-2 border-perestroika-preto/12 bg-perestroika-preto text-perestroika-bege p-5 flex flex-col hover:scale-[1.01] active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
      >
        <div className="flex items-center justify-between text-perestroika-bege/70 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-body text-[10px] uppercase tracking-[0.22em]">
              tutor ia
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
        <p className="font-display uppercase text-2xl sm:text-3xl leading-none mb-2">
          peça uma luz
        </p>
        <p className="font-body text-sm text-perestroika-bege/75 mt-auto">
          {currentModule
            ? `joão-de-barro te ajuda a destravar o módulo ${currentNum}.`
            : "joão-de-barro te ajuda a pensar antes de construir."}
        </p>
      </Link>

      {/* mapa */}
      <Link
        to={mapHref}
        className="group rounded-2xl border-2 border-perestroika-preto/12 bg-perestroika-bege p-5 flex flex-col hover:scale-[1.01] active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
      >
        <div className="flex items-center justify-between text-perestroika-preto/55 mb-3">
          <div className="flex items-center gap-2">
            <Map className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-body text-[10px] uppercase tracking-[0.22em]">
              o mapa inteiro
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
        <p className="font-display uppercase text-2xl sm:text-3xl leading-none text-perestroika-preto mb-2">
          20 módulos, um mapa
        </p>
        <p className="font-body text-sm text-perestroika-preto/70 mt-auto">
          enxergar a eletiva inteira, do começo ao final.
        </p>
      </Link>
    </section>
  );
};
