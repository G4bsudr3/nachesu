import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * garante que a requisição seguinte vai sair com um JWT válido.
 *
 * por quê: quando o app volta de background (celular, navegador embutido do
 * gmail/instagram) o refresh automático pode não ter rodado ainda. o contexto
 * de auth ainda expõe `user`, então a gravação dispara, mas o postgrest recebe
 * a chamada como `anon` e a RLS recusa ("new row violates row-level security
 * policy"). o progresso do estudante simplesmente sumia.
 *
 * devolve a sessão válida ou null quando não deu pra recuperar.
 */
export async function ensureSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const expiresInMs = session?.expires_at ? session.expires_at * 1000 - Date.now() : 0;
  if (session?.access_token && expiresInMs > 60_000) return session;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return refreshed.session ?? null;
}
