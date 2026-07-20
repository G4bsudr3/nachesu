import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Plus, Sparkles, Pencil, Trash2, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useHubFeed, type FeedItem } from "@/features/hub/useHubFeed";
import { useMyProjects, type HubProject } from "@/features/hub/useMyProjects";
import { ReactionBar } from "@/components/hub/ReactionBar";
import { CommentThread } from "@/components/hub/CommentThread";
import { ProjectFormModal } from "@/features/hub/ProjectFormModal";
import { VotingBanner } from "@/components/hub/VotingBanner";
import { VoteButton } from "@/components/hub/VoteButton";
import { toast } from "sonner";

const formatRel = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

const linkPreviewHost = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

interface CardProps {
  item: FeedItem;
  isMine: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const FeedCard = ({ item, isMine, expanded, onToggle, onEdit, onDelete }: CardProps) => {
  const author = item.author.nickname || item.author.display_name || "alguém";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/60 shadow-sm"
    >
      {item.cover_url && (
        <a href={item.link} target="_blank" rel="noreferrer noopener" className="block aspect-[16/9] w-full overflow-hidden bg-perestroika-preto/5">
          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
        </a>
      )}

      <div className="space-y-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 font-body text-[10px] uppercase tracking-[0.18em] text-perestroika-preto/55">
              <span>{formatRel(item.created_at)}</span>
            </div>
            <h3 className="font-display text-2xl uppercase leading-[0.95] text-perestroika-preto sm:text-3xl">
              {item.title}
            </h3>
            <p className="mt-1 font-body text-xs text-perestroika-preto/55">
              por {author}
            </p>
          </div>

          {isMine && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onEdit}
                aria-label="editar"
                className="rounded-full border border-perestroika-preto/15 p-1.5 text-perestroika-preto/60 hover:border-perestroika-preto/40 hover:text-perestroika-preto"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label="apagar"
                className="rounded-full border border-perestroika-preto/15 p-1.5 text-perestroika-preto/60 hover:border-perestroika-vermelho hover:text-perestroika-vermelho"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <p className="whitespace-pre-wrap font-body text-sm text-perestroika-preto/85">
          {item.description}
        </p>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-perestroika-preto/8 px-2 py-0.5 font-body text-[11px] text-perestroika-preto/70"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <a
          href={item.link}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-perestroika-azul hover:underline"
        >
          {linkPreviewHost(item.link)} <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-perestroika-preto/10 pt-3">
          <ReactionBar targetId={item.id} targetKind={item.kind} size="sm" />
          <div className="flex items-center gap-2">
            <VoteButton projectId={item.id} projectOwnerId={item.user_id} />
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/15 px-3 py-1 font-body text-xs text-perestroika-preto/70 hover:border-perestroika-preto/40 hover:text-perestroika-preto"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {expanded ? "fechar" : "comentar"}
            </button>
          </div>
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25 }}
            className="border-t border-perestroika-preto/10 pt-3"
          >
            <CommentThread targetId={item.id} targetKind={item.kind} />
          </motion.div>
        )}
      </div>
    </motion.article>
  );
};

const HubProjetos = () => {
  const { user } = useAuth();
  const { items, loading, refresh } = useHubFeed();
  const { remove } = useMyProjects();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HubProject | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // só projetos
  const projects = useMemo(() => items.filter((i) => i.kind === "project"), [items]);

  const handleDelete = async (id: string) => {
    if (!confirm("apagar esse projeto? não dá pra desfazer.")) return;
    const r = await remove(id);
    if (r.ok) {
      toast.success("apagado");
      refresh();
    } else {
      toast.error(r.error ?? "erro");
    }
  };

  const handleEdit = (item: FeedItem) => {
    setEditing({
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      description: item.description,
      link: item.link,
      cover_url: item.cover_url,
      tags: item.tags,
      created_at: item.created_at,
      updated_at: item.created_at,
    } as HubProject);
    setModalOpen(true);
  };

  const scrollToFeed = () => {
    feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app/hub"
        actions={
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> hub
          </Link>
        }
      />

      <main className="container max-w-3xl py-8 sm:py-12">
        <header className="mb-8">
          <p className="mb-3 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            o feed da turma
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
            projetos<br />que tão saindo<br />do forno
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
            os builds livres da turma. reage, comenta, posta o teu 🚀
          </p>
        </header>

        <VotingBanner onJumpToFeed={scrollToFeed} />

        <div ref={feedRef} className="mb-6 flex flex-wrap items-center justify-end gap-3">
          {user && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              postar projeto
            </button>
          )}
        </div>

        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-perestroika-preto/5" />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/40 px-6 py-16 text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 text-perestroika-preto/40" />
            <h3 className="font-display text-2xl uppercase text-perestroika-preto">
              feed vazio por enquanto
            </h3>
            <p className="mx-auto mt-2 max-w-xs font-body text-sm text-perestroika-preto/65">
              seja a primeira pessoa a postar. quem começa vira referência 🤙
            </p>
            {user && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege"
              >
                <Plus className="h-3.5 w-3.5" />
                abrir o feed
              </button>
            )}
          </div>
        )}

        <div className="grid gap-5">
          {projects.map((item) => (
            <FeedCard
              key={`${item.kind}-${item.id}`}
              item={item}
              isMine={user?.id === item.user_id}
              expanded={expanded === `${item.kind}-${item.id}`}
              onToggle={() =>
                setExpanded((cur) =>
                  cur === `${item.kind}-${item.id}` ? null : `${item.kind}-${item.id}`,
                )
              }
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      </main>

      <ProjectFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
        editing={editing}
      />
    </div>
  );
};

export default HubProjetos;
