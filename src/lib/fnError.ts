// Extrai uma mensagem de erro clara + código + request_id das respostas das
// edge functions (que agora seguem o padrão de supabase/functions/_shared/errors.ts:
// { error: string, code: string, request_id: string }).
//
// Cobre os dois casos do supabase-js:
//   - função retorna 2xx com corpo { error } → vem em `data`
//   - função retorna 4xx/5xx → o corpo fica no Response de `error.context`
//
// Totalmente defensivo: nunca lança. O `request_id` permite correlacionar o
// erro visto na aplicação com a linha exata dos logs da função.

export interface FnErrorInfo {
  message?: string;
  code?: string;
  requestId?: string;
}

export async function fnErrorInfo(error: unknown, data?: unknown): Promise<FnErrorInfo> {
  const fromBody = (b: unknown): FnErrorInfo | null => {
    const o = b as { error?: string; code?: string; request_id?: string } | null | undefined;
    if (o && typeof o.error === "string") {
      return { message: o.error, code: o.code, requestId: o.request_id };
    }
    return null;
  };

  const inData = fromBody(data);
  if (inData) return inData;

  try {
    const ctx = (error as { context?: unknown })?.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      const body = await (ctx as Response).json();
      const parsed = fromBody(body);
      if (parsed) return parsed;
    }
  } catch {
    /* ignora — cai no fallback */
  }

  return {};
}

/** Sufixo pronto pra descrição de toast, ex.: "ref a1b2c3d4". */
export function refSuffix(info: FnErrorInfo): string | undefined {
  return info.requestId ? `ref ${info.requestId}` : undefined;
}
