import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ExternalLink, Filter, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * auditoria automática de copy das pílulas.
 * roda os checks do guia de tom (lowercase, você, sem em-dash, sem hashtag,
 * sem emoji, "estudante" no lugar de "aluno", "educador" no lugar de só "professor")
 * e mostra as pílulas que violam, com deeplink pra edição.
 *
 * não inventa texto — só sinaliza onde tem trabalho pra fazer.
 */

type PillRow = {
  id: string;
  module_id: string;
  order_index: number;
  kind: string;
  title: string;
  body_md: string;
  published: boolean;
  updated_at: string;
};

type ModuleLite = {
  id: string;
  number: number;
  title: string;
  trail_id: string | null;
};

type TrailLite = { id: string; course_id: string | null; title: string };
type CourseLite = { id: string; title: string };

type Severity = "alto" | "medio" | "baixo";

type Finding = {
  code: string;
  label: string;
  severity: Severity;
  where: "titulo" | "corpo";
  excerpt?: string;
};

// regex helpers
const reEmDash = /—/g;
const reHashtag = /(^|\s)#[a-zA-Z0-9_]+/g;
const reEmoji =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2700}-\u{27BF}]/gu;
// 4+ letras maiúsculas seguidas (URLs/siglas conhecidas ignoradas via lista curta)
const reShouty = /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/g;
const SHOUTY_ALLOW = new Set([
  "IA", "API", "URL", "PDF", "CSV", "MVP", "MLP", "MVT", "PBL", "UX", "UI",
  "BH", "TI", "SP", "RJ", "OK", "SEBRAE", "NACHES", "NACHESU", "PERESTROIKA",
  "LOVABLE", "CHŎRA", "CHORA", "JOÃO", "DUDU", "FRATTZ",
]);

const reAluno = /\b(alunos?|alun[ao]s)\b/gi;
const reTu = /\b(tu|teu|tua|teus|tuas|ti|contigo)\b/gi;
const reProfessor = /\b(professor|professora|professores|professoras)\b/gi;
const reEspero = /\b(prezad[ao]|espero que esteja bem|à disposição)\b/gi;

const excerptAround = (text: string, match: string, span = 30) => {
  const idx = text.toLowerCase().indexOf(match.toLowerCase());
  if (idx < 0) return match;
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + match.length + span);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
};

const checkText = (text: string, where: "titulo" | "corpo"): Finding[] => {
  if (!text) return [];
  const out: Finding[] = [];

  if (reEmDash.test(text)) {
    out.push({ code: "em_dash", label: "em-dash (—)", severity: "alto", where, excerpt: excerptAround(text, "—") });
  }
  reEmDash.lastIndex = 0;

  const hash = text.match(reHashtag);
  if (hash) out.push({ code: "hashtag", label: "hashtag", severity: "alto", where, excerpt: excerptAround(text, hash[0].trim()) });

  const emoji = text.match(reEmoji);
  if (emoji) out.push({ code: "emoji", label: `emoji (${emoji[0]})`, severity: "medio", where, excerpt: excerptAround(text, emoji[0]) });

  const tu = text.match(reTu);
  if (tu) out.push({ code: "tu", label: `"${tu[0].toLowerCase()}" (usar você/seu)`, severity: "alto", where, excerpt: excerptAround(text, tu[0]) });

  const aluno = text.match(reAluno);
  if (aluno) out.push({ code: "aluno", label: `"${aluno[0].toLowerCase()}" (usar estudante)`, severity: "alto", where, excerpt: excerptAround(text, aluno[0]) });

  const prof = text.match(reProfessor);
  if (prof) out.push({ code: "professor", label: `"${prof[0].toLowerCase()}" (preferir educador)`, severity: "baixo", where, excerpt: excerptAround(text, prof[0]) });

  const corp = text.match(reEspero);
  if (corp) out.push({ code: "corporativo", label: `corporativês ("${corp[0]}")`, severity: "medio", where, excerpt: excerptAround(text, corp[0]) });

  // shouty só no título (corpo pode ter trecho citado)
  if (where === "titulo") {
    const shouty = text.match(reShouty)?.filter((s) => !SHOUTY_ALLOW.has(s));
    if (shouty && shouty.length > 0) {
      out.push({
        code: "uppercase",
        label: `caixa-alta no título ("${shouty[0]}")`,
        severity: "medio",
        where,
        excerpt: shouty.join(", "),
      });
    }
  }

  return out;
};

