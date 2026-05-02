import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, ExternalLink, FileText, MessageCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { EstrelaPerestroika } from "@/components/brand/EstrelaPerestroika";
import { TutorChat } from "@/components/eletiva/TutorChat";

type Pill = {
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
};

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

const pillKindLabel: Record<Pill["kind"], string> = {
  pilula_a: "pílula a",
  pilula_b: "pílula b",
  pilula_c: "pílula c",
  exercicio_pbl: "exercício pbl",
  registro: "registro",
};

const Modulo = () => {
  const { number } = useParams<{ number: string }>();
  const moduleNumber = Number(number);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: snapshot, isLoading: snapLoading } = useEletivaProgress();
  const [tutorOpen, setTutorOpen] = useState(false);

  const moduleRow = useMemo(
    () => snapshot?.modules.find((m) => m.number === moduleNumber) ?? null,
    [snapshot, moduleNumber],
  );

  const trail = useMemo(
    () => snapshot?.trails.find((t) => t.id === moduleRow?.trail_id) ?? null,
    [snapshot, moduleRow],
  );

  const trailColor =
    trailColorByOrder[trail?.order_index ?? 1] ?? trail?.color ?? "#fe7b02";

  // pílulas do módulo (só carrega quando o módulo existe)
  const { data: pills, isLoading: pillsLoading } = useQuery({
    queryKey: ["module-pills", moduleRow?.id],
    enabled: !!moduleRow?.id,
    queryFn: async () => {
      // a RLS já esconde rascunhos pra alunos; o filtro explícito garante
      // que admins navegando como aluno também não vejam pílulas em rascunho.
      const { data, error } = await supabase
        .from("module_pills")
        .select("*")
        .eq("module_id", moduleRow!.id)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Pill[];
    },
  });

  const progress = moduleRow ? snapshot?.progressByModuleId[moduleRow.id] : undefined;
  const isStarted = !!progress?.started_at;
  const isCompleted = !!progress?.completed_at;

  // marca início automaticamente quando aluno entra na página de um módulo disponível
  useEffect(() => {
    if (!user || !moduleRow || isStarted) return;
    const available =
      moduleRow.published &&
      (!moduleRow.available_from || new Date(moduleRow.available_from).getTime() <= Date.now());
    if (!available) return;
    void supabase
      .from("student_module_progress")
      .upsert(
        { user_id: user.id, module_id: moduleRow.id, started_at: new Date().toISOString() },
        { onConflict: "user_id,module_id", ignoreDuplicates: false },
      )
      .then(({ error }) => {
        if (!error) queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
      });
  }, [user, moduleRow, isStarted, queryClient]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!user || !moduleRow) throw new Error("sem contexto");
      const now = new Date().toISOString();
      const { error } = await supabase.from("student_module_progress").upsert(
        {
          user_id: user.id,
          module_id: moduleRow.id,
          started_at: progress?.started_at ?? now,
          completed_at: now,
        },
        { onConflict: "user_id,module_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      const next = snapshot?.modules.find((m) => m.number === moduleNumber + 1) ?? null;
      const nextWasLocked =
        next && snapshot?.sequentialUnlock && !snapshot?.unlockedModuleIds.has(next.id);
      if (nextWasLocked) {
        toast.success(`módulo ${String(next!.number).padStart(2, "0")} desbloqueado.`);
      } else {
        toast.success("módulo concluído. bom demais.");
      }
      queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "deu ruim ao concluir"),
  });

  const completedPillIds = snapshot?.completedPillIds ?? new Set<string>();

  const togglePillMutation = useMutation({
    mutationFn: async (pill: Pill) => {
      if (!user) throw new Error("sem contexto");
      const isDone = completedPillIds.has(pill.id);
      if (isDone) {
        const { error } = await supabase
          .from("student_pill_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("pill_id", pill.id);
        if (error) throw error;
        return { wasDone: true };
      }
      const { error } = await supabase.from("student_pill_progress").upsert(
        {
          user_id: user.id,
          pill_id: pill.id,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,pill_id" },
      );
      if (error) throw error;
      return { wasDone: false };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
      // checa se todas as required do módulo agora estão feitas → auto-complete
      if (!user || !moduleRow || isCompleted || !pills) return;
      const required = pills.filter((p) => p.required);
      const fresh = await supabase
        .from("student_pill_progress")
        .select("pill_id")
        .eq("user_id", user.id)
        .in(
          "pill_id",
          required.map((p) => p.id),
        );
      const doneCount = fresh.data?.length ?? 0;
      if (required.length > 0 && doneCount >= required.length) {
        const now = new Date().toISOString();
        await supabase.from("student_module_progress").upsert(
          {
            user_id: user.id,
            module_id: moduleRow.id,
            started_at: progress?.started_at ?? now,
            completed_at: now,
          },
          { onConflict: "user_id,module_id" },
        );
        const next = snapshot?.modules.find((m) => m.number === moduleNumber + 1) ?? null;
        const nextWasLocked =
          next && snapshot?.sequentialUnlock && !snapshot?.unlockedModuleIds.has(next.id);
        if (nextWasLocked) {
          toast.success(`rodou todas as pílulas. módulo ${String(next!.number).padStart(2, "0")} desbloqueado.`);
        } else {
          toast.success("rodou todas as pílulas. módulo concluído.");
        }
        queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
      }
    },
    onError: (e: Error) => toast.error(e.message ?? "deu ruim ao salvar"),
  });

  // estados
  if (!number || Number.isNaN(moduleNumber) || moduleNumber < 1 || moduleNumber > 20) {
    return <Navigate to="/app" replace />;
  }

  if (snapLoading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="motion-safe:animate-pulse">
          <LagrimaGradient size={56} />
          <span className="sr-only">carregando módulo</span>
        </div>
      </div>
    );
  }

  if (!moduleRow) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" />
        <main className="container max-w-2xl pt-10 pb-20 text-center">
          <h1 className="font-display uppercase text-4xl mb-3">módulo não encontrado</h1>
          <p className="font-body text-perestroika-preto/70 mb-6">
            esse módulo ainda não foi liberado pela escola sebrae ou o número tá errado.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide"
          >
            <ArrowLeft className="h-4 w-4" /> voltar pro início
          </Link>
        </main>
      </div>
    );
  }

  const prevModule = snapshot?.modules.find((m) => m.number === moduleNumber - 1) ?? null;
  const nextModule = snapshot?.modules.find((m) => m.number === moduleNumber + 1) ?? null;

  // bloqueio sequencial: módulo publicado mas anterior ainda não concluído.
  // admin sempre passa (precisa preview). flag `eletiva_sequential_unlock = false` desliga.
  const isUnlocked = isAdmin || (snapshot?.unlockedModuleIds.has(moduleRow.id) ?? false);
  if (!isUnlocked) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" />
        <main className="container max-w-2xl pt-10 pb-20 text-center">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-3">
            módulo {String(moduleRow.number).padStart(2, "0")}
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl mb-3 leading-[0.95]">
            esse módulo abre quando você fechar o anterior
          </h1>
          <p className="font-body text-perestroika-preto/70 mb-7 max-w-md mx-auto">
            a eletiva é em escada. termina o módulo {String(moduleNumber - 1).padStart(2, "0")} e esse aqui libera na hora.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {prevModule && (
              <Link
                to={`/app/modulo/${prevModule.number}`}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
              >
                <ArrowLeft className="h-4 w-4" /> ir pro módulo {String(prevModule.number).padStart(2, "0")}
              </Link>
            )}
            <Link
              to="/app/trilhas"
              className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-6 py-3 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
            >
              ver mapa completo
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <EstrelaPerestroika
          size={320}
          color="rosa"
          className="absolute -right-32 -top-20 opacity-15 motion-safe:animate-spin-slow"
        />
      </div>

      <PageHeader
        showLogo
        logoLink="/app"
        actions={
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="icon-btn"
            aria-label="voltar pro início"
            title="voltar pro início"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
      />

      <main id="conteudo" className="relative z-10 container max-w-3xl pt-6 pb-16 sm:pt-10">
        {/* breadcrumb */}
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/60 hover:text-perestroika-preto mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> meu início
        </Link>

        {/* hero */}
        <section
          aria-label="cabeçalho do módulo"
          className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-6 sm:p-8 mb-8"
        >
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: trailColor }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 inline-flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: trailColor }}
                aria-hidden="true"
              />
              {trail?.title?.toLowerCase() ?? "trilha"}
            </p>
            <span className="font-body text-xs sm:text-sm text-perestroika-preto/60 whitespace-nowrap">
              módulo {String(moduleRow.number).padStart(2, "0")}/20
            </span>
          </div>

          <h1 className="font-display uppercase text-4xl sm:text-5xl mb-3 leading-[0.95]">
            {moduleRow.title}
          </h1>

          {moduleRow.objective && (
            <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-2xl mb-5">
              {moduleRow.objective}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-body text-sm text-perestroika-preto/70">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {moduleRow.total_minutes ?? 50} min
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 text-perestroika-preto">
                <CheckCircle2 className="h-3.5 w-3.5" /> concluído
              </span>
            )}
          </div>
        </section>

        {/* pílulas */}
        <section aria-label="pílulas do módulo" className="space-y-4 mb-10">
          <h2 className="font-display uppercase text-2xl mb-2">pílulas</h2>

          {pillsLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] motion-safe:animate-pulse"
                />
              ))}
            </div>
          )}

          {!pillsLoading && (pills?.length ?? 0) === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/20 p-6 text-center">
              <p className="font-body text-sm text-perestroika-preto/60">
                as pílulas desse módulo ainda estão sendo preparadas. volta em breve.
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

              <h3 className={`font-display uppercase text-xl sm:text-2xl mb-2 leading-tight ${pillDone ? "line-through decoration-perestroika-preto/40 decoration-2" : ""}`}>
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
                {pill.kind === "exercicio_pbl" && trail && (
                  <button
                    type="button"
                    onClick={() => setTutorOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:scale-105 active:scale-95 transition-transform"
                    style={{ backgroundColor: trailColor }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> conversar com tutor
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => togglePillMutation.mutate(pill)}
                  disabled={togglePillMutation.isPending}
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

        {/* ação de conclusão */}
        <section
          aria-label="finalizar módulo"
          className="rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-6 sm:p-8 mb-8"
        >
          <h2 className="font-display uppercase text-2xl sm:text-3xl mb-2 leading-tight">
            {isCompleted ? "esse módulo já é seu" : "fechou o módulo?"}
          </h2>
          <p className="font-body text-sm text-perestroika-bege/75 mb-5 max-w-lg">
            {isCompleted
              ? "se quiser revisar, fica à vontade. seguimos pro próximo quando der."
              : "marca como concluído quando rodar todas as pílulas. sem pressa, sem cobrança."}
          </p>
          <div className="flex flex-wrap gap-3">
            {!isCompleted && (
              <button
                type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-105 active:scale-95 disabled:opacity-50 transition-transform"
              >
                <CheckCircle2 className="h-4 w-4" />
                {completeMutation.isPending ? "salvando..." : "marcar como concluído"}
              </button>
            )}
            {nextModule && (
              <Link
                to={`/app/modulo/${nextModule.number}`}
                className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-bege/40 px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:bg-perestroika-bege hover:text-perestroika-preto transition-colors"
              >
                próximo módulo <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {/* navegação entre módulos */}
        <nav aria-label="navegação entre módulos" className="flex justify-between gap-3">
          {prevModule ? (
            <Link
              to={`/app/modulo/${prevModule.number}`}
              className="group flex-1 max-w-[48%] rounded-2xl border border-perestroika-preto/15 p-4 hover:border-perestroika-preto transition-colors"
            >
              <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> módulo {String(prevModule.number).padStart(2, "0")}
              </p>
              <p className="font-body text-sm text-perestroika-preto/85 line-clamp-2">
                {prevModule.title}
              </p>
            </Link>
          ) : (
            <span className="flex-1 max-w-[48%]" />
          )}
          {nextModule ? (
            <Link
              to={`/app/modulo/${nextModule.number}`}
              className="group flex-1 max-w-[48%] text-right rounded-2xl border border-perestroika-preto/15 p-4 hover:border-perestroika-preto transition-colors"
            >
              <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1 inline-flex items-center gap-1">
                módulo {String(nextModule.number).padStart(2, "0")} <ArrowRight className="h-3 w-3" />
              </p>
              <p className="font-body text-sm text-perestroika-preto/85 line-clamp-2">
                {nextModule.title}
              </p>
            </Link>
          ) : (
            <span className="flex-1 max-w-[48%]" />
          )}
        </nav>
      </main>

      {trail && (
        <TutorChat
          open={tutorOpen}
          onOpenChange={setTutorOpen}
          trailId={trail.id}
          trailTitle={trail.title}
          trailColor={trailColor}
        />
      )}

      <EletivaFooter />
    </div>
  );
};

export default Modulo;
