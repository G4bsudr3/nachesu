import { Suspense, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, EyeOff, FileWarning, Clock, User2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseBySlug } from "@/hooks/useCourses";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExercicioTabContent } from "@/features/admin/moduloPanels/ExercicioTabContent";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FeedbackReviewDrawer } from "@/features/admin/FeedbackReviewDrawer";
import type { DeliverableInbox } from "@/features/admin/usePendingDeliverables";
import { computeCompleteness } from "@/features/admin/deliverableRendering/completeness";
import type { PillForResolve, PillKind } from "@/features/admin/deliverableRendering/types";
import { ModuloPillList, type ModuloPill } from "@/components/eletiva/modulo/ModuloPillList";
import { AberturaVideoManager } from "@/features/admin/AberturaVideoManager";
import { getModuloPanel } from "@/features/admin/moduloPanels/registry";
import type { Database } from "@/integrations/supabase/types";

type DeliverableRow = Database["public"]["Tables"]["module_deliverables"]["Row"];

type TrailRow = { id: string; order_index: number; title: string; color: string | null };
type ModuleRow = {
  id: string;
  trail_id: string;
  number: number;
  title: string;
  objective: string | null;
  published: boolean;
  total_minutes: number | null;
};
type PillRow = {
  id: string;
  module_id: string;
  order_index: number;
  kind: string;
  title: string;
  body_md: string | null;
  duration_min_low: number | null;
  duration_min_high: number | null;
  video_url?: string | null;
  attachment_url?: string | null;
  required: boolean | null;
  interaction_schema: Record<string, unknown> | null;
};
type ProfileRow = {
  user_id: string;
  display_name: string | null;
  nickname: string | null;
  is_test: boolean | null;
};

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#8A85BF",
};

const pillKindLabel: Record<string, string> = {
  pilula_a: "pílula a",
  pilula_b: "pílula b",
  pilula_c: "pílula c",
  exercicio_pbl: "exercício pbl",
  registro: "registro",
};

