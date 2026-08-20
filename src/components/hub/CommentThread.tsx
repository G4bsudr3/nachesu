import { useEffect, useState } from "react";
import { useComments, type CommentTargetKind, type HubCommentGif } from "@/features/hub/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, ImagePlay, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GifPicker } from "@/components/hub/GifPicker";

interface Props {
  targetId: string;
  targetKind?: CommentTargetKind;
}

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

export const CommentThread = ({ targetId, targetKind = "submission" }: Props) => {
  const { user } = useAuth();
  const { comments, myComment, loading, saving, upsert, remove } = useComments(targetId, targetKind);
  const [draft, setDraft] = useState("");
  const [gif, setGif] = useState<HubCommentGif | null>(null);
  const [editing, setEditing] = useState(false);

  // só popula draft + gif quando o usuário escolhe editar
  useEffect(() => {
    if (editing && myComment) {
      setDraft(myComment.body ?? "");
      setGif(myComment.gif ?? null);
    }
  }, [editing, myComment]);

  const submit = async () => {
    const r = await upsert({ body: draft, gif });
    if (r.ok) {
      setDraft("");
      setGif(null);
      setEditing(false);
      toast.success(editing ? "comentário atualizado" : "mandado 🤙");
    } else if (r.error) {
      toast.error(r.error);
    }
  };

  const canSend = (draft.trim().length > 0 || Boolean(gif?.url)) && !saving;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {loading && <div className="font-body text-sm text-perestroika-preto/50">carregando comentários…</div>}
        {!loading && comments.length === 0 && (
          <div className="rounded-xl border border-dashed border-perestroika-preto/15 bg-perestroika-bege/30 px-4 py-6 text-center font-body text-sm text-perestroika-preto/55">
            ainda sem comentários. quebra o silêncio.
          </div>
        )}
        {!loading &&
          comments.map((c) => {
            const isMine = user?.id === c.user_id;
            const name = c.author.nickname || c.author.display_name || "alguém";
            return (
              <div key={c.id} className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/50 px-4 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm font-semibold text-perestroika-preto">{name}</span>
                    <span className="font-body text-xs text-perestroika-preto/45">{formatRelative(c.created_at)}{c.edited && " · editado"}</span>
                  </div>
                  {isMine && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        aria-label="editar comentário"
                        className="text-perestroika-preto/60 hover:text-perestroika-preto"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove()}
                        aria-label="apagar comentário"
                        className="text-perestroika-preto/60 hover:text-perestroika-vermelho"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {c.body && <p className="whitespace-pre-wrap font-body text-sm text-perestroika-preto/85">{c.body}</p>}
                {c.gif?.url && (
                  <img src={c.gif.preview_url || c.gif.url} alt="gif" className="mt-2 max-h-48 rounded-xl" loading="lazy" />
                )}
              </div>
            );
          })}
      </div>

      {user && (
        <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/70 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={editing ? "edite o seu comentário…" : "deixe um comentário…"}
            maxLength={280}
            rows={2}
            className="w-full resize-none bg-transparent font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/60 focus:outline-none"
          />

          {gif?.url && (
            <div className="relative mt-2 inline-block">
              <img
                src={gif.preview_url || gif.url}
                alt="gif escolhido"
                className="max-h-32 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setGif(null)}
                aria-label="remover gif"
                className="absolute -right-2 -top-2 rounded-full bg-perestroika-preto p-1 text-perestroika-bege shadow-md hover:bg-perestroika-vermelho"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-perestroika-preto/60">{draft.length}/280</span>
              <GifPicker
                onPick={(g) =>
                  setGif({
                    url: g.url,
                    preview_url: g.preview_url,
                    provider: "giphy",
                  })
                }
                trigger={
                  <button
                    type="button"
                    aria-label="adicionar gif"
                    className="inline-flex items-center gap-1 rounded-full border border-perestroika-preto/15 px-2.5 py-1 font-body text-xs text-perestroika-preto/70 transition-all hover:border-perestroika-preto/30 hover:text-perestroika-preto"
                  >
                    <ImagePlay className="h-3.5 w-3.5" />
                    gif
                  </button>
                }
              />
            </div>
            <div className="flex items-center gap-2">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft("");
                    setGif(null);
                  }}
                  className="font-body text-xs text-perestroika-preto/50 hover:text-perestroika-preto"
                >
                  cancelar
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                className={cn(
                  "rounded-full bg-perestroika-preto px-4 py-1.5 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-opacity",
                  "disabled:opacity-40",
                )}
              >
                {saving ? "enviando…" : editing ? "atualizar" : "enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
