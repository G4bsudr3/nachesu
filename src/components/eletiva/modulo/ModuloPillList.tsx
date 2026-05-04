import { CheckCircle2, Circle, Clock, ExternalLink, FileText, MessageCircle } from "lucide-react";
import { PillVideoPlayer } from "./PillVideoPlayer";

export type ModuloPill = {
  id: string;
  module_id: string;
  order_index: number;
  kind: "pilula_a" | "pilula_b" | "pilula_c" | "exercicio_pbl" | "registro";
  title: string;
  body_md: string;
  duration_min_low: number | null;
  duration_min_high: number | null;
  video_url: string | null;
  attachment_url: string | null;
  required: boolean;
  interaction_schema?: { tutor_prompt?: string } | null;
};

const pillKindLabel: Record<ModuloPill["kind"], string> = {
  pilula_a: "pílula a",
  pilula_b: "pílula b",
  pilula_c: "pílula c",
  exercicio_pbl: "exercício pbl",
  registro: "registro",
};

interface Props {
  pills: ModuloPill[] | undefined;
  loading: boolean;
  completedPillIds: Set<string>;
  trailColor: string;
  hasTrail: boolean;
  onTogglePill: (pill: ModuloPill) => void;
  togglePending: boolean;
  onOpenTutor: () => void;
}

export const ModuloPillList = ({
  pills,
  loading,
  completedPillIds,
  trailColor,
  hasTrail,
  onTogglePill,
  togglePending,
  onOpenTutor,
}: Props) => (
  <section aria-label="pílulas do módulo" className="space-y-4 mb-10">
    <h2 className="font-display uppercase text-2xl mb-2">pílulas</h2>

    {loading && (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] motion-safe:animate-pulse"
          />
        ))}
      </div>
    )}

    {!loading && (pills?.length ?? 0) === 0 && (
      <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/20 p-6 text-center">
        <p className="font-body text-sm text-perestroika-preto/60">
          as pílulas desse módulo ainda estão sendo preparadas. volte em breve.
        </p>
      </div>
    )}

    {pills?.map((pill, idx) => {
      const pillDone = completedPillIds.has(pill.id);
      return (
        <article
          key={pill.id}
          className={`rounded-2xl border-2 p-5 sm:p-6 transition-colors ${
            pillDone
              ? "border-perestroika-preto/40 bg-perestroika-preto/[0.04]"
              : "border-perestroika-preto/15 bg-perestroika-bege hover:border-perestroika-preto/40"
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
              {String(idx + 1).padStart(2, "0")} · {pillKindLabel[pill.kind]}
              {!pill.required && " · opcional"}
            </p>
            {(pill.duration_min_low || pill.duration_min_high) && (
              <span className="inline-flex items-center gap-1 font-body text-xs text-perestroika-preto/55">
                <Clock className="h-3 w-3" />
                {pill.duration_min_low === pill.duration_min_high || !pill.duration_min_high
                  ? `${pill.duration_min_low ?? pill.duration_min_high} min`
                  : `${pill.duration_min_low}-${pill.duration_min_high} min`}
              </span>
            )}
          </div>

          <h3
            className={`font-display uppercase text-xl sm:text-2xl mb-2 leading-tight ${
              pillDone ? "line-through decoration-perestroika-preto/40 decoration-2" : ""
            }`}
          >
            {pill.title}
          </h3>

          {pill.body_md && (
            <p className="font-body text-sm sm:text-base text-perestroika-preto/75 whitespace-pre-wrap">
              {pill.body_md}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {pill.video_url && (
              <a
                href={pill.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/20 px-3 py-1.5 font-body text-xs uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
              >
                <Play className="h-3.5 w-3.5" /> assistir
              </a>
            )}
            {pill.attachment_url && (
              <a
                href={pill.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/20 px-3 py-1.5 font-body text-xs uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
              >
                <FileText className="h-3.5 w-3.5" /> material
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {pill.kind === "exercicio_pbl" && hasTrail && (
              <button
                type="button"
                onClick={onOpenTutor}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:scale-105 active:scale-95 transition-transform"
                style={{ backgroundColor: trailColor }}
              >
                <MessageCircle className="h-3.5 w-3.5" /> conversar com tutor
              </button>
            )}
            <button
              type="button"
              onClick={() => onTogglePill(pill)}
              disabled={togglePending}
              aria-pressed={pillDone}
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors disabled:opacity-50 ${
                pillDone
                  ? "bg-perestroika-preto text-perestroika-bege"
                  : "border border-perestroika-preto/30 hover:bg-perestroika-preto hover:text-perestroika-bege"
              }`}
            >
              {pillDone ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> concluída
                </>
              ) : (
                <>
                  <Circle className="h-3.5 w-3.5" /> marcar
                </>
              )}
            </button>
          </div>
        </article>
      );
    })}
  </section>
);
