import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";

// fonte de verdade da landing pública /eletivas — manter espelhado
const PUBLIC_META: Record<string, { pitch: string; descLonga: string; tag: string }> = {
  "ia-na-pratica": {
    pitch: "construa seu primeiro app com ia, do problema ao mvp no ar.",
    descLonga:
      "uma jornada de 20 semanas pra você sair da ideia ao app publicado, com tutor ia provocando builder do seu lado.",
    tag: "4 trilhas · 20 módulos · tutor ia",
  },
  "economia-circular": {
    pitch: "desenhe um negócio que regenera, do sistema ao protótipo validado.",
    descLonga:
      "20 semanas pra enxergar fluxos, mapear ciclos e prototipar negócios regenerativos usando a escola sebrae bh como laboratório vivo.",
    tag: "4 trilhas · 20 módulos · pbl real",
  },
};

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  professor_name: string;
  published: boolean;
};

type ModulePill = {
  id: string;
  order_index: number;
  kind: string;
  title: string;
  body_md: string;
  published: boolean;
};

type ModuleRow = {
  id: string;
  number: number;
  title: string;
  published: boolean;
  released: boolean;
  pills: ModulePill[];
};

type ScopeIssue = {
  module_id: string;
  module_number: number;
  module_title: string;
  pill_id: string;
  pill_title: string;
  pill_kind: string;
  term: string;
};

export function AdminEletivaReview() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-review-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, subtitle, professor_name, published")
        .order("order_index");
      if (error) throw error;
      return data as Course[];
    },
  });

  const activeCourse = useMemo(
    () => courses.find((c) => c.slug === selectedSlug) ?? courses[0] ?? null,
    [courses, selectedSlug],
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">carregando eletivas…</div>;
  }
  if (!activeCourse) {
    return <div className="text-sm text-muted-foreground">nenhuma eletiva cadastrada.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {courses.map((c) => (
          <Button
            key={c.id}
            variant={c.id === activeCourse.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSlug(c.slug)}
            className="rounded-full"
          >
            {c.slug}
          </Button>
        ))}
      </div>

      <CourseReview course={activeCourse} />
    </div>
  );
}

