import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Play, Square, Trash2, RefreshCw, Trophy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "draft" | "open" | "closed";

interface Session {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
}

interface FullRankRow {
  project_id: string;
  title: string;
  author: string;
  vote_count: number;
}

const STATUS_LABEL: Record<Status, string> = {
  draft: "rascunho",
  open: "aberta",
  closed: "fechada",
};

const STATUS_STYLE: Record<Status, string> = {
  draft: "bg-perestroika-preto/10 text-perestroika-preto/70",
  open: "bg-perestroika-azul/15 text-perestroika-azul",
  closed: "bg-perestroika-preto text-perestroika-bege",
};

export const AdminVotacaoProjetos = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCloses, setNewCloses] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("project_voting_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    setSessions((data as Session[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!user) return;
    if (newTitle.trim().length < 3) {
      toast.error("dá um título de pelo menos 3 letras");
      return;
    }
    const { error } = await supabase.from("project_voting_sessions").insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      closes_at: newCloses ? new Date(newCloses).toISOString() : null,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("sessão criada");
    setCreating(false);
    setNewTitle("");
    setNewDesc("");
    setNewCloses("");
    refresh();
  };

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase
      .from("project_voting_sessions")
      .update({ status })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`sessão ${STATUS_LABEL[status]}`);
      refresh();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("apagar essa sessão e todos os votos? não dá pra desfazer.")) return;
    const { error } = await supabase.from("project_voting_sessions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("apagada");
      refresh();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl uppercase leading-none sm:text-6xl">
            votação · projetos
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            cria sessões, abre, fecha e vê o ranking completo. estudante só vê top 10 quando fechar.
          </p>
        </div>
        <Button
          onClick={() => setCreating((v) => !v)}
          className="bg-perestroika-preto text-perestroika-bege hover:bg-perestroika-preto/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> nova sessão
        </Button>
      </div>

      {creating && (
        <div className="space-y-3 rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-5">
          <div>
            <label className="mb-1 block font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/60">
              título
            </label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="ex: votação dos projetos chŏra 2026"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/60">
              descrição (opcional)
            </label>
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              placeholder="contexto pra turma"
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/60">
              fecha em (opcional)
            </label>
            <Input
              type="datetime-local"
              value={newCloses}
              onChange={(e) => setNewCloses(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              cancelar
            </Button>
            <Button onClick={handleCreate}>criar como rascunho</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-perestroika-preto/5" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/40 px-6 py-10 text-center font-body text-sm text-perestroika-preto/60">
          nenhuma sessão ainda. cria a primeira aí em cima.
        </p>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              isActive={activeId === s.id}
              onToggleActive={() => setActiveId(activeId === s.id ? null : s.id)}
              onSetStatus={setStatus}
              onRemove={remove}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SessionCard = ({
  session,
  isActive,
  onToggleActive,
  onSetStatus,
  onRemove,
  onRefresh,
}: {
  session: Session;
  isActive: boolean;
  onToggleActive: () => void;
  onSetStatus: (id: string, s: Status) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
}) => {
  const [rows, setRows] = useState<FullRankRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadingRows(true);
    const { data: votes } = await supabase
      .from("project_votes")
      .select("project_id")
      .eq("session_id", session.id);
    const counts = new Map<string, number>();
    (votes ?? []).forEach((v: { project_id: string }) => {
      counts.set(v.project_id, (counts.get(v.project_id) ?? 0) + 1);
    });
    const ids = Array.from(counts.keys());
    if (ids.length === 0) {
      setRows([]);
      setLoadingRows(false);
      return;
    }
    const { data: projects } = await supabase
      .from("hub_projects")
      .select("id, title, user_id")
      .in("id", ids);
    const userIds = Array.from(new Set((projects ?? []).map((p: { user_id: string }) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, display_name")
      .in("user_id", userIds);
    const profMap = new Map<string, string>();
    (profiles ?? []).forEach((p: { user_id: string; nickname: string | null; display_name: string | null }) =>
      profMap.set(p.user_id, p.nickname || p.display_name || "alguém"),
    );
    const merged: FullRankRow[] = (projects ?? []).map((p: { id: string; title: string; user_id: string }) => ({
      project_id: p.id,
      title: p.title,
      author: profMap.get(p.user_id) ?? "alguém",
      vote_count: counts.get(p.id) ?? 0,
    }));
    merged.sort((a, b) => b.vote_count - a.vote_count);
    setRows(merged);
    setLoadingRows(false);
  }, [session.id]);

  useEffect(() => {
    if (isActive) loadAll();
  }, [isActive, loadAll]);

  const exportCsv = () => {
    const header = "rank,title,author,votes\n";
    const body = rows
      .map((r, i) => `${i + 1},"${r.title.replace(/"/g, '""')}","${r.author.replace(/"/g, '""')}",${r.vote_count}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `votacao-${session.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-[0.18em]",
                STATUS_STYLE[session.status],
              )}
            >
              {STATUS_LABEL[session.status]}
            </span>
            {session.closes_at && (
              <span className="font-body text-[11px] text-perestroika-preto/55">
                fecha {new Date(session.closes_at).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
          <h3 className="font-display text-2xl uppercase leading-none">{session.title}</h3>
          {session.description && (
            <p className="mt-1 font-body text-sm text-perestroika-preto/70">{session.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {session.status === "draft" && (
            <Button size="sm" onClick={() => onSetStatus(session.id, "open")}>
              <Play className="mr-1 h-3.5 w-3.5" /> abrir
            </Button>
          )}
          {session.status === "open" && (
            <Button size="sm" variant="secondary" onClick={() => onSetStatus(session.id, "closed")}>
              <Square className="mr-1 h-3.5 w-3.5" /> fechar
            </Button>
          )}
          {session.status === "closed" && (
            <Button size="sm" variant="ghost" onClick={() => onSetStatus(session.id, "open")}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> reabrir
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onToggleActive}>
            <Trophy className="mr-1 h-3.5 w-3.5" />
            {isActive ? "fechar ranking" : "ver ranking"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRemove(session.id)}>
            <Trash2 className="h-3.5 w-3.5 text-perestroika-vermelho" />
          </Button>
        </div>
      </div>

      {isActive && (
        <div className="mt-4 border-t border-perestroika-preto/10 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
              ranking completo (admin) · {rows.length} {rows.length === 1 ? "projeto" : "projetos"} com voto
            </p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={loadAll}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {rows.length > 0 && (
                <Button size="sm" variant="ghost" onClick={exportCsv}>
                  <Download className="mr-1 h-3.5 w-3.5" /> csv
                </Button>
              )}
            </div>
          </div>
          {loadingRows ? (
            <p className="font-body text-sm text-perestroika-preto/50">carregando…</p>
          ) : rows.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/55">nenhum voto ainda.</p>
          ) : (
            <ol className="grid gap-1.5">
              {rows.map((r, i) => (
                <li
                  key={r.project_id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-body text-sm",
                    i < 10 ? "bg-perestroika-bege" : "bg-perestroika-preto/5 text-perestroika-preto/65",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-perestroika-preto/55">#{i + 1}</span>
                    <span className="truncate font-semibold">{r.title}</span>
                    <span className="truncate text-perestroika-preto/55">por {r.author}</span>
                  </span>
                  <Badge variant="secondary">
                    {r.vote_count} {r.vote_count === 1 ? "voto" : "votos"}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};
