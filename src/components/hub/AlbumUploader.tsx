import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import type { AlbumPhoto } from "@/features/hub/useHubAlbum";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Props {
  open: boolean;
  onClose: () => void;
  uploading: boolean;
  onUpload: (files: File[], caption?: string) => Promise<AlbumPhoto[]>;
}

export const AlbumUploader = ({ open, onClose, uploading, onUpload }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setCaption("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
      const sliced = arr.slice(0, 10 - files.length);
      const skipped = arr.length - sliced.length;
      if (skipped > 0) toast.info(`máximo 10 fotos por vez. ${skipped} ficaram de fora`);
      const urls = sliced.map((f) => URL.createObjectURL(f));
      setFiles((prev) => [...prev, ...sliced]);
      setPreviews((prev) => [...prev, ...urls]);
    },
    [files.length],
  );

  const removeAt = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const send = async () => {
    if (!files.length) return;
    try {
      await onUpload(files, caption);
      toast.success(`tua${files.length > 1 ? "s" : ""} foto${files.length > 1 ? "s" : ""} entrou no álbum 💫`);
      reset();
      onClose();
    } catch (e) {
      logger.error(e);
      toast.error("deu ruim no upload, tenta de novo");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-perestroika-preto/60 backdrop-blur-sm"
      />
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="mandar foto pro álbum"
        className="fixed inset-x-0 bottom-0 top-4 z-50 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-perestroika-bege shadow-2xl sm:inset-4 sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-perestroika-preto/10 p-5 sm:p-6">
          <div>
            <p className="mb-1 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55">
              álbum coletivo
            </p>
            <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
              manda tua foto
            </h2>
            <p className="mt-2 font-body text-sm text-perestroika-preto/70">
              até 10 imagens de uma vez. comprimimos pra ficar leve, mas sem perder a vibe.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="fechar"
            className="rounded-full bg-perestroika-preto/5 p-2 hover:bg-perestroika-preto/15"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition-all",
              drag
                ? "border-perestroika-preto bg-perestroika-preto/5"
                : "border-perestroika-preto/25 hover:border-perestroika-preto/60 hover:bg-perestroika-preto/5",
            )}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-perestroika-bege shadow-md"
              style={{ background: "linear-gradient(135deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
            >
              <ImagePlus className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-2xl uppercase leading-none">arrasta ou clica</p>
              <p className="mt-1 font-body text-sm text-perestroika-preto/60">
                .jpg, .png, .webp, .heic. até 10 por vez 🤙
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </button>

          {/* previews */}
          {previews.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55">
                {previews.length} pra subir
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <div
                    key={src}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-perestroika-preto/15"
                  >
                    <img src={src} alt={`preview ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label="remover"
                      className="absolute right-1 top-1 rounded-full bg-perestroika-preto/85 p-1 text-perestroika-bege opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55">
                  legenda (opcional, vale pra todas)
                </span>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="ex: dia 1, café da manhã antes do caos"
                  maxLength={140}
                  className="w-full rounded-2xl border border-perestroika-preto/20 bg-perestroika-bege/60 px-4 py-3 font-body text-sm placeholder:text-perestroika-preto/60 focus:border-perestroika-preto focus:outline-none"
                />
              </label>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-perestroika-preto/10 bg-perestroika-bege/95 p-5 sm:p-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto disabled:opacity-50"
          >
            cancelar
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!files.length || uploading}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-6 py-3 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Camera className="h-4 w-4 animate-pulse" />
                subindo…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                mandar {files.length > 0 && `${files.length} foto${files.length > 1 ? "s" : ""}`}
              </>
            )}
          </button>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};