type AuditRow = {
  pill: PillRow;
  module: ModuleLite | null;
  trail: TrailLite | null;
  courseId: string | null;
  findings: Finding[];
};

export const AdminCopyAudit = () => {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<"todos" | Severity>("todos");
  const [courseFilter, setCourseFilter] = useState<string>("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (vars: { id: string; title: string; body_md: string }) => {
      const { error } = await supabase
        .from("module_pills")
        .update({ title: vars.title, body_md: vars.body_md })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("pílula atualizada");
      queryClient.invalidateQueries({ queryKey: ["admin-copy-audit-pills"] });
      setEditingId(null);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "não consegui salvar");
    },
  });

  const startEdit = (pill: PillRow) => {
    setEditingId(pill.id);
    setDraftTitle(pill.title ?? "");
    setDraftBody(pill.body_md ?? "");
  };


  const { data: pills, isLoading: pillsLoading } = useQuery({
    queryKey: ["admin-copy-audit-pills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select("id, module_id, order_index, kind, title, body_md, published, updated_at")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as PillRow[];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["admin-copy-audit-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, number, title, trail_id")
        .order("number");
      if (error) throw error;
      return (data ?? []) as ModuleLite[];
    },
  });

  const { data: trails } = useQuery({
    queryKey: ["admin-copy-audit-trails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trails")
        .select("id, course_id, title");
      if (error) throw error;
      return (data ?? []) as TrailLite[];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-copy-audit-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CourseLite[];
    },
  });

  const audit = useMemo<AuditRow[]>(() => {
    if (!pills) return [];
    const modMap = new Map<string, ModuleLite>((modules ?? []).map((m) => [m.id, m]));
    const trailMap = new Map<string, TrailLite>((trails ?? []).map((t) => [t.id, t]));

    return pills
      .map((pill) => {
        const findings = [
          ...checkText(pill.title, "titulo"),
          ...checkText(pill.body_md, "corpo"),
        ];
        const module = modMap.get(pill.module_id) ?? null;
        const trail = module?.trail_id ? trailMap.get(module.trail_id) ?? null : null;
        return {
          pill,
          module,
          trail,
          courseId: trail?.course_id ?? null,
          findings,
        };
      })
      .filter((r) => r.findings.length > 0);
  }, [pills, modules, trails]);

  const filtered = useMemo(() => {
    return audit.filter((r) => {
      if (courseFilter !== "todos" && r.courseId !== courseFilter) return false;
      if (severityFilter !== "todos" && !r.findings.some((f) => f.severity === severityFilter))
        return false;
      return true;
    });
  }, [audit, severityFilter, courseFilter]);

  const totals = useMemo(() => {
    const all = audit.flatMap((r) => r.findings);
    return {
      pilulas: audit.length,
      alto: all.filter((f) => f.severity === "alto").length,
      medio: all.filter((f) => f.severity === "medio").length,
      baixo: all.filter((f) => f.severity === "baixo").length,
    };
  }, [audit]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
          auditoria · copy
        </h1>
        <p className="mt-3 text-perestroika-preto/70 text-sm max-w-2xl">
          escaneia título e corpo de todas as pílulas contra o guia de tom: lowercase, você (não tu),
          sem em-dash, sem hashtag, sem emoji, "estudante" no lugar de "aluno", "educador" no lugar
          de só "professor". não reescreve nada, só sinaliza onde tem trabalho.
        </p>
      </div>

      {pillsLoading ? (
        <p className="text-sm text-perestroika-preto/55">carregando pílulas…</p>
      ) : audit.length === 0 ? (
        <div className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/50 p-8 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-perestroika-preto/60 mb-3" />
          <p className="text-perestroika-preto/70">
            nenhuma violação detectada. tom consistente em tudo.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/50 p-4">
              <div className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
                pílulas com avisos
              </div>
              <div className="font-display text-3xl mt-1">{totals.pilulas}</div>
            </div>
            <div className="rounded-lg border border-perestroika-vermelho/30 bg-perestroika-vermelho/5 p-4">
              <div className="text-[10px] uppercase tracking-wide text-perestroika-vermelho">
                alto
              </div>
              <div className="font-display text-3xl mt-1">{totals.alto}</div>
            </div>
            <div className="rounded-lg border border-perestroika-laranja/30 bg-perestroika-laranja/5 p-4">
              <div className="text-[10px] uppercase tracking-wide text-perestroika-laranja">
                médio
              </div>
              <div className="font-display text-3xl mt-1">{totals.medio}</div>
            </div>
            <div className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/50 p-4">
              <div className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
                baixo
              </div>
              <div className="font-display text-3xl mt-1">{totals.baixo}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Filter className="w-4 h-4 text-perestroika-preto/50" />
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/20 w-56">
                <SelectValue placeholder="curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">todos os cursos</SelectItem>
                {(courses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={severityFilter}
              onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}
            >
              <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/20 w-44">
                <SelectValue placeholder="severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">todas severidades</SelectItem>
                <SelectItem value="alto">alto</SelectItem>
                <SelectItem value="medio">médio</SelectItem>
                <SelectItem value="baixo">baixo</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-perestroika-preto/50">
              {filtered.length} pílula(s) listada(s)
            </span>
          </div>

          <div className="space-y-3">
            {filtered.map(({ pill, module, findings }) => {
              const isEditing = editingId === pill.id;
              const isSaving = saveMutation.isPending && saveMutation.variables?.id === pill.id;
              return (
              <div
                key={pill.id}
                className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/60 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
                      {module ? `módulo ${String(module.number).padStart(2, "0")} · ${module.title}` : "módulo desconhecido"}
                      {" · "}
                      {pill.kind.replace("_", " ")}
                    </div>
                    {!isEditing && (
                      <div className="font-medium text-perestroika-preto mt-0.5 break-words">
                        {pill.title || "(sem título)"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(pill)}
                        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                      >
                        <Pencil className="w-3 h-3" />
                        editar aqui
                      </button>
                    )}
                    {module && (
                      <Link
                        to={`/admin/aula/${module.number}`}
                        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                      >
                        <ExternalLink className="w-3 h-3" />
                        abrir módulo
                      </Link>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
                        título
                      </label>
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="bg-perestroika-bege/80 border-perestroika-preto/20 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
                        corpo (markdown)
                      </label>
                      <Textarea
                        value={draftBody}
                        onChange={(e) => setDraftBody(e.target.value)}
                        rows={6}
                        className="bg-perestroika-bege/80 border-perestroika-preto/20 mt-1 font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          saveMutation.mutate({
                            id: pill.id,
                            title: draftTitle.trim(),
                            body_md: draftBody,
                          })
                        }
                        disabled={isSaving}
                      >
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                        salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={isSaving}
                      >
                        <X className="w-3 h-3" />
                        cancelar
                      </Button>
                      <span className="text-[10px] text-perestroika-preto/50 ml-auto">
                        os avisos somem assim que o texto for salvo
                      </span>
                    </div>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {findings.map((f, i) => (
                      <li
                        key={`${f.code}-${f.where}-${i}`}
                        className="flex flex-wrap items-baseline gap-2 text-sm"
                      >
                        <Badge
                          className={
                            f.severity === "alto"
                              ? "bg-perestroika-vermelho text-white uppercase text-[10px]"
                              : f.severity === "medio"
                                ? "bg-perestroika-laranja text-white uppercase text-[10px]"
                                : "bg-perestroika-preto/15 text-perestroika-preto uppercase text-[10px]"
                          }
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {f.severity}
                        </Badge>
                        <span className="text-perestroika-preto/80">
                          {f.where}: {f.label}
                        </span>
                        {f.excerpt && (
                          <span className="text-xs text-perestroika-preto/55 italic">
                            "{f.excerpt}"
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
