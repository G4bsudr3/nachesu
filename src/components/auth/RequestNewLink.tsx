import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Formulário curto pra pedir um link novo quando o anterior expirou ou já foi usado. */
export const RequestNewLink = ({
  initialEmail = "",
  type = "magiclink",
}: {
  initialEmail?: string;
  type?: "magiclink" | "recovery";
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-access-link", {
        body: { email: clean, type },
      });
      if (error) throw error;
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { message?: string }).message ?? "não consegui enviar o link");
      }
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "não consegui enviar o link");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p role="status" className="font-body text-base text-perestroika-preto/80">
        pronto. se esse email estiver liberado, um link novo chega em instantes. abre só o mais recente.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="relative">
        <label htmlFor="new-link-email" className="sr-only">email</label>
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-perestroika-preto/60" aria-hidden="true" />
        <input
          id="new-link-email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sending}
          className="w-full pl-11 pr-4 h-14 rounded-2xl bg-transparent border-2 border-perestroika-preto/15 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/60"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="w-full h-14 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2"
      >
        {sending ? "enviando…" : "mandar um link novo"}
      </button>
    </form>
  );
};
