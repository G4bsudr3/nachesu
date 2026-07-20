import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Lock, ArrowRight, Instagram, Linkedin, Moon, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { PasswordStrength } from "@/components/PasswordStrength";
import { normalizeInstagram, normalizeLinkedin } from "@/lib/socialHandles";
import { useReadingPreferences } from "@/hooks/useReadingPreferences";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { easyRead, toggle: toggleEasyRead } = useReadingPreferences();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  // janela silenciosa: nudges automáticos são adiados nesse intervalo
  const [quietStart, setQuietStart] = useState<number | null>(null);
  const [quietEnd, setQuietEnd] = useState<number | null>(null);
  const [savingQuiet, setSavingQuiet] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase.rpc("get_my_profile").maybeSingle() as unknown as Promise<{
      data: {
        has_password: boolean | null;
        instagram: string | null;
        linkedin: string | null;
        quiet_hours_start: number | null;
        quiet_hours_end: number | null;
      } | null;
    }>).then(({ data }) => {
      setHasPassword(Boolean(data?.has_password));
      setInstagram(data?.instagram ?? "");
      setLinkedin(data?.linkedin ?? "");
      setQuietStart(
        typeof data?.quiet_hours_start === "number" ? data.quiet_hours_start : null,
      );
      setQuietEnd(typeof data?.quiet_hours_end === "number" ? data.quiet_hours_end : null);
    });
  }, [user]);

  const handleSavePassword = async () => {
    if (password.length < 6) {
      toast.error("senha precisa ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("as senhas não batem");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.from("profiles").update({ has_password: true }).eq("user_id", user.id);
      setHasPassword(true);
      setPassword("");
      setConfirm("");
      toast.success("senha atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!user) return;
    const ig = normalizeInstagram(instagram);
    const li = normalizeLinkedin(linkedin);

    if (instagram.trim() && !ig) {
      toast.error("instagram inválido. tenta só o handle, ex: frattz");
      return;
    }
    if (linkedin.trim() && !li) {
      toast.error("linkedin inválido. cola a url ou só o handle");
      return;
    }

    setSavingSocial(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ instagram: ig, linkedin: li })
        .eq("user_id", user.id);
      if (error) throw error;
      setInstagram(ig ?? "");
      setLinkedin(li ?? "");
      toast.success("redes salvas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setSavingSocial(false);
    }
  };

  const handleSaveQuiet = async (start: number | null, end: number | null) => {
    if (!user) return;
    setSavingQuiet(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ quiet_hours_start: start, quiet_hours_end: end })
        .eq("user_id", user.id);
      if (error) throw error;
      setQuietStart(start);
      setQuietEnd(end);
      toast.success(
        start === null || end === null
          ? "janela silenciosa removida"
          : "janela silenciosa salva",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setSavingQuiet(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const quietActive = quietStart !== null && quietEnd !== null;

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/"
        back={{ to: "/app", label: "voltar" }}
        actions={<AuthedHeaderActions />}
      />

      <main className="container max-w-xl py-12">
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-2">
          sua conta
        </h1>
        <p className="font-body text-perestroika-preto/70 mb-10">
          {user?.email}
        </p>

        <section className="rounded-3xl border border-perestroika-preto/15 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Instagram className="h-4 w-4" aria-hidden />
            <h2 className="font-display uppercase text-2xl leading-none">
              suas redes
            </h2>
          </div>
          <p className="font-body text-sm text-perestroika-preto/70 mb-5">
            se preencher, aparece em <Link to="/app/hub/turma" className="underline decoration-perestroika-laranja decoration-2 underline-offset-4">redes da turma</Link> e fica fácil o seu pessoal te achar.
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="acc-instagram" className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                instagram
              </label>
              <div className="flex h-12 items-center rounded-2xl border border-perestroika-preto/20 bg-transparent focus-within:border-perestroika-preto">
                <span className="pl-4 font-body text-sm text-perestroika-preto/40" aria-hidden>@</span>
                <input
                  id="acc-instagram"
                  type="text"
                  placeholder="seu_handle"
                  value={instagram.replace(/^@+/, "")}
                  onChange={(e) => setInstagram(e.target.value)}
                  disabled={savingSocial}
                  className="flex-1 bg-transparent px-2 font-body text-base focus:outline-none"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label htmlFor="acc-linkedin" className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                linkedin
              </label>
              <div className="flex h-12 items-center rounded-2xl border border-perestroika-preto/20 bg-transparent focus-within:border-perestroika-preto">
                <Linkedin className="ml-4 h-4 w-4 text-perestroika-preto/40" aria-hidden />
                <input
                  id="acc-linkedin"
                  type="text"
                  placeholder="url ou handle"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  disabled={savingSocial}
                  className="flex-1 bg-transparent px-3 font-body text-base focus:outline-none"
                  autoComplete="off"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveSocial}
              disabled={savingSocial}
              className="w-full h-12 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] transition-transform"
            >
              {savingSocial ? "salvando..." : (
                <>
                  salvar redes
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>

        {/* leitura acessível */}
        <section className="rounded-3xl border border-perestroika-preto/15 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4" aria-hidden />
            <h2 className="font-display uppercase text-2xl leading-none">
              leitura acessível
            </h2>
          </div>
          <p className="font-body text-sm text-perestroika-preto/70 mb-5">
            aumenta o espaçamento entre letras, palavras e linhas. ajuda em cansaço visual ou
            dislexia. fica salvo só nesse navegador.
          </p>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege px-4 py-3 cursor-pointer">
            <span className="font-body text-sm">texto com respiração</span>
            <input
              type="checkbox"
              checked={easyRead}
              onChange={toggleEasyRead}
              className="h-6 w-6 accent-perestroika-preto cursor-pointer"
              aria-label="ativar leitura acessível"
            />
          </label>
        </section>

        {/* janela silenciosa */}
        <section className="rounded-3xl border border-perestroika-preto/15 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="h-4 w-4" aria-hidden />
            <h2 className="font-display uppercase text-2xl leading-none">
              janela silenciosa
            </h2>
          </div>
          <p className="font-body text-sm text-perestroika-preto/70 mb-5">
            avisos automáticos por e-mail não vão sair nesse intervalo (horário de brasília).
            mensagem direta do educador continua chegando normal.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quiet-start" className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                começa às
              </label>
              <select
                id="quiet-start"
                value={quietStart ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  void handleSaveQuiet(v, quietEnd);
                }}
                disabled={savingQuiet}
                className="w-full h-12 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 font-body text-base focus:border-perestroika-preto focus:outline-none"
              >
                <option value="">sem janela</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quiet-end" className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                acaba às
              </label>
              <select
                id="quiet-end"
                value={quietEnd ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  void handleSaveQuiet(quietStart, v);
                }}
                disabled={savingQuiet}
                className="w-full h-12 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 font-body text-base focus:border-perestroika-preto focus:outline-none"
              >
                <option value="">sem janela</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </div>
          </div>
          {quietActive && (
            <p className="mt-3 font-body text-xs text-perestroika-preto/55">
              ativa entre {fmtHour(quietStart!)} e {fmtHour(quietEnd!)}.
              {quietStart! > quietEnd! ? " atravessa a meia-noite." : ""}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-perestroika-preto/15 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4" aria-hidden />
            <h2 className="font-display uppercase text-2xl leading-none">
              {hasPassword ? "trocar senha" : "definir senha"}
            </h2>
          </div>
          <p className="font-body text-sm text-perestroika-preto/70 mb-5">
            {hasPassword
              ? "muda quando quiser. mínimo 6 caracteres."
              : "define uma pra entrar mais rápido da próxima vez."}
          </p>
          <div className="space-y-3">
            <label htmlFor="acc-pwd" className="sr-only">nova senha</label>
            <input
              id="acc-pwd"
              type="password"
              autoComplete="new-password"
              placeholder="nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full h-12 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base"
            />
            <PasswordStrength password={password} />
            <label htmlFor="acc-pwd-confirm" className="sr-only">confirmar senha</label>
            <input
              id="acc-pwd-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="confirma a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
              onKeyDown={(e) => e.key === "Enter" && handleSavePassword()}
              className="w-full h-12 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base"
            />
            <button
              type="button"
              onClick={handleSavePassword}
              disabled={submitting || !password}
              className="w-full h-12 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] transition-transform"
            >
              {submitting ? "salvando..." : (
                <>
                  salvar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-perestroika-preto/15 p-6">
          <h2 className="font-display uppercase text-2xl leading-none mb-1">
            sair
          </h2>
          <p className="font-body text-sm text-perestroika-preto/70 mb-5">
            desconecta dessa sessão.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-2xl border border-perestroika-preto/30 px-5 py-3 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            sair da conta
          </button>
        </section>
      </main>
    </div>
  );
};

export default AccountSettings;
