import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Lock, ArrowRight, Instagram, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { PasswordStrength } from "@/components/PasswordStrength";
import { normalizeInstagram, normalizeLinkedin } from "@/lib/socialHandles";

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("has_password, instagram, linkedin")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasPassword(Boolean(data?.has_password));
        setInstagram(data?.instagram ?? "");
        setLinkedin(data?.linkedin ?? "");
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/"
        actions={
          <Link
            to="/app"
            className="inline-flex items-center gap-2 min-h-11 px-2 font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            voltar
          </Link>
        }
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
            <Instagram className="h-4 w-4" />
            <h2 className="font-display uppercase text-2xl leading-none">
              tuas redes
            </h2>
          </div>
          <p className="font-body text-sm text-perestroika-preto/70 mb-5">
            se preencher, aparece em <Link to="/app/hub/turma" className="underline decoration-perestroika-laranja decoration-2 underline-offset-4">redes da turma</Link> e fica fácil teu pessoal te achar.
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                instagram
              </label>
              <div className="flex h-12 items-center rounded-2xl border border-perestroika-preto/20 bg-transparent focus-within:border-perestroika-preto">
                <span className="pl-4 font-body text-sm text-perestroika-preto/40">@</span>
                <input
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
              <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
                linkedin
              </label>
              <div className="flex h-12 items-center rounded-2xl border border-perestroika-preto/20 bg-transparent focus-within:border-perestroika-preto">
                <Linkedin className="ml-4 h-4 w-4 text-perestroika-preto/40" aria-hidden />
                <input
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

        <section className="rounded-3xl border border-perestroika-preto/15 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4" />
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
            <input
              type="password"
              placeholder="nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full h-12 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base"
            />
            <PasswordStrength password={password} />
            <input
              type="password"
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
