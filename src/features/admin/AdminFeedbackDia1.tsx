import { useEffect, useMemo, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { FeedbackDia1Analysis } from "@/components/admin/FeedbackDia1Analysis";
import { logger } from "@/lib/logger";

interface FeedbackRow {
  id: string;
  user_id: string;
  event_day: string;
  experiencia: string | null;
  poderia_ser_diferente: string | null;
  algo_que_amou: string | null;
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

export const AdminFeedbackDia1 = () => {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalAlunos, setTotalAlunos] = useState<number>(0);

  const load = async () => {
    setLoading(true);
    const [{ data: feedback, error }, profilesRes, totalRes] = await Promise.all([
      supabase
        .from("hub_event_feedback")
        .select("*")
        .eq("event_day", "dia-1")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, nickname"),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    if (error) {
      logger.error("[admin/feedback-d1]", error);
      toast.error("erro ao carregar feedbacks");
      setLoading(false);
      return;
    }
    const byId = new Map<string, { display_name: string | null; nickname: string | null }>();
    (profilesRes.data ?? []).forEach((p) =>
      byId.set(p.user_id, { display_name: p.display_name, nickname: p.nickname }),
    );
    const merged: FeedbackRow[] = (feedback ?? []).map((f) => ({
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
      [r.display_name, r.nickname, r.experiencia, r.poderia_ser_diferente, r.algo_que_amou]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const handleExportCsv = () => {
    const header = ["enviado", "nome", "apelido", "experiência", "poderia ser diferente", "algo que amou"];
    const lines = [header.map(escapeCsv).join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          formatDate(r.created_at),
          r.display_name,
          r.nickname,
          r.experiencia,
          r.poderia_ser_diferente,
          r.algo_que_amou,
        ]
          .map(escapeCsv)
          .join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-dia1-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("apagar esse feedback?")) return;
    const { error } = await supabase.from("hub_event_feedback").delete().eq("id", id);
    if (error) {
      toast.error("erro ao apagar");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("feedback apagado");
  };

  const pct = totalAlunos > 0 ? Math.round((rows.length / totalAlunos) * 100) : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            feedback dia 1
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading
              ? "carregando…"
              : totalAlunos > 0
                ? `${rows.length} de ${totalAlunos} responderam · ${pct}%`
                : `${rows.length} respostas`}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          <Download className="w-4 h-4" />
          exportar csv
        </button>
      </div>

      {!loading && <FeedbackDia1Analysis totalFeedbacks={rows.length} />}

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
        <div className="text-center py-16 text-perestroika-preto/50 font-body">
          {rows.length === 0
            ? "ninguém respondeu ainda. o banner aparece pra cada estudante no /app/hub 🤙"
            : "nenhum resultado pra essa busca"}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-perestroika-preto/15 bg-white/50 p-5 sm:p-6"
            >
              <header className="flex items-start justify-between gap-3 mb-4">
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
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs text-perestroika-preto/55">
                    {formatDate(r.created_at)}
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    aria-label="apagar"
                    className="rounded-full p-1.5 text-perestroika-preto/40 hover:bg-perestroika-vermelho/10 hover:text-perestroika-vermelho transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="grid gap-4 sm:grid-cols-3">
                <FeedbackBlock label="experiência do dia 1" value={r.experiencia} />
                <FeedbackBlock label="poderia ser diferente" value={r.poderia_ser_diferente} />
                <FeedbackBlock label="algo que amou" value={r.algo_que_amou} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const FeedbackBlock = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50 mb-1.5">
      {label}
    </div>
    {value ? (
      <p className="font-body text-sm text-perestroika-preto whitespace-pre-wrap">{value}</p>
    ) : (
      <p className="font-body text-sm text-perestroika-preto/30">—</p>
    )}
  </div>
);
