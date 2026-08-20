import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { ReactionBar } from "@/components/hub/ReactionBar";
import { CommentThread } from "@/components/hub/CommentThread";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import type { AlbumPhoto } from "@/features/hub/useHubAlbum";

interface Props {
  photo: AlbumPhoto | null;
  photos: AlbumPhoto[];
  onClose: () => void;
  onNavigate: (photo: AlbumPhoto) => void;
  onDelete: (photo: AlbumPhoto) => Promise<void>;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const AlbumLightbox = ({ photo, photos, onClose, onNavigate, onDelete }: Props) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const idx = photo ? photos.findIndex((p) => p.id === photo.id) : -1;
  const prev = idx > 0 ? photos[idx - 1] : null;
  const next = idx >= 0 && idx < photos.length - 1 ? photos[idx + 1] : null;

  const goPrev = useCallback(() => {
    if (prev) onNavigate(prev);
  }, [prev, onNavigate]);
  const goNext = useCallback(() => {
    if (next) onNavigate(next);
  }, [next, onNavigate]);

  useEffect(() => {
    if (!photo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photo, onClose, goPrev, goNext]);

  if (!photo) return null;

  const author = photo.author?.nickname || photo.author?.display_name || "anônimo";
  const canDelete = user?.id === photo.user_id || isAdmin;

  const handleDelete = async () => {
    if (!confirm("apagar essa foto do álbum?")) return;
    try {
      await onDelete(photo);
      toast.success("foto removida");
      if (next) onNavigate(next);
      else if (prev) onNavigate(prev);
      else onClose();
    } catch {
      toast.error("não consegui apagar");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-perestroika-preto/85 backdrop-blur-md"
      />
      <motion.div
        key="content"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex flex-col overflow-y-auto sm:flex-row"
        role="dialog"
        aria-modal="true"
      >
        {/* foto */}
        <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="fechar"
            className="absolute right-4 top-4 z-10 rounded-full bg-perestroika-bege/15 p-2.5 text-perestroika-bege backdrop-blur hover:bg-perestroika-bege/25 sm:right-6 sm:top-6"
          >
            <X className="h-5 w-5" />
          </button>

          {prev && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="foto anterior"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-perestroika-bege/15 p-2.5 text-perestroika-bege backdrop-blur hover:bg-perestroika-bege/25 sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {next && (
            <button
              type="button"
              onClick={goNext}
              aria-label="próxima foto"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-perestroika-bege/15 p-2.5 text-perestroika-bege backdrop-blur hover:bg-perestroika-bege/25 sm:right-4"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <motion.img
            key={photo.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            src={photo.url}
            alt={photo.caption ?? `foto de ${author}`}
            className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* lateral / inferior — info, reactions, comments */}
        <aside
          onClick={(e) => e.stopPropagation()}
          className="flex w-full flex-col bg-perestroika-bege text-perestroika-preto sm:w-[380px] sm:max-w-[40vw]"
        >
          <div className="border-b border-perestroika-preto/15 p-5 sm:p-6">
            <p className="mb-1 font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
              álbum coletivo · {idx + 1} de {photos.length}
            </p>
            <h3 className="font-display text-2xl uppercase leading-none">@{author}</h3>
            {photo.caption && (
              <p className="mt-2 font-body text-sm italic text-perestroika-preto/80">
                "{photo.caption}"
              </p>
            )}
            <p className="mt-2 font-body text-[11px] lowercase text-perestroika-preto/50">
              {formatDate(photo.created_at)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer noopener"
                download
                className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto/5 px-3 py-1.5 font-body text-[11px] uppercase tracking-wide text-perestroika-preto/75 hover:bg-perestroika-preto/10"
              >
                <Download className="h-3 w-3" /> baixar
              </a>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-vermelho/10 px-3 py-1.5 font-body text-[11px] uppercase tracking-wide text-perestroika-vermelho hover:bg-perestroika-vermelho/20"
                >
                  <Trash2 className="h-3 w-3" /> apagar
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <p className="mb-3 font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
              reações
            </p>
            <ReactionBar targetId={photo.id} targetKind="album_photo" />

            <div className="mt-6">
              <p className="mb-3 font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                comentários
              </p>
              <CommentThread targetId={photo.id} targetKind="album_photo" />
            </div>
          </div>
        </aside>
      </motion.div>
    </AnimatePresence>
  );
};