function CourseReview({ course }: { course: Course }) {
  const publicMeta = PUBLIC_META[course.slug];

  const modulesQuery = useQuery({
    queryKey: ["admin-review-modules", course.id],
    queryFn: async () => {
      const { data: trails, error: tErr } = await supabase
        .from("trails")
        .select("id")
        .eq("course_id", course.id);
      if (tErr) throw tErr;
      const trailIds = (trails ?? []).map((t) => t.id);
      if (trailIds.length === 0) return [] as ModuleRow[];

      const { data: mods, error: mErr } = await supabase
        .from("modules")
        .select("id, number, title, published, trail_id")
        .in("trail_id", trailIds)
        .order("number");
      if (mErr) throw mErr;

      const moduleIds = (mods ?? []).map((m) => m.id);
      const { data: pills, error: pErr } = await supabase
        .from("module_pills")
        .select("id, module_id, order_index, kind, title, body_md, published")
        .in("module_id", moduleIds)
        .order("order_index");
      if (pErr) throw pErr;

      const pillsByModule = new Map<string, ModulePill[]>();
      for (const p of pills ?? []) {
        const arr = pillsByModule.get(p.module_id) ?? [];
        arr.push(p as ModulePill);
        pillsByModule.set(p.module_id, arr);
      }
      return (mods ?? []).map((m) => ({
        id: m.id,
        number: m.number,
        title: m.title,
        published: m.published,
        released: m.published,
        pills: pillsByModule.get(m.id) ?? [],
      })) as ModuleRow[];
    },
  });


  const scopeQuery = useQuery({
    queryKey: ["admin-review-scope", course.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("scope_check_course", {
        _course_id: course.id,
      });
      if (error) throw error;
      return (data ?? []) as ScopeIssue[];
    },
  });

  const issuesByModule = useMemo(() => {
    const map = new Map<string, ScopeIssue[]>();
    for (const i of scopeQuery.data ?? []) {
      const arr = map.get(i.module_id) ?? [];
      arr.push(i);
      map.set(i.module_id, arr);
    }
    return map;
  }, [scopeQuery.data]);

  const totalIssues = scopeQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da eletiva */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">slug ativo</div>
            <code className="text-lg font-mono">{course.slug}</code>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={course.published ? "default" : "outline"}>
              {course.published ? "publicada" : "rascunho"}
            </Badge>
            <a
              href={`/eletivas#${course.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs inline-flex items-center gap-1 underline text-muted-foreground hover:text-foreground"
            >
              landing pública <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">título</div>
          <div className="text-base">{course.title} <span className="text-muted-foreground">— {course.professor_name}</span></div>
        </div>

        {publicMeta && (
          <>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">pitch</div>
              <div className="text-sm">{publicMeta.pitch}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">descrição pública</div>
              <div className="text-sm">{publicMeta.descLonga}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">tag</div>
              <Badge variant="secondary">{publicMeta.tag}</Badge>
            </div>
          </>
        )}
      </div>

      {/* Verificação de escopo */}
      <div className="rounded-2xl border p-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {totalIssues === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <div className="font-medium">
                {totalIssues === 0
                  ? "conteúdo dentro do escopo"
                  : `${totalIssues} trecho(s) fora do escopo`}
              </div>
              <div className="text-xs text-muted-foreground">
                verifica termos proibidos em título, corpo e schema das pílulas.
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => scopeQuery.refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> rever
          </Button>
        </div>
        {totalIssues > 0 && (
          <ul className="text-sm space-y-1 mt-2">
            {(scopeQuery.data ?? []).map((i, idx) => (
              <li key={`${i.pill_id}-${i.term}-${idx}`} className="text-destructive">
                · m{String(i.module_number).padStart(2, "0")} <span className="opacity-70">›</span>{" "}
                {i.pill_kind} "{i.pill_title}" — termo <code>"{i.term}"</code>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Módulos + pílulas */}
      <div className="rounded-2xl border p-2">
        {modulesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground p-4">carregando módulos…</div>
        ) : (modulesQuery.data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground p-4">sem módulos.</div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {(modulesQuery.data ?? []).map((m) => {
              const moduleIssues = issuesByModule.get(m.id) ?? [];
              return (
                <AccordionItem key={m.id} value={m.id}>
                  <AccordionTrigger className="px-3 hover:no-underline">
                    <div className="flex items-center justify-between w-full gap-3 pr-2">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-mono text-xs text-muted-foreground">
                          m{String(m.number).padStart(2, "0")}
                        </span>
                        <span className="font-medium">{m.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {moduleIssues.length > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            {moduleIssues.length} fora
                          </Badge>
                        )}
                        <Badge
                          variant={m.published ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {m.published ? "publicado" : "rascunho"}
                        </Badge>
                        <Badge
                          variant={m.released ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {m.released ? "liberado" : "trancado"}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 space-y-3">
                    {m.pills.length === 0 ? (
                      <div className="text-xs text-muted-foreground">sem pílulas.</div>
                    ) : (
                      m.pills.map((p) => {
                        const pillIssues = moduleIssues.filter((i) => i.pill_id === p.id);
                        return (
                          <div
                            key={p.id}
                            className={`rounded-lg border p-3 ${
                              pillIssues.length > 0 ? "border-destructive" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {p.kind}
                                </Badge>
                                <span className="text-sm font-medium">{p.title}</span>
                              </div>
                              {!p.published && (
                                <Badge variant="outline" className="text-[10px]">rascunho</Badge>
                              )}
                            </div>
                            {pillIssues.length > 0 && (
                              <div className="text-xs text-destructive mb-1">
                                termos fora do escopo: {pillIssues.map((i) => `"${i.term}"`).join(", ")}
                              </div>
                            )}
                            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-body line-clamp-6">
                              {p.body_md || "(corpo vazio)"}
                            </pre>
                          </div>
                        );
                      })
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
