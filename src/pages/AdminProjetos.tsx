import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, ExternalLink, Rocket, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStudentRoster } from "@/hooks/useStudentRoster";
import { useProjectLinks, type StudentProjects } from "@/features/admin/projetos/useProjectLinks";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "–";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportCsv = (rows: StudentProjects[], nameOf: (r: StudentProjects) => string) => {
  if (rows.length === 0) return;
  const header = ["estudante", "codigo", "modulo", "link", "enviado_em", "status", "links_total"];
  const lines = rows.map((r) =>
    [
      nameOf(r),
      r.code ?? "",
      r.latest.module_number,
      r.latest.url,
      r.latest.submitted_at ?? "",
      r.latest.status,
      r.history.length,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nachesu-projetos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * painel dos projetos reais: só quem já mandou link de algo construído no lovable.
 * serve pra revisar o que importa sem varrer a fila inteira de entregas.
 */
const AdminProjetos = () => {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { lookupByCode } = useStudentRoster();

  const { data: courses } = useQuery({
    queryKey: ["admin-projetos-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug")
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeCourse = courseId ?? courses?.[0]?.id ?? null;
  const { data, isLoading } = useProjectLinks(activeCourse);

  const nameOf = (r: StudentProjects) => lookupByCode(r.code)?.full_name ?? r.name;

  const term = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = data ?? [];
    if (!term) return list;
    return list.filter((r) =>
      [nameOf(r), r.code, r.latest.url].filter(Boolean).join(" ").toLowerCase().includes(term),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, term, lookupByCode]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-4"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">
          admin
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">projetos</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            projetos reais
          </h1>
          <p className="mt-3 text-perestroika-preto/70 inline-flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            {isLoading
              ? "carregando…"
              : `${rows.length} estudante${rows.length === 1 ? "" : "s"} com link de projeto no lovable`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(rows, nameOf)}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/10 disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          csv
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Select
          value={activeCourse ?? ""}
          onValueChange={(v) => setCourseId(v)}
        >
          <SelectTrigger className="bg-perestroika-bege/60 border-perestroika-preto/15">
            <SelectValue placeholder="curso" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={6}>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/60 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar estudante ou link…"
            className="pl-9 bg-perestroika-bege/60 border-perestroika-preto/15"
          />
        </div>
      </div>

      {!isLoading && rows.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/15 p-8 text-center">
          <p className="font-display uppercase text-2xl mb-2">nenhum projeto ainda</p>
          <p className="text-sm text-perestroika-preto/65">
            quando alguém enviar o link de algo construído no lovable, o projeto aparece aqui.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rows.map((r) => {
          const open = expanded === r.user_id;
          return (
            <article
              key={r.user_id}
              className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/aluno/${r.user_id}`}
                    className="font-display uppercase text-xl leading-tight hover:underline break-words"
                  >
                    {nameOf(r)}
                  </Link>
                  <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/50 mt-0.5">
                    {[r.code, `módulo ${String(r.latest.module_number).padStart(2, "0")}`, fmt(r.latest.submitted_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="uppercase text-[10px] shrink-0"
                  title="quantidade de links enviados por este estudante"
                >
                  {r.history.length} link{r.history.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <a
                href={r.latest.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-[11px] uppercase tracking-wide hover:opacity-90 break-all"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                abrir projeto
              </a>
              <p className="mt-2 text-[11px] text-perestroika-preto/55 break-all">{r.latest.url}</p>

              {r.history.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : r.user_id)}
                    className="mt-3 text-[11px] uppercase tracking-wide underline hover:no-underline"
                  >
                    {open ? "esconder histórico" : "ver histórico"}
                  </button>
                  {open && (
                    <ul className="mt-2 space-y-1.5 border-t border-perestroika-preto/10 pt-2">
                      {r.history.map((h) => (
                        <li key={`${h.deliverable_id}-${h.url}`} className="text-[11px]">
                          <span className="text-perestroika-preto/55 mr-2">
                            mód {String(h.module_number).padStart(2, "0")} · {fmt(h.submitted_at)}
                          </span>
                          <a
                            href={h.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:no-underline break-all"
                          >
                            {h.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AdminProjetos;
