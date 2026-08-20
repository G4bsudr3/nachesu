import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePulso, type PulsoEntry } from "@/features/admin/usePulso";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 px-4 py-3">
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

/** resposta em palavra, respeitando a escala da pergunta */
const AnswerChip = ({ entry }: { entry: PulsoEntry }) => {
  if (entry.scale === "satisfacao") return <Stars n={entry.rating} color={entry.trail_color} />;
  const tone =
    entry.rating === 2
      ? "bg-perestroika-preto/5 text-perestroika-preto"
      : "bg-perestroika-laranja/15 text-perestroika-preto";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${tone}`}>
      {entry.answer}
    </span>
  );
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const AdminPulso = () => {
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState("30d");
  const courseFilter = params.get("eletiva") ?? "todas";
  const setCourseFilter = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "todas") next.delete("eletiva");
    else next.set("eletiva", v);
    setParams(next, { replace: true });
  };
  const [answerFilter, setAnswerFilter] = useState("todas");
  const [q, setQ] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
  const [openStudent, setOpenStudent] = useState<string | null>(null);

  const {
    loading,
    stats,
    byCourse,
    byTrail,
    byModule,
    entries,
    historyByStudent,
    comments,
    insight,
    analyze,
    analyzing,
    days,
    hiddenTestCount,
  } = usePulso(range, includeTest);

  const matches = (e: PulsoEntry) => {
    if (courseFilter !== "todas" && e.course_slug !== courseFilter) return false;
    if (answerFilter === "ritmo-fora" && !(e.scale === "ritmo" && e.rating !== 2)) return false;
    if (answerFilter === "ritmo-facil" && !(e.scale === "ritmo" && e.rating === 1)) return false;
    if (answerFilter === "ritmo-pesado" && !(e.scale === "ritmo" && e.rating === 3)) return false;
    if (answerFilter === "sat-baixas" && !(e.scale === "satisfacao" && e.rating <= 2)) return false;
    if (answerFilter === "sat-altas" && !(e.scale === "satisfacao" && e.rating >= 4)) return false;
    if (answerFilter === "com-comentario" && !e.comment?.trim()) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      (e.comment ?? "").toLowerCase().includes(term) ||
      e.student.toLowerCase().includes(term) ||
      e.module_title.toLowerCase().includes(term) ||
      String(e.module_number).padStart(2, "0").includes(term)
    );
  };

  const filteredEntries = useMemo(
    () => entries.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, courseFilter, answerFilter, q],
  );
  const filteredComments = useMemo(
    () => comments.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comments, courseFilter, answerFilter, q],
  );

  const exportCsv = () => {
    const rows = [
      ["data", "estudante", "eletiva", "modulo", "titulo", "pergunta", "resposta", "valor", "comentario"],
      ...filteredEntries.map((c) => [
        c.created_at,
        c.student,
        c.course_title,
        String(c.module_number),
        c.module_title,
        c.scale === "ritmo" ? "ritmo do módulo" : "satisfação 1-5",
        c.answer,
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

  const sat = stats.satisfacao;
  const ritmo = stats.ritmo;
  const delta =
    sat.average !== null && sat.previousAverage !== null
      ? Number((sat.average - sat.previousAverage).toFixed(2))
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

      {/* as duas perguntas, lidas separadas */}
      <div className="grid gap-3 lg:grid-cols-2 mb-6">
        <section className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h2 className="font-display uppercase text-xl leading-none">ritmo do módulo</h2>
            <span className="text-[11px] text-perestroika-preto/50">3 opções · ia na prática</span>
          </div>
          {ritmo.total === 0 ? (
            <p className="text-sm text-perestroika-preto/55 mt-2">
              nenhuma resposta de ritmo nesse período.
            </p>
          ) : (
            <>
              <p className="font-display text-4xl leading-none mt-2">{ritmo.noPontoPct}%</p>
              <p className="text-xs text-perestroika-preto/55 mb-3">
                acham que está no ponto · {ritmo.total} respostas
              </p>
              <ul className="space-y-1.5 text-xs">
                {[
                  { label: "tranquilo demais", n: ritmo.tranquilo },
                  { label: "no ponto", n: ritmo.noPonto },
                  { label: "pesado demais", n: ritmo.pesado },
                ].map((row) => (
                  <li key={row.label}>
                    <div className="flex justify-between mb-0.5">
                      <span>{row.label}</span>
                      <span className="text-perestroika-preto/55">{row.n}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-perestroika-preto/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-perestroika-preto/60"
                        style={{ width: `${(row.n / ritmo.total) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h2 className="font-display uppercase text-xl leading-none">satisfação</h2>
            <span className="text-[11px] text-perestroika-preto/50">1 a 5 estrelas</span>
          </div>
          {sat.total === 0 ? (
            <p className="text-sm text-perestroika-preto/55 mt-2">
              nenhuma avaliação de estrelas nesse período.
            </p>
          ) : (
            <>
              <p className="font-display text-4xl leading-none mt-2">
                {sat.average?.toFixed(2) ?? "—"}
              </p>
              <p className="text-xs text-perestroika-preto/55">
                média de 5 · {sat.total} respostas
                {delta !== null ? ` · ${delta >= 0 ? "+" : ""}${delta} vs período anterior` : ""}
              </p>
              <p className="text-xs text-perestroika-preto/55 mt-3">
                notas 1-2: {sat.detractorsPct}% · notas 4-5: {sat.promotersPct}%
              </p>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Stat
          label="respostas"
          value={String(stats.total)}
          hint={
            stats.responseRate !== null
              ? `${stats.responseRate}% de quem fechou um checkpoint`
              : "sem conclusões no período"
          }
        />
        <Stat label="comentários" value={String(stats.comments)} hint="texto livre no período" />
        <Stat
          label="módulos avaliados"
          value={String(byModule.length)}
          hint="checkpoints 1, 5, 10, 15 e 20"
        />
      </div>

      {/* análise de IA */}
      <section className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-4 sm:p-5 mb-6">
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
            ainda não rodou nenhuma análise. clique em analisar com ia pra ler as respostas do
            período de uma vez só.
          </p>
        )}
      </section>

      <Tabs defaultValue="geral">
        <TabsList className="mb-4">
          <TabsTrigger value="geral" className="text-xs">
            visão geral
          </TabsTrigger>
          <TabsTrigger value="estudantes" className="text-xs">
            por estudante ({entries.length})
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs">
            comentários ({comments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          {/* eletivas e trilhas */}
          <section className="mb-6">
            <h2 className="font-display uppercase text-2xl leading-none mb-2">
              por eletiva e trilha
            </h2>
            {byCourse.length === 0 ? (
              <p className="text-sm text-perestroika-preto/55">
                nenhuma avaliação no período. os checkpoints aparecem nos módulos 1, 5, 10, 15 e 20.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {byCourse.map((c) => (
                  <div
                    key={c.course_id}
                    className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-4"
                  >
                    <p className="font-display uppercase text-lg leading-none">{c.title}</p>
                    <p className="text-xs text-perestroika-preto/55 mb-3">
                      {c.scale === "ritmo"
                        ? `${c.noPontoPct}% no ponto`
                        : `${c.average?.toFixed(2) ?? "—"} de média`}{" "}
                      · {c.count} respostas
                    </p>
                    <ul className="space-y-2">
                      {byTrail
                        .filter((t) => t.course === c.title)
                        .map((t) => (
                          <li key={t.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="truncate pr-2">{t.trail}</span>
                              <span className="text-perestroika-preto/55 shrink-0">
                                {t.scale === "ritmo"
                                  ? `${Math.round(t.score * 100)}% no ponto`
                                  : (t.average?.toFixed(2) ?? "—")}{" "}
                                · {t.count}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-perestroika-preto/10 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round(t.score * 100)}%`,
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
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display uppercase text-2xl leading-none">módulos fora do ponto</h2>
              <span className="text-[11px] text-perestroika-preto/55">
                {byModule.length} com avaliação · mais desalinhado primeiro
              </span>
            </div>
            <AdminTableWrapper scroll>
              <AdminTable>
                <AdminTHead>
                  <tr>
                    <AdminTH>módulo</AdminTH>
                    <AdminTH>eletiva</AdminTH>
                    <AdminTH>leitura</AdminTH>
                    <AdminTH>respostas</AdminTH>
                    <AdminTH>distribuição</AdminTH>
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
                        {m.scale === "ritmo" ? (
                          <span className="text-xs">
                            <span className="font-display text-lg mr-1">{100 - m.offPct}%</span>
                            no ponto
                            {m.direction ? (
                              <span className="text-perestroika-preto/55"> · {m.direction}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="font-display text-lg">
                            {m.average?.toFixed(2) ?? "—"}
                          </span>
                        )}
                      </AdminTD>
                      <AdminTD className="text-perestroika-preto/60">{m.count}</AdminTD>
                      <AdminTD>
                        <span className="inline-flex gap-1 text-[10px] text-perestroika-preto/60">
                          {m.dist.map((d, i) => (
                            <span
                              key={i}
                              className="rounded px-1.5 py-0.5 bg-perestroika-preto/5 whitespace-nowrap"
                            >
                              {m.scale === "ritmo"
                                ? `${["tranquilo", "no ponto", "pesado"][i]} ${d}`
                                : `${i + 1}★ ${d}`}
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
        </TabsContent>

        <TabsContent value="estudantes">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-perestroika-preto/60" />
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
            <Select value={answerFilter} onValueChange={setAnswerFilter}>
              <SelectTrigger className="h-9 w-[210px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="todas">todas as respostas</SelectItem>
                <SelectItem value="ritmo-fora">ritmo fora do ponto</SelectItem>
                <SelectItem value="ritmo-facil">achou tranquilo demais</SelectItem>
                <SelectItem value="ritmo-pesado">achou pesado demais</SelectItem>
                <SelectItem value="sat-baixas">estrelas 1 e 2</SelectItem>
                <SelectItem value="sat-altas">estrelas 4 e 5</SelectItem>
                <SelectItem value="com-comentario">só com comentário</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] text-perestroika-preto/55">
              {filteredEntries.length} no filtro
            </span>
          </div>

          <AdminTableWrapper scroll>
            <AdminTable>
              <AdminTHead>
                <tr>
                  <AdminTH>estudante</AdminTH>
                  <AdminTH>eletiva</AdminTH>
                  <AdminTH>módulo</AdminTH>
                  <AdminTH>respondeu</AdminTH>
                  <AdminTH>quando</AdminTH>
                  <AdminTH>comentário</AdminTH>
                </tr>
              </AdminTHead>
              <AdminTBody>
                {filteredEntries.map((e) => {
                  const open = openStudent === e.user_id;
                  const history = historyByStudent.get(e.user_id) ?? [];
                  return [
                    <AdminTR key={`${e.user_id}-${e.module_id}`}>
                      <AdminTD>
                        <button
                          type="button"
                          onClick={() => setOpenStudent(open ? null : e.user_id)}
                          className="font-semibold hover:underline text-left"
                        >
                          {e.student}
                        </button>
                        <span className="text-[11px] text-perestroika-preto/45 ml-1.5">
                          {history.length} avaliaç{history.length === 1 ? "ão" : "ões"}
                        </span>
                      </AdminTD>
                      <AdminTD className="text-xs text-perestroika-preto/60">
                        {e.course_title}
                      </AdminTD>
                      <AdminTD className="text-xs">
                        <Link
                          to={`/admin/eletiva/${e.course_slug}/modulo/${e.module_number}`}
                          className="hover:underline"
                        >
                          {String(e.module_number).padStart(2, "0")} {e.module_title}
                        </Link>
                      </AdminTD>
                      <AdminTD>
                        <AnswerChip entry={e} />
                      </AdminTD>
                      <AdminTD className="text-[11px] text-perestroika-preto/50 whitespace-nowrap">
                        {fmt(e.created_at)}
                      </AdminTD>
                      <AdminTD className="text-xs text-perestroika-preto/70 max-w-[240px]">
                        {e.comment?.trim() ? e.comment : "—"}
                      </AdminTD>
                    </AdminTR>,
                    open ? (
                      <tr key={`${e.user_id}-${e.module_id}-hist`}>
                        <AdminTD colSpan={6} className="bg-perestroika-preto/[0.03]">
                          <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
                            histórico de {e.student}
                          </p>
                          <ul className="space-y-1.5">
                            {history.map((h) => (
                              <li
                                key={`${h.module_id}-${h.created_at}`}
                                className="flex flex-wrap items-center gap-2 text-xs"
                              >
                                <span className="text-perestroika-preto/45 w-[86px] shrink-0">
                                  {fmt(h.created_at)}
                                </span>
                                <span className="w-[190px] truncate">
                                  {h.course_title} · mód{" "}
                                  {String(h.module_number).padStart(2, "0")}
                                </span>
                                <AnswerChip entry={h} />
                                {h.comment?.trim() && (
                                  <span className="text-perestroika-preto/70">{h.comment}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <Link
                            to={`/admin/aluno/${e.user_id}`}
                            className="inline-block mt-2 text-[11px] underline text-perestroika-preto/60"
                          >
                            abrir perfil do estudante
                          </Link>
                        </AdminTD>
                      </tr>
                    ) : null,
                  ];
                })}
                {filteredEntries.length === 0 && !loading && (
                  <tr>
                    <AdminTD colSpan={6} className="text-center text-perestroika-preto/50 py-6">
                      nenhuma avaliação nesse filtro
                    </AdminTD>
                  </tr>
                )}
              </AdminTBody>
            </AdminTable>
          </AdminTableWrapper>
          <p className="text-[11px] text-perestroika-preto/45 mt-2">
            a avaliação nunca foi anônima: cada resposta é gravada com o nome de quem respondeu.
          </p>
        </TabsContent>

        <TabsContent value="comentarios">
          <ul className="space-y-2">
            {filteredComments.map((c) => (
              <li
                key={`${c.user_id}-${c.module_id}`}
                className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <AnswerChip entry={c} />
                  <Link
                    to={`/admin/aluno/${c.user_id}`}
                    className="text-xs font-semibold hover:underline"
                  >
                    {c.student}
                  </Link>
                  <span className="text-[11px] text-perestroika-preto/50">
                    {c.course_title} · módulo {String(c.module_number).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-perestroika-preto/60 ml-auto">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPulso;
