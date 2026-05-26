import { useState } from "react";
import { Vote, Check } from "lucide-react";
import { toast } from "sonner";
import { useActiveVotingSession, useMyVote } from "@/features/votacao/useProjectVoting";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  projectOwnerId: string;
}

export const VoteButton = ({ projectId, projectOwnerId }: Props) => {
  const { user } = useAuth();
  const { session } = useActiveVotingSession();
  const { vote, castVote, removeVote } = useMyVote(session?.id ?? null);
  const [busy, setBusy] = useState(false);

  if (!session || session.status !== "open" || !user) return null;

  const isOwn = user.id === projectOwnerId;
  if (isOwn) {
    return (
      <span className="font-body text-[11px] italic text-perestroika-preto/45">
        teu projeto · não dá pra votar no próprio
      </span>
    );
  }

  const isMyVote = vote?.project_id === projectId;
  const hasOtherVote = !!vote && !isMyVote;

  const handleClick = async () => {
    if (busy) return;
    if (isMyVote) {
      if (!confirm("tirar teu voto desse projeto?")) return;
      setBusy(true);
      const r = await removeVote();
      setBusy(false);
      if (r.ok) toast.success("voto removido");
      else toast.error(r.error ?? "erro");
      return;
    }
    if (hasOtherVote) {
      if (!confirm("tu já votou em outro. trocar pra esse?")) return;
    }
    setBusy(true);
    const r = await castVote(projectId);
    setBusy(false);
    if (r.ok) toast.success(hasOtherVote ? "voto trocado" : "voto registrado");
    else toast.error(r.error ?? "erro ao votar");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-xs uppercase tracking-wide transition-all disabled:opacity-50",
        isMyVote
          ? "border-perestroika-azul bg-perestroika-azul text-white hover:bg-perestroika-azul/90"
          : hasOtherVote
            ? "border-perestroika-preto/20 bg-white/60 text-perestroika-preto/70 hover:border-perestroika-azul hover:text-perestroika-azul"
            : "border-perestroika-preto/20 bg-white/60 text-perestroika-preto hover:border-perestroika-preto/50",
      )}
    >
      {isMyVote ? <Check className="h-3.5 w-3.5" /> : <Vote className="h-3.5 w-3.5" />}
      {isMyVote ? "teu voto" : hasOtherVote ? "trocar pra esse" : "votar nesse"}
    </button>
  );
};
