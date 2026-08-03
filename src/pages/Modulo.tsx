import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { logAdminModuleView } from "@/hooks/useAdminAuditLog";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { useCourseBySlug } from "@/hooks/useCourses";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { MobileNav } from "@/components/layout/MobileNav";
import { ModuloSkeleton } from "@/components/eletiva/modulo/ModuloSkeleton";
import { TutorChat } from "@/components/eletiva/TutorChat";
import { ModuloHeader } from "@/components/eletiva/modulo/ModuloHeader";
import { ModuloPillList, type ModuloPill } from "@/components/eletiva/modulo/ModuloPillList";
import { ModuloCelebration } from "@/components/eletiva/modulo/ModuloCelebration";
import { ModuloConclusaoClassificador } from "@/components/eletiva/modulo/ModuloConclusaoClassificador";
import { ModuloConclusaoMapaAtores } from "@/components/eletiva/modulo/ModuloConclusaoMapaAtores";
import { ModuloConclusaoEvidencias } from "@/components/eletiva/modulo/ModuloConclusaoEvidencias";
import { ModuloConclusaoBriefing } from "@/components/eletiva/modulo/ModuloConclusaoBriefing";
import { ModuloConclusaoMapaFluxo } from "@/components/eletiva/modulo/ModuloConclusaoMapaFluxo";
import { ModuloConclusaoMatrizValor } from "@/components/eletiva/modulo/ModuloConclusaoMatrizValor";
import { ModuloConclusaoRegrasJogo } from "@/components/eletiva/modulo/ModuloConclusaoRegrasJogo";
import { ModuloConclusaoImpactos } from "@/components/eletiva/modulo/ModuloConclusaoImpactos";
import { ModuloConclusaoStakeholders } from "@/components/eletiva/modulo/ModuloConclusaoStakeholders";
import { ModuloConclusaoSprintIdeacao } from "@/components/eletiva/modulo/ModuloConclusaoSprintIdeacao";
import { ModuloConclusaoSelecaoIdeia } from "@/components/eletiva/modulo/ModuloConclusaoSelecaoIdeia";
import { ModuloConclusaoPropostaValor } from "@/components/eletiva/modulo/ModuloConclusaoPropostaValor";
import { ModuloConclusaoBMC } from "@/components/eletiva/modulo/ModuloConclusaoBMC";
import { ModuloConclusaoSuposicoesRiscos } from "@/components/eletiva/modulo/ModuloConclusaoSuposicoesRiscos";
import { ModuloConclusaoPlanoExperimento } from "@/components/eletiva/modulo/ModuloConclusaoPlanoExperimento";
import { ModuloConclusaoRegistroResultado } from "@/components/eletiva/modulo/ModuloConclusaoRegistroResultado";
import { ModuloConclusaoChangelogV2 } from "@/components/eletiva/modulo/ModuloConclusaoChangelogV2";
import { ModuloAutoCompleteBurst } from "@/components/eletiva/modulo/ModuloAutoCompleteBurst";

import { ModuloFooter } from "@/components/eletiva/modulo/ModuloFooter";
import { FloatingSumario } from "@/components/eletiva/modulo/FloatingSumario";
import { ModuloProgressBar } from "@/components/eletiva/modulo/ModuloProgressBar";
import { ModuloFeedbackCard } from "@/components/eletiva/modulo/ModuloFeedbackCard";
import { ModuloLockedHero } from "@/components/eletiva/modulo/ModuloLockedHero";
import { DeliverableStatusPill } from "@/components/eletiva/modulo/DeliverableStatusPill";
import { TrailTransitionBanner } from "@/components/eletiva/modulo/TrailTransitionBanner";
import { scopeModuleNavigation } from "@/lib/moduleNavigation";
import { resolvePill } from "@/features/admin/deliverableRendering/resolvers";
import { hasDeliverableAnswers } from "@/lib/deliverableContent";
import type {
  DeliverableContent,
  PillKind,
} from "@/features/admin/deliverableRendering/types";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02", // fundamentos & ia — laranja
  2: "#fd4644", // problema & decisão — vermelho
  3: "#f756a6", // construção no lovable — rosa
  4: "#8A85BF", // validação & evolução — lilás
};

