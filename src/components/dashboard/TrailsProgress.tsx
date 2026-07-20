import { Link } from "react-router-dom";
import type { EletivaSnapshot } from "@/hooks/useEletivaProgress";

interface Props {
  snapshot: EletivaSnapshot;
}

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

export const TrailsProgress = ({ snapshot }: Props) => {
  const { trails, modules, progressByModuleId } = snapshot;

  if (!trails.length) return null;

  const rows = trails.map((trail) => {
    const trailModules = modules.filter(
      (m) => m.trail_id === trail.id && m.published,
    );
    const total = trailModules.length;
    const done = trailModules.filter(
      (m) => !!progressByModuleId[m.id]?.completed_at,
    ).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const color =
      trail.color ?? trailColorByOrder[trail.order_index] ?? "#090909";
    return { trail, total, done, pct, color };
  });

  return (
    <section
      aria-labelledby="trails-progress-title"
      className="rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/55 p-5 sm:p-6"
    >
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55">
            mapa da eletiva
          </p>
          <h2
            id="trails-progress-title"
            className="font-display text-2xl uppercase leading-none text-perestroika-preto sm:text-3xl"
          >
            vinte módulos na sua eletiva
          </h2>
        </div>
      </header>

      <ul className="space-y-3">
        {rows.map(({ trail, total, done, pct, color }) => (
          <li key={trail.id}>
            <Link
              to="/app/trilhas"
              className="group block rounded-xl px-2 py-2 -mx-2 transition-colors hover:bg-perestroika-preto/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3 font-body text-sm">
                <span className="inline-flex items-center gap-2 text-perestroika-preto">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {trail.title.toLowerCase()}
                </span>
                <span className="font-body text-xs text-perestroika-preto/55 tabular-nums">
                  {total > 0 ? `${done}/${total}` : "em breve"}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-perestroika-preto/10"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${trail.title}: ${pct}% concluído`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: total > 0 ? `${pct}%` : "0%",
                    backgroundColor: color,
                  }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
