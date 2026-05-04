import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

export type MaterialKind = "pdf" | "slides" | "link" | "video" | "image" | "doc" | "other";
export type MaterialCategory =
  | "apresentacao"
  | "referencia"
  | "leitura"
  | "ferramenta"
  | "video"
  | "outro";

export const MATERIAL_CATEGORIES: { value: MaterialCategory; label: string; emoji: string }[] = [
  { value: "apresentacao", label: "apresentações", emoji: "🎤" },
  { value: "referencia", label: "referências", emoji: "🧭" },
  { value: "leitura", label: "leituras", emoji: "📖" },
  { value: "ferramenta", label: "ferramentas", emoji: "🛠️" },
  { value: "video", label: "vídeos", emoji: "🎬" },
  { value: "outro", label: "outros", emoji: "✨" },
];

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  pdf: "pdf",
  slides: "slides",
  link: "link",
  video: "vídeo",
  image: "imagem",
  doc: "doc",
  other: "arquivo",
};

export type HubMaterial = Database["public"]["Tables"]["hub_materials"]["Row"];

/** detecta o tipo do material a partir da URL ou mime */
export function detectKind(url: string | null, mime?: string | null): MaterialKind {
  if (mime) {
    if (mime.includes("pdf")) return "pdf";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
  }
  if (!url) return "other";
  const u = url.toLowerCase();
  if (u.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(u)) return "image";
  if (/\.(mp4|mov|webm)$/.test(u)) return "video";
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo.com")) return "video";
  if (u.includes("docs.google.com/presentation") || u.includes("slides.com") || u.includes("pitch.com") || u.includes("canva.com/design")) return "slides";
  if (u.includes("docs.google.com") || u.includes("notion.so") || u.includes("notion.site")) return "doc";
  return "link";
}

/** retorna URL pública útil pro card abrir */
export function materialOpenUrl(m: HubMaterial): string | null {
  return m.external_url ?? m.file_url ?? null;
}

/** thumb automática sem capa custom */
export function autoThumbUrl(m: HubMaterial): string | null {
  if (m.cover_url) return m.cover_url;
  const url = materialOpenUrl(m);
  if (!url) return null;
  // youtube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt?.[1]) return `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`;
  // image direta
  if (detectKind(url, m.file_mime) === "image") return url;
  // fallback: screenshot do site (links externos http/https)
  if (/^https?:\/\//i.test(url)) {
    return `https://image.thum.io/get/width/800/crop/600/noanimate/${url}`;
  }
  return null;
}

export const useHubMaterials = (opts?: { adminMode?: boolean; courseId?: string | null; includeGlobal?: boolean }) => {
  const [materials, setMaterials] = useState<HubMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("hub_materials").select("*").order("order_index", { ascending: true }).order("created_at", { ascending: false });
    if (!opts?.adminMode) q = q.eq("published", true);
    // escopo por eletiva: se courseId for passado, filtra por aquele curso
    // (incluindo materiais globais quando includeGlobal !== false).
    if (opts?.courseId !== undefined && opts.courseId !== null) {
      if (opts.includeGlobal === false) {
        q = q.eq("course_id", opts.courseId);
      } else {
        q = q.or(`course_id.eq.${opts.courseId},course_id.is.null`);
      }
    }
    const { data, error } = await q;
    if (error) {
      logger.error("[useHubMaterials]", error);
      setMaterials([]);
    } else {
      setMaterials(data ?? []);
    }
    setLoading(false);
  }, [opts?.adminMode, opts?.courseId, opts?.includeGlobal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { materials, loading, refresh };
};
