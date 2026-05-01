import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TarotCard } from "./TarotCard";
import { useCardDownload } from "./useCardDownload";
import type { Archetype } from "./cartaTokens";

interface CartaDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archetype: Archetype;
  imageUrl: string | null;
  nickname: string | null;
}

/** modal de preview antes do download. mostra TarotCard hero c/ tilt + cta "manda ver". */
export const CartaDownloadDialog = ({
  open,
  onOpenChange,
  archetype,
  imageUrl,
  nickname,
}: CartaDownloadDialogProps) => {
  const { download, downloading } = useCardDownload({ archetype, imageUrl, nickname });
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    const ok = await download();
    if (ok) {
      setDone(true);
      toast.success("baixou. agora posta nos stories 🔥");
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
      }, 900);
    } else {
      toast.error("deu ruim no download, tenta de novo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-2xl bg-perestroika-bege border-perestroika-preto/10 p-6 sm:p-10">
        <DialogTitle className="sr-only">preview da sua carta</DialogTitle>
        <DialogDescription className="sr-only">
          confira como sua carta vai ficar antes de baixar a imagem
        </DialogDescription>

        <div className="flex flex-col items-center gap-6 sm:gap-8">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: -3 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-[260px] sm:w-[340px]"
          >
            <TarotCard
              archetype={archetype}
              imageUrl={imageUrl ?? undefined}
              nickname={nickname ?? undefined}
              size="hero"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col items-center gap-5 w-full"
          >
            <p className="font-body italic text-sm text-perestroika-preto/70 text-center">
              vai ficar lindo nos stories 🔥
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownload}
                disabled={downloading || done}
                className="inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-full bg-perestroika-preto text-perestroika-bege text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "renderizando…" : done ? "baixado" : "manda ver"}
              </button>

              <button
                onClick={() => onOpenChange(false)}
                disabled={downloading}
                className="text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto transition-colors disabled:opacity-50"
              >
                fechar
              </button>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
