import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "valid" | "done" | "already" | "invalid">("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: supabaseAnonKey },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid === true) setState("valid");
        else if (d.valid === false || d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    if (!error && (data as any)?.success) setState("done");
    else if ((data as any)?.reason === "already_unsubscribed") setState("already");
    else setState("invalid");
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <PageHeader borderless back={{ to: "/" }} logoLink="/" />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          {state === "loading" && <p className="text-perestroika-preto/50">verificando…</p>}
          {state === "valid" && (
            <>
              <h1 className="font-display uppercase text-5xl mb-4">cancelar inscrição?</h1>
              <p className="text-perestroika-preto/70 mb-6">
                você não vai mais receber emails do Chŏra Lovable nesse endereço.
              </p>
              <button
                onClick={confirm}
                disabled={submitting}
                className="rounded-full bg-perestroika-preto text-perestroika-bege px-8 py-4 text-sm uppercase tracking-wide hover:scale-105 disabled:opacity-40"
              >
                {submitting ? "cancelando…" : "confirmar"}
              </button>
            </>
          )}
          {state === "done" && (
            <>
              <h1 className="font-display uppercase text-5xl mb-4">pronto.</h1>
              <p className="text-perestroika-preto/70">você não recebe mais emails nesse endereço.</p>
            </>
          )}
          {state === "already" && (
            <>
              <h1 className="font-display uppercase text-4xl mb-4">já cancelado.</h1>
              <p className="text-perestroika-preto/70">esse email já tinha sido removido.</p>
            </>
          )}
          {state === "invalid" && (
            <>
              <h1 className="font-display uppercase text-4xl mb-4">link inválido.</h1>
              <p className="text-perestroika-preto/70">esse link expirou ou está incorreto.</p>
              <Link to="/" className="inline-block mt-6 underline">voltar pra home</Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Unsubscribe;
