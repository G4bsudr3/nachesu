import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Vote, Sparkles, Rocket, X } from "lucide-react";
import { useActiveVotingSession, useMyVote } from "@/features/votacao/useProjectVoting";
import { useMyProjects } from "@/features/hub/useMyProjects";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Banner global que aparece em todas as páginas /app enquanto a votação
 * tá aberta. Esconde nas páginas que já tem o VotingBanner próprio
 * (HubProjetos e ranking) pra não duplicar.
 */
export const GlobalVotingBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { session } = useActiveVotingSession();
  const { vote } = useMyVote(session?.id ?? null);
  const { projects, loading: loadingProjects } = useMyProjects();
  const [dismissed, setDismissed] = useState(false);

  // só mostra logado, em rotas /app, com sessão aberta
  if (!user) return null;
  if (!location.pathname.startsWith("/app")) return null;
  if (!session || session.status !== "open") return null;
  if (dismissed) return null;

  // não duplica nas páginas que já tem banner próprio
  const path = location.pathname;
  if (
    path.startsWith("/app/hub/projetos") ||
    path === "/app/pending" ||
    path === "/app/conta"
  ) {
    return null;
  }

  if (loadingProjects) return null;

  const hasProject = projects.length > 0;
  const hasVoted = !!vote;

  // 3 estados de copy + cta
  let icon = <Rocket className="h-4 w-4" />;
  let label = "publica teu projeto";
  let text = "tá rolando votação. publica o teu pra entrar na disputa.";
  let cta = "publicar agora";
  let ctaTo = "/app/hub/projetos?new=1";
  let tone: "alert" | "info" | "done" = "alert";

  if (hasProject && !hasVoted) {
    icon = <Vote className="h-4 w-4" />;
    label = "vota no teu favorito";
    text = "escolhe 1 projeto da turma que te marcou.";
    cta = "ir votar";
    ctaTo = "/app/hub/projetos";
    tone = "info";
  } else if (hasProject && hasVoted) {
    icon = <Sparkles className="h-4 w-4" />;
    label = "voto registrado 🤙";
    text = "dá pra trocar enquanto a votação tá aberta.";
    cta = "ver projetos";
    ctaTo = "/app/hub/projetos";
    tone = "done";
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-40 w-full border-b font-body text-perestroika-preto",
        tone === "alert" && "border-perestroika-laranja/30 bg-perestroika-laranja/12",
        tone === "info" && "border-perestroika-azul/30 bg-perestroika-azul/10",
        tone === "done" && "border-perestroika-preto/15 bg-perestroika-bege",
      )}
      role="region"
      aria-label="aviso de votação"
    >
      <div className="container flex items-center gap-3 px-4 py-2.5">
        <span
          className={cn(
            "hidden shrink-0 rounded-full p-1.5 sm:inline-flex",
            tone === "alert" && "bg-perestroika-laranja/20 text-perestroika-laranja",
            tone === "info" && "bg-perestroika-azul/20 text-perestroika-azul",
            tone === "done" && "bg-perestroika-preto/10 text-perestroika-preto/70",
          )}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
            <span className="font-display text-sm uppercase tracking-wide sm:text-base">
              {label}
            </span>
            <span className="text-xs text-perestroika-preto/70 sm:text-sm">{text}</span>
          </p>
        </div>

        <Link
          to={ctaTo}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-transform hover:-translate-y-0.5 sm:text-sm",
            tone === "alert" && "bg-perestroika-preto text-perestroika-bege hover:bg-perestroika-preto/90",
            tone === "info" && "bg-perestroika-azul text-white hover:bg-perestroika-azul/90",
            tone === "done" && "bg-perestroika-preto text-perestroika-bege hover:bg-perestroika-preto/90",
          )}
        >
          {cta}
        </Link>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-perestroika-preto/50 transition-colors hover:bg-perestroika-preto/10 hover:text-perestroika-preto"
          aria-label="fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
