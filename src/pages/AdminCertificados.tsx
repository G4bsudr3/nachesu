import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllCourses } from "@/hooks/useCourses";
import { accentFor, PAPER } from "@/lib/eletivaTheme";
import {
  certificateCode,
  renderNachesCertificatePdf,
  slugifyName,
} from "@/components/certificate/renderNachesCertificatePdf";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

type Candidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  ra: string | null;
  turma: string | null;
  display_name: string | null;
  completed_at: string;
};

type Course = { id: string; slug: string; title: string; subtitle: string | null; professor_name: string };

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");
const nameOf = (c: Candidate) => c.full_name?.trim() || c.display_name?.trim() || c.email.split("@")[0];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export default function AdminCertificados() {
  const { data: courses = [] } = useAllCourses();
  const [tab, setTab] = useState<string | null>(null);
  const course = (courses as Course[]).find((c) => c.id === tab) ?? (courses as Course[])[0];
  const [q, setQ] = useState("");
  const [turma, setTurma] = useState("todas");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: list = [], isLoading, error } = useQuery({
    queryKey: ["admin-certificate-candidates", course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_certificate_candidates", {
        _course_id: course!.id,
      });
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const turmas = useMemo(
    () => Array.from(new Set(list.map((c) => c.turma ?? "sem turma"))).sort(),
    [list],
  );
  const filtered = list.filter((c) => {
    if (turma !== "todas" && (c.turma ?? "sem turma") !== turma) return false;
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return [nameOf(c), c.ra ?? "", c.email].some((v) => v.toLowerCase().includes(t));
  });
  const semNome = list.filter((c) => !c.full_name).length;

  const propsFor = (c: Candidate) => ({
    fullName: nameOf(c),
    courseTitle: course!.title,
    courseSubtitle: course!.subtitle,
    professorName: course!.professor_name,
    accentColor: accentFor(course!.slug),
    paperColor: PAPER,
    completedAt: c.completed_at,
    verificationCode: certificateCode(course!.slug, c.user_id),
  });
  const fileFor = (c: Candidate) => `${slugifyName(nameOf(c))}${c.ra ? `-${c.ra}` : ""}.pdf`;

  const downloadOne = async (c: Candidate) => {
    setProgress({ done: 0, total: 1 });
    try {
      downloadBlob(await renderNachesCertificatePdf(propsFor(c)), fileFor(c));
    } catch (e) {
      logger.error("[AdminCertificados]", e);
      toast({ title: "não rolou gerar agora", description: "tenta de novo.", variant: "destructive" });
    } finally {
      setProgress(null);
    }
  };

  const downloadZip = async (items: Candidate[]) => {
    if (!course || !items.length) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const failed: string[] = [];
    setProgress({ done: 0, total: items.length });
    const rows = [["nome", "ra", "turma", "e-mail", "eletiva", "concluído em", "código", "nome oficial"].join(",")];
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      try {
        const blob = await renderNachesCertificatePdf(propsFor(c));
        zip.folder(c.turma ?? "sem-turma")!.file(fileFor(c), blob);
        rows.push(
          [nameOf(c), c.ra ?? "", c.turma ?? "", c.email, course.title, fmt(c.completed_at),
            certificateCode(course.slug, c.user_id), c.full_name ? "sim" : "não"].map(csvCell).join(","),
        );
      } catch (e) {
        logger.error("[AdminCertificados] falhou", c.email, e);
        failed.push(nameOf(c));
      }
      setProgress({ done: i + 1, total: items.length });
    }
    zip.file("lista.csv", "\uFEFF" + rows.join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `certificados-${course.slug}-${new Date().getFullYear()}.zip`);
    setProgress(null);
    toast({
      title: `${items.length - failed.length} certificados no zip`,
      description: failed.length ? `não consegui gerar: ${failed.join(", ")}. tenta esses de novo.` : "pronto pra mandar pra secretaria.",
      variant: failed.length ? "destructive" : undefined,
    });
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const busy = !!progress;
  const allChecked = filtered.length > 0 && filtered.every((c) => selected.has(c.user_id));

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">admin</p>
        <h1 className="font-display uppercase text-4xl md:text-5xl leading-none">certificados</h1>
        <p className="font-body text-sm text-muted-foreground max-w-xl">
          quem concluiu os 20 módulos aparece aqui. baixa um por um ou tudo num zip, com uma pasta por turma e a lista em planilha.
        </p>
      </header>

      <div role="tablist" className="flex flex-wrap gap-2">
        {(courses as Course[]).map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={course?.id === c.id}
            onClick={() => { setTab(c.id); setSelected(new Set()); setTurma("todas"); }}
            className={`min-h-11 rounded-full border-2 px-5 font-body text-sm font-semibold lowercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              course?.id === c.id ? "border-foreground bg-foreground text-background" : "border-border"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6" style={{ color: course ? accentFor(course.slug) : undefined }} />
          <p className="font-display uppercase text-2xl">
            {isLoading ? "carregando..." : `${list.length} estudantes concluíram`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy || selected.size === 0}
            onClick={() => downloadZip(list.filter((c) => selected.has(c.user_id)))}
            className="min-h-11 rounded-full border-2 border-foreground px-5 font-body text-sm font-semibold disabled:opacity-40"
          >
            baixar selecionados ({selected.size})
          </button>
          <button
            disabled={busy || list.length === 0}
            onClick={() => downloadZip(filtered)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 font-body text-sm font-semibold text-background disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> baixar {turma === "todas" && !q ? "todos" : "filtrados"} (zip)
          </button>
        </div>
      </div>

      {progress && progress.total > 1 && (
        <div className="rounded-2xl border-2 border-border p-4" aria-live="polite">
          <p className="font-body text-sm mb-2">gerando {progress.done} de {progress.total}. deixa essa aba aberta.</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-foreground transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {semNome > 0 && (
        <p className="rounded-2xl bg-muted p-4 font-body text-sm">
          {semNome} {semNome === 1 ? "estudante não está" : "estudantes não estão"} na lista oficial da escola. o certificado vai sair com o apelido, confere antes de enviar.
        </p>
      )}

      <div className="flex flex-col gap-2 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">buscar</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="buscar por nome, ra ou e-mail"
            className="min-h-11 w-full rounded-full border-2 border-border bg-background pl-9 pr-4 font-body text-sm"
          />
        </label>
        <select
          aria-label="filtrar por turma"
          value={turma}
          onChange={(e) => setTurma(e.target.value)}
          className="min-h-11 rounded-full border-2 border-border bg-background px-4 font-body text-sm"
        >
          <option value="todas">todas as turmas</option>
          {turmas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {error ? (
        <p className="font-body text-sm">não consegui carregar a lista. recarrega a página.</p>
      ) : !isLoading && filtered.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">ninguém por aqui com esse filtro ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2 border-border">
          <table className="w-full font-body text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="selecionar todos"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map((c) => c.user_id)))}
                  />
                </th>
                <th className="p-3">nome</th>
                <th className="p-3">ra</th>
                <th className="p-3">turma</th>
                <th className="p-3">concluiu em</th>
                <th className="p-3 text-right">certificado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.user_id} className="border-t border-border">
                  <td className="p-3">
                    <input type="checkbox" aria-label={`selecionar ${nameOf(c)}`} checked={selected.has(c.user_id)} onChange={() => toggle(c.user_id)} />
                  </td>
                  <td className="p-3">
                    <span className="font-semibold">{nameOf(c)}</span>
                    {!c.full_name && <span className="ml-2 text-xs text-muted-foreground">sem nome oficial</span>}
                  </td>
                  <td className="p-3">{c.ra ?? "-"}</td>
                  <td className="p-3">{c.turma ?? "-"}</td>
                  <td className="p-3">{fmt(c.completed_at)}</td>
                  <td className="p-3 text-right">
                    <button
                      disabled={busy}
                      onClick={() => downloadOne(c)}
                      aria-label={`baixar pdf de ${nameOf(c)}`}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold hover:bg-muted disabled:opacity-40"
                    >
                      {busy && progress?.total === 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} pdf
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
