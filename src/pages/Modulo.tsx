import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { TutorChat } from "@/components/eletiva/TutorChat";
import { ModuloHeader } from "@/components/eletiva/modulo/ModuloHeader";
import { ModuloPillList, type ModuloPill } from "@/components/eletiva/modulo/ModuloPillList";
import { ModuloFooter } from "@/components/eletiva/modulo/ModuloFooter";
import { ModuloProgressBar } from "@/components/eletiva/modulo/ModuloProgressBar";
import { ModuloFeedbackCard } from "@/components/eletiva/modulo/ModuloFeedbackCard";
import { ModuloLockedHero } from "@/components/eletiva/modulo/ModuloLockedHero";
import { DeliverableStatusPill } from "@/components/eletiva/modulo/DeliverableStatusPill";
import { TrailTransitionBanner } from "@/components/eletiva/modulo/TrailTransitionBanner";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
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
  const [tutorPillContext, setTutorPillContext] = useState<{
    pillTitle: string;
    pillPrompt: string;
  } | null>(null);

  const moduleRow = useMemo(
    () => snapshot?.modules.find((m) => m.number === moduleNumber) ?? null,
    [snapshot, moduleNumber],
  );
  const trail = useMemo(
    () => snapshot?.trails.find((t) => t.id === moduleRow?.trail_id) ?? null,
    [snapshot, moduleRow],
  );
  const trailColor = trailColorByOrder[trail?.order_index ?? 1] ?? trail?.color ?? "#fe7b02";

  const { data: pills, isLoading: pillsLoading } = useQuery({
    queryKey: ["module-pills", moduleRow?.id],
    enabled: !!moduleRow?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("*")
        .eq("module_id", moduleRow!.id)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as ModuloPill[];
    },
  });

  const progress = moduleRow ? snapshot?.progressByModuleId[moduleRow.id] : undefined;
  const isStarted = !!progress?.started_at;
  const isCompleted = !!progress?.completed_at;

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

  const submitDeliverableIfExists = async () => {
    if (!user || !moduleRow) return;
    // se existe deliverable em rascunho/enviado, marca submitted_at
    await supabase
      .from("module_deliverables")
      .update({ status: "enviado", submitted_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("module_id", moduleRow.id)
      .is("reviewed_at", null);
  };

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
      await submitDeliverableIfExists();
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
    mutationFn: async (pill: ModuloPill) => {
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
        { user_id: user.id, pill_id: pill.id, completed_at: new Date().toISOString() },
        { onConflict: "user_id,pill_id" },
      );
      if (error) throw error;
      return { wasDone: false };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
      if (!user || !moduleRow || isCompleted || !pills) return;
      const required = pills.filter((p) => p.required);
      const fresh = await supabase
        .from("student_pill_progress")
        .select("pill_id")
        .eq("user_id", user.id)
        .in("pill_id", required.map((p) => p.id));
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
        await submitDeliverableIfExists();
        const next = snapshot?.modules.find((m) => m.number === moduleNumber + 1) ?? null;
        const nextWasLocked =
          next && snapshot?.sequentialUnlock && !snapshot?.unlockedModuleIds.has(next.id);
        toast.success(
          nextWasLocked
            ? `rodou todas as pílulas. módulo ${String(next!.number).padStart(2, "0")} desbloqueado.`
            : "rodou todas as pílulas. módulo concluído.",
        );
        queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
      }
    },
    onError: (e: Error) => toast.error(e.message ?? "deu ruim ao salvar"),
  });

  if (!number || Number.isNaN(moduleNumber) || moduleNumber < 1) {
    return <Navigate to="/app" replace />;
  }

  if (snapLoading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse">
            <EletivaSymbol size={72} pose="building" />
          </div>
          <p className="font-body text-xs text-perestroika-preto/55">amassando mais um tijolinho...</p>
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
            esse módulo ainda não foi liberado pela escola sebrae ou o número está errado.
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
  const totalModules = snapshot?.modules.length ?? 20;

  const isUnlocked = isAdmin || (snapshot?.unlockedModuleIds.has(moduleRow.id) ?? false);
  if (!isUnlocked) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" />
        <ModuloLockedHero
          moduleNumber={moduleRow.number}
          prevModuleNumber={prevModule?.number ?? null}
          prevModuleTitle={prevModule?.title ?? null}
          availableFrom={moduleRow.available_from}
        />
      </div>
    );
  }

  const totalPills = pills?.length ?? 0;
  const donePills = pills?.filter((p) => completedPillIds.has(p.id)).length ?? 0;

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      <ModuloProgressBar
        total={totalPills}
        done={donePills}
        trailColor={trailColor}
        moduleNumber={moduleRow.number}
        moduleTitle={moduleRow.title}
      />
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
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-wider text-perestroika-preto/60 hover:text-perestroika-preto mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> meu início
        </Link>

        {/* marco de transição: aparece nos primeiros módulos das trilhas 2/3/4
            (números 6, 11, 16) quando a trilha anterior está completa */}
        {trail && prevModule && (() => {
          const prevTrail = snapshot?.trails.find((t) => t.id === prevModule.trail_id) ?? null;
          const isFirstOfNewTrail =
            prevTrail && prevTrail.id !== trail.id && trail.order_index >= 2;
          if (!isFirstOfNewTrail || !prevTrail) return null;
          const prevTrailDone = snapshot?.modules
            .filter((m) => m.trail_id === prevTrail.id)
            .every((m) => snapshot?.progressByModuleId[m.id]?.completed_at);
          if (!prevTrailDone) return null;
          return (
            <TrailTransitionBanner
              fromTrailTitle={prevTrail.title}
              toTrailTitle={trail.title}
              toTrailIndex={trail.order_index}
              storageKey={`trail-transition-${trail.id}`}
              trailColor={trailColor}
            />
          );
        })()}

        <DeliverableStatusPill moduleId={moduleRow.id} />

        <ModuloFeedbackCard moduleId={moduleRow.id} trailColor={trailColor} />

        <ModuloHeader
          trailTitle={trail?.title ?? null}
          trailColor={trailColor}
          moduleNumber={moduleRow.number}
          totalModules={totalModules}
          title={moduleRow.title}
          objective={moduleRow.objective}
          totalMinutes={moduleRow.total_minutes}
          isCompleted={isCompleted}
        />

        <ModuloPillList
          pills={pills}
          loading={pillsLoading}
          completedPillIds={completedPillIds}
          trailColor={trailColor}
          hasTrail={!!trail}
          moduleId={moduleRow.id}
          onTogglePill={(p) => togglePillMutation.mutate(p)}
          togglePending={togglePillMutation.isPending}
          onOpenTutor={(pill) => {
            if (pill?.interaction_schema?.tutor_prompt) {
              setTutorPillContext({
                pillTitle: pill.title,
                pillPrompt: pill.interaction_schema.tutor_prompt,
              });
            } else {
              setTutorPillContext(pill ? { pillTitle: pill.title, pillPrompt: pill.body_md ?? "" } : null);
            }
            setTutorOpen(true);
          }}
        />

        <ModuloFooter
          isCompleted={isCompleted}
          onComplete={() => completeMutation.mutate()}
          completePending={completeMutation.isPending}
          prevModule={prevModule}
          nextModule={nextModule}
        />
      </main>

      {trail && (
        <TutorChat
          open={tutorOpen}
          onOpenChange={(o) => {
            setTutorOpen(o);
            if (!o) setTutorPillContext(null);
          }}
          trailId={trail.id}
          trailTitle={trail.title}
          trailColor={trailColor}
          pillContext={tutorPillContext}
          moduleId={moduleRow.id}
        />
      )}

      <EletivaFooter />
    </div>
  );
};

export default Modulo;
