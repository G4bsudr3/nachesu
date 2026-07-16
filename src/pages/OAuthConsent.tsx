import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

// wrapper tipado pro namespace beta `auth.oauth`
type OAuthClient = { name?: string; redirect_uri?: string };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauthApi = () =>
  (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!authorizationId) {
      setError("authorization_id ausente");
      return;
    }
    if (!user) return; // vai redirecionar abaixo

    let active = true;
    (async () => {
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, user, loading]);

  if (loading) return null;

  // não autenticado: manda pro /auth preservando A URL INTEIRA (nunca só pathname)
  if (!user) {
    const next = window.location.pathname + window.location.search;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorizationId)
      : await oauthApi().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("o servidor de autorização não retornou uma url de redirect.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "esse assistente";
  const scopes = (details?.scope ?? "").split(" ").filter(Boolean);

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <PageHeader showLogo logoLink="/" />
      <main className="flex-1 container flex items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <EletivaSymbol size={56} pose="thinking" />
            <div>
              <h1 className="font-display uppercase text-4xl leading-none">conectar</h1>
              <p className="font-body text-sm text-perestroika-preto/70 lowercase">
                {clientName} quer acessar sua conta nachesu
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-perestroika-vermelho/40 bg-perestroika-vermelho/10 p-4">
              <p className="font-body text-sm text-perestroika-preto">{error}</p>
            </div>
          )}

          {!details && !error && (
            <p className="font-body text-sm text-perestroika-preto/60">carregando…</p>
          )}

          {details && (
            <>
              <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-preto/5 p-4 space-y-3">
                <p className="font-body text-sm leading-snug">
                  entrando como <span className="font-semibold">{user.email}</span>.
                </p>
                <p className="font-body text-sm leading-snug">
                  {clientName} vai poder usar as ferramentas da nachesu agindo como você
                  enquanto essa conexão estiver ativa. suas permissões e as políticas
                  do backend continuam valendo.
                </p>
                {scopes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-perestroika-preto/70 lowercase">
                    {scopes.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => decide(true)}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center min-h-12 px-4 rounded-xl bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 transition-transform"
                >
                  aprovar
                </button>
                <button
                  type="button"
                  onClick={() => decide(false)}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center min-h-12 px-4 rounded-xl border border-perestroika-preto/30 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-60 transition-colors"
                >
                  cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="container py-8">
        <EletivaFooter />
      </footer>
    </div>
  );
};

export default OAuthConsent;
