import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { TarotCard } from "./TarotCard";
import type { Archetype } from "./cartaTokens";
import { logger } from "@/lib/logger";

interface UseCardDownloadParams {
  archetype: Archetype | null;
  imageUrl: string | null;
  nickname: string | null;
}

/** baixa a TarotCard renderizada (moldura + nick + arte + arquétipo) como png 2160x2700.
 * renderiza off-screen via portal pra capturar com html-to-image preservando css/svg/fonts. */
export const useCardDownload = ({ archetype, imageUrl, nickname }: UseCardDownloadParams) => {
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(async (): Promise<boolean> => {
    if (!archetype) return false;
    setDownloading(true);

    // container off-screen
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.top = "-10000px";
    host.style.left = "-10000px";
    host.style.width = "1080px";
    host.style.height = "1350px";
    host.style.pointerEvents = "none";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);

    const root = createRoot(host);

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      root.render(
        <TarotCard
          archetype={archetype}
          imageUrl={imageUrl ?? undefined}
          nickname={nickname ?? undefined}
          size="export"
        />,
      );

      // 2 frames pra layout/paint assentar
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      // garante decode das imagens
      const imgs = host.querySelectorAll("img");
      await Promise.all(
        Array.from(imgs).map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener("load", res, { once: true });
                img.addEventListener("error", res, { once: true });
              }),
        ),
      );

      const node = host.firstElementChild as HTMLElement;
      if (!node) throw new Error("falha ao renderizar carta");

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#f2e4d8",
        width: 1080,
        height: 1350,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carta-${nickname ?? "builder"}-chora-lovable.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      logger.error("[useCardDownload]", err);
      return false;
    } finally {
      root.unmount();
      host.remove();
      setDownloading(false);
    }
  }, [archetype, imageUrl, nickname]);

  return { download, downloading };
};
