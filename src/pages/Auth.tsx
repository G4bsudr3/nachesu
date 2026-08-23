import { useState, FormEvent, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { FirstTimeChecklist } from "@/components/auth/FirstTimeChecklist";

import { ALLOWED_EMAILS } from "@/lib/access";
import { resolveAuthError, readAuthErrorFromUrl, t } from "@/lib/authErrors";

const EMAIL_LS_KEY = "nachesu.lastEmail";
const LEGACY_EMAIL_LS_KEY = "chora.lastEmail";

// resposta uniforme: nunca dizemos se o email existe ou está na lista
// (evita usar o login como oráculo de enumeração de estudantes).
const UNIFORM_SENT_MESSAGE =
  "se esse email estiver liberado pela escola, o link de acesso chega em instantes. confere a caixa de entrada e o spam.";

interface SebraeEligibility {
  needs_course_choice: boolean;
  courses: Array<{ id: string; slug: string; title: string }>;
}


const checkSebrae = async (email: string): Promise<SebraeEligibility | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("check-sebrae-eligibility", {
      body: { email },
    });
    if (error || !data) return null;
    return data as SebraeEligibility;
  } catch {
    return null;
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
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<AuthPhase>("idle");
  const submitting = phase !== "idle";
  const [sent, setSent] = useState(false);
  const [aliasHint, setAliasHint] = useState<string | null>(null);
  const [sebraeChoice, setSebraeChoice] = useState<SebraeEligibility | null>(null);
  const [chosenCourseSlug, setChosenCourseSlug] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const fromCarta = searchParams.get("from") === "carta";
  const cartaToken = searchParams.get("token");

  useEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery) {
      setEmail(fromQuery);
    } else {
      // migra a chave antiga "chora.lastEmail" pra "nachesu.lastEmail" silenciosamente
      const saved = localStorage.getItem(EMAIL_LS_KEY);
      const legacy = !saved ? localStorage.getItem(LEGACY_EMAIL_LS_KEY) : null;
      if (saved) {
        setEmail(saved);
      } else if (legacy) {
        setEmail(legacy);
        localStorage.setItem(EMAIL_LS_KEY, legacy);
        localStorage.removeItem(LEGACY_EMAIL_LS_KEY);
      }
    }
    if (fromCarta && cartaToken) {
      try { sessionStorage.setItem("nachesu.fromCartaToken", cartaToken); } catch { /* ignore */ }
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

  const sendMagicLink = async (targetEmail: string, courseSlug?: string | null) => {
    // preserva o `next` (ex: /.lovable/oauth/consent?authorization_id=...) pra
    // que o clique no email retorne pra rota original em vez de cair em /app.
    const nextParam = searchParams.get("next");
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";
    // enviado pelo nosso próprio pipeline (notify.frattz.com), em português,
    // em vez do email padrão do auth que sai em inglês e cai no spam.
    // o gate de acesso (lista liberada, criação de conta) roda dentro da função,
    // e a resposta é sempre igual: aqui nunca sabemos se o email existe.
    const { data, error } = await supabase.functions.invoke("send-access-link", {
      body: { email: targetEmail, type: "magiclink", next: safeNext, courseSlug },
    });
    if (error) throw error;
    if (data && (data as { error?: string }).error) {
      throw new Error((data as { message?: string }).message ?? "não consegui enviar o link");
    }
    localStorage.setItem(EMAIL_LS_KEY, targetEmail);
    setSent(true);
    toast.success(UNIFORM_SENT_MESSAGE, { duration: 8000 });
  };


  const confirmSebraeChoice = async () => {
    if (!sebraeChoice || !chosenCourseSlug) return;
    const cleanEmail = email.trim().toLowerCase();
    setPhase("sending");
    try {
      await sendMagicLink(cleanEmail, chosenCourseSlug);
      setSebraeChoice(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "não consegui enviar o link";
      setFormError(message);
      toast.error(message);
    } finally {
      setPhase("idle");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    setFormError(null);
    if (!cleanEmail) {
      setFormError("digita seu email pra continuar.");
      return;
    }
    const hasPassword = password.trim().length > 0;
    setPhase(hasPassword ? "logging-in" : "checking");
    try {
      const isAllowed = ALLOWED_EMAILS.has(cleanEmail);
      if (!isAllowed) {
        // antes de seguir, checa se digitou um alias de outro email oficial
        const canonical = await lookupCanonicalEmail(cleanEmail);
        if (canonical && canonical.isAlias && canonical.canonical !== cleanEmail) {
          setAliasHint(canonical.canonical);
          return;
        }

        // email da escola sem senha: pergunta a eletiva antes de mandar o link.
        // a pergunta aparece pra qualquer email do domínio, sem consultar o banco,
        // pra não virar oráculo de quem já tem conta ou convite.
        if (cleanEmail.endsWith("@edu.sebrae.com.br") && !hasPassword) {
          const sebrae = await checkSebrae(cleanEmail);
          if (sebrae && sebrae.needs_course_choice && sebrae.courses.length > 0) {
            setSebraeChoice(sebrae);
            setChosenCourseSlug(sebrae.courses[0]?.slug ?? null);
            return;
          }
        }
      }

      if (hasPassword) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("invalid")) {
            // mensagem genérica: não diferencia "senha errada" de "conta não existe"
            setFormError("email ou senha não conferem. quer entrar com link mágico?");
            toast.error("email ou senha não conferem. quer entrar com link mágico?", {
              action: {
                label: "enviar link",
                onClick: () => {
                  setPassword("");
                  setFormError(null);
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
      setFormError(message);
      toast.error(message);
    } finally {
      setPhase("idle");
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setFormError(null);
    if (!cleanEmail) {
      setFormError(t("forgot_email_required"));
      toast.error(t("forgot_email_required"));
      return;
    }
    setPhase("resetting");
    try {
      // resposta uniforme do servidor: manda o email só se a conta existir,
      // mas a UI mostra sempre a mesma mensagem.
      const { data, error } = await supabase.functions.invoke("send-access-link", {
        body: { email: cleanEmail, type: "recovery" },
      });
      if (error) throw error;
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { message?: string }).message ?? t("forgot_generic_error"));
      }
      localStorage.setItem(EMAIL_LS_KEY, cleanEmail);
      setSent(true);
      toast.success(
        "se existir uma conta com esse email, o link de recuperação chega em instantes.",
        { duration: 8000 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t("forgot_generic_error");
      setFormError(message);
      toast.error(message);
    } finally {
      setPhase("idle");
    }
  };


  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <PageHeader back={{ to: "/" }} />

      <main className="flex-1 container flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          {!sent ? (
            <>
              {!fromCarta && (
                <div className="flex items-start gap-4 mb-8">
                  <FirstTimeChecklist
                    className="flex-1 mb-0"
                    emailFilled={email.trim().length > 3 && email.includes("@")}
                    passwordFilled={password.trim().length > 0}
                    submitted={submitting}
                    sent={sent}
                  />
                  <motion.div
                    className="flex-shrink-0 hidden sm:block"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <EletivaSymbol size={72} rotate={-15} pose="peeking" />
                  </motion.div>
                </div>
              )}
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
                {fromCarta ? (<>abre a sua<br />carta completa</>) : (<>entrar<br />na nachesu</>)}
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-10">
                {fromCarta
                  ? "use o email do convite da escola sebrae. mandamos um link mágico em segundos."
                  : <>tem senha? preenche os dois.&nbsp;<br />se não, só o email basta, a gente manda o link.</>}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <label htmlFor="auth-email" className="sr-only">
                    email
                  </label>
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/60"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="seu@email.com"
                    aria-label="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (aliasHint) setAliasHint(null);
                    }}
                    disabled={submitting}
                    className="w-full pl-11 pr-4 h-14 rounded-2xl bg-transparent border-2 border-perestroika-preto/15 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/60 transition-colors"
                  />
                </div>

                {aliasHint && (
                  <div className="rounded-2xl border border-perestroika-laranja/40 bg-perestroika-laranja/10 p-4 space-y-3 animate-fade-up">
                    <p className="font-body text-sm text-perestroika-preto leading-snug">
                      esse email tá vinculado a outro endereço.
                      <br />
                      você entra com <span className="font-semibold">{aliasHint}</span>.
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

                {sebraeChoice && sebraeChoice.needs_course_choice && (
                  <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/5 p-4 space-y-3 animate-fade-up">
                    <p className="font-body text-sm text-perestroika-preto leading-snug">
                      reconheci seu email da escola sebrae. em qual eletiva você se inscreveu?
                    </p>
                    <div className="space-y-2">
                      {sebraeChoice.courses.map((c) => (
                        <label
                          key={c.slug}
                          className="flex items-center gap-3 rounded-xl border border-perestroika-preto/15 p-3 cursor-pointer hover:bg-perestroika-preto/5 transition-colors"
                        >
                          <input
                            type="radio"
                            name="sebrae-course"
                            value={c.slug}
                            checked={chosenCourseSlug === c.slug}
                            onChange={() => setChosenCourseSlug(c.slug)}
                            className="accent-perestroika-preto"
                          />
                          <span className="font-body text-sm lowercase">{c.title}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={confirmSebraeChoice}
                      disabled={!chosenCourseSlug || submitting}
                      className="inline-flex items-center min-h-11 px-4 rounded-xl bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 transition-transform"
                    >
                      enviar meu link
                    </button>
                  </div>
                )}

                <div className="relative">
                  <label htmlFor="auth-password" className="sr-only">
                    senha
                  </label>
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/60"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="senha"
                    aria-label="senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-11 pr-12 h-14 rounded-2xl bg-transparent border-2 border-perestroika-preto/15 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "ocultar senha" : "mostrar senha"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center text-perestroika-preto/60 hover:text-perestroika-preto hover:bg-perestroika-preto/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                abre o link e cai direto na eletiva. olha o spam se demorar.
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
        <EletivaFooter />
      </footer>
    </div>
  );
};

export default Auth;
