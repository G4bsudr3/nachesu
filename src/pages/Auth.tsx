import { useState, FormEvent, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { FirstTimeChecklist } from "@/components/auth/FirstTimeChecklist";

import { ALLOWED_EMAILS } from "@/lib/access";
import { resolveAuthError, readAuthErrorFromUrl, t } from "@/lib/authErrors";

const EMAIL_LS_KEY = "chora.lastEmail";

const SOON_MESSAGE =
  "esse email não tá na lista. se você respondeu o fbi ou foi convidado, confere se digitou certo. caso contrário, fala com a gente no whatsapp 🤙";

interface EmailValidationResult {
  can_enter: boolean;
  account_exists: boolean;
  account_has_password: boolean;
}

/** Consulta edge function pra ver se email pode entrar e qual o status da conta */
const validateEmail = async (email: string): Promise<EmailValidationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("validate-public-email", {
      body: { email },
    });
    if (error) return { can_enter: false, account_exists: false, account_has_password: false };
    const d = data as Partial<EmailValidationResult>;
    return {
      can_enter: Boolean(d?.can_enter),
      account_exists: Boolean(d?.account_exists),
      account_has_password: Boolean(d?.account_has_password),
    };
  } catch {
    return { can_enter: false, account_exists: false, account_has_password: false };
  }
};

type AuthPhase = "idle" | "checking" | "sending" | "logging-in" | "resetting";

const PHASE_LABELS: Record<Exclude<AuthPhase, "idle">, string> = {
  checking: "checando email…",
  sending: "checando e enviando link…",
  "logging-in": "entrando…",
  resetting: "preparando recuperação…",
};

/** Verifica se o email digitado é alias de outro convidado oficial */
const lookupCanonicalEmail = async (
  email: string,
): Promise<{ canonical: string; isAlias: boolean } | null> => {
  try {
    const { data, error } = await supabase.rpc("lookup_invited_canonical", { _email: email });
    if (error || !data || data.length === 0) return null;
    const row = data[0] as { canonical_email: string; is_alias: boolean };
    return { canonical: row.canonical_email, isAlias: Boolean(row.is_alias) };
  } catch {
    return null;
  }
};

