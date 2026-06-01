import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, Trash2, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { FeedbackFinalAnalysis } from "@/components/admin/FeedbackFinalAnalysis";

interface FeedbackFinalRow {
  id: string;
  user_id: string;
  nota_imersao: number;
  nota_profs: number;
  melhoria_entregas: number;
  nps_recomendacao: number;
  geral: string | null;
  mais_gostou: string | null;
  menos_gostou: string | null;
  conteudo_faltou: string | null;
  coracao_aberto: string | null;
  certificate_archetype: string | null;
  created_at: string;
  display_name?: string | null;
  nickname?: string | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const escapeCsv = (val: unknown) => {
  if (val === null || val === undefined) return "";
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
};

const avg = (nums: number[]): string => {
  if (nums.length === 0) return "–";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
};

const npsScore = (nums: number[]): { score: number; promoters: number; passives: number; detractors: number } => {
  if (nums.length === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0 };
  const promoters = nums.filter((n) => n >= 9).length;
  const passives = nums.filter((n) => n >= 7 && n <= 8).length;
  const detractors = nums.filter((n) => n <= 6).length;
  const score = Math.round(((promoters - detractors) / nums.length) * 100);
  return { score, promoters, passives, detractors };
};

export const AdminFeedbackFinal = () => {
  const [rows, setRows] = useState<FeedbackFinalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalAlunos, setTotalAlunos] = useState(0);

  const load = async () => {
    setLoading(true);
    const [{ data: feedback, error }, profilesRes, totalRes] = await Promise.all([
      supabase
        .from("hub_event_feedback_final")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, nickname"),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    if (error) {
      logger.error("[admin/feedback-final]", error);
      toast.error("erro ao carregar pesquisa final");
      setLoading(false);
      return;
    }
    const byId = new Map<string, { display_name: string | null; nickname: string | null }>();
    (profilesRes.data ?? []).forEach((p) =>
      byId.set(p.user_id, { display_name: p.display_name, nickname: p.nickname }),
    );
    const merged: FeedbackFinalRow[] = (feedback ?? []).map((f) => ({
      ...f,
      display_name: byId.get(f.user_id)?.display_name ?? null,
      nickname: byId.get(f.user_id)?.nickname ?? null,
    }));
    setRows(merged);
    setTotalAlunos(totalRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.display_name, r.nickname, r.geral, r.mais_gostou, r.menos_gostou, r.conteudo_faltou, r.coracao_aberto]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    return {
      avgImersao: avg(rows.map((r) => r.nota_imersao)),
      avgProfs: avg(rows.map((r) => r.nota_profs)),
      avgMelhoria: avg(rows.map((r) => r.melhoria_entregas)),
      nps: npsScore(rows.map((r) => r.nps_recomendacao)),
    };
  }, [rows]);

  const handleExportCsv = () => {
    const header = [
      "enviado",
      "nome",
      "apelido",
      "nota_imersao",
      "nota_profs",
      "melhoria_entregas",
      "nps_recomendacao",
      "geral",
      "mais_gostou",
      "menos_gostou",
      "conteudo_faltou",
      "coracao_aberto",
    ];
    const lines = [header.map(escapeCsv).join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          formatDate(r.created_at),
          r.display_name,
          r.nickname,
          r.nota_imersao,
          r.nota_profs,
          r.melhoria_entregas,
          r.nps_recomendacao,
          r.geral,
          r.mais_gostou,
          r.menos_gostou,
          r.conteudo_faltou,
          r.coracao_aberto,
        ].map(escapeCsv).join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-final-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("apagar essa resposta? não dá pra desfazer.")) return;
    const { error } = await supabase.from("hub_event_feedback_final").delete().eq("id", id);
    if (error) {
      logger.error("[admin/feedback-final/delete]", error);
      toast.error("erro ao apagar, tenta de novo");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("resposta apagada");
  };

  const pct = totalAlunos > 0 ? Math.round((rows.length / totalAlunos) * 100) : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            pesquisa final
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading
              ? "carregando…"
              : totalAlunos > 0
                ? `${rows.length} de ${totalAlunos} responderam · ${pct}%`
                : `${rows.length} respostas`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/certificate-sandbox"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto transition-colors"
            title="testar visual do certificado sem afetar o banco"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            sandbox do certificado
          </Link>
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-3 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            <Download className="w-4 h-4" />
            csv
          </button>
        </div>
      </div>

