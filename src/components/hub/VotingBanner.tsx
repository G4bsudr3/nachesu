import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Vote, Trophy, Sparkles } from "lucide-react";
import { useActiveVotingSession, useMyVote } from "@/features/votacao/useProjectVoting";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const fmtRemaining = (iso: string | null): string => {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "encerrando";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `fecha em ${d}d ${h % 24}h`;
  }
  if (h > 0) return `fecha em ${h}h ${m}m`;
  return `fecha em ${m}m`;
};

export const VotingBanner = ({ onJumpToFeed }: { onJumpToFeed?: () => void }) => {
  const { session } = useActiveVotingSession();
  const { vote } = useMyVote(session?.id ?? null);
  const [votedTitle, setVotedTitle] = useState<string | null>(null);
  const [, force] = useState(0);

  // tick por minuto pra atualizar o countdown
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!vote?.project_id) {
      setVotedTitle(null);
      return;
    }
    supabase
      .from("hub_projects")
      .select("title")
      .eq("id", vote.project_id)
      .maybeSingle()
      .then(({ data }) => setVotedTitle((data as { title: string } | null)?.title ?? null));
  }, [vote?.project_id]);

  if (!session) return null;

  if (session.status === "closed") {
    return (
      <Link
        to="/app/hub/projetos/ranking"
        className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-perestroika-preto/15 bg-perestroika-preto px-5 py-4 text-perestroika-bege transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-perestroika-bege/15 p-2">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-bege/60">
              {session.title}
            </p>
            <p className="font-display text-2xl uppercase leading-none">ranking saiu 🔥</p>
          </div>
        </div>
        <span className="font-body text-xs uppercase tracking-wide opacity-80">ver top 10 →</span>
      </Link>
    );
  }

  // open
  const remaining = fmtRemaining(session.closes_at);
  const hasVoted = !!vote;

  return (
    <div
      className={cn(
        "mb-6 overflow-hidden rounded-3xl border px-5 py-4",
        hasVoted
          ? "border-perestroika-azul/30 bg-perestroika-azul/8"
          : "border-perestroika-preto/15 bg-white/70",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-full p-2",
              hasVoted ? "bg-perestroika-azul/20 text-perestroika-azul" : "bg-perestroika-preto/8 text-perestroika-preto",
            )}
          >
            {hasVoted ? <Sparkles className="h-5 w-5" /> : <Vote className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
              {session.title} {remaining && <span>· {remaining}</span>}
            </p>
            {hasVoted ? (
              <p className="font-body text-sm text-perestroika-preto">
                tu votou em <span className="font-semibold">{votedTitle ?? "um projeto"}</span>. dá pra trocar enquanto tá aberto.
              </p>
            ) : (
              <p className="font-body text-sm text-perestroika-preto">
                vota num projeto que te marcou. <span className="font-semibold">só 1</span>, e não pode ser o teu.
              </p>
            )}
          </div>
        </div>
        {!hasVoted && (
          <button
            type="button"
            onClick={onJumpToFeed}
            className="rounded-full bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-transform hover:-translate-y-0.5"
          >
            votar agora
          </button>
        )}
      </div>
    </div>
  );
};
