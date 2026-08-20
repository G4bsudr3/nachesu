import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ExternalLink, FileText, Lock, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleResume } from "@/hooks/useModuleResume";
import { ModuloRatingCard } from "./ModuloRatingCard";

/** avisa o módulo qual bloco a pessoa abriu por último */
const ResumeContext = createContext<((pillId: string, label: string) => void) | null>(null);

import { PillVideoPlayer } from "./PillVideoPlayer";
import { PillReflection } from "./PillReflection";
import { PillPBL } from "./PillPBL";
import {
  PillAbertura,
  PillVideoEmbed,
  PillConteudoCurado,
  PillRadar,
  PillQuiz,
  PillBonus,
  PillEditorial,
  PillPBLEstruturado,
  PillChecklistPacto,
  PillPBLCorfTriplo,
  PillGuiaDePrompts,
  PillClassificador3x3,
  PillCacaEvidencias,
  PillQuatroFiltrosBriefing,
  PillMapaFluxo,
  PillMatrizValor,
  PillRegrasJogo,
  PillImpactos3P,
  PillStakeholdersMatriz,
  PillSprintIdeacao,
  PillSelecaoIdeia,
  PillPropostaValor,
  PillBMCSimplificado,
  PillSuposicoesRiscos,
  PillPlanoExperimento,
  PillInstrumentoColeta,
  PillEmCampo,
  PillRegistroResultado,
  PillChangelogV2,
  PillPitchRoteiro,
  PillPitchFinal,
  PillCartaEncerramento,
  PillFechamentoAvaliacao,
  PillMiniDossie,
  useDeliverable,
  type DeliverableContent,
  type RadarItem,
  type PblCorfValue,
  type GuiaPromptsValue,
  type ClassificadorValue,
  type CacaEvidenciasValue,
  type BriefingValue,
  type MapaFluxoValue,
  type MatrizValorValue,
  type RegrasJogoValue,
  type Impactos3PValue,
  type StakeholdersMatrizValue,
  type SprintIdeacaoValue,
  type SelecaoIdeiaValue,
  type PropostaValorValue,
  type BMCValue,
  type SuposicoesRiscosValue,
  type PlanoExperimentoValue,
  type InstrumentoColetaValue,
  type EmCampoValue,
  type RegistroResultadoValue,
  type ChangelogV2Value,
  type PitchRoteiroValue,
  type PitchFinalValue,
  type CartaEncerramentoValue,
  type FechamentoAvaliacaoValue,
  type MiniDossieValue,
} from "@/components/eletiva/pills";
import { PillMapaAtores, type MapaAtoresValue } from "@/components/eletiva/pills/PillMapaAtores";
import { PillMarkdown } from "@/components/eletiva/PillMarkdown";
import { DuracaoBadge, formatDuracao } from "@/components/eletiva/DuracaoBadge";


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
        reflexao?: { md?: string } | string;
      })
    | null;
};

const pillKindLabel: Record<ModuloPill["kind"], string> = {
  pilula_a: "abertura",
  pilula_b: "conteúdo",
  pilula_c: "conteúdo",
  exercicio_pbl: "exercício",
  registro: "registro",
};

/**
 * o rótulo conversa com o nome da pílula: as duas eletivas usam o mesmo
 * vocabulário (abertura, conteúdo, exercício, fechamento, bônus, registro),
 * então uma pílula chamada "fechando o módulo 6" não aparece como "conteúdo".
 */
export function pillLabel(pill: Pick<ModuloPill, "kind" | "title">) {
  const t = (pill.title || "").toLowerCase();
  if (t.startsWith("bônus") || t.startsWith("bonus")) return "bônus";
  if (t.startsWith("fechando") || t.startsWith("checagem")) return "fechamento";
  return pillKindLabel[pill.kind];
}


