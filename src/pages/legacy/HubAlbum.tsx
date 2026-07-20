import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowLeft, Camera, ExternalLink, ImagePlus, Sparkles, Users, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { useHubAlbum, useHubSetting, type AlbumPhoto } from "@/features/hub/useHubAlbum";
import { useAuth } from "@/contexts/AuthContext";
import { AlbumPolaroid } from "@/components/hub/AlbumPolaroid";
import { AlbumUploader } from "@/components/hub/AlbumUploader";
import { AlbumLightbox } from "@/components/hub/AlbumLightbox";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { cn } from "@/lib/utils";

type Filter = "tudo" | "minhas";

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

const HubAlbum = () => {
  const { user } = useAuth();
  const { photos, loading, uploading, stats, upload, remove } = useHubAlbum();
  const { value: officialUrl } = useHubSetting("official_photos_url");
  const [filter, setFilter] = useState<Filter>("tudo");
  const [showUpload, setShowUpload] = useState(false);
  const [active, setActive] = useState<AlbumPhoto | null>(null);

  const filtered = useMemo(() => {
    if (filter === "minhas") return photos.filter((p) => p.user_id === user?.id);
    return photos;
  }, [photos, filter, user?.id]);

  const myCount = useMemo(
    () => (user ? photos.filter((p) => p.user_id === user.id).length : 0),
    [photos, user],
  );

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        actions={
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> hub
          </Link>
        }
      />

      <main className="container max-w-6xl py-8 sm:py-12">
        {/* hero */}
        <header className="mb-10">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            hub · álbum
          </p>
          <div className="flex items-end gap-3">
            <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
              álbum<br />do chŏra
            </h1>
            <LagrimaGradient className="hidden h-16 w-auto sm:block" />
          </div>
          <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
            o que rolou, pelo olhar de quem tava lá. manda tuas fotos e constrói o registro coletivo da turma 📸
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/55">
            <span className="rounded-full bg-perestroika-preto/5 px-3 py-1.5">
              {stats.total} foto{stats.total === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-perestroika-preto/5 px-3 py-1.5">
              {stats.contributors} builder{stats.contributors === 1 ? "" : "s"} contribuíram
            </span>
            {myCount > 0 && (
              <span
                className="rounded-full px-3 py-1.5 text-perestroika-bege"
                style={{ background: "linear-gradient(90deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
              >
                tu mandou {myCount}
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-all hover:opacity-90"
            >
              <ImagePlus className="h-4 w-4" /> mandar foto
            </button>

            {officialUrl && (
              <a
                href={officialUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 bg-perestroika-bege/40 px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-preto hover:border-perestroika-preto hover:bg-perestroika-bege/70"
              >
                <Sparkles className="h-4 w-4" /> fotos oficiais do evento
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </header>

        {/* faixa fotógrafo oficial */}
        {officialUrl ? (
          <a
            href={officialUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="group relative mb-10 block overflow-hidden rounded-3xl border border-perestroika-preto/15 p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{
              background: "linear-gradient(110deg, #6f77fc 0%, #f756a6 50%, #fd4644 100%)",
            }}
          >
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4 sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-perestroika-bege/95 text-perestroika-preto shadow-lg">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-bege/85">
                    do fotógrafo do evento
                  </p>
                  <h2 className="font-display text-2xl uppercase leading-none text-perestroika-bege sm:text-3xl">
                    galeria oficial
                  </h2>
                  <p className="mt-1 font-body text-sm text-perestroika-bege/85">
                    as fotos curadas, em alta resolução, prontas pra baixar
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors group-hover:bg-perestroika-bege group-hover:text-perestroika-preto sm:self-center">
                abrir <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </div>
          </a>
        ) : (
          <div className="mb-10 rounded-3xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/30 p-5 text-center">
            <p className="font-body text-sm text-perestroika-preto/65">
              as fotos oficiais do fotógrafo aparecem aqui assim que forem liberadas. fica de olho 👀
            </p>
          </div>
        )}

        {/* filtros */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="inline-flex gap-2">
            <FilterChip
              active={filter === "tudo"}
              onClick={() => setFilter("tudo")}
              label="tudo"
              count={photos.length}
            />
            {user && (
              <FilterChip
                active={filter === "minhas"}
                onClick={() => setFilter("minhas")}
                label="minhas"
                count={myCount}
                icon={<Heart className="h-3 w-3" />}
              />
            )}
          </div>
        </div>

        {/* mosaico */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-sm bg-perestroika-preto/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            mine={filter === "minhas"}
            onUpload={() => setShowUpload(true)}
          />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {filtered.map((p) => {
              const isFresh = Date.now() - new Date(p.created_at).getTime() < FRESH_WINDOW_MS;
              return (
                <AlbumPolaroid
                  key={p.id}
                  photo={p}
                  isMine={p.user_id === user?.id}
                  isFresh={isFresh}
                  onClick={() => setActive(p)}
                />
              );
            })}
          </motion.div>
        )}

        {/* CTA flutuante mobile */}
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          aria-label="mandar foto"
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-perestroika-bege shadow-2xl transition-transform hover:scale-110 sm:hidden"
          style={{ background: "linear-gradient(135deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
        >
          <ImagePlus className="h-6 w-6" />
        </button>
      </main>

      <AlbumUploader
        open={showUpload}
        onClose={() => setShowUpload(false)}
        uploading={uploading}
        onUpload={upload}
      />
      <AlbumLightbox
        photo={active}
        photos={filtered}
        onClose={() => setActive(null)}
        onNavigate={setActive}
        onDelete={remove}
      />
    </div>
  );
};

const FilterChip = ({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-sm transition-all",
      active
        ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
        : "border-perestroika-preto/15 bg-perestroika-bege/50 text-perestroika-preto/75 hover:border-perestroika-preto/40",
    )}
  >
    {icon}
    <span className="lowercase">{label}</span>
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
        active ? "bg-perestroika-bege/20" : "bg-perestroika-preto/8",
      )}
    >
      {count}
    </span>
  </button>
);

const EmptyState = ({ mine, onUpload }: { mine: boolean; onUpload: () => void }) => (
  <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/30 p-12 text-center">
    <div
      className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-perestroika-bege shadow-md"
      style={{ background: "linear-gradient(135deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
    >
      <Camera className="h-8 w-8" />
    </div>
    <p className="font-display text-3xl uppercase text-perestroika-preto/75">
      {mine ? "tu ainda não postou nada" : "ainda ninguém postou"}
    </p>
    <p className="mx-auto mt-2 max-w-sm font-body text-sm text-perestroika-preto/55">
      {mine
        ? "manda a primeira foto e começa o teu registro do chŏra 🤙"
        : "seja o primeiro a entrar pro álbum coletivo. uma foto já vale 🤙"}
    </p>
    <button
      type="button"
      onClick={onUpload}
      className="mt-5 inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90"
    >
      <ImagePlus className="h-4 w-4" /> mandar foto
    </button>
  </div>
);

export default HubAlbum;
