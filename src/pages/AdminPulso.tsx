import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Download, Sparkles, Loader2, Star, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AdminTable,
  AdminTableWrapper,
  AdminTBody,
  AdminTD,
  AdminTH,
  AdminTHead,
  AdminTR,
} from "@/components/admin/ui/AdminTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePulso } from "@/features/admin/usePulso";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/60 px-4 py-3">
    <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55">{label}</p>
    <p className="font-display text-3xl leading-none text-perestroika-preto mt-1">{value}</p>
    {hint && <p className="text-[11px] text-perestroika-preto/50 mt-1">{hint}</p>}
  </div>
);

const Stars = ({ n, color }: { n: number; color?: string | null }) => (
  <span className="inline-flex" aria-label={`${n} de 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className="h-3.5 w-3.5"
        style={{ color: color ?? "#090909" }}
        fill={i < n ? (color ?? "#090909") : "transparent"}
      />
    ))}
  </span>
);

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminPulso = () => {
  const [range, setRange] = useState("30d");
  const [courseFilter, setCourseFilter] = useState("todas");
  const [noteFilter, setNoteFilter] = useState("todas");
  const [q, setQ] = useState("");
  const [includeTest, setIncludeTest] = useState(false);

  const {
    loading,
    stats,
    byCourse,
    byTrail,
    byModule,
    comments,
    insight,
    analyze,
    analyzing,
    days,
    hiddenTestCount,
  } = usePulso(range, includeTest);


  const filteredComments = useMemo(() => {
    const term = q.trim().toLowerCase();
    return comments.filter((c) => {
      if (courseFilter !== "todas" && c.course_slug !== courseFilter) return false;
      if (noteFilter === "baixas" && c.rating > 2) return false;
      if (noteFilter === "neutras" && c.rating !== 3) return false;
      if (noteFilter === "altas" && c.rating < 4) return false;
      if (!term) return true;
      return (
        (c.comment ?? "").toLowerCase().includes(term) ||
        c.student.toLowerCase().includes(term) ||
        c.module_title.toLowerCase().includes(term)
      );
    });
  }, [comments, courseFilter, noteFilter, q]);

  const exportCsv = () => {
    const rows = [
      ["data", "estudante", "eletiva", "modulo", "titulo", "nota", "comentario"],
      ...filteredComments.map((c) => [
        c.created_at,
        c.student,
        c.course_title,
        String(c.module_number),
        c.module_title,
        String(c.rating),
        (c.comment ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulso-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAnalysis = async () => {
    try {
      await analyze(days);
      toast.success("análise atualizada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro na análise";
      toast.error(
        msg.includes("429")
          ? "muitas chamadas seguidas, espera um minuto"
          : msg.includes("402")
            ? "créditos de IA esgotados"
            : msg,
      );
    }
  };

  const delta =
    stats.average !== null && stats.previousAverage !== null
      ? Number((stats.average - stats.previousAverage).toFixed(2))
      : null;

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
        <span className="text-perestroika-preto font-semibold">pulso</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-4xl leading-none">pulso</h1>
          <p className="text-xs text-perestroika-preto/55 mt-1">
            como as pessoas estão sentindo a experiência, módulo a módulo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="7d">últimos 7 dias</SelectItem>
              <SelectItem value="30d">últimos 30 dias</SelectItem>
              <SelectItem value="90d">últimos 90 dias</SelectItem>
              <SelectItem value="tudo">tudo</SelectItem>
            </SelectContent>
          </Select>
          {(hiddenTestCount > 0 || includeTest) && (
            <Button
              variant={includeTest ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeTest((v) => !v)}
              className="text-xs"
              title="contas marcadas como teste ficam fora das médias"
            >
              {includeTest ? "ocultar teste" : `incluir teste (${hiddenTestCount})`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> csv
          </Button>

        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat
          label="nota média"
          value={stats.average !== null ? stats.average.toFixed(2) : "—"}
          hint={
            delta !== null
              ? `${delta >= 0 ? "+" : ""}${delta} vs período anterior`
              : "sem base de comparação"
          }
        />
        <Stat
          label="respostas"
          value={String(stats.total)}
          hint={
            stats.responseRate !== null
              ? `${stats.responseRate}% de quem fechou um checkpoint`
              : "sem conclusões no período"
          }
        />
        <Stat label="notas 1-2" value={`${stats.detractorsPct}%`} hint={`4-5: ${stats.promotersPct}%`} />
        <Stat label="comentários" value={String(stats.comments)} hint="texto livre no período" />
      </div>

      {/* análise de IA */}
      <section className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/60 p-4 sm:p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-display uppercase text-2xl leading-none">leitura da ia</h2>
          <div className="flex items-center gap-2">
            {insight && (
              <span className="text-[11px] text-perestroika-preto/50">
                gerado em {fmt(insight.generated_at)}
              </span>
            )}
            <Button size="sm" onClick={runAnalysis} disabled={analyzing} className="text-xs">
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              {insight ? "reanalisar" : "analisar com ia"}
            </Button>
          </div>
        </div>
        {insight ? (
          <FeedbackMarkdown>{insight.summary_md}</FeedbackMarkdown>
        ) : (
          <p className="text-sm text-perestroika-preto/55">
            ainda não rodou nenhuma análise. clique em analisar com ia pra ler os comentários do
            período de uma vez só.
          </p>
        )}
      </section>

      {/* eletivas e trilhas */}
      <section className="mb-6">
        <h2 className="font-display uppercase text-2xl leading-none mb-2">por eletiva e trilha</h2>
        {byCourse.length === 0 ? (
          <p className="text-sm text-perestroika-preto/55">
            nenhuma avaliação no período. os checkpoints aparecem nos módulos 1, 5, 10, 15 e 20.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {byCourse.map((c) => (
              <div
                key={c.course_id}
                className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/60 p-4"
              >
                <p className="font-display uppercase text-lg leading-none">{c.title}</p>
                <p className="text-xs text-perestroika-preto/55 mb-3">
                  {c.average?.toFixed(2) ?? "—"} de média · {c.count} respostas
                </p>
                <ul className="space-y-2">
                  {byTrail
                    .filter((t) => t.course === c.title)
                    .map((t) => (
                      <li key={t.key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="truncate pr-2">{t.trail}</span>
                          <span className="text-perestroika-preto/55 shrink-0">
                            {t.average?.toFixed(2) ?? "—"} · {t.count}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-perestroika-preto/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${((t.average ?? 0) / 5) * 100}%`,
                              backgroundColor: t.color ?? "#090909",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ranking de módulos */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display uppercase text-2xl leading-none">módulos</h2>
          <span className="text-[11px] text-perestroika-preto/55">
            {byModule.length} com avaliação · pior média primeiro
          </span>
        </div>
        <AdminTableWrapper scroll>
          <AdminTable>
            <AdminTHead>
              <tr>
                <AdminTH>módulo</AdminTH>
                <AdminTH>eletiva</AdminTH>
                <AdminTH>média</AdminTH>
                <AdminTH>respostas</AdminTH>
                <AdminTH>distribuição 1→5</AdminTH>
              </tr>
            </AdminTHead>
            <AdminTBody>
              {byModule.map((m) => (
                <AdminTR key={m.module_id}>
                  <AdminTD>
                    <Link
                      to={`/admin/eletiva/${m.slug}/modulo/${m.number}`}
                      className="hover:underline"
                    >
                      <span className="font-semibold">
                        {String(m.number).padStart(2, "0")}
                      </span>{" "}
                      {m.title}
                    </Link>
                  </AdminTD>
                  <AdminTD className="text-perestroika-preto/60 text-xs">{m.course}</AdminTD>
                  <AdminTD>
                    <span className="font-display text-lg">{m.average?.toFixed(2) ?? "—"}</span>
                  </AdminTD>
                  <AdminTD className="text-perestroika-preto/60">{m.count}</AdminTD>
                  <AdminTD>
                    <span className="inline-flex gap-1 text-[10px] text-perestroika-preto/60">
                      {m.dist.map((d, i) => (
                        <span
                          key={i}
                          className="rounded px-1.5 py-0.5 bg-perestroika-preto/5"
                          title={`${i + 1} estrela${i ? "s" : ""}`}
                        >
                          {i + 1}★ {d}
                        </span>
                      ))}
                    </span>
                  </AdminTD>
                </AdminTR>
              ))}
              {byModule.length === 0 && !loading && (
                <tr>
                  <AdminTD colSpan={5} className="text-center text-perestroika-preto/50 py-6">
                    nada avaliado nesse período ainda
                  </AdminTD>
                </tr>
              )}
            </AdminTBody>
          </AdminTable>
        </AdminTableWrapper>
      </section>

      {/* comentários */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-display uppercase text-2xl leading-none">comentários</h2>
          <span className="text-[11px] text-perestroika-preto/55">
            {filteredComments.length} no filtro
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-perestroika-preto/40" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="buscar por estudante, módulo ou texto"
              className="h-9 pl-8 text-xs w-[260px]"
            />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-9 w-[190px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="todas">todas as eletivas</SelectItem>
              {byCourse.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={noteFilter} onValueChange={setNoteFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="todas">todas as notas</SelectItem>
              <SelectItem value="baixas">1 e 2</SelectItem>
              <SelectItem value="neutras">3</SelectItem>
              <SelectItem value="altas">4 e 5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ul className="space-y-2">
          {filteredComments.map((c) => (
            <li
              key={`${c.user_id}-${c.module_id}`}
              className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Stars n={c.rating} color={c.trail_color} />
                <Link
                  to={`/admin/aluno/${c.user_id}`}
                  className="text-xs font-semibold hover:underline"
                >
                  {c.student}
                </Link>
                <span className="text-[11px] text-perestroika-preto/50">
                  {c.course_title} · módulo {String(c.module_number).padStart(2, "0")}
                </span>
                <span className="text-[11px] text-perestroika-preto/40 ml-auto">
                  {fmt(c.created_at)}
                </span>
              </div>
              <p className="text-sm text-perestroika-preto/85 whitespace-pre-wrap">{c.comment}</p>
            </li>
          ))}
          {filteredComments.length === 0 && (
            <li className="text-sm text-perestroika-preto/50 py-6 text-center">
              nenhum comentário nesse filtro
            </li>
          )}
        </ul>
      </section>
    </div>
  );
};

export default AdminPulso;
