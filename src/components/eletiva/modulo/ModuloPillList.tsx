import { CheckCircle2, Circle, Clock, ExternalLink, FileText, MessageCircle } from "lucide-react";
import { PillVideoPlayer } from "./PillVideoPlayer";
import { PillReflection } from "./PillReflection";
import { PillPBL } from "./PillPBL";
import {
  PillAbertura,
  PillConteudoCurado,
  PillRadar,
  PillQuiz,
  PillBonus,
  PillEditorial,
  PillPBLEstruturado,
  PillChecklistPacto,
  useDeliverable,
  type DeliverableContent,
  type RadarItem,
} from "@/components/eletiva/pills";


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
  interaction_schema?:
    | (Record<string, unknown> & {
        type?: string;
        tutor_prompt?: string;
        prompt?: string;
      })
    | null;
};

const pillKindLabel: Record<ModuloPill["kind"], string> = {
  pilula_a: "abertura",
  pilula_b: "conteúdo",
  pilula_c: "conteúdo",
  exercicio_pbl: "exercício pbl",
  registro: "reflexão",
};

interface Props {
  pills: ModuloPill[] | undefined;
  loading: boolean;
  completedPillIds: Set<string>;
  trailColor: string;
  hasTrail: boolean;
  moduleId: string | null;
  onTogglePill: (pill: ModuloPill) => void;
  togglePending: boolean;
  onOpenTutor: (pill?: ModuloPill) => void;
}

const PillCardShell = ({
  pill,
  index,
  done,
  children,
}: {
  pill: ModuloPill;
  index: number;
  done: boolean;
  children: React.ReactNode;
}) => (
  <article
    id={`pilula-${index + 1}`}
    className={`rounded-2xl border-2 p-5 sm:p-6 transition-colors scroll-mt-24 ${
      done
        ? "border-perestroika-preto/40 bg-perestroika-preto/[0.04]"
        : "border-perestroika-preto/15 bg-perestroika-bege hover:border-perestroika-preto/40"
    }`}
  >
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
        {String(index + 1).padStart(2, "0")} · {pillKindLabel[pill.kind]}
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
    {children}
  </article>
);

/**
 * dispatcher de pílulas: roteia por `kind` + `interaction_schema.type`.
 *
 * 1. se a pílula tem schema rico (`type: "radar_form" | "quiz" | "curated_content_with_questions" | etc`)
 *    → usa o componente rico correspondente (PillRadar, PillQuiz, ...)
 * 2. se a pílula é `registro` (sem schema) → vira PillReflection (textarea autosave)
 * 3. se a pílula é `exercicio_pbl` (sem schema) → vira PillPBL (briefing + tutor + textarea)
 * 4. caso contrário → card passivo (título + body + vídeo + anexo + marcar)
 *
 * compatível com pílulas existentes sem schema.
 */
