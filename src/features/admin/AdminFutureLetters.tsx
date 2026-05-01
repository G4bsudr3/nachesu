import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";

interface Session {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  send_at: string;
  status: "draft" | "open" | "closed" | "sent";
}

interface GroupRow {
  id: string;
  session_id: string;
  letter_text: string;
  submitted_at: string;
  created_at: string;
  created_by: string;
  member_user_ids: string[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const AdminFutureLetters = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, g, p] = await Promise.all([
      supabase.from("future_letter_sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("future_letter_responses").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, nickname"),
    ]);
    setSessions((s.data ?? []) as Session[]);
    setGroups((g.data ?? []) as GroupRow[]);
    const map = new Map<string, string>();
    (p.data ?? []).forEach((row: any) => {
      map.set(row.user_id, row.nickname || row.display_name || "sem nome");
    });
    setProfilesById(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (sessionId: string, status: Session["status"]) => {
    const { error } = await supabase
      .from("future_letter_sessions")
      .update({ status })
      .eq("id", sessionId);
    if (error) toast.error("erro ao atualizar status");
    else {
      toast.success(`sessão ${status}`);
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            carta pro futuro
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${sessions.length} sessões · ${groups.length} grupos`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/dinamica/carta-futuro"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-laranja text-perestroika-preto px-5 py-3 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            preview admin
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-3 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            nova sessão
          </button>
        </div>
      </div>

      {sessions.length === 0 && !loading && (
        <div className="rounded-2xl border border-perestroika-preto/15 bg-white/40 p-12 text-center">
          <p className="text-perestroika-preto/60">
            nenhuma sessão criada. crie uma pra começar a dinâmica.
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {sessions.map((s) => {
          const sessionGroups = groups.filter((g) => g.session_id === s.id);
          return (
            <section
              key={s.id}
              className="rounded-2xl border border-perestroika-preto/15 bg-white/50 p-5 sm:p-6"
            >
              <header className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="font-display uppercase text-3xl leading-none">
                    {s.title}
                  </h2>
                  <p className="text-xs uppercase tracking-wide text-perestroika-preto/55 mt-2 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {sessionGroups.length} grupos
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={s.status === "sent" ? "closed" : s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value as Session["status"])}
                    className="px-3 py-1.5 rounded-full text-xs uppercase tracking-wide bg-perestroika-preto/5 border border-perestroika-preto/15"
                  >
                    <option value="draft">rascunho</option>
                    <option value="open">aberta</option>
                    <option value="closed">fechada</option>
                  </select>
                </div>
              </header>

              {s.description && (
                <p className="text-sm text-perestroika-preto/70 mb-4">{s.description}</p>
              )}

              {sessionGroups.length === 0 ? (
                <p className="text-sm text-perestroika-preto/50 italic">
                  nenhum grupo salvou carta ainda.
                </p>
              ) : (
                <div className="grid gap-3">
                  {sessionGroups.map((g) => {
                    return (
                      <article
                        key={g.id}
                        className="rounded-xl bg-perestroika-bege/60 p-4 border border-perestroika-preto/10"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(g.member_user_ids ?? []).map((memberUserId) => (
                              <Badge
                                key={memberUserId}
                                variant="outline"
                                className="text-xs"
                              >
                                {profilesById.get(memberUserId) || memberUserId.slice(0, 6)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-xs text-perestroika-preto/55 mb-2 flex gap-3 flex-wrap">
                          <span>salva: {g.submitted_at ? fmtDate(g.submitted_at) : "—"}</span>
                        </div>

                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto">
                            ver carta
                          </summary>
                          <pre className="mt-2 p-3 rounded-lg bg-white/70 text-sm whitespace-pre-wrap font-body italic text-perestroika-preto/85 max-h-96 overflow-auto">
                            {g.letter_text}
                          </pre>
                        </details>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <CreateSessionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />
    </div>
  );
};

const CreateSessionModal = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [title, setTitle] = useState("Carta pro Futuro - Chŏra 2026");
  const [slug, setSlug] = useState("chora-2026");
  const [description, setDescription] = useState(
    "uma carta coletiva do grupo. quando salvarem, ela fica guardada aqui no admin.",
  );
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("não logado");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("future_letter_sessions").insert({
      slug,
      title,
      description,
      send_at: new Date("2026-05-26T12:00:00-03:00").toISOString(),
      status: "draft",
      created_by: u.user.id,
    });
    setSaving(false);
    if (error) {
      toast.error(`erro: ${error.message}`);
      return;
    }
    toast.success("sessão criada (em rascunho)");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-perestroika-bege border-perestroika-preto/15">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-3xl">
            nova sessão de carta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-perestroika-preto/60">título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/70" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-perestroika-preto/60">slug</label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-white/70" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-perestroika-preto/60">descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/70 min-h-[80px]"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !title || !slug}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide disabled:opacity-40"
          >
            {saving ? "criando…" : "criar sessão (rascunho)"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
