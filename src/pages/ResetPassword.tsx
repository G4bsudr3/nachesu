import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { PasswordStrength, evaluatePasswordStrength } from "@/components/PasswordStrength";
import { t } from "@/lib/authErrors";

/**
 * Página pública de redefinição de senha.
 * Acessada via link enviado por supabase.auth.resetPasswordForEmail.
 * Supabase processa o token no hash da URL automaticamente e cria sessão temporária
 * (evento PASSWORD_RECOVERY). Aqui só validamos sessão e chamamos updateUser.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let resolved = false;

    // listener pega o evento PASSWORD_RECOVERY assim que supabase processa o hash
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolved = true;
        setHasRecoverySession(true);
        setReady(true);
      }
    });

    // fallback: se já tem sessão (usuário já entrou antes via link), permite trocar mesmo assim
    supabase.auth.getSession().then(({ data }) => {
      if (resolved) return;
      if (data.session) {
        setHasRecoverySession(true);
      }
      setReady(true);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("reset_passwords_dont_match"));
      return;
    }
    const strength = evaluatePasswordStrength(password);
    if (strength.level < 2) {
      toast.error(t("reset_password_too_weak"));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // marca has_password no profile pra UI saber
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from("profiles")
          .update({ has_password: true })
          .eq("user_id", userData.user.id);
      }
      toast.success(t("reset_success"));
      navigate("/app", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reset_save_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <PageHeader
        showLogo
        logoLink="/"
        actions={
          <Link
            to="/auth"
            className="inline-flex items-center min-h-11 px-2 font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            voltar
          </Link>
        }
      />

      <main className="flex-1 container flex items-center justify-center py-16">
        <div className="w-full max-w-md relative">
          <EletivaSymbol
            size={72}
            className="absolute -top-24 right-0 animate-pulse-soft"
            rotate={-15}
            pose="peeking"
          />

          {!ready ? (
            <p className="font-body text-perestroika-preto/60">verificando link…</p>
          ) : !hasRecoverySession ? (
            <div>
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3 whitespace-pre-line">
                {t("reset_link_invalid_title")}
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-8">
                {t("reset_link_invalid_body")}
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 h-14 px-6 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide hover:scale-[1.01] transition-transform"
              >
                voltar pra entrar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
                nova
                <br />
                senha
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-10">
                escolhe uma senha boa. mínimo 8 caracteres, mistura letra e número.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/40" />
                  <input
                    type="password"
                    required
                    autoFocus
                    autoComplete="new-password"
                    placeholder="nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-11 pr-4 h-14 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors"
                  />
                </div>

                <PasswordStrength password={password} />

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/40" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="confirma a senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-11 pr-4 h-14 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !password || !confirm}
                  className="w-full h-14 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-transform"
                >
                  {submitting ? "salvando…" : (
                    <>
                      salvar e entrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
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

export default ResetPassword;
