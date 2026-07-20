import { useState } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStudentNotes } from "./useAdminStudentNotes";

interface Props {
  userId: string;
}

export const StudentInternalNotes = ({ userId }: Props) => {
  const { user } = useAuth();
  const { notes, isLoading, create, creating, remove, removing } = useAdminStudentNotes(userId);
  const [draft, setDraft] = useState("");

  const submit = async () => {
    try {
      await create(draft);
      setDraft("");
      toast.success("nota salva");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-3 mb-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          rows={3}
          placeholder="observação interna sobre esse estudante. aceita **negrito**, listas, [link](url). não chega no estudante."
          className="bg-transparent border-0 focus-visible:ring-0 p-0 text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-perestroika-preto/40">{draft.length}/4000 · privado entre admins</span>
          <button
            type="button"
            onClick={submit}
            disabled={creating || draft.trim().length < 1}
            className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-[11px] uppercase tracking-wide disabled:opacity-40 min-h-[36px]"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            salvar
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-perestroika-preto/55">carregando notas…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs italic text-perestroika-preto/40">nenhuma nota interna ainda</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-perestroika-preto/10 bg-perestroika-bege/60 p-3">
              <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase tracking-wide text-perestroika-preto/55">
                <span>{n.author_name ?? "admin"} · {new Date(n.created_at).toLocaleString("pt-BR")}</span>
                {user?.id === n.author_id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("apagar essa nota?")) return;
                      try {
                        await remove(n.id);
                        toast.success("nota removida");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    disabled={removing}
                    className="inline-flex items-center gap-1 hover:text-[#fd4644]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <FeedbackMarkdown>{n.body_md}</FeedbackMarkdown>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
