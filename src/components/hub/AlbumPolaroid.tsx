import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlbumPhoto } from "@/features/hub/useHubAlbum";

/** rotação determinística por id (não muda em re-render) */
function rotationFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  // -3 a 3 graus
  return ((Math.abs(h) % 70) - 35) / 10;
}

interface Props {
  photo: AlbumPhoto;
  isMine: boolean;
  isFresh: boolean; // <24h
  onClick: () => void;
}

export const AlbumPolaroid = ({ photo, isMine, isFresh, onClick }: Props) => {
  const rot = rotationFor(photo.id);
  const author = photo.author?.nickname || photo.author?.display_name || "anônimo";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, scale: 0.8, rotate: rot }}
      animate={{ opacity: 1, scale: 1, rotate: rot }}
      whileHover={{ scale: 1.04, rotate: 0, zIndex: 5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={cn(
        "group relative block w-full origin-center cursor-pointer rounded-sm bg-perestroika-bege p-2 pb-8 text-left shadow-[0_8px_24px_-12px_rgba(9,9,9,0.4)] outline-none ring-perestroika-preto transition-shadow hover:shadow-[0_18px_40px_-15px_rgba(9,9,9,0.55)] focus-visible:ring-2",
      )}
      style={{
        backgroundColor: "#f6ede2",
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-perestroika-preto/10">
        <img
          src={photo.url}
          alt={photo.caption ?? `foto de ${author}`}
          loading="lazy"
          className="h-full w-full object-cover"
          draggable={false}
        />
        {isFresh && (
          <span
            className="absolute right-1.5 top-1.5 inline-block rounded-full px-2 py-0.5 font-body text-[9px] uppercase tracking-wider text-perestroika-bege shadow-md"
            style={{ background: "linear-gradient(90deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
          >
            novo
          </span>
        )}
        {isMine && (
          <span
            className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-body text-[9px] uppercase tracking-wider text-perestroika-bege shadow-md"
            style={{ background: "linear-gradient(90deg, #fe7b02, #fd4644, #f756a6, #6f77fc)" }}
          >
            <Heart className="h-2.5 w-2.5 fill-current" /> minha
          </span>
        )}
      </div>
      <div className="absolute inset-x-2 bottom-1.5 flex items-center justify-between gap-2">
        <span className="truncate font-body text-[11px] lowercase text-perestroika-preto/75">
          @{author}
        </span>
        {photo.caption && (
          <span aria-hidden className="text-perestroika-preto/60">·</span>
        )}
        {photo.caption && (
          <span className="truncate font-body text-[11px] italic text-perestroika-preto/55">
            {photo.caption}
          </span>
        )}
      </div>
    </motion.button>
  );
};
