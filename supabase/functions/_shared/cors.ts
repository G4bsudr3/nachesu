// CORS helper compartilhado.
//
// Restringe Access-Control-Allow-Origin a uma allow-list vinda da env
// `ALLOWED_ORIGINS` (origens separadas por vírgula). Enquanto a env não estiver
// configurada, mantém o comportamento atual (`*`) para não quebrar nenhum deploy
// existente — o endurecimento passa a valer assim que o operador define a env.
//
// Ativação: definir `ALLOWED_ORIGINS` nas secrets do projeto, ex.:
//   ALLOWED_ORIGINS="https://nachesu.lovable.app,https://nachesu.com.br"

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  // Sem allow-list configurada → fallback permissivo (comportamento legado).
  // Com allow-list → ecoa a origem quando permitida; caso contrário devolve a
  // primeira origem confiável (origens não listadas ficam bloqueadas pelo browser).
  const allowOrigin =
    ALLOWED.length === 0 ? "*" : ALLOWED.includes(origin) ? origin : ALLOWED[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-safety-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
