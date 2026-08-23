import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

export interface AlbumPhoto {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  url: string;
  author?: {
    nickname: string | null;
    display_name: string | null;
  };
}

const BUCKET = "hub-album";
const MAX_DIM = 1600;
const QUALITY = 0.85;
// bucket é privado: fotos de menores só via URL assinada (exige login). TTL de
// algumas horas cobre a sessão; o refresh regenera as URLs a cada visita.
const SIGNED_TTL = 60 * 60 * 4;

/** comprime imagem client-side: webp <=1600px, fallback jpeg */
async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number; ext: string }> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    // fallback via dataURL
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    return img as unknown as ImageBitmap;
  });

  const w0 = (bitmap as ImageBitmap).width;
  const h0 = (bitmap as ImageBitmap).height;
  const scale = Math.min(1, MAX_DIM / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);

  // tenta webp primeiro
  let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", QUALITY));
  let ext = "webp";
  if (!blob || blob.size === 0) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    ext = "jpg";
  }
  if (!blob) throw new Error("falha na compressão");
  return { blob, width: w, height: h, ext };
}

export const useHubAlbum = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const enrich = useCallback(async (rows: Omit<AlbumPhoto, "url" | "author">[]): Promise<AlbumPhoto[]> => {
    if (!rows.length) return [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("user_id, nickname, display_name")
      .in("user_id", userIds);
    const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    // URLs assinadas em lote (bucket privado). mapeia de volta por caminho.
    const paths = rows.map((r) => r.storage_path);
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

    return rows.map((r) => {
      const prof = map.get(r.user_id);
      return {
        ...r,
        url: urlByPath.get(r.storage_path) ?? "",
        author: prof ? { nickname: prof.nickname, display_name: prof.display_name } : undefined,
      };
    });
  }, []);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("hub_album_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      logger.error("[useHubAlbum]", error);
      setPhotos([]);
      setLoading(false);
      return;
    }
    const enriched = await enrich(data ?? []);
    setPhotos(enriched);
    setLoading(false);
  }, [enrich]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // realtime: nova foto entra no topo
  useEffect(() => {
    const channel = supabase
      .channel(`hub-album-photos-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hub_album_photos" },
        async (payload) => {
          const row = payload.new as Omit<AlbumPhoto, "url" | "author">;
          // evita duplicar se já adicionado pelo upload local
          setPhotos((prev) => (prev.some((p) => p.id === row.id) ? prev : prev));
          const [enriched] = await enrich([row]);
          setPhotos((prev) => (prev.some((p) => p.id === enriched.id) ? prev : [enriched, ...prev]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "hub_album_photos" },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setPhotos((prev) => prev.filter((p) => p.id !== id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enrich]);

  const upload = useCallback(
    async (files: File[], caption?: string) => {
      if (!user) throw new Error("não logado");
      setUploading(true);
      const results: AlbumPhoto[] = [];
      try {
        for (const file of files) {
          if (!file.type.startsWith("image/")) continue;
          if (file.size > 12 * 1024 * 1024) {
            logger.warn("foto >12MB ignorada:", file.name);
            continue;
          }
          const { blob, width, height, ext } = await compressImage(file);
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
            contentType: blob.type,
            cacheControl: "3600",
            upsert: false,
          });
          if (upErr) throw upErr;

          const { data, error } = await supabase
            .from("hub_album_photos")
            .insert({
              user_id: user.id,
              storage_path: path,
              caption: caption?.trim() || null,
              width,
              height,
            })
            .select("*")
            .single();
          if (error) throw error;
          const [enriched] = await enrich([data]);
          results.push(enriched);
        }
        // prepend localmente (realtime pode chegar depois)
        if (results.length) {
          setPhotos((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            return [...results.filter((r) => !ids.has(r.id)), ...prev];
          });
        }
        return results;
      } finally {
        setUploading(false);
      }
    },
    [user, enrich],
  );

  const remove = useCallback(
    async (photo: AlbumPhoto) => {
      const { error } = await supabase.from("hub_album_photos").delete().eq("id", photo.id);
      if (error) throw error;
      // best-effort delete no storage
      await supabase.storage.from(BUCKET).remove([photo.storage_path]).catch(() => undefined);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    },
    [],
  );

  const stats = useMemo(() => {
    const contributors = new Set(photos.map((p) => p.user_id));
    return { total: photos.length, contributors: contributors.size };
  }, [photos]);

  return { photos, loading, uploading, upload, remove, stats, refresh };
};

/** lê uma chave de hub_settings */
export const useHubSetting = (key: string) => {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("hub_settings").select("value").eq("key", key).maybeSingle();
    setValue(data?.value ?? null);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (newValue: string | null) => {
      const { error } = await supabase
        .from("hub_settings")
        .upsert({ key, value: newValue, updated_at: new Date().toISOString() });
      if (error) throw error;
      setValue(newValue);
    },
    [key],
  );

  return { value, loading, save, refresh };
};
