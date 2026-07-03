import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * cliente supabase escopado ao usuário do mcp: usa o access_token verificado
 * pelo mcp-js e reencaminha pra supabase, então RLS aplica normalmente com
 * `auth.uid()` do estudante/educador que conectou o assistente.
 *
 * import-safe: nada roda no top-level. secrets só são lidos dentro da função,
 * quando o edge function já tem env.
 */
export function supabaseAsUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** service-role client pra bypass RLS em checks admin (verifica role antes). */
export function supabaseServiceRole() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** true se o usuário logado tem role admin em user_roles. */
export async function isAdmin(ctx: ToolContext): Promise<boolean> {
  const supabase = supabaseAsUser(ctx);
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: ctx.getUserId(),
    _role: "admin",
  });
  if (error) return false;
  return Boolean(data);
}
