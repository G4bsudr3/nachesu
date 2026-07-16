// Rate limiter compartilhado, fail-open.
//
// Usa a RPC `check_rate_limit` (SECURITY DEFINER, ver migration
// 20260716090100_rate_limit_infra.sql) para contar hits por janela deslizante.
// NUNCA lança: se o próprio limiter falhar, a requisição é PERMITIDA. Em fluxos
// voltados a estudantes, disponibilidade importa mais que rigidez — o limiter é
// defesa contra abuso em massa, não um gate de autorização.

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Extrai o IP do chamador a partir do x-forwarded-for (primeira entrada). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0]?.trim() || "unknown";
}

/**
 * Retorna `true` se a requisição está DENTRO do limite (pode prosseguir).
 * Retorna `false` apenas quando a RPC confirma que o limite foi excedido.
 */
export async function checkRateLimit(
  admin: RpcClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      _key: key,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.warn("[rate-limit] rpc error, failing open:", error.message);
      return true;
    }
    // a RPC devolve false somente quando estourou o limite
    return data !== false;
  } catch (e) {
    console.warn("[rate-limit] exception, failing open:", e);
    return true;
  }
}

/** Resposta 429 padrão. */
export function tooManyRequests(cors: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "muitas requisições, tenta de novo em instantes" }),
    { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": "30" } },
  );
}
