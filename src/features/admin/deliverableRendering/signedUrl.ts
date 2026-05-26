import { supabase } from "@/integrations/supabase/client";

// cache simples de signed urls por (bucket, path) durante a vida da página.
// evita rebatidas no storage quando o drawer re-renderiza.
const cache = new Map<string, { url: string; expiresAt: number }>();

const TTL_SECONDS = 60 * 60; // 1h
const SAFETY_MS = 60 * 1000; // renova 1min antes

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  if (!bucket || !path) return null;
  const key = `${bucket}::${path}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt - SAFETY_MS > Date.now()) return hit.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  cache.set(key, {
    url: data.signedUrl,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}
