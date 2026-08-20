import { CalendarClock, Clock } from "lucide-react";
import type { EletivaSnapshot } from "@/hooks/useEletivaProgress";

interface Props {
  snapshot: EletivaSnapshot | null | undefined;
}

/**
 * mostra a cadência da semana: quanto tempo de eletiva o aluno tem pela frente
 * (módulos desbloqueados não concluídos) e quando o próximo módulo bloqueado
 * deve abrir (se admin definiu `available_from`).
 * pedagogicamente: dá noção de ritmo num produto assíncrono.
 */
export const WeekCadenceStrip = ({ snapshot }: Props) => {
  if (!snapshot) return null;
  const { modules, unlockedModuleIds, progressByModuleId } = snapshot;

  const unlockedPending = modules.filter(
    (m) => unlockedModuleIds.has(m.id) && !progressByModuleId[m.id]?.completed_at,
  );
  const totalMinutes = unlockedPending.reduce(
    (acc, m) => acc + (m.total_minutes ?? 50),
    0,
  );

  // próximo módulo que ainda vai abrir (publicado, futuro)
  const now = Date.now();
  const nextLocked = modules
    .filter((m) => m.published && !unlockedModuleIds.has(m.id))
    .sort((a, b) => a.number - b.number)
    .find((m) => m.available_from && new Date(m.available_from).getTime() > now);

  const nextReleaseDate = nextLocked?.available_from
    ? new Date(nextLocked.available_from)
    : null;
  const daysUntilNext = nextReleaseDate
    ? Math.max(0, Math.ceil((nextReleaseDate.getTime() - now) / (1000 * 60 * 60 * 24)))
    : null;

  // nada útil pra mostrar
  if (unlockedPending.length === 0 && !nextReleaseDate) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/40 px-4 py-3 font-body text-sm text-perestroika-preto/75">
      {unlockedPending.length > 0 && (
        <span className="inline-flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            essa semana você tem{" "}
            <strong className="text-perestroika-preto tabular-nums">~{totalMinutes} min</strong>{" "}
            de eletiva
            {unlockedPending.length > 1 && (
              <span className="text-perestroika-preto/55">
                {" "}
                · {unlockedPending.length} módulos abertos
              </span>
            )}
          </span>
        </span>
      )}
      {nextReleaseDate && daysUntilNext !== null && (
        <span className="inline-flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            módulo {String(nextLocked!.number).padStart(2, "0")} abre{" "}
            <strong className="text-perestroika-preto">
              {daysUntilNext === 0
                ? "hoje"
                : daysUntilNext === 1
                  ? "amanhã"
                  : `em ${daysUntilNext} dias`}
            </strong>
          </span>
        </span>
      )}
    </div>
  );
};