export const ModuloPillList = ({
  pills,
  loading,
  completedPillIds,
  trailColor,
  hasTrail,
  moduleId,
  onTogglePill,
  togglePending,
  onOpenTutor,
}: Props) => {
  // só carrega deliverable se existe pelo menos uma pílula que precisa
  const needsDeliverable = !!pills?.some(
    (p) =>
      p.kind === "registro" ||
      p.kind === "exercicio_pbl" ||
      !!p.interaction_schema?.type,
  );
  const { deliverable, save } = useDeliverable(
    needsDeliverable && moduleId ? moduleId : undefined,
  );

  const content = (deliverable?.content ?? {}) as Record<string, unknown>;
  const reflections = (content.reflections ?? {}) as Record<string, string>;
  const pblResponses = (content.pbl_responses ?? {}) as Record<string, string>;
  const pblEstruturado = (content.pbl_estruturado ?? {}) as Record<string, Record<string, unknown>>;
  const checklist = (content.checklist ?? {}) as Record<string, Record<string, unknown>>;
  const guidedAnswers = (content.guided_answers ?? {}) as Record<string, string>;
  const radarItems = (content.items ?? []) as RadarItem[];
  const quizAnswers = (content.quiz_answers ?? {}) as Record<string, string | string[]>;
  const bonusValue = (content.bonus ?? {}) as Record<string, string>;


  const safeSave = save ?? (async () => undefined);

  return (
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
        const done = completedPillIds.has(pill.id);
        const schemaType = pill.interaction_schema?.type as string | undefined;

        // ---- 1. schemas ricos (quando o conteúdo é autorado) ----
        if (schemaType === "video_with_transcript") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <PillAbertura
                title={pill.title}
                bodyMd={pill.body_md}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "curated_content_with_questions") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <PillConteudoCurado
                title={pill.title}
                bodyMd={pill.body_md}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={guidedAnswers}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "radar_form") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <PillRadar
                title={pill.title}
                bodyMd={pill.body_md}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={radarItems}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "quiz") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <PillQuiz
                title={pill.title}
                bodyMd={pill.body_md}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={quizAnswers}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "bonus_text") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <PillBonus
                title={pill.title}
                bodyMd={pill.body_md}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={bonusValue}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        // ---- 2. registro sem schema → reflexão escrita ----
        if (pill.kind === "registro") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <h3
                className={`font-display uppercase text-xl sm:text-2xl mb-3 leading-tight ${
                  done ? "line-through decoration-perestroika-preto/40 decoration-2" : ""
                }`}
              >
                {pill.title}
              </h3>
              <PillReflection
                pillId={pill.id}
                title={pill.title}
                bodyMd={pill.body_md}
                prompt={(pill.interaction_schema?.prompt as string | undefined) ?? null}
                trailColor={trailColor}
                initial={reflections[pill.id] ?? ""}
                save={safeSave}
                onComplete={() => !done && onTogglePill(pill)}
                isCompleted={done}
                isPending={togglePending}
              />
            </PillCardShell>
          );
        }

        // ---- 3. exercicio_pbl sem schema → workspace PBL ----
        if (pill.kind === "exercicio_pbl") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
              <h3
                className={`font-display uppercase text-xl sm:text-2xl mb-3 leading-tight ${
                  done ? "line-through decoration-perestroika-preto/40 decoration-2" : ""
                }`}
              >
                {pill.title}
              </h3>
              <PillPBL
                pillId={pill.id}
                title={pill.title}
                bodyMd={pill.body_md}
                trailColor={trailColor}
                initial={pblResponses[pill.id] ?? ""}
                save={safeSave}
                onOpenTutor={() => hasTrail && onOpenTutor(pill)}
                onComplete={() => !done && onTogglePill(pill)}
                isCompleted={done}
                isPending={togglePending}
              />
            </PillCardShell>
          );
        }

        // ---- 4. fallback passivo (pilula_a/b/c sem schema) ----
        return (
          <PillCardShell key={pill.id} pill={pill} index={idx} done={done}>
            <h3
              className={`font-display uppercase text-xl sm:text-2xl mb-2 leading-tight ${
                done ? "line-through decoration-perestroika-preto/40 decoration-2" : ""
              }`}
            >
              {pill.title}
            </h3>

            {pill.body_md && (
              <p className="font-body text-sm sm:text-base text-perestroika-preto/75 whitespace-pre-wrap">
                {pill.body_md}
              </p>
            )}

            {pill.video_url && (
              <PillVideoPlayer url={pill.video_url} trailColor={trailColor} />
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
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
              {pill.interaction_schema?.tutor_prompt && hasTrail && (
                <button
                  type="button"
                  onClick={() => onOpenTutor(pill)}
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
                aria-pressed={done}
                className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  done
                    ? "bg-perestroika-preto text-perestroika-bege"
                    : "border border-perestroika-preto/30 hover:bg-perestroika-preto hover:text-perestroika-bege"
                }`}
              >
                {done ? (
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
          </PillCardShell>
        );
      })}
    </section>
  );
};
