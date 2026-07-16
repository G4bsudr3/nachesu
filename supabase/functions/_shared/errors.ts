// Respostas de erro padronizadas e fáceis de depurar.
//
// Objetivo: quando algo falha, ficar claro O QUÊ e ONDE, sem vazar detalhe
// interno pro cliente. Mantém compatibilidade com os frontends existentes
// (o campo `error` continua sendo uma STRING legível) e ADICIONA:
//   - `code`        → identificador estável do tipo de erro (triagem/grep)
//   - `request_id`  → correlaciona a resposta do browser com a linha de log
// A causa técnica real (exceção, erro do Postgres, etc.) vai SOMENTE para os
// logs do servidor, junto do mesmo request_id.

export function requestId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return "na";
  }
}

interface FailOpts {
  status: number;
  code: string;
  message: string;
  cause?: unknown;
  fn?: string; // nome da função, para prefixar o log
}

export function fail(cors: Record<string, string>, opts: FailOpts): Response {
  const rid = requestId();
  const tag = opts.fn ? `[${opts.fn}]` : "";
  // log estruturado e greppável: [fn][code] mensagem | req=xxxx  <causa>
  console.error(`${tag}[${opts.code}] ${opts.message} | req=${rid}`, opts.cause ?? "");
  return new Response(
    JSON.stringify({ error: opts.message, code: opts.code, request_id: rid }),
    { status: opts.status, headers: { ...cors, "Content-Type": "application/json" } },
  );
}
