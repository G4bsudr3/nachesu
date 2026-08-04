import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, Search, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminTable,
  AdminTableWrapper,
  AdminTHead,
  AdminTBody,
  AdminTH,
  AdminTD,
  AdminTR,
} from "@/components/admin/ui/AdminTable";
import { usePendingDeliverables, type InboxFilter } from "@/features/admin/usePendingDeliverables";
import { DeliverableAnswersList } from "@/features/admin/deliverableRendering/DeliverableAnswersList";
import type { PillForResolve, PillKind } from "@/features/admin/deliverableRendering/types";
import { buildAnswerRows, rowsToCsv, downloadCsv } from "@/features/admin/answersExport";
import { useStudentRoster } from "@/hooks/useStudentRoster";
import { cn } from "@/lib/utils";

type PillRpcRow = {
  id: string;
  module_id: string;
  order_index: number;
  kind: string;
  title: string;
  body_md: string | null;
  required: boolean | null;
  interaction_schema: Record<string, unknown> | null;
};

/**
 * inspeção de respostas: filtra entregas por eletiva, módulo, estudante e status,
 * abre as perguntas/respostas resolvidas (inclusive campos opcionais e textos longos
 * como o do módulo 2) e exporta o recorte em csv.
 */
const AdminRespostas = () => {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [status, setStatus] = useState<InboxFilter>("todos");
  const [search, setSearch] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { lookupByCode } = useStudentRoster();

  const { data: courses } = useQuery({
    queryKey: ["admin-respostas-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["admin-respostas-modules", courseId],
    queryFn: async () => {
      let trailIds: string[] | null = null;
      if (courseId) {
        const { data: trails } = await supabase
          .from("trails")
          .select("id")
          .eq("course_id", courseId);
        trailIds = (trails ?? []).map((t) => t.id);
        if (trailIds.length === 0) return [];
      }
      const q = supabase.from("modules").select("id, number, title").order("number");
      const { data, error } = trailIds ? await q.in("trail_id", trailIds) : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data, isLoading } = usePendingDeliverables({
    courseId,
    moduleId,
    status,
    includeTest,
  });

  const courseTitleById = useMemo(() => {
    const m = new Map<string, string>();
    (courses ?? []).forEach((c) => m.set(c.id, c.title));
    return m;
  }, [courses]);

  const labelFor = useMemo(
    () =>
      (d: (typeof data)[number]) => {
        const code = d.profile?.nickname ?? d.profile?.display_name ?? "";
        const roster = lookupByCode(code);
        return {
          name:
            roster?.full_name ??
            d.profile?.display_name ??
            d.profile?.nickname ??
            d.user_id.slice(0, 8),
          code,
          turma: roster?.turma ?? "",
          courseTitle: d.course_id ? courseTitleById.get(d.course_id) ?? "" : "",
        };
      },
    [lookupByCode, courseTitleById],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = data ?? [];
    if (!term) return base;
    return base.filter((d) => {
      const l = labelFor(d);
      return (
        l.name.toLowerCase().includes(term) ||
        l.code.toLowerCase().includes(term) ||
        l.turma.toLowerCase().includes(term)
      );
    });
  }, [data, search, labelFor]);

  const moduleIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.module_id))).sort(),
    [rows],
  );

  const { data: pillsByModule } = useQuery({
    queryKey: ["admin-respostas-pills", moduleIds.join(",")],
    enabled: moduleIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const map: Record<string, PillForResolve[]> = {};
      await Promise.all(
        moduleIds.map(async (mid) => {
          const { data: pills, error } = await supabase.rpc("admin_module_pills", {
            p_module_id: mid,
          });
          if (error) return;
          map[mid] = ((pills ?? []) as unknown as PillRpcRow[]).map((p) => ({
            id: p.id,
            module_id: p.module_id,
            order_index: p.order_index,
            kind: p.kind as PillKind,
            title: p.title,
            body_md: p.body_md,
            required: !!p.required,
            interaction_schema: p.interaction_schema,
          }));
        }),
      );
      return map;
    },
  });

  const exportCsv = () => {
    const csvRows = buildAnswerRows(rows, pillsByModule ?? {}, labelFor);
    const modLabel = moduleId
      ? (modules ?? []).find((m) => m.id === moduleId)?.number ?? "modulo"
      : "todos";
    downloadCsv(`respostas-modulo-${modLabel}.csv`, rowsToCsv(csvRows));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">
          admin
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">respostas</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl sm:text-4xl leading-none">
            inspeção de respostas
          </h1>
          <p className="text-sm text-perestroika-preto/60 mt-1">
            filtra por módulo e por estudante, abre pergunta a pergunta (campos opcionais
            inclusos) e exporta o recorte.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" /> exportar csv
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Select
          value={courseId ?? "all"}
          onValueChange={(v) => {
            setCourseId(v === "all" ? null : v);
            setModuleId(null);
          }}
        >
          <SelectTrigger className="w-[200px] h-9 text-xs bg-perestroika-bege/60 border-perestroika-preto/20">
            <SelectValue placeholder="eletiva" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">todas as eletivas</SelectItem>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={moduleId ?? "all"}
          onValueChange={(v) => setModuleId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[220px] h-9 text-xs bg-perestroika-bege/60 border-perestroika-preto/20">
            <SelectValue placeholder="módulo" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[320px]">
            <SelectItem value="all">todos os módulos</SelectItem>
            {(modules ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {String(m.number).padStart(2, "0")} · {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as InboxFilter)}>
          <SelectTrigger className="w-[170px] h-9 text-xs bg-perestroika-bege/60 border-perestroika-preto/20">
            <SelectValue placeholder="status" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="todos">todos os status</SelectItem>
            <SelectItem value="pendentes">aguardando correção</SelectItem>
            <SelectItem value="ajuste">em ajuste</SelectItem>
            <SelectItem value="revisados">revisados</SelectItem>
            <SelectItem value="rascunho">rascunho</SelectItem>
            <SelectItem value="rascunho-completo">rascunho completo</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={includeTest ? "default" : "outline"}
          size="sm"
          className="h-9 text-xs"
          onClick={() => setIncludeTest((v) => !v)}
        >
          {includeTest ? "com contas de teste" : "sem contas de teste"}
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/40 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar estudante por nome, código ou turma…"
          className="pl-9 bg-perestroika-bege/60 border-perestroika-preto/20"
        />
      </div>

      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
        {isLoading
          ? "carregando…"
          : `${rows.length} ${rows.length === 1 ? "resposta" : "respostas"} nesse recorte`}
      </p>

      <AdminTableWrapper scroll>
        <AdminTable>
          <AdminTHead>
            <tr>
              <AdminTH>estudante</AdminTH>
              <AdminTH>módulo</AdminTH>
              <AdminTH>status</AdminTH>
              <AdminTH>preenchimento</AdminTH>
              <AdminTH />
            </tr>
          </AdminTHead>
          <AdminTBody>
            {!isLoading && rows.length === 0 && (
              <tr>
                <AdminTD colSpan={5} className="text-center py-10 text-perestroika-preto/50">
                  nenhuma resposta nesse recorte. troca o módulo ou o status.
                </AdminTD>
              </tr>
            )}
            {rows.map((d) => {
              const l = labelFor(d);
              const isOpen = openId === d.id;
              const isDraft = d.submitted_at === null && d.status === "rascunho";
              return (
                <>
                  <AdminTR
                    key={d.id}
                    onClick={() => setOpenId(isOpen ? null : d.id)}
                    className="cursor-pointer"
                  >
                    <AdminTD className="font-medium">
                      {l.name}
                      {(l.code || l.turma) && (
                        <span className="block text-[11px] font-normal uppercase tracking-wide text-perestroika-preto/50">
                          {[l.code, l.turma].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </AdminTD>
                    <AdminTD className="text-sm">
                      {d.module
                        ? `${String(d.module.number).padStart(2, "0")} · ${d.module.title}`
                        : "–"}
                    </AdminTD>
                    <AdminTD className="text-xs uppercase tracking-wide">
                      {isDraft ? "rascunho" : d.status}
                    </AdminTD>
                    <AdminTD className="text-xs">
                      {d.completeness.requiredAnswered}/{d.completeness.requiredTotal}
                    </AdminTD>
                    <AdminTD className="w-8">
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </AdminTD>
                  </AdminTR>
                  {isOpen && (
                    <tr key={`${d.id}-detail`}>
                      <AdminTD colSpan={5} className="bg-perestroika-bege/40">
                        <div className="py-2">
                          <DeliverableAnswersList deliverable={d} />
                        </div>
                      </AdminTD>
                    </tr>
                  )}
                </>
              );
            })}
          </AdminTBody>
        </AdminTable>
      </AdminTableWrapper>
    </div>
  );
};

export default AdminRespostas;