const AdminModuloDetalhe = () => {
  const { slug, number } = useParams<{ slug: string; number: string }>();
  const course = useCourseBySlug(slug);
  const num = number ? parseInt(number, 10) : NaN;
  const ExercicioPanel = getModuloPanel(slug, Number.isNaN(num) ? undefined : num);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-modulo-detalhe", course.data?.id, num],
    enabled: !!course.data?.id && !Number.isNaN(num),
    queryFn: async () => {
      const { data: trails } = await supabase
        .from("trails")
        .select("id, order_index, title, color")
        .eq("course_id", course.data!.id);
      const trailList = (trails ?? []) as TrailRow[];
      const trailIds = trailList.map((t) => t.id);
      if (trailIds.length === 0) return null;
      const { data: mod } = await supabase
        .from("modules")
        .select("id, trail_id, number, title, objective, published, total_minutes")
        .in("trail_id", trailIds)
        .eq("number", num)
        .maybeSingle();
      if (!mod) return null;
      const module = mod as ModuleRow;
      const trail = trailList.find((t) => t.id === module.trail_id) ?? null;

      const [{ data: pills }, { data: enrollments }, { data: delivs }] = await Promise.all([
        supabase.rpc("admin_module_pills", { p_module_id: module.id }),
        supabase
          .from("enrollments")
          .select("user_id, profile:profiles!inner(user_id, display_name, nickname, is_test)")
          .eq("course_id", course.data!.id)
          .eq("status", "active"),
        supabase
          .from("module_deliverables")
          .select("*")
          .eq("module_id", module.id),
      ]);

      const pillList = ((pills ?? []) as PillRow[]).sort(
        (a, b) => a.order_index - b.order_index,
      );

      type EnRow = { user_id: string; profile: ProfileRow };
      const enrolled = ((enrollments ?? []) as unknown as EnRow[]).map((e) => ({
        user_id: e.user_id,
        profile: e.profile,
      }));

      return {
        module,
        trail,
        pills: pillList,
        enrolled,
        delivs: (delivs ?? []) as DeliverableRow[],
      };
    },
  });

  const [selected, setSelected] = useState<DeliverableInbox | null>(null);

  if (course.isLoading || isLoading) {
    return <div className="p-8 text-perestroika-preto/50">carregando…</div>;
  }
  if (!course.data) return <Navigate to="/admin" replace />;
  if (!data) return <div className="p-8">módulo não encontrado.</div>;

  const { module, trail, pills, enrolled, delivs } = data;
  const color = trail ? trailColorByOrder[trail.order_index] ?? trail.color ?? "#090909" : "#090909";

  const pillsForResolve: PillForResolve[] = pills.map((p) => ({
    id: p.id,
    module_id: p.module_id,
    order_index: p.order_index,
    kind: p.kind as PillKind,
    title: p.title,
    body_md: p.body_md,
    required: !!p.required,
    interaction_schema: p.interaction_schema,
  }));

  const delivByUser = new Map<string, DeliverableRow>();
  for (const d of delivs) delivByUser.set(d.user_id, d);

  const missingSchema = pills.filter((p) => !p.interaction_schema);

  // aula (pílula editorial) que ficou sem vídeo: slot vazio esperando o link certo
  const missingVideo = pills.filter((p) => {
    const schema = (p.interaction_schema ?? {}) as Record<string, unknown>;
    if (schema.type !== "pilula_editorial") return false;
    const video = schema.video as { url?: string } | undefined;
    return !video?.url && !p.video_url;
  });

  const wrapDeliverable = (d: DeliverableRow, prof: ProfileRow | null): DeliverableInbox => ({
    ...d,
    module: {
      id: module.id,
      number: module.number,
      title: module.title,
      trail_id: module.trail_id,
    },
    trail: trail ? { id: trail.id, course_id: course.data!.id, title: trail.title } : null,
    course_id: course.data!.id,
    profile: prof
      ? {
          user_id: prof.user_id,
          display_name: prof.display_name,
          nickname: prof.nickname,
          is_test: prof.is_test,
        }
      : null,
    completeness: computeCompleteness(pillsForResolve, d.content as never),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/admin/eletivas" className="hover:text-perestroika-preto">eletivas</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/admin/eletiva/${slug}/modulos`} className="hover:text-perestroika-preto">
          {course.data.title}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">
          módulo {String(module.number).padStart(2, "0")}
        </span>
      </nav>


      <header
        className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5 mb-6 flex flex-wrap items-start gap-4"
        style={{ borderTopColor: color, borderTopWidth: 6 }}
      >
        <span
          className="font-display uppercase text-6xl leading-none tabular-nums"
          style={{ color }}
        >
          {String(module.number).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-[240px]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50 mb-1">
            {trail?.title}
          </p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-1">
            {module.title}
          </h1>
          {module.objective && (
            <p className="text-sm text-perestroika-preto/70">{module.objective}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "uppercase tracking-wide text-[10px]",
                module.published
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800",
              )}
            >
              {module.published ? "publicado" : "despublicado"}
            </Badge>
            <span className="text-[11px] text-perestroika-preto/55 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {module.total_minutes ?? 0} min · {pills.length} pílulas
            </span>
          </div>
        </div>
      </header>

      {!module.published && (
        <div className="rounded-xl bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 mb-4 text-sm flex items-center gap-2">
          <EyeOff className="w-4 h-4" />
          módulo despublicado. só admin enxerga.
        </div>
      )}

      <Tabs defaultValue="conteudo">
        <TabsList className="bg-perestroika-preto/5 mb-6">
          <TabsTrigger value="conteudo" className="uppercase tracking-wide text-xs">
            conteúdo
          </TabsTrigger>
          <TabsTrigger value="abertura" className="uppercase tracking-wide text-xs">
            abertura
          </TabsTrigger>
          <TabsTrigger value="turma" className="uppercase tracking-wide text-xs">
            turma ({enrolled.length})
          </TabsTrigger>
          <TabsTrigger value="exercicio" className="uppercase tracking-wide text-xs">
            painel do exercício
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="space-y-4">
          {missingSchema.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 text-sm flex items-center gap-2">
              <FileWarning className="w-4 h-4" />
              {missingSchema.length} pílula(s) sem interaction_schema. o estudante vê só o body_md nelas.
            </div>
          )}

          {missingVideo.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 text-sm space-y-1">
              <p className="flex items-center gap-2 font-semibold">
                <FileWarning className="w-4 h-4" />
                falta vídeo em {missingVideo.length} aula(s) deste módulo
              </p>
              <p>{missingVideo.map((p) => p.title).join(" · ")}</p>
              <Link
                to="/admin/videos"
                className="underline underline-offset-4 text-[11px] uppercase tracking-wide"
              >
                ver a conferência de vídeos ↗
              </Link>
            </div>
          )}


          {/* reaproveita o dispatcher do estudante: mesmo visual, mesmos componentes
              (PillEditorial, PillPBLEstruturado, PillChecklistPacto, etc.).
              tudo desbloqueado pra admin, sem gate sequencial. */}
          <ModuloPillList
            pills={pills.map<ModuloPill>((p) => ({
              id: p.id,
              module_id: p.module_id,
              order_index: p.order_index,
              kind: p.kind as ModuloPill["kind"],
              title: p.title,
              body_md: p.body_md ?? "",
              duration_min_low: p.duration_min_low,
              duration_min_high: p.duration_min_high,
              video_url: p.video_url ?? null,
              attachment_url: p.attachment_url ?? null,
              required: !!p.required,
              interaction_schema: p.interaction_schema as ModuloPill["interaction_schema"],
            }))}
            loading={false}
            completedPillIds={new Set()}
            unlockedPillIds={new Set(pills.map((p) => p.id))}
            trailColor={color}
            hasTrail={!!trail}
            moduleId={module.id}
            onTogglePill={() => {}}
            togglePending={false}
            onOpenTutor={() => {}}
          />

          <div className="pt-2">
            <Link
              to={`/app/eletiva/${slug}/modulo/${module.number}`}
              className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto underline"
            >
              abrir como estudante ↗
            </Link>
          </div>
        </TabsContent>


        <TabsContent value="abertura">
          <AberturaVideoManager
            courseId={course.data.id}
            slug={slug!}
            moduleId={module.id}
            moduleNumber={module.number}
            accent={color}
          />
          <div className="pt-4">
            <Link
              to={`/admin/eletiva/${slug}/avaliacoes`}
              className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto underline"
            >
              ver avaliações dos módulos ↗
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="turma">
          <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white overflow-hidden">
            <ul className="divide-y divide-perestroika-preto/10">
              {enrolled
                .filter((e) => !e.profile?.is_test)
                .sort((a, b) =>
                  (a.profile?.display_name ?? a.profile?.nickname ?? "").localeCompare(
                    b.profile?.display_name ?? b.profile?.nickname ?? "",
                  ),
                )
                .map((e) => {
                  const d = delivByUser.get(e.user_id);
                  let state: "não começou" | "em andamento" | "aguardando" | "revisado" =
                    "não começou";
                  let stateColor = "text-perestroika-preto/50";
                  if (d) {
                    if (d.reviewed_at) {
                      state = "revisado";
                      stateColor = "text-emerald-700";
                    } else if (d.submitted_at && d.status === "enviado") {
                      state = "aguardando";
                      stateColor = "text-rose-700 font-semibold";
                    } else {
                      state = "em andamento";
                      stateColor = "text-amber-700";
                    }
                  }
                  const name =
                    e.profile?.display_name ?? e.profile?.nickname ?? "sem nome";
                  const clickable = d && d.status !== "rascunho";
                  return (
                    <li
                      key={e.user_id}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 text-sm",
                        clickable && "cursor-pointer hover:bg-perestroika-preto/5",
                      )}
                      onClick={() => {
                        if (clickable && d) setSelected(wrapDeliverable(d, e.profile));
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User2 className="w-4 h-4 text-perestroika-preto/60 shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wide tabular-nums",
                          stateColor,
                        )}
                      >
                        {state}
                      </span>
                    </li>
                  );
                })}
              {enrolled.length === 0 && (
                <li className="px-4 py-6 text-sm text-perestroika-preto/50 text-center">
                  ainda sem estudantes matriculados nesta eletiva.
                </li>
              )}
            </ul>
          </div>
        </TabsContent>
        <TabsContent value="exercicio" className="space-y-8">
          <ExercicioTabContent slug={slug} number={Number.isNaN(num) ? undefined : num} />
        </TabsContent>
      </Tabs>

      <FeedbackReviewDrawer
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        deliverable={selected}
      />
    </div>
  );
};

export default AdminModuloDetalhe;
