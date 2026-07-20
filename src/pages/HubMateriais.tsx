import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, BookOpen, ExternalLink, FileText, Film, Image as ImageIcon, Link as LinkIcon, RefreshCw, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { useHubMaterials, MATERIAL_CATEGORIES, MATERIAL_KIND_LABELS, type MaterialCategory, type HubMaterial, type MaterialKind, detectKind, materialOpenUrl, autoThumbUrl } from "@/features/hub/useHubMaterials";
import { ReactionBar } from "@/components/hub/ReactionBar";
import { CommentThread } from "@/components/hub/CommentThread";
import { cn } from "@/lib/utils";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

const KIND_ICON: Record<MaterialKind, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  slides: BookOpen,
  link: LinkIcon,
  video: Film,
  image: ImageIcon,
  doc: FileText,
  other: Sparkles,
};

const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;

interface CardProps {
  m: HubMaterial;
  onOpen: (m: HubMaterial) => void;
}

const MaterialCard = ({ m, onOpen }: CardProps) => {
  const kind = (m.kind as MaterialKind) || detectKind(materialOpenUrl(m), m.file_mime);
  const Icon = KIND_ICON[kind] ?? Sparkles;
  const thumb = autoThumbUrl(m);
  const cat = MATERIAL_CATEGORIES.find((c) => c.value === m.category);
  const fresh = isNew(m.created_at);

  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/50 text-left transition-all hover:-translate-y-1 hover:border-perestroika-preto/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-perestroika-preto/5">
        {thumb ? (
          <img src={thumb} alt={m.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-perestroika-bege"
            style={{ background: "linear-gradient(135deg, #6f77fc 0%, #f756a6 100%)" }}
          >
            <Icon className="h-16 w-16 opacity-80" />
          </div>
        )}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-perestroika-preto/85 px-2.5 py-1 font-body text-[10px] uppercase tracking-wide text-perestroika-bege backdrop-blur">
          <Icon className="h-3 w-3" /> {MATERIAL_KIND_LABELS[kind]}
        </span>

        {fresh && (
          <span
            className="absolute right-3 top-3 inline-block rounded-full px-2.5 py-1 font-body text-[10px] uppercase tracking-wide text-perestroika-bege shadow-md"
            style={{ background: "linear-gradient(90deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
          >
            novo
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {cat && (
          <span className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            {cat.emoji} {cat.label}
          </span>
        )}
        <h3 className="font-display text-2xl uppercase leading-tight">{m.title}</h3>
        {m.description && (
          <p className="line-clamp-2 font-body text-sm text-perestroika-preto/70">{m.description}</p>
        )}
      </div>
    </button>
  );
};

/**
 * resolve qual player usar pra cada material.
 * - vídeo youtube/vimeo → iframe embed
 * - vídeo direto (.mp4/.webm/.mov) → <video> nativo com controles
 * - pdf hospedado por nós → <iframe> com #toolbar=1 pra leitor inline
 * - slides google/canva/pitch → iframe embed
 * - imagem → <img> contido
 * - doc/link/other → não embute (drawer mostra CTA "abrir em nova aba")
 */
const resolvePlayer = (
  url: string | null,
  kind: MaterialKind,
): { mode: "iframe" | "video" | "image" | "none"; src?: string } => {
  if (!url) return { mode: "none" };

  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return { mode: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { mode: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };

  if (kind === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return { mode: "video", src: url };
  }

  if (kind === "pdf") {
    // #toolbar=1 ativa controles nativos do chrome/edge
    return { mode: "iframe", src: `${url}#toolbar=1&view=FitH` };
  }

  if (kind === "slides") {
    if (url.includes("docs.google.com/presentation")) {
      return { mode: "iframe", src: url.replace("/edit", "/embed").replace("/pub", "/embed") };
    }
    if (url.includes("canva.com/design")) {
      return { mode: "iframe", src: url.replace("/view", "/view?embed").includes("?embed") ? url : `${url}?embed` };
    }
    if (url.includes("pitch.com")) return { mode: "iframe", src: url };
  }

  if (kind === "image") return { mode: "image", src: url };

  return { mode: "none" };
};

/**
 * iframe com fallback: se o embed não carregar em até 6s, mostra um aviso
 * com cta pra abrir em nova aba. cobre casos de X-Frame-Options/CSP que
 * silenciosamente bloqueiam o embed sem disparar onError.
 */
const EmbedWithFallback = ({
  src,
  title,
  externalUrl,
  className,
}: {
  src: string;
  title: string;
  externalUrl: string | null;
  className?: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, [src]);

  const showFallback = timedOut && !loaded;

  return (
    <div className={cn("relative", className)}>
      <iframe
        src={src}
        title={title}
        className="h-full w-full"
        allowFullScreen
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        onLoad={() => setLoaded(true)}
      />
      {showFallback && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-perestroika-bege/95 p-6 text-center"
        >
          <AlertCircle className="h-6 w-6 text-perestroika-preto/60" />
          <p className="max-w-xs font-body text-sm text-perestroika-preto/75">
            esse material não pôde ser carregado aqui dentro. abre em nova aba pra continuar.
          </p>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90"
            >
              abrir em nova aba <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

const MaterialDrawer = ({ m, onClose }: { m: HubMaterial; onClose: () => void }) => {
  const kind = (m.kind as MaterialKind) || detectKind(materialOpenUrl(m), m.file_mime);
  const url = materialOpenUrl(m);
  const cat = MATERIAL_CATEGORIES.find((c) => c.value === m.category);
  const player = resolvePlayer(url, kind);
  const isExternalOnly = player.mode === "none";

  // a11y: fecha com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-perestroika-preto/60 backdrop-blur-sm"
      />
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 top-4 z-50 mx-auto flex max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-perestroika-bege shadow-2xl sm:inset-4 sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 border-b border-perestroika-preto/10 p-5 sm:p-6">
          <div className="min-w-0">
            {cat && (
              <span className="mb-1 inline-block font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                {cat.emoji} {cat.label} · {MATERIAL_KIND_LABELS[kind]}
              </span>
            )}
            <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">{m.title}</h2>
            {m.description && (
              <p className="mt-2 font-body text-sm text-perestroika-preto/75">{m.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="fechar"
            className="rounded-full bg-perestroika-preto/5 p-2 text-perestroika-preto hover:bg-perestroika-preto/15"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* player por formato */}
          {player.mode === "iframe" && player.src && (
            <EmbedWithFallback
              src={player.src}
              title={m.title}
              externalUrl={url}
              className={cn(
                "mb-6 w-full overflow-hidden rounded-2xl border border-perestroika-preto/10 bg-perestroika-preto/5",
                kind === "pdf" ? "h-[70vh]" : "aspect-video",
              )}
            />
          )}
          {player.mode === "video" && player.src && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-perestroika-preto/10 bg-perestroika-preto">
              <video
                src={player.src}
                controls
                preload="metadata"
                className="aspect-video w-full"
                aria-label={m.title}
              />
            </div>
          )}
          {player.mode === "image" && player.src && (
            <img
              src={player.src}
              alt={m.title}
              className="mb-6 max-h-[70vh] w-full rounded-2xl object-contain"
            />
          )}
          {isExternalOnly && (
            <div className="mb-6 rounded-2xl border-2 border-dashed border-perestroika-preto/20 bg-perestroika-bege/50 p-6 text-center">
              <ExternalLink className="mx-auto mb-2 h-6 w-6 text-perestroika-preto/55" />
              <p className="mb-4 font-body text-sm text-perestroika-preto/75">
                {kind === "doc"
                  ? "documento externo. abre numa aba nova pra leitura confortável."
                  : kind === "link"
                    ? "esse material vive fora da plataforma. abre numa aba nova pra continuar."
                    : "esse formato não embute aqui dentro. abre numa aba nova pra usar."}
              </p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90"
                >
                  abrir em nova aba <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {url && !isExternalOnly && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-8 inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90"
            >
              abrir em nova aba <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="mb-6">
            <p className="mb-3 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/50">reações da turma</p>
            <ReactionBar targetId={m.id} targetKind="material" />
          </div>

          <div>
            <p className="mb-3 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/50">comentários</p>
            <CommentThread targetId={m.id} targetKind="material" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const HubMateriais = () => {
  // escopa materiais pela eletiva ativa do aluno (única matrícula ou
  // a que ele escolheu no switcher). materiais globais (course_id null)
  // continuam aparecendo via `includeGlobal=true` (default do hook).
  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug } = useActiveEletiva();
  const activeCourseId =
    enrollments && enrollments.length === 1
      ? enrollments[0].course_id
      : enrollments?.find((e) => e.course?.slug === activeSlug)?.course_id ?? null;
  const activeCourseTitle =
    enrollments && enrollments.length === 1
      ? enrollments[0].course?.title
      : enrollments?.find((e) => e.course?.slug === activeSlug)?.course?.title ?? null;
  // só materiais da eletiva ativa. globais (course_id null) ficam de fora
  // pra evitar mistura entre as duas eletivas com conteúdo de naturezas
  // bem distintas (ia na prática vs economia circular).
  const { materials, loading, refresh } = useHubMaterials({
    courseId: activeCourseId ?? undefined,
    includeGlobal: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };
  const [activeCategory, setActiveCategory] = useState<MaterialCategory | "todos">("todos");
  const [selected, setSelected] = useState<HubMaterial | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === "todos") return materials;
    return materials.filter((m) => m.category === activeCategory);
  }, [materials, activeCategory]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { todos: materials.length };
    for (const m of materials) counts[m.category] = (counts[m.category] ?? 0) + 1;
    return counts;
  }, [materials]);

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        back={{ to: "/app", label: "voltar" }}
        actions={<AuthedHeaderActions />}
      />

      <main className="container max-w-6xl py-8 sm:py-12">
        <header className="mb-8">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            {activeCourseTitle ? `materiais · ${activeCourseTitle.toLowerCase()}` : "materiais"}
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
            material<br />pra mastigar
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
            apresentações, leituras, ferramentas e referências{activeCourseTitle ? ` dessa eletiva` : ""}. tudo num lugar só.
          </p>
        </header>

        {/* abas categoria */}
        <div className="mb-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex gap-2 pb-1">
            <CategoryChip
              active={activeCategory === "todos"}
              onClick={() => setActiveCategory("todos")}
              label="tudo"
              count={countByCategory.todos}
            />
            {MATERIAL_CATEGORIES.map((c) => {
              const count = countByCategory[c.value] ?? 0;
              if (count === 0 && activeCategory !== c.value) return null;
              return (
                <CategoryChip
                  key={c.value}
                  active={activeCategory === c.value}
                  onClick={() => setActiveCategory(c.value)}
                  label={`${c.emoji} ${c.label}`}
                  count={count}
                />
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[16/10] animate-pulse rounded-3xl bg-perestroika-preto/5" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/40 p-8 sm:p-12 text-center">
            <div className="mx-auto mb-5 w-28 sm:w-32" aria-hidden="true">
              <EletivaSymbol pose="resting" />
            </div>
            {materials.length === 0 ? (
              <>
                <p className="font-display text-3xl sm:text-4xl uppercase text-perestroika-preto/75 leading-none">
                  o ninho ainda tá vazio
                </p>
                <p className="mx-auto mt-3 max-w-md font-body text-sm text-perestroika-preto/65">
                  {activeCourseTitle
                    ? `nenhum material publicado em ${activeCourseTitle.toLowerCase()} por enquanto. o(a) educador(a) solta os primeiros antes do módulo 1.`
                    : "ainda não tem material publicado por aqui. assim que o(a) educador(a) postar, aparece nessa lista."}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl sm:text-4xl uppercase text-perestroika-preto/75 leading-none">
                  nada nessa categoria
                </p>
                <p className="mx-auto mt-3 max-w-md font-body text-sm text-perestroika-preto/65">
                  tenta voltar pra "tudo" e dar uma olhada nas outras categorias.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCategory("todos")}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 bg-perestroika-bege/70 px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/80 hover:border-perestroika-preto/50"
                >
                  ver tudo
                </button>
              </>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege transition hover:opacity-90 disabled:opacity-60"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                {refreshing ? "atualizando" : "atualizar lista"}
              </button>
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/25 bg-perestroika-bege/70 px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-preto/80 hover:border-perestroika-preto/60"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                voltar pro início
              </Link>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {filtered.map((m) => (
              <MaterialCard key={m.id} m={m} onOpen={setSelected} />
            ))}
          </div>
        )}
      </main>

      {selected && <MaterialDrawer m={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const CategoryChip = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-body text-sm transition-all",
      active
        ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
        : "border-perestroika-preto/15 bg-perestroika-bege/50 text-perestroika-preto/75 hover:border-perestroika-preto/40",
    )}
  >
    <span className="lowercase">{label}</span>
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", active ? "bg-perestroika-bege/20" : "bg-perestroika-preto/8")}>
      {count}
    </span>
  </button>
);

export default HubMateriais;