      {/* análise IA – manchete */}
      {!loading && <FeedbackFinalAnalysis totalRespostas={rows.length} />}

      {/* cards de média */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="média imersão" value={stats.avgImersao} suffix="/10" tone="laranja" />
          <StatCard label="média profs" value={stats.avgProfs} suffix="/10" tone="rosa" />
          <StatCard label="melhoria entregas" value={stats.avgMelhoria} suffix="/5" tone="azul" />
          <StatCard
            label="nps"
            value={String(stats.nps.score)}
            suffix=""
            tone={stats.nps.score >= 50 ? "preto" : "vermelho"}
            extra={`${stats.nps.promoters} promotores · ${stats.nps.detractors} detratores`}
          />
        </div>
      )}

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/50" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar por nome ou conteúdo…"
          className="pl-9 bg-white/60 border-perestroika-preto/20"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-perestroika-preto/50">carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-perestroika-preto/50">
          {rows.length === 0
            ? "ninguém respondeu ainda. quando você liberar a pesquisa pro estudante, as respostas aparecem aqui."
            : "nenhum resultado pra essa busca"}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => (
            <article key={r.id} className="rounded-2xl border border-perestroika-preto/15 bg-white/50 p-5 sm:p-6">
              <header className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h3 className="font-display text-2xl uppercase leading-none text-perestroika-preto">
                    {r.display_name ?? "sem nome"}
                  </h3>
                  {r.nickname && (
                    <p className="mt-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/55">
                      @{r.nickname}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Badge label="imersão" value={`${r.nota_imersao}/10`} />
                  <Badge label="profs" value={`${r.nota_profs}/10`} />
                  <Badge label="melhoria" value={`${r.melhoria_entregas}/5`} />
                  <Badge label="nps" value={`${r.nps_recomendacao}/10`} />
                  <span className="text-perestroika-preto/55">{formatDate(r.created_at)}</span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    aria-label="apagar resposta"
                    title="apagar resposta"
                    className="rounded-full p-1.5 text-perestroika-preto/40 hover:bg-perestroika-vermelho/10 hover:text-perestroika-vermelho transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Block label="geral" value={r.geral} />
                <Block label="mais gostou" value={r.mais_gostou} />
                <Block label="menos gostou" value={r.menos_gostou} />
                <Block label="conteúdo que faltou" value={r.conteudo_faltou} />
                {r.coracao_aberto && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Block label="coração aberto" value={r.coracao_aberto} highlight />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  suffix,
  tone,
  extra,
}: {
  label: string;
  value: string;
  suffix: string;
  tone: "laranja" | "rosa" | "azul" | "preto" | "vermelho";
  extra?: string;
}) => {
  const toneMap = {
    laranja: "bg-perestroika-laranja/15 border-perestroika-laranja/40 text-perestroika-laranja",
    rosa: "bg-perestroika-rosa/15 border-perestroika-rosa/40 text-perestroika-rosa",
    azul: "bg-perestroika-azul/15 border-perestroika-azul/40 text-perestroika-azul",
    preto: "bg-perestroika-preto/10 border-perestroika-preto/30 text-perestroika-preto",
    vermelho: "bg-perestroika-vermelho/15 border-perestroika-vermelho/40 text-perestroika-vermelho",
  };
  return (
    <div className={`rounded-2xl border p-5 ${toneMap[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">{label}</div>
      <div className="font-display text-5xl leading-none">
        {value}
        <span className="text-2xl opacity-50">{suffix}</span>
      </div>
      {extra && <div className="mt-2 text-[10px] uppercase tracking-wide text-perestroika-preto/55">{extra}</div>}
    </div>
  );
};

const Badge = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-perestroika-preto/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-perestroika-preto/75">
    {label} <strong className="text-perestroika-preto">{value}</strong>
  </span>
);

const Block = ({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50 mb-1.5">{label}</div>
    {value ? (
      <p className={`font-body text-sm whitespace-pre-wrap ${highlight ? "italic text-perestroika-preto" : "text-perestroika-preto/85"}`}>
        {value}
      </p>
    ) : (
      <p className="font-body text-sm text-perestroika-preto/30">–</p>
    )}
  </div>
);
