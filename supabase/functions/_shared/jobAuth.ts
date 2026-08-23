// Gate de autorização para funções de job/e-mail.
//
// Aceita apenas dois tipos de chamador:
//   1. service_role  → Authorization: Bearer <service_role JWT> (role=service_role no payload)
//   2. cron interno  → header x-cron-secret igual ao segredo guardado em private.job_secrets
//
// Qualquer chamada anon, de estudante ou de admin comum é rejeitada.

import { createClient } from 'npm:@supabase/supabase-js@2'

function decodeRole(jwt: string): string | null {
  try {
    const payload = JSON.parse(
      atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    return typeof payload?.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

/** true quando o Authorization traz o JWT de service_role do próprio projeto */
export function isServiceRoleCaller(req: Request): boolean {
  const header = req.headers.get('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice(7).trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (serviceKey && token === serviceKey) return true
  return decodeRole(token) === 'service_role'
}

/** compara o header x-cron-secret com o segredo interno (timing-safe o bastante) */
export async function isCronCaller(req: Request): Promise<boolean> {
  const provided = req.headers.get('x-cron-secret')
  if (!provided) return false
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
  const { data } = await admin
    .schema('private')
    .from('job_secrets')
    .select('secret')
    .eq('name', 'cron')
    .maybeSingle()
  const expected = data?.secret
  if (!expected || expected.length !== provided.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return diff === 0
}

/** true se o chamador é service_role OU o cron interno */
export async function isTrustedJobCaller(req: Request): Promise<boolean> {
  if (isServiceRoleCaller(req)) return true
  return await isCronCaller(req)
}

/** true se o chamador é um admin logado (usado só para dry_run manual) */
export async function isAdminCaller(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return false
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data } = await userClient.auth.getUser()
  if (!data?.user) return false
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
  const { data: isAdmin } = await admin.rpc('has_role', {
    _user_id: data.user.id,
    _role: 'admin',
  })
  return isAdmin === true
}