const Auth = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<AuthPhase>("idle");
  const submitting = phase !== "idle";
  const [sent, setSent] = useState(false);
  const [aliasHint, setAliasHint] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const fromCarta = searchParams.get("from") === "carta";
  const cartaToken = searchParams.get("token");

  useEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery) {
      setEmail(fromQuery);
    } else {
      const saved = localStorage.getItem(EMAIL_LS_KEY);
      if (saved) setEmail(saved);
    }
    if (fromCarta && cartaToken) {
      try { sessionStorage.setItem("chora.fromCartaToken", cartaToken); } catch { /* ignore */ }
    }

    // Detecta erro de auth vindo do Supabase (hash ou query)
    // Ex: link mágico expirado/queimado retorna #error=access_denied&error_code=otp_expired
    const authError = readAuthErrorFromUrl(searchParams, window.location.hash);
    if (authError) {
      const { title, duration } = resolveAuthError(authError);
      toast.error(title, { duration });
      // Limpa o hash pra não repetir o toast em re-renders
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [searchParams, fromCarta, cartaToken]);

  if (loading) return null;
  if (user) {
    const next = searchParams.get("next");
    // só permite next interno (path absoluto começando com /), evita open-redirect
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
    return <Navigate to={target} replace />;
  }

  const sendMagicLink = async (targetEmail: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) throw error;
    localStorage.setItem(EMAIL_LS_KEY, targetEmail);
    setSent(true);
    toast.success("link mágico enviado para o seu email");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    const hasPassword = password.trim().length > 0;
    setPhase(hasPassword ? "logging-in" : "checking");
    try {
      const isAllowed = ALLOWED_EMAILS.has(cleanEmail);
      // valida no banco antes (admins pulam, já têm conta garantida)
      let validation: EmailValidationResult = {
        can_enter: true,
        account_exists: true,
        account_has_password: true,
      };
      if (!isAllowed) {
        // antes de validar conta, checa se digitou um alias de outro email oficial
        const canonical = await lookupCanonicalEmail(cleanEmail);
        if (canonical && canonical.isAlias && canonical.canonical !== cleanEmail) {
          setAliasHint(canonical.canonical);
          return;
        }
        validation = await validateEmail(cleanEmail);
        if (!validation.can_enter) {
          toast.info(SOON_MESSAGE, { duration: 7000 });
          return;
        }
      }

      // CASO 1: pode entrar mas ainda não tem conta auth → manda link mágico (cria conta)
      if (!validation.account_exists) {
        setPhase("sending");
        await sendMagicLink(cleanEmail);
        toast.info(t("no_account_creating"), { duration: 8000 });
        return;
      }

      // CASO 2: fluxo normal
      if (hasPassword) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("invalid")) {
            toast.error("senha incorreta. quer entrar com link mágico?", {
              action: {
                label: "enviar link",
                onClick: () => {
                  setPassword("");
                  setPhase("sending");
                  sendMagicLink(cleanEmail)
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : t("forgot_generic_error")),
                    )
                    .finally(() => setPhase("idle"));
                },
              },
            });
            return;
          }
          throw error;
        }
        localStorage.setItem(EMAIL_LS_KEY, cleanEmail);
      } else {
        setPhase("sending");
        await sendMagicLink(cleanEmail);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "não foi possível entrar agora";
      toast.error(message);
    } finally {
      setPhase("idle");
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error(t("forgot_email_required"));
      return;
    }
    setPhase("checking");
    try {
      const isAllowed = ALLOWED_EMAILS.has(cleanEmail);
      let validation: EmailValidationResult = {
        can_enter: true,
        account_exists: true,
        account_has_password: true,
      };
      if (!isAllowed) {
        validation = await validateEmail(cleanEmail);
        if (!validation.can_enter) {
          toast.info(SOON_MESSAGE, { duration: 7000 });
          return;
        }
      }

      if (!validation.account_exists) {
        setPhase("sending");
        await sendMagicLink(cleanEmail);
        toast.info(t("no_account_creating"), { duration: 8000 });
        return;
      }

      setPhase("resetting");
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      localStorage.setItem(EMAIL_LS_KEY, cleanEmail);
      setSent(true);
      toast.success(t("forgot_link_sent"), { duration: 7000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("forgot_generic_error"));
    } finally {
      setPhase("idle");
    }
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <PageHeader
        showLogo
        logoLink="/"
        actions={
          <Link
            to="/"
            className="inline-flex items-center min-h-11 px-2 font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            voltar
          </Link>
        }
      />

      <main className="flex-1 container flex items-center justify-center py-16">
        <div className="w-full max-w-md relative">
          <EletivaSymbol
            size={64}
            className="absolute -top-20 right-0 animate-pulse-soft"
            rotate={-15}
          />

          {!sent ? (
            <>
              {!fromCarta && (
                <FirstTimeChecklist
                  emailFilled={email.trim().length > 3 && email.includes("@")}
                  passwordFilled={password.trim().length > 0}
                  submitted={submitting}
                  sent={sent}
                />
              )}
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
                {fromCarta ? (<>abre a sua<br />carta completa</>) : (<>entrar<br />no hub</>)}
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-10">
                {fromCarta
                  ? "use o email com que você respondeu o fbi. mandamos um link mágico em segundos."
                  : "tem senha? coloca os dois campos. se não, deixa só o email que a gente manda um link mágico."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/40" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (aliasHint) setAliasHint(null);
                    }}
                    disabled={submitting}
                    className="w-full pl-11 pr-4 h-14 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors"
                  />
                </div>

                {aliasHint && (
                  <div className="rounded-2xl border border-perestroika-laranja/40 bg-perestroika-laranja/10 p-4 space-y-3 animate-fade-up">
                    <p className="font-body text-sm text-perestroika-preto leading-snug">
                      esse email tá vinculado a outro endereço.
                      <br />
                      tu entra com <span className="font-semibold">{aliasHint}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(aliasHint);
                        setAliasHint(null);
                      }}
                      className="inline-flex items-center min-h-11 px-4 rounded-xl bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    >
                      usar esse email
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/40" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="senha (opcional)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-11 pr-4 h-14 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className="w-full h-14 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-transform"
                >
                  {submitting ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 rounded-full border-2 border-perestroika-bege/40 border-t-perestroika-bege animate-spin"
                        aria-hidden="true"
                      />
                      <span className="lowercase tracking-normal">
                        {PHASE_LABELS[phase as Exclude<AuthPhase, "idle">]}
                      </span>
                    </>
                  ) : (
                    <>
                      entrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={submitting}
                  className="inline-flex items-center justify-center w-full min-h-11 text-center font-body text-sm text-perestroika-preto/60 hover:text-perestroika-preto underline underline-offset-4 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
                >
                  esqueci minha senha
                </button>
              </form>
            </>
          ) : (
            <div className="animate-fade-up">
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
                olha
                <br />
                o email
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-2">
                mandamos um link mágico para <span className="font-semibold text-perestroika-preto">{email}</span>.
              </p>
              <p className="font-body text-sm text-perestroika-preto/60">
                clica no link e você cai direto no hub. (talvez precise olhar a caixa de spam.)
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setPassword(""); }}
                className="mt-8 inline-flex items-center min-h-11 px-1 font-body text-sm uppercase tracking-wide underline underline-offset-4 hover:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
              >
                voltar
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="container py-8">
        <p className="font-body text-xs text-perestroika-preto/60 text-center">
          eletiva sebrae · escola sebrae · 1º ano EM
        </p>
      </footer>
    </div>
  );
};

export default Auth;