interface Props {
  pills: ModuloPill[] | undefined;
  loading: boolean;
  completedPillIds: Set<string>;
  unlockedPillIds: Set<string>;
  trailColor: string;
  hasTrail: boolean;
  moduleId: string | null;
  onTogglePill: (pill: ModuloPill) => void;
  togglePending: boolean;
  onOpenTutor: (pill?: ModuloPill) => void;
  /**
   * quando presente, a última pílula (registro) pede a avaliação do módulo
   * antes do botão de concluir. vale igual pras duas eletivas, só nos
   * módulos de checkpoint (1, 5, 10, 15, 20).
   */
  ratingModuleId?: string | null;
  /** slug da eletiva, pra oferecer o tutor quando a nota vem baixa */
  courseSlug?: string | null;
}



const PillCardShell = ({
  pill,
  index,
  total,
  done,
  justUnlocked,
  trailColor,
  children,
  defaultExpanded = true,
}: {
  pill: ModuloPill;
  index: number;
  total: number;
  done: boolean;
  justUnlocked?: boolean;
  trailColor?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = `pilula-body-${pill.id}`;
  const rememberResume = useContext(ResumeContext);
  const markHere = () => rememberResume?.(pill.id, pill.title);
  const toggle = () =>
    setExpanded((v) => {
      if (!v) markHere();
      return !v;
    });

  return (
    <article
      id={`pilula-${index + 1}`}
      className={`rounded-2xl border-2 transition-colors scroll-mt-24 overflow-hidden ${
        done
          ? "border-perestroika-preto/30 bg-perestroika-preto/[0.04]"
          : "border-perestroika-preto/15 bg-perestroika-bege hover:border-perestroika-preto/30"
      } ${justUnlocked ? "motion-safe:animate-pill-unlock ring-2 ring-perestroika-rosa/60 ring-offset-2 ring-offset-perestroika-bege" : ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="w-full text-left p-5 sm:p-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa/60 focus-visible:ring-inset"
      >

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full font-display text-sm sm:text-base text-perestroika-bege shrink-0"
              style={{ backgroundColor: trailColor || "#090909" }}
              aria-label={`bloco ${index + 1} de ${total}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            {pill.required ? (
              <span className="font-body text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/70">
                {pillLabel(pill)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-perestroika-preto/15 px-2 py-0.5 font-body text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
                <Sparkles className="h-3 w-3" aria-hidden /> bônus opcional
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {(pill.duration_min_low || pill.duration_min_high) && (
              <DuracaoBadge
                className="hidden sm:inline-flex"
                muted={!pill.required}
                title={!pill.required ? "fora do tempo do módulo" : undefined}
              >
                {formatDuracao(pill.duration_min_low, pill.duration_min_high)}
                {!pill.required && " fora do tempo do módulo"}
              </DuracaoBadge>
            )}

            <span
              className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-perestroika-preto/15 text-perestroika-preto/70"
              aria-hidden
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 sm:px-6 sm:pb-6" onFocusCapture={markHere}>
              {justUnlocked && (
                <p className="flex items-center gap-1.5 mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-rosa font-semibold motion-safe:animate-fade-in">
                  <Sparkles className="h-3 w-3" aria-hidden /> agora é a sua vez
                </p>
              )}
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};

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
  unlockedPillIds,
  trailColor,
  hasTrail,
  moduleId,
  onTogglePill,
  togglePending,
  onOpenTutor,
  ratingModuleId,
  courseSlug,
}: Props) => {
  // avaliação de fim de módulo: guardada aqui pra virar item do checklist
  // da pílula de registro sem depender de a rede ter respondido.
  const [ratingAnswered, setRatingAnswered] = useState(false);
  // a avaliação mora na última pílula de registro, mesmo quando existe um
  // bônus opcional depois dela.
  const lastRegistroId = pills
    ? [...pills].reverse().find((p) => p.kind === "registro")?.id ?? null
    : null;
  const wantsRating = (pill: ModuloPill) =>
    !!ratingModuleId && pill.id === lastRegistroId;

  const ratingSlot = (pill: ModuloPill) =>
    wantsRating(pill) ? (
      <ModuloRatingCard
        moduleId={ratingModuleId as string}
        moduleNumber={0}
        trailColor={trailColor}
        courseSlug={courseSlug}
        inline
        onAnswered={(v) => setRatingAnswered(v !== null)}
      />
    ) : undefined;

  const ratingChecklist = (pill: ModuloPill) =>
    wantsRating(pill)
      ? [{ id: "avaliacao", label: "dizer como foi o módulo", done: ratingAnswered }]
      : undefined;

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

  // detecta pílulas que acabaram de passar de locked → unlocked nesse render.
  // serve pra pulsar o card recém-aberto e mostrar "agora é a sua vez" por alguns segundos.
  const prevUnlockedRef = useRef<Set<string>>(new Set());
  const [justUnlockedIds, setJustUnlockedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevUnlockedRef.current;
    const fresh = new Set<string>();
    unlockedPillIds.forEach((id) => {
      // ignora o primeiro mount (quando prev tá vazio): não queremos celebrar
      // pílulas já disponíveis quando o aluno só abriu a página.
      if (prev.size > 0 && !prev.has(id) && !completedPillIds.has(id)) {
        fresh.add(id);
      }
    });
    prevUnlockedRef.current = new Set(unlockedPillIds);
    if (fresh.size === 0) return;
    setJustUnlockedIds(fresh);
    const t = window.setTimeout(() => setJustUnlockedIds(new Set()), 4000);
    return () => window.clearTimeout(t);
  }, [unlockedPillIds, completedPillIds]);

  const content = (deliverable?.content ?? {}) as Record<string, unknown>;
  const reflections = (content.reflections ?? {}) as Record<string, string>;
  const pblResponses = (content.pbl_responses ?? {}) as Record<string, string>;
  const pblEstruturado = (content.pbl_estruturado ?? {}) as Record<string, Record<string, unknown>>;
  const pblCorf = (content.pbl_corf ?? {}) as Record<string, PblCorfValue>;
  const guiaPrompts = (content.guia_prompts ?? {}) as Record<string, GuiaPromptsValue>;
  const classificadorMap = (content.classificacao_aula2 ?? {}) as Record<string, ClassificadorValue>;
  const mapaAtoresMap = (content.mapa_atores_aula3 ?? {}) as Record<string, MapaAtoresValue>;
  const cacaEvidenciasMap = (content.caca_evidencias ?? {}) as Record<string, CacaEvidenciasValue>;
  const briefingMap = (content.briefing_aula5 ?? {}) as Record<string, BriefingValue>;
  const mapaFluxoMap = (content.mapa_fluxo_aula6 ?? {}) as Record<string, MapaFluxoValue>;
  const matrizValorMap = (content.matriz_valor_aula7 ?? {}) as Record<string, MatrizValorValue>;
  const regrasJogoMap = (content.regras_jogo_aula8 ?? {}) as Record<string, RegrasJogoValue>;
  const impactos3pMap = (content.impactos_aula9 ?? {}) as Record<string, Impactos3PValue>;
  const stakeholdersMap = (content.stakeholders_aula10 ?? {}) as Record<string, StakeholdersMatrizValue>;
  const sprintIdeacaoMap = (content.ideias_aula11 ?? {}) as Record<string, SprintIdeacaoValue>;
  const selecaoIdeiaMap = (content.selecao_aula12 ?? {}) as Record<string, SelecaoIdeiaValue>;
  const propostaValorMap = (content.proposta_valor_aula13 ?? {}) as Record<string, PropostaValorValue>;
  const bmcMap = (content.bmc_aula14 ?? {}) as Record<string, BMCValue>;
  const suposicoesRiscosMap = (content.suposicoes_riscos_aula15 ?? {}) as Record<string, SuposicoesRiscosValue>;
  const planoExperimentoMap = (content.experimento_plano_aula16 ?? {}) as Record<string, PlanoExperimentoValue>;
  const instrumentoColetaMap = (content.instrumento_coleta_aula17 ?? {}) as Record<string, InstrumentoColetaValue>;
  const emCampoMap = (content.em_campo_aula17 ?? {}) as Record<string, EmCampoValue>;
  const registroResultadoMap = (content.experimento_resultado_aula17 ?? {}) as Record<string, RegistroResultadoValue>;
  const changelogV2Map = (content.changelog_aula18 ?? {}) as Record<string, ChangelogV2Value>;
  const pitchRoteiroMap = (content.pitch_aula19 ?? {}) as Record<string, PitchRoteiroValue>;
  const pitchFinalMap = (content.pitch_final ?? {}) as Record<string, PitchFinalValue>;
  const cartaEncerramentoMap = (content.carta_encerramento ?? {}) as Record<string, CartaEncerramentoValue>;
  const fechamentoAvaliacaoMap = (content.fechamento_avaliacao ?? {}) as Record<string, FechamentoAvaliacaoValue>;
  const miniDossieMap = (content.mini_dossie ?? {}) as Record<string, MiniDossieValue>;
  const checklist = (content.checklist ?? {}) as Record<string, Record<string, unknown>>;
  const guidedAnswers = (content.guided_answers ?? {}) as Record<string, string>;
  const radarItems = (content.items ?? []) as RadarItem[];
  const quizAnswers = (content.quiz_answers ?? {}) as Record<string, string | string[]>;
  const bonusValue = (content.bonus ?? {}) as Record<string, string>;


  const safeSave = save ?? (async () => undefined);

  const { user } = useAuth();
  const { mark, remember, forget } = useModuleResume(moduleId, user?.id);


  // último bloco em que a pessoa mexeu nesse módulo (sobrevive a reload)
  const resumeIndex = mark ? (pills?.findIndex((p) => p.id === mark.pillId) ?? -1) : -1;
  const showResume = resumeIndex > 0 && !completedPillIds.has(mark!.pillId);

  const goToResume = () => {
    const el = document.getElementById(`pilula-${resumeIndex + 1}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <ResumeContext.Provider value={remember}>
    <section aria-label="pílulas do módulo" className="space-y-4 mb-10">
      <header className="mb-4 sm:mb-6">
        <p className="font-body text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1.5">
          conteúdo do módulo
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-none text-perestroika-preto">
          blocos
        </h2>
      </header>

      {showResume && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border-2 p-4 sm:p-5"
          style={{ borderColor: `${trailColor || "#090909"}55`, backgroundColor: `${trailColor || "#090909"}10` }}
        >
          <div className="min-w-0">
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
              você parou aqui
            </p>
            <p className="font-body text-sm sm:text-base text-perestroika-preto truncate">
              bloco {String(resumeIndex + 1).padStart(2, "0")} · {mark!.label}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto shrink-0">
            <button
              type="button"
              onClick={goToResume}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:scale-[1.02] active:scale-95 transition-transform"
              style={{ backgroundColor: trailColor || "#090909" }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> continuar de onde parei
            </button>
            <button
              type="button"
              onClick={forget}
              className="rounded-full border border-perestroika-preto/15 px-3 py-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/70 hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              dispensar
            </button>
          </div>
        </div>
      )}


      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/[0.03] motion-safe:animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && (pills?.length ?? 0) === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/15 p-6 text-center">
          <p className="font-body text-sm text-perestroika-preto/60">
            as pílulas desse módulo ainda estão sendo preparadas. volte em breve.
          </p>
        </div>
      )}

      {pills?.map((pill, idx) => {
        const done = completedPillIds.has(pill.id);
        const unlocked = unlockedPillIds.has(pill.id);
        const schemaType = pill.interaction_schema?.type as string | undefined;

        // ---- pílula trancada (liberação sequencial) ----
        if (!unlocked) {
          const prev = pills[idx - 1];
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={false} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <div className="flex items-start gap-3 opacity-70">
                <Lock className="h-5 w-5 mt-1 text-perestroika-preto/50 shrink-0" aria-hidden />
                <div>
                  <h3 className="font-display uppercase text-xl sm:text-2xl mb-1 leading-tight text-perestroika-preto/60">
                    {pill.title}
                  </h3>
                  <p className="font-body text-sm text-perestroika-preto/55">
                    {prev
                      ? <>termine <span className="font-semibold text-perestroika-preto/75">{prev.title}</span> pra abrir essa.</>
                      : "essa pílula abre quando a anterior estiver concluída."}
                  </p>
                </div>
              </div>
            </PillCardShell>
          );
        }



        // ---- novos schemas editoriais (módulo 1 da eletiva ia na prática) ----
        if (schemaType === "pilula_editorial") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillEditorial
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={reflections[pill.id] ?? ""}
                reflectionsMap={reflections}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "pbl_estruturado") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillPBLEstruturado
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={(pblEstruturado[pill.id] ?? {}) as never}
                pblMap={pblEstruturado as never}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
                hasTrail={hasTrail}
                onOpenTutor={() => onOpenTutor(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "checklist_pacto") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillChecklistPacto
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={(checklist[pill.id] ?? { checked: [] }) as never}
                checklistMap={checklist as never}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
                beforeCta={ratingSlot(pill)}
                extraChecklistItems={ratingChecklist(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "pbl_corf_triplo") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillPBLCorfTriplo
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={pblCorf[pill.id] ?? {}}
                corfMap={pblCorf}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
                hasTrail={hasTrail}
                onOpenTutor={() => onOpenTutor(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "guia_de_prompts") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillGuiaDePrompts
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={guiaPrompts[pill.id] ?? {}}
                guiaMap={guiaPrompts}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
                beforeCta={ratingSlot(pill)}
                extraChecklistItems={ratingChecklist(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "classificador_linear_circular_regenerativo") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillClassificador3x3
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={classificadorMap[pill.id] ?? {}}
                classMap={classificadorMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "mapa_atores_2x2") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillMapaAtores
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={mapaAtoresMap[pill.id] ?? {}}
                mapaMap={mapaAtoresMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "caca_evidencias") {
          const schema = pill.interaction_schema as { metodo_field_id?: string } | null;
          const metodoFieldId = schema?.metodo_field_id ?? "";
          const metodo = metodoFieldId ? guidedAnswers[metodoFieldId] : undefined;
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillCacaEvidencias
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={cacaEvidenciasMap[pill.id] ?? { evidencias: [] }}
                cacaMap={cacaEvidenciasMap}
                metodoEscolhido={metodo}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "quatro_filtros_briefing") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillQuatroFiltrosBriefing
                pillId={pill.id}
                moduleId={pill.module_id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={briefingMap[pill.id] ?? {}}
                briefingMap={briefingMap}
                guidedAnswers={guidedAnswers}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "mapa_fluxo") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillMapaFluxo
                pillId={pill.id}
                moduleId={pill.module_id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={mapaFluxoMap[pill.id] ?? {}}
                mapaFluxoMap={mapaFluxoMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "matriz_valor") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillMatrizValor
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={matrizValorMap[pill.id] ?? {}}
                matrizMap={matrizValorMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "regras_jogo") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillRegrasJogo
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={regrasJogoMap[pill.id] ?? {}}
                regrasMap={regrasJogoMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "impactos_3p") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillImpactos3P
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={impactos3pMap[pill.id] ?? {}}
                impactosMap={impactos3pMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }
        if (schemaType === "stakeholders_matriz") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillStakeholdersMatriz
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={stakeholdersMap[pill.id] ?? {}}
                stakeholdersMap={stakeholdersMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "sprint_ideacao") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillSprintIdeacao
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={sprintIdeacaoMap[pill.id] ?? {}}
                ideiasMap={sprintIdeacaoMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "selecao_ideia") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillSelecaoIdeia
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={selecaoIdeiaMap[pill.id] ?? {}}
                selecaoMap={selecaoIdeiaMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "proposta_valor") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillPropostaValor
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={propostaValorMap[pill.id] ?? {}}
                propostaMap={propostaValorMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "bmc_simplificado") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillBMCSimplificado
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={bmcMap[pill.id] ?? {}}
                bmcMap={bmcMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "suposicoes_riscos") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillSuposicoesRiscos
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={suposicoesRiscosMap[pill.id] ?? {}}
                suposicoesMap={suposicoesRiscosMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "plano_experimento") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillPlanoExperimento
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={planoExperimentoMap[pill.id] ?? {}}
                planoMap={planoExperimentoMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "instrumento_coleta") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillInstrumentoColeta
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={instrumentoColetaMap[pill.id] ?? {}}
                instrumentoMap={instrumentoColetaMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "em_campo") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillEmCampo
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={emCampoMap[pill.id] ?? {}}
                emCampoMap={emCampoMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "registro_resultado") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillRegistroResultado
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={registroResultadoMap[pill.id] ?? {}}
                registroMap={registroResultadoMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "changelog_v2") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillChangelogV2
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={changelogV2Map[pill.id] ?? {}}
                changelogMap={changelogV2Map}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "pitch_roteiro") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillPitchRoteiro
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={pitchRoteiroMap[pill.id] ?? {}}
                pitchMap={pitchRoteiroMap}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "pitch_final") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillPitchFinal
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={pitchFinalMap[pill.id] ?? {}}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "carta_encerramento") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillCartaEncerramento
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={cartaEncerramentoMap[pill.id] ?? {}}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "fechamento_avaliacao") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillFechamentoAvaliacao
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={fechamentoAvaliacaoMap[pill.id] ?? {}}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }

        if (schemaType === "mini_dossie") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillMiniDossie
                pillId={pill.id}
                title={pill.title}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                initial={miniDossieMap[pill.id] ?? {}}
                save={safeSave}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />
            </PillCardShell>
          );
        }














        // ---- vídeo embedado simples (loom/youtube, sem entrega) ----
        if (schemaType === "video_embed") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
              <PillVideoEmbed
                title={pill.title}
                bodyMd={pill.body_md}
                schema={pill.interaction_schema as never}
                accent={trailColor}
                optional={!pill.required}
                isCompleted={done}
                isCompleting={togglePending}
                onComplete={() => !done && onTogglePill(pill)}
              />

            </PillCardShell>
          );
        }

        // ---- 1. schemas ricos (quando o conteúdo é autorado) ----
        if (schemaType === "video_with_transcript") {
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
          const reflexao = pill.interaction_schema?.reflexao;
          const reflexaoPrompt =
            typeof reflexao === "string" ? reflexao : reflexao?.md;
          return (
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
                prompt={
                  (pill.interaction_schema?.prompt as string | undefined) ??
                  reflexaoPrompt ??
                  null
                }
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
            <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
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
          <PillCardShell key={pill.id} pill={pill} index={idx} total={pills.length} done={done} justUnlocked={justUnlockedIds.has(pill.id)} trailColor={trailColor}>
            <h3
              className={`font-display uppercase text-xl sm:text-2xl mb-2 leading-tight ${
                done ? "line-through decoration-perestroika-preto/40 decoration-2" : ""
              }`}
            >
              {pill.title}
            </h3>

            {pill.body_md && (
              <PillMarkdown accent={trailColor} className="text-perestroika-preto/75">
                {pill.body_md}
              </PillMarkdown>
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/15 px-3 py-1.5 font-body text-xs uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
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
                className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 min-h-[44px] font-body text-xs uppercase tracking-wide transition-colors disabled:opacity-50 ${
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
    </ResumeContext.Provider>
  );

};