const Modulo = () => {
  const { number, slug: slugParam } = useParams<{ number: string; slug?: string }>();
  const moduleNumber = Number(number);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug: activeSlug, setSlug } = useActiveEletiva();
  // slug da URL ganha de localStorage. mantém os dois sincronizados.
  const effectiveSlug = slugParam ?? activeSlug ?? undefined;
  useEffect(() => {
    if (slugParam && slugParam !== activeSlug) setSlug(slugParam);
  }, [slugParam, activeSlug, setSlug]);
  const { data: activeCourse } = useCourseBySlug(effectiveSlug);
  const { data: snapshot, isLoading: snapLoading } = useEletivaProgress(activeCourse?.id ?? null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorPillContext, setTutorPillContext] = useState<{
    pillTitle: string;
    pillPrompt: string;
  } | null>(null);
  const [burst, setBurst] = useState<{ open: boolean; nextUnlocked: boolean }>({
    open: false,
    nextUnlocked: false,
  });

  const moduleRow = useMemo(
    () => snapshot?.modules.find((m) => m.number === moduleNumber) ?? null,
    [snapshot, moduleNumber],
  );
  const trail = useMemo(
    () => snapshot?.trails.find((t) => t.id === moduleRow?.trail_id) ?? null,
    [snapshot, moduleRow],
  );

  // log de auditoria: admin abriu este módulo (throttle de 2min server-side)
  useEffect(() => {
    if (isAdmin && moduleRow?.id) {
      logAdminModuleView(moduleRow.id);
    }
  }, [isAdmin, moduleRow?.id]);
  const trailColor =
    trail?.color ?? trailColorByOrder[trail?.order_index ?? 1] ?? "#fe7b02";

  // slug do curso (pra navegar pro marco entre trilhas + CTAs escopadas)
  const courseSlug = activeCourse?.slug ?? slugParam ?? null;

  // detecta se um módulo é o último da sua trilha e devolve order_index da trilha
  const trailFinishedOrder = (justCompletedModuleId: string): number | null => {
    if (!snapshot) return null;
    const m = snapshot.modules.find((x) => x.id === justCompletedModuleId);
    if (!m) return null;
    const trailModules = snapshot.modules
      .filter((x) => x.trail_id === m.trail_id)
      .sort((a, b) => a.number - b.number);
    const last = trailModules[trailModules.length - 1];
    if (last?.id !== m.id) return null;
    const t = snapshot.trails.find((tr) => tr.id === m.trail_id);
    return t?.order_index ?? null;
  };

  const goToMarcoIfTrailFinished = () => {
    if (!moduleRow || !courseSlug) return false;
    const order = trailFinishedOrder(moduleRow.id);
    if (!order) return false;
    navigate(`/app/eletiva/${courseSlug}/marco/${order}`);
    return true;
  };

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

  // conteúdo do deliverable (rascunho) — usado pra detectar quando todas as
  // pílulas obrigatórias já têm resposta válida, mesmo que o estudante não
  // tenha clicado "feito" em cada uma. evita travar o "concluir módulo".
  const { data: deliverableContent } = useQuery({
    queryKey: ["module-deliverable-content", moduleRow?.id, user?.id],
    enabled: !!user && !!moduleRow && !isCompleted,
    // o autosave grava direto sem invalidar essa query, então repolingamos a
    // cada 6s pra liberar "concluir módulo" assim que o conteúdo ficar
    // completo, mesmo sem o estudante clicar "feito" em cada pílula.
    refetchInterval: 6_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("user_id", user!.id)
        .eq("module_id", moduleRow!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.content ?? {}) as DeliverableContent;
    },
  });

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
      // defesa em profundidade: estudante só fecha o módulo se as obrigatórias estão concluídas.
      // admin ignora (precisa pra revisar conteúdo sem ter feito tudo).
      const required = (pills ?? []).filter((p) => p.required);
      const doneRequired = required.filter((p) => completedPillIds.has(p.id));
      if (!isAdmin && required.length > 0 && doneRequired.length < required.length) {
        // antes de barrar, tenta auto-marcar pílulas cujo conteúdo já está completo
        // (autosave salvou tudo mas o estudante esqueceu de bater "feito").
        const { data: deliv } = await supabase
          .from("module_deliverables")
          .select("content")
          .eq("user_id", user.id)
          .eq("module_id", moduleRow.id)
          .maybeSingle();
        const content = (deliv?.content ?? {}) as DeliverableContent;
        const missing = required.filter((p) => !completedPillIds.has(p.id));
        const auto: string[] = [];
        for (const p of missing) {
          const resolved = resolvePill(
            {
              id: p.id,
              module_id: moduleRow.id,
              order_index: p.order_index,
              kind: p.kind as PillKind,
              title: p.title,
              body_md: p.body_md,
              required: !!p.required,
              interaction_schema: (p.interaction_schema ?? null) as Record<string, unknown> | null,
            },
            content,
          );
          if (resolved.state === "respondida" || resolved.state === "passiva") {
            auto.push(p.id);
          }
        }
        if (auto.length > 0) {
          const nowIso = new Date().toISOString();
          const rows = auto.map((pid) => ({
            user_id: user.id,
            pill_id: pid,
            completed_at: nowIso,
          }));
          const { error: upErr } = await supabase
            .from("student_pill_progress")
            .upsert(rows, { onConflict: "user_id,pill_id" });
          if (upErr) throw upErr;
        }
        if (auto.length + doneRequired.length < required.length) {
          throw new Error("termine as pílulas obrigatórias primeiro");
        }
      }
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
        toast.success(`módulo ${String(next!.number).padStart(2, "0")} liberado. quando quiser`);
      } else {
        toast.success("fechou esse. próximo te espera");
      }
      queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
      // signature moment: se acabou a última da trilha, abre a tela de marco
      setTimeout(() => { goToMarcoIfTrailFinished(); }, 250);
    },
    onError: (e: Error) => toast.error(e.message ?? "deu ruim ao concluir"),
  });

  const completedPillIds = snapshot?.completedPillIds ?? new Set<string>();

  // liberação progressiva: a pílula N só abre quando todas as anteriores obrigatórias
  // (`required=true`, ordenadas por `order_index`) estiverem concluídas. opcionais
  // não bloqueiam. admin ignora a trava pra conseguir testar fora de ordem.
  const sortedPills = useMemo(
    () => (pills ? [...pills].sort((a, b) => a.order_index - b.order_index) : []),
    [pills],
  );
  const unlockedPillIds = useMemo(() => {
    const set = new Set<string>();
    if (isAdmin) {
      sortedPills.forEach((p) => set.add(p.id));
      return set;
    }
    let blocked = false;
    for (const p of sortedPills) {
      if (!blocked) {
        set.add(p.id);
        if (p.required && !completedPillIds.has(p.id)) blocked = true;
      }
    }
    return set;
  }, [sortedPills, completedPillIds, isAdmin]);

  const progressQueryKey = ["eletiva-progress", user?.id ?? "anon", activeCourse?.id ?? "all"];

  const togglePillMutation = useMutation({
    mutationFn: async (pill: ModuloPill) => {
      if (!user) throw new Error("sem contexto");
      if (!unlockedPillIds.has(pill.id)) {
        throw new Error("termine a pílula anterior pra abrir essa");
      }
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
    // atualização otimista: a próxima pílula desbloqueia no mesmo frame do clique,
    // sem esperar o refetch. se a chamada falhar, reverte. invalidate confirma depois.
    onMutate: async (pill: ModuloPill) => {
      await queryClient.cancelQueries({ queryKey: progressQueryKey });
      const previous = queryClient.getQueryData(progressQueryKey);
      queryClient.setQueryData(progressQueryKey, (old: typeof snapshot | undefined) => {
        if (!old) return old;
        const nextSet = new Set(old.completedPillIds);
        if (nextSet.has(pill.id)) nextSet.delete(pill.id);
        else nextSet.add(pill.id);
        return { ...old, completedPillIds: nextSet };
      });
      return { previous };
    },
    onError: (e: Error, _pill, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(progressQueryKey, ctx.previous);
      }
      toast.error(e.message ?? "deu ruim ao salvar");
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
        // o módulo tem registro/exercício obrigatório? então a entrega precisa
        // ter conteúdo antes de fechar. sem isso, o estudante avançava com o
        // rascunho parado e a entrega nunca chegava na fila do educador.
        const needsWritten = required.some(
          (p) => p.kind === "registro" || p.kind === "exercicio_pbl",
        );
        const { data: deliv } = await supabase
          .from("module_deliverables")
          .select("content")
          .eq("user_id", user.id)
          .eq("module_id", moduleRow.id)
          .maybeSingle();
        const filled = hasDeliverableAnswers(deliv?.content ?? null);

        if (needsWritten && !filled && !isAdmin) {
          toast.info("falta o seu registro. escreve sua resposta pra fechar o módulo");
          return;
        }

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
        // entrega com conteúdo vai junto: fechar o módulo é o mesmo gesto de
        // entregar. rascunho vazio continua rascunho.
        if (filled) await submitDeliverableIfExists();
        const next = snapshot?.modules.find((m) => m.number === moduleNumber + 1) ?? null;
        const nextWasLocked =
          next && snapshot?.sequentialUnlock && !snapshot?.unlockedModuleIds.has(next.id);
        setBurst({ open: true, nextUnlocked: !!nextWasLocked });
        queryClient.invalidateQueries({ queryKey: ["eletiva-progress"] });
        setTimeout(() => { goToMarcoIfTrailFinished(); }, 250);
      }
    },
  });

  if (!number || Number.isNaN(moduleNumber) || moduleNumber < 1) {
    return <Navigate to="/app" replace />;
  }

  if (snapLoading) {
    return <ModuloSkeleton />;
  }

  if (!moduleRow) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" />
        <main className="container max-w-2xl pt-10 pb-20 text-center">
          <h1 className="font-display uppercase text-4xl mb-3">módulo não encontrado</h1>
          <p className="font-body text-perestroika-preto/70 mb-6">
            esse módulo ainda não rolou ou o número não bate.
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

  // escopa prev/next/total pelos módulos da MESMA eletiva (mesmo course_id da trilha atual).
  // ver src/lib/moduleNavigation.ts — contrato testado em moduleNavigation.test.ts.
  const { prevModule, nextModule, totalModules } = scopeModuleNavigation({
    trails: snapshot?.trails ?? [],
    modules: snapshot?.modules ?? [],
    currentTrail: trail,
    moduleNumber,
  });

  const isUnlocked = isAdmin || (snapshot?.unlockedModuleIds.has(moduleRow.id) ?? false);
  if (!isUnlocked) {
    return (
      <div
        data-eletiva={courseSlug === "economia-circular" ? "ecc" : undefined}
        className="relative min-h-dvh bg-background text-foreground font-body [overflow-x:clip]"
      >
        <PageHeader showLogo logoLink="/app" />
        <ModuloLockedHero
          moduleNumber={moduleRow.number}
          prevModuleNumber={prevModule?.number ?? null}
          prevModuleTitle={prevModule?.title ?? null}
          availableFrom={moduleRow.available_from}
          courseSlug={courseSlug}
        />
        <MobileNav />
        <footer
          className="relative z-10 container max-w-3xl pb-10"
          style={{ marginBottom: "var(--mobile-nav-h, 0px)" }}
        >
          <EletivaFooter tone="dark" />
        </footer>
      </div>
    );
  }

  const totalPills = pills?.length ?? 0;
  const donePills = pills?.filter((p) => completedPillIds.has(p.id)).length ?? 0;
  const requiredPills = pills?.filter((p) => p.required) ?? [];
  const doneRequired = requiredPills.filter((p) => completedPillIds.has(p.id)).length;
  // pílulas obrigatórias com conteúdo aceito pelos resolvers, mesmo sem
  // o clique manual em "feito". serve pra desbloquear "concluir módulo".
  const contentAutoComplete = requiredPills.filter((p) => {
    if (completedPillIds.has(p.id)) return false;
    const resolved = resolvePill(
      {
        id: p.id,
        module_id: moduleRow.id,
        order_index: p.order_index,
        kind: p.kind as PillKind,
        title: p.title,
        body_md: p.body_md,
        required: !!p.required,
        interaction_schema: (p.interaction_schema ?? null) as Record<string, unknown> | null,
      },
      deliverableContent ?? {},
    );
    return resolved.state === "respondida" || resolved.state === "passiva";
  }).length;
  const effectiveDoneRequired = doneRequired + contentAutoComplete;
  const pillsRemaining = Math.max(0, requiredPills.length - effectiveDoneRequired);
  const canCompleteModule = requiredPills.length > 0 && pillsRemaining === 0;

  return (
    <div
      data-eletiva={courseSlug === "economia-circular" ? "ecc" : undefined}
      className="relative min-h-dvh bg-background text-foreground font-body [overflow-x:clip]"
    >
      <ModuloProgressBar
        total={requiredPills.length > 0 ? requiredPills.length : totalPills}
        done={requiredPills.length > 0 ? doneRequired : donePills}
        trailColor={trailColor}
        moduleNumber={moduleRow.number}
        moduleTitle={moduleRow.title}
      />
      <PageHeader
        showLogo
        logoLink="/app"
        back={{ to: courseSlug ? `/app/eletiva/${courseSlug}` : "/app", label: "voltar" }}
        actions={<AuthedHeaderActions />}
      />

      <main id="conteudo" className="relative z-10 container max-w-3xl pt-6 pb-16 sm:pt-10">

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

        <ModuloFeedbackCard moduleId={moduleRow.id} trailColor={trailColor} />

        <ModuloHeader
          courseTitle={activeCourse?.title ?? null}
          trailTitle={trail?.title ?? null}
          trailColor={trailColor}
          moduleNumber={moduleRow.number}
          totalModules={totalModules}
          title={moduleRow.title}
          objective={moduleRow.objective}
          totalMinutes={moduleRow.total_minutes}
          isCompleted={isCompleted}
          totalPills={totalPills}
          donePills={donePills}
        />

        {isCompleted && (
          <ModuloCelebration
            moduleNumber={moduleRow.number}
            courseSlug={courseSlug ?? null}
            moduleId={moduleRow.id}
            trailColor={trailColor}
            nextHint={
              nextModule
                ? "obrigado por entregar com presença. o próximo módulo já tá aí, é só seguir."
                : "obrigado por entregar com presença. próximo módulo libera em breve."
            }
          />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 2 && (
          <ModuloConclusaoClassificador moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 3 && (
          <ModuloConclusaoMapaAtores moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 4 && (
          <ModuloConclusaoEvidencias moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 5 && (
          <ModuloConclusaoBriefing moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 6 && (
          <ModuloConclusaoMapaFluxo moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 7 && (
          <ModuloConclusaoMatrizValor moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 8 && (
          <ModuloConclusaoRegrasJogo moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 9 && (
          <ModuloConclusaoImpactos moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 10 && (
          <ModuloConclusaoStakeholders moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 11 && (
          <ModuloConclusaoSprintIdeacao moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 12 && (
          <ModuloConclusaoSelecaoIdeia moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 13 && (
          <ModuloConclusaoPropostaValor moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 14 && (
          <ModuloConclusaoBMC moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 15 && (
          <ModuloConclusaoSuposicoesRiscos moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 16 && (
          <ModuloConclusaoPlanoExperimento moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 17 && (
          <ModuloConclusaoRegistroResultado moduleId={moduleRow.id} />
        )}

        {isCompleted && courseSlug === "economia-circular" && moduleRow.number === 18 && (
          <ModuloConclusaoChangelogV2 moduleId={moduleRow.id} />
        )}






        <ModuloPillList
          pills={pills}
          loading={pillsLoading}
          completedPillIds={completedPillIds}
          unlockedPillIds={unlockedPillIds}

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
          courseSlug={courseSlug}
          canComplete={canCompleteModule}
          pillsRemaining={pillsRemaining}
          isAdmin={isAdmin}
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

      {!isCompleted && pills && pills.length > 0 && (
        <FloatingSumario
          pills={pills}
          completedPillIds={completedPillIds}
          unlockedPillIds={unlockedPillIds}
          trailColor={trailColor}
        />
      )}

      <ModuloAutoCompleteBurst
        open={burst.open}
        nextUnlocked={burst.nextUnlocked}
        onDone={() => setBurst({ open: false, nextUnlocked: false })}
      />
    </div>
  );
};

export default Modulo;
