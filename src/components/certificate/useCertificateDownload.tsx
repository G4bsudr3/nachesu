import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CertificateRenderer, CERTIFICATE_DIMENSIONS } from "./CertificateRenderer";
import type { CertificateVariant } from "@/features/hub/feedbackFinalFlag";
import type { CertificatePreset } from "./certificatePresets";
import { logger } from "@/lib/logger";

// fundo sólido por preset, usado como fallback do html-to-image em áreas
// transparentes da captura. **CRÍTICO**: se ficar fixo em bege, presets
// escuros saem com manchas/bordas bege contaminando a imagem final.
const PRESET_CAPTURE_BG: Record<CertificatePreset, string> = {
  "bege-editorial": "#f2e4d8",
  "preto-cinema": "#090909",
  "gradient-festa": "#fd4644", // cor sólida do topo do gradient
};
import choraLogoPreta from "@/assets/brand/logo-preta.svg";
import choraLogoBege from "@/assets/brand/logo-bege.svg";

// assets de marca importados estaticamente. precisam estar decodificados antes
// do html-to-image capturar, senão aparecem como ícone "broken image" no PNG final.
// (a logo Perestroika agora é SVG inline em <PeresLogo />, então não precisa de preload.)
const LOCAL_BRAND_ASSETS = [
  choraLogoPreta,
  choraLogoBege,
];

interface Params {
  variant?: CertificateVariant;
  fullName: string;
  archetype?: string | null;
  gender?: "f" | "m" | "n";
  userId: string | null;
  /** url da artwork do arquétipo. quando ausente mas archetype presente, busca em archetype_artworks. */
  tarotImageUrl?: string | null;
  /** preset visual escolhido pelo usuário. default = editorial-bege. */
  preset?: CertificatePreset;
  /** se true, persiste no bucket hub-certificates e na tabela hub_certificates. */
  persist?: boolean;
}

/**
 * Pré-carrega os pesos específicos das fontes usadas no certificado.
 * `document.fonts.ready` sozinho não garante peso/tamanho, então forçamos
 * o load explícito de cada combinação que aparece no layout.
 */
const FONT_SPECS: Array<[string, string]> = [
  ["700 128px 'League Gothic'", "NOME"],
  ["700 96px 'League Gothic'", "NOME"],
  ["500 11px 'Urbanist'", "label"],
  ["400 16px 'Urbanist'", "corpo"],
  ["700 16px 'Urbanist'", "corpo"],
  ["500 9px 'Urbanist'", "rodapé"],
];

const preloadFonts = async () => {
  if (!document.fonts) return;
  try {
    await Promise.all(
      FONT_SPECS.map(([spec, sample]) =>
        document.fonts.load(spec, sample).catch(() => null),
      ),
    );
    await document.fonts.ready;
  } catch (err) {
    logger.warn("[useCertificateDownload] preloadFonts falhou:", err);
  }
};

const preloadImage = async (url: string | null | undefined) => {
  if (!url) return;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    if (img.decode) {
      await img.decode().catch(() => null);
    } else {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }
  } catch (err) {
    logger.warn("[useCertificateDownload] preloadImage falhou:", err);
  }
};

