import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { ReactionBar } from "@/components/hub/ReactionBar";
import {
  useActiveVotingSession,
  useTopTen,
  useMyVoteResult,
} from "@/features/votacao/useProjectVoting";
import { cn } from "@/lib/utils";

const linkHost = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const HubProjetosRanking = () => {
  const { session, loading: loadingSession } = useActiveVotingSession();
  const { rows, loading } = useTopTen(session?.id ?? null);
  const myResult = useMyVoteResult(session?.id ?? null, session?.status === "closed");
  const topRef = useRef<HTMLDivElement>(null);

  const isOpen = session?.status === "open";
  const isClosed = session?.status === "closed";

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app/hub"
        actions={
          <Link
            to="/app/hub/projetos"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> projetos
          </Link>
        }
      />

      <main className="container max-w-3xl py-8 sm:py-12" ref={topRef}>
        <header className="mb-10">
          <p className="mb-3 inline-flex items-center gap-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            <Trophy className="h-3.5 w-3.5" /> {session?.title ?? "ranking"}
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
            top 10<br />da turma
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
            os 10 projetos mais votados pela própria turma. quem ficou fora não aparece, ninguém precisa saber.
          </p>
        </header>

        {loadingSession || loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-perestroika-preto/5" />
            ))}
          </div>
        ) : !session ? (
          <EmptyState message="ainda não rolou votação por aqui." />
        ) : isOpen ? (
          <EmptyState message="votação tá rolando agora. o ranking sai quando fechar." />
        ) : rows.length === 0 ? (
          <EmptyState message="nenhum voto registrado nessa sessão." />
        ) : (
          <div className="grid gap-5">
            {rows.map((r) => (
              <RankCard key={r.project_id} row={r} />
            ))}
          </div>
        )}

        {isClosed && myResult && !myResult.in_top_ten && (
          <div className="mt-8 rounded-3xl border border-perestroika-azul/25 bg-perestroika-azul/8 px-5 py-4">
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-azul">
              o teu voto
            </p>
            <p className="mt-1 font-body text-sm text-perestroika-preto">
              tu votou em <span className="font-semibold">{myResult.title}</span>. ele recebeu{" "}
              <span className="font-semibold">{myResult.vote_count}</span>{" "}
              {myResult.vote_count === 1 ? "voto" : "votos"}. só tu vê isso.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-white/40 px-6 py-16 text-center">
    <Trophy className="mx-auto mb-4 h-8 w-8 text-perestroika-preto/40" />
    <p className="mx-auto max-w-sm font-body text-sm text-perestroika-preto/65">{message}</p>
  </div>
);

const RankCard = ({ row }: { row: { rank: number; project_id: string; title: string; description: string; link: string; cover_url: string | null; tags: string[]; author_user_id: string; author_display_name: string | null; author_nickname: string | null; vote_count: number } }) => {
  const isFirst = row.rank === 1;
  const isPodium = row.rank <= 3;
  const author = row.author_nickname || row.author_display_name || "alguém";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border shadow-sm",
        isFirst
          ? "border-perestroika-preto/20 bg-white"
          : isPodium
            ? "border-perestroika-preto/15 bg-white/85"
            : "border-perestroika-preto/10 bg-white/60",
      )}
    >
      {isFirst && (
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            background:
              "linear-gradient(90deg, #fe7b02 0%, #fd4644 30%, #f756a6 60%, #6f77fc 100%)",
          }}
        />
      )}

      {row.cover_url && (
        <a
          href={row.link}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "block w-full overflow-hidden bg-perestroika-preto/5",
            isFirst ? "aspect-[16/9]" : "aspect-[16/7]",
          )}
        >
          <img
            src={row.cover_url}
            alt={row.title}
            className="h-full w-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        </a>
      )}

      <div className="space-y-3 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "shrink-0 rounded-2xl px-3 py-2 text-center",
              isFirst
                ? "bg-perestroika-preto text-perestroika-bege"
                : isPodium
                  ? "bg-perestroika-preto/10 text-perestroika-preto"
                  : "bg-perestroika-preto/5 text-perestroika-preto/80",
            )}
          >
            <p className="font-body text-[9px] uppercase tracking-[0.2em] opacity-70">
              {isFirst ? "1º lugar" : `${row.rank}º`}
            </p>
            <p
              className={cn(
                "font-display leading-none",
                isFirst ? "text-5xl" : isPodium ? "text-3xl" : "text-2xl",
              )}
            >
              #{row.rank}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "font-display uppercase leading-[0.95] text-perestroika-preto",
                isFirst ? "text-3xl sm:text-4xl" : "text-2xl",
              )}
            >
              {row.title}
            </h3>
            <p className="mt-1 font-body text-xs text-perestroika-preto/55">por {author}</p>
            <p className="mt-2 font-body text-sm text-perestroika-preto/85 line-clamp-3">
              {row.description}
            </p>
          </div>

          {isFirst && (
            <div className="hidden shrink-0 sm:block">
              <LagrimaGradient className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-perestroika-preto/10 pt-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-xs",
                isFirst
                  ? "bg-perestroika-laranja/15 text-perestroika-laranja"
                  : "bg-perestroika-preto/8 text-perestroika-preto/75",
              )}
            >
              <Trophy className="h-3.5 w-3.5" />
              {row.vote_count} {row.vote_count === 1 ? "voto" : "votos"}
            </span>
            <ReactionBar targetId={row.project_id} targetKind="project" size="sm" />
          </div>

          <a
            href={row.link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-perestroika-azul hover:underline"
          >
            {linkHost(row.link)} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </motion.article>
  );
};

export default HubProjetosRanking;
