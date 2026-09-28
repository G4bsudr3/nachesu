import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { RequestNewLink } from "@/components/auth/RequestNewLink";

/**
 * Página de confirmação do link por email. O token só é consumido no clique,
 * então scanners de email que abrem o link antes do estudante não queimam o acesso.
 */
const AuthConfirmar = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = params.get("type") === "recovery" ? "recovery" : "magiclink";
  const email = params.get("email") ?? "";
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : type === "recovery" ? "/reset-password" : "/app";

  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(!tokenHash);

  const confirm = async () => {
    if (!tokenHash) return;
    setWorking(true);
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      setFailed(true);
      setWorking(false);
      return;
    }
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <PageHeader back={{ to: "/auth" }} />
      <main className="flex-1 container flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          <EletivaSymbol size={72} rotate={-15} pose="peeking" className="mb-6" />
          {failed ? (
            <>
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
                esse link<br />não vale mais
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-8">
                ele já foi usado ou passou de 1 hora. sem problema, a gente manda outro agora.
              </p>
              <RequestNewLink initialEmail={email} type={type} />
            </>
          ) : (
            <>
              <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none mb-3">
                {type === "recovery" ? (<>quase lá</>) : (<>bora<br />entrar</>)}
              </h1>
              <p className="font-body text-base text-perestroika-preto/70 mb-8">
                {type === "recovery"
                  ? "toca no botão pra criar sua senha nova."
                  : "toca no botão e você cai direto na sua eletiva."}
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={working}
                aria-busy={working}
                className="w-full h-14 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2"
              >
                {working ? "entrando…" : (
                  <>
                    {type === "recovery" ? "criar nova senha" : "entrar na nachesu"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
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

export default AuthConfirmar;