const waitForRenderedImage = (img: HTMLImageElement, index: number) =>
  new Promise<void>((resolve) => {
    if (img.complete) {
      if (img.naturalWidth === 0) {
        logger.warn("[useCertificateDownload] imagem já falhou antes da captura", {
          index,
          src: img.currentSrc || img.src,
        });
      }
      resolve();
      return;
    }

    let settled = false;
    const finish = (status: "load" | "error" | "timeout") => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      if (status !== "load") {
        logger.warn("[useCertificateDownload] imagem não carregou antes da captura", {
          index,
          status,
          src: img.currentSrc || img.src,
        });
      }
      resolve();
    };
    const onLoad = () => finish("load");
    const onError = () => finish("error");
    const timer = window.setTimeout(() => finish("timeout"), 8000);

    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
  });

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} demorou demais`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

/**
 * Renderiza certificado off-screen, captura como PNG retina (3x),
 * baixa localmente e (opcional) faz upload pro storage + salva DB.
 */
export const useCertificateDownload = () => {
  const [downloading, setDownloading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const generate = useCallback(async (params: Params): Promise<{ blob: Blob; url: string; publicUrl?: string | null } | null> => {
    const { fullName, archetype, gender, userId, persist, preset } = params;
    const variant: CertificateVariant = "editorial";
    setDownloading(true);
    let persistedUrl: string | null = null;

    // se tiver arquétipo mas não veio url, busca a artwork oficial atual do baralho
    let tarotImageUrl = params.tarotImageUrl ?? null;
    if (archetype && !tarotImageUrl) {
      try {
        const { data: artwork } = await withTimeout(
          Promise.resolve(
            supabase
              .from("archetype_artworks")
              .select("image_url")
              .eq("archetype", archetype as never)
              .maybeSingle(),
          ),
          8000,
          "busca da artwork do arquétipo",
        );
        tarotImageUrl = artwork?.image_url ?? null;
      } catch (err) {
        logger.warn("[useCertificateDownload] busca da artwork falhou:", err);
      }
    }

    // pré-carrega assets antes de montar o nó, mas nunca deixa o fluxo preso
    // se fonte/imagem externa travar no navegador.
    try {
      await withTimeout(
        Promise.all([
          preloadFonts(),
          preloadImage(tarotImageUrl),
          ...LOCAL_BRAND_ASSETS.map(preloadImage),
        ]),
        12000,
        "pré-carga dos assets do certificado",
      );
    } catch (err) {
      logger.warn("[useCertificateDownload] seguindo sem pré-carga completa:", err);
    }

    const dims = CERTIFICATE_DIMENSIONS[variant];
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.top = "-20000px";
    host.style.left = "-20000px";
    host.style.width = `${dims.width}px`;
    host.style.height = `${dims.height}px`;
    host.style.pointerEvents = "none";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);

    const root = createRoot(host);

    try {
      root.render(
        <CertificateRenderer
          variant={variant}
          fullName={fullName}
          archetype={archetype}
          gender={gender}
          tarotImageUrl={tarotImageUrl}
          preset={preset}
        />,
      );

      // 3 RAFs + 120ms pra garantir layout settled, fontes aplicadas e
      // imagens decodificadas no DOM off-screen.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setTimeout(resolve, 120)),
          ),
        ),
      );

      // double-check: aguarda <img> tags completarem load
      const imgs = host.querySelectorAll("img");
      await Promise.all(Array.from(imgs).map(waitForRenderedImage));

      const node = host.firstElementChild as HTMLElement;
      if (!node) throw new Error("falha ao renderizar certificado");

      // fundo de captura por preset (não pode ser bege fixo, senão escuro vaza)
      const captureBg = preset ? PRESET_CAPTURE_BG[preset] : "#f2e4d8";

      // tentativa principal em 3x. se falhar (CORS/canvas tainted), faz retry em 2x.
      let dataUrl: string;
      try {
        dataUrl = await withTimeout(toPng(node, {
          pixelRatio: 3,
          cacheBust: true,
          backgroundColor: captureBg,
          width: dims.width,
          height: dims.height,
          skipFonts: false,
          style: {
            // garante que não herde transformações do contêiner pai
            transform: "none",
            transformOrigin: "top left",
          },
        }), 20000, "captura do certificado @3x");
      } catch (err) {
        logger.warn("[useCertificateDownload] retry @ 2x:", err);
        dataUrl = await withTimeout(toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: captureBg,
          width: dims.width,
          height: dims.height,
          skipFonts: false,
        }), 20000, "captura do certificado @2x");
      }

      const blob = await (await fetch(dataUrl)).blob();
      const localUrl = URL.createObjectURL(blob);

      // persistência opcional no storage + db
      if (persist && userId) {
        const designVariant = preset ? `dom-${preset}` : variant;
        const fileName = `certificado-${designVariant}-${Date.now()}.png`;
        const path = `${userId}/${fileName}`;
        try {
          const { error: upErr } = await withTimeout(
            supabase.storage
              .from("hub-certificates")
              .upload(path, blob, { contentType: "image/png", upsert: true }),
            10000,
            "upload do certificado",
          );
          if (!upErr) {
            const { data: pub } = supabase.storage
              .from("hub-certificates")
              .getPublicUrl(path);
            const fileUrl = pub.publicUrl;
            setPublicUrl(fileUrl);
            persistedUrl = fileUrl;

            // upsert manual em hub_certificates (1 por user)
            const { data: existing } = await withTimeout(
              Promise.resolve(
                supabase
                  .from("hub_certificates")
                  .select("id")
                  .eq("user_id", userId)
                  .maybeSingle(),
              ),
              8000,
              "busca do certificado existente",
            );

            const payload = {
              user_id: userId,
              archetype: (archetype as never) ?? null,
              design_variant: designVariant,
              file_url: fileUrl,
              generated_at: new Date().toISOString(),
            };

            if (existing?.id) {
              await withTimeout(
                Promise.resolve(supabase.from("hub_certificates").update(payload).eq("id", existing.id)),
                8000,
                "atualização do certificado no banco",
              );
            } else {
              await withTimeout(
                Promise.resolve(supabase.from("hub_certificates").insert(payload)),
                8000,
                "registro do certificado no banco",
              );
            }
            // invalida status pós-evento pra atualizar chips e próximo passo na hora
            queryClient.invalidateQueries({ queryKey: ["post-event-status"] });
          } else {
            logger.warn("[useCertificateDownload] upload falhou, segue só com download local:", upErr);
          }
        } catch (err) {
          logger.warn("[useCertificateDownload] persistência demorou/falhou, segue só com preview local:", err);
        }
      }

      return { blob, url: localUrl, publicUrl: persistedUrl };
    } catch (err) {
      logger.error("[useCertificateDownload]", err);
      return null;
    } finally {
      root.unmount();
      host.remove();
      setDownloading(false);
    }
  }, []);

  const downloadLocal = useCallback(
    async (params: Params, fileName: string) => {
      const result = await generate(params);
      if (!result) return false;
      const a = document.createElement("a");
      a.href = result.url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(result.url);
      return true;
    },
    [generate],
  );

  const share = useCallback(
    async (params: Params, fileName: string): Promise<boolean> => {
      const result = await generate(params);
      if (!result) return false;
      const file = new File([result.blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "meu certificado chŏra lovable",
            text: "fui lá e criei.",
          });
          URL.revokeObjectURL(result.url);
          return true;
        } catch (err) {
          // user cancelou — não é erro
          URL.revokeObjectURL(result.url);
          return false;
        }
      }
      // fallback: baixa
      const a = document.createElement("a");
      a.href = result.url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(result.url);
      return true;
    },
    [generate],
  );

  return { downloadLocal, share, generate, downloading, publicUrl };
};
