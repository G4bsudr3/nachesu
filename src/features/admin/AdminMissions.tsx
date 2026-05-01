import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Check, AlertCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { useUrlState } from "@/hooks/useUrlState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Status = "pendente" | "aprovada" | "ajustar";

interface Mission {
  id: string;
  titulo: string;
  ordem: number;
}

interface SubmissionRow {
  id: string;
  mission_id: string;
  user_id: string;
  link: string;
  descricao: string;
  status: Status;
  feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
}

interface Joined extends SubmissionRow {
  mission_titulo: string;
  mission_ordem: number;
  builder: string;
}

const statusConfig: Record<Status, { label: string; classes: string; icon: typeof Check }> = {
  pendente: { label: "pendente", classes: "bg-perestroika-azul text-perestroika-bege", icon: Clock },
  aprovada: { label: "aprovada", classes: "bg-perestroika-preto text-perestroika-bege", icon: Check },
  ajustar: { label: "ajustar", classes: "bg-perestroika-laranja text-perestroika-preto", icon: AlertCircle },
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdminMissions = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Joined[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilterRaw, setStatusFilterRaw] = useUrlState("missoes_status", "todos");
  const statusFilter = (["todos", "pendente", "aprovada", "ajustar"].includes(statusFilterRaw)
    ? statusFilterRaw
    : "todos") as "todos" | Status;
  const setStatusFilter = (v: "todos" | Status) => setStatusFilterRaw(v);
  const [missionFilter, setMissionFilter] = useUrlState("missoes_missao", "todas");
  const [reviewing, setReviewing] = useState<Joined | null>(null);
  const [submissaoIdParam, setSubmissaoIdParam] = useUrlState("submissao", "");
  const [reviewStatus, setReviewStatus] = useState<Status>("pendente");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: subs, error }, { data: missions }, { data: profiles }] = await Promise.all([
      supabase.from("mission_submissions").select("*").order("updated_at", { ascending: false }),
      supabase.from("missions").select("id, titulo, ordem"),
      supabase.from("profiles").select("user_id, nickname, display_name"),
    ]);

    if (error) {
      toast.error("não foi possível carregar as submissões");
      setLoading(false);
      return;
    }

    const missionMap = new Map<string, Mission>();
    (missions ?? []).forEach((m) => missionMap.set(m.id, m as Mission));
    const profileMap = new Map<string, ProfileRow>();
    (profiles ?? []).forEach((p) => profileMap.set(p.user_id, p as ProfileRow));

    const joined: Joined[] = (subs ?? []).map((s) => {
      const mission = missionMap.get(s.mission_id);
      const profile = profileMap.get(s.user_id);
      return {
        ...(s as SubmissionRow),
        mission_titulo: mission?.titulo ?? "missão removida",
        mission_ordem: mission?.ordem ?? 0,
        builder: profile?.nickname ?? profile?.display_name ?? "builder",
      };
    });

    setSubmissions(joined);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const missionOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; ordem: number }>();
    submissions.forEach((s) => {
      if (!map.has(s.mission_id)) {
        map.set(s.mission_id, {
          id: s.mission_id,
          label: `${String(s.mission_ordem).padStart(2, "0")} · ${s.mission_titulo}`,
          ordem: s.mission_ordem,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.ordem - b.ordem);
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "todos" && s.status !== statusFilter) return false;
      if (missionFilter !== "todas" && s.mission_id !== missionFilter) return false;
      return true;
    });
  }, [submissions, statusFilter, missionFilter]);

  const openReview = (sub: Joined) => {
    setReviewing(sub);
    setReviewStatus(sub.status);
    setFeedback(sub.feedback ?? "");
    setSubmissaoIdParam(sub.id);
  };

  // sync ?submissao= -> abre review automaticamente após carregar
  useEffect(() => {
    if (!submissaoIdParam) return;
    if (reviewing?.id === submissaoIdParam) return;
    const found = submissions.find((s) => s.id === submissaoIdParam);
    if (found) openReview(found);
  }, [submissaoIdParam, submissions, reviewing?.id]);
  const closeReview = () => {
    setReviewing(null);
    setSubmissaoIdParam("");
  };


  const handleSaveReview = async () => {
    if (!reviewing || !user) return;
    if (feedback.length > 1000) {
      toast.error("feedback ficou longo demais");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("mission_submissions")
      .update({
        status: reviewStatus,
        feedback: feedback.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reviewing.id);
    setSaving(false);
    if (error) {
      toast.error("não foi possível salvar a avaliação");
      return;
    }
    toast.success("avaliação salva");
    closeReview();
    fetchAll();
  };

  const stats = useMemo(() => {
    const total = submissions.length;
    const pendentes = submissions.filter((s) => s.status === "pendente").length;
    const aprovadas = submissions.filter((s) => s.status === "aprovada").length;
    const ajustar = submissions.filter((s) => s.status === "ajustar").length;
    return { total, pendentes, aprovadas, ajustar };
  }, [submissions]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">missões · submissões</h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${stats.total} submissões · ${stats.pendentes} pendentes · ${stats.aprovadas} aprovadas · ${stats.ajustar} para ajustar`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">todos os status</SelectItem>
            <SelectItem value="pendente">pendentes</SelectItem>
            <SelectItem value="aprovada">aprovadas</SelectItem>
            <SelectItem value="ajustar">precisa ajustar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={missionFilter} onValueChange={setMissionFilter}>
          <SelectTrigger className="bg-white/60 border-perestroika-preto/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">todas as missões</SelectItem>
            {missionOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-perestroika-bege/40 border border-perestroika-preto/10 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-perestroika-preto/20 p-12 text-center">
          <p className="font-body text-perestroika-preto/60">nenhuma submissão com esses filtros.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => {
            const cfg = statusConfig[s.status];
            const Icon = cfg.icon;
            return (
              <article
                key={s.id}
                onClick={() => openReview(s)}
                className="cursor-pointer rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/80 backdrop-blur p-5 flex items-start gap-4 hover:border-perestroika-preto/30 transition-colors"
              >
                <div className="shrink-0 font-display text-3xl text-perestroika-preto/30 tabular-nums leading-none pt-1">
                  {String(s.mission_ordem).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                      {s.builder}
                    </span>
                    <span className="text-perestroika-preto/30">·</span>
                    <span className="font-body text-xs text-perestroika-preto/50">
                      {formatDate(s.updated_at)}
                    </span>
                  </div>
                  <h3 className="font-display uppercase text-xl sm:text-2xl leading-tight">
                    {s.mission_titulo}
                  </h3>
                  <p className="mt-1 font-body text-sm text-perestroika-preto/70 line-clamp-2">{s.descricao}</p>
                  <a
                    href={s.link.startsWith("http") ? s.link : `https://${s.link}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-flex items-center gap-1 font-body text-xs text-perestroika-preto/70 hover:text-perestroika-preto truncate max-w-full"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s.link}</span>
                  </a>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs uppercase tracking-wide ${cfg.classes}`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent className="max-w-lg bg-perestroika-bege max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-2xl">
              avaliar submissão
            </DialogTitle>
          </DialogHeader>

          {reviewing && (
            <div className="space-y-4 mt-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-1">builder</p>
                <p className="font-body">{reviewing.builder}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-1">missão</p>
                <p className="font-body">
                  {String(reviewing.mission_ordem).padStart(2, "0")} · {reviewing.mission_titulo}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-1">link</p>
                <a
                  href={reviewing.link.startsWith("http") ? reviewing.link : `https://${reviewing.link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-body text-perestroika-preto underline break-all hover:opacity-70"
                >
                  {reviewing.link}
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-1">descrição</p>
                <p className="font-body whitespace-pre-wrap">{reviewing.descricao}</p>
              </div>

              <div className="pt-3 border-t border-perestroika-preto/10">
                <p className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-2">status</p>
                <div className="flex gap-2 flex-wrap">
                  {(["pendente", "aprovada", "ajustar"] as Status[]).map((s) => {
                    const cfg = statusConfig[s];
                    const selected = reviewStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewStatus(s)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs uppercase tracking-wide border transition-all ${
                          selected
                            ? `${cfg.classes} border-transparent`
                            : "border-perestroika-preto/20 hover:border-perestroika-preto/50"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-perestroika-preto/50 mb-1">
                  feedback para o builder
                </p>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="opcional. seja direto e construtivo."
                  className="bg-white/60 resize-y"
                />
                <p className="mt-1 text-right text-[10px] text-perestroika-preto/40 tabular-nums">
                  {feedback.length}/1000
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={closeReview}
              disabled={saving}
              className="px-5 h-11 rounded-full font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity disabled:opacity-30"
            >
              cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveReview}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              salvar avaliação
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
