import { useState } from "react";
import { toast } from "sonner";
import { Lock, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PasswordStrength } from "@/components/PasswordStrength";

const DISMISS_LS_KEY = "chora.dismissSenhaCardUntil";

interface Props {
  onDefined: () => void;
}

export const DefinirSenhaCard = ({ onDefined }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    const until = localStorage.getItem(DISMISS_LS_KEY);
    return until ? Date.now() < Number(until) : false;
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    // 7 dias
    localStorage.setItem(DISMISS_LS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setDismissed(true);
  };

  const handleSubmit = async () => {
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
      toast.success("senha definida. agora você entra direto.");
      setOpen(false);
      onDefined();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro ao definir senha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-preto/5 p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="dispensar"
          className="absolute top-3 right-3 h-7 w-7 rounded-full hover:bg-perestroika-preto/10 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 pr-8">
          <p className="font-display uppercase text-xl sm:text-2xl leading-none mb-1">
            entra mais rápido da próxima vez
          </p>
          <p className="font-body text-sm text-perestroika-preto/70">
            define uma senha e você não precisa mais esperar email pra entrar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start sm:self-auto inline-flex items-center gap-2 min-h-11 rounded-2xl bg-perestroika-preto text-perestroika-bege px-5 py-3 font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
        >
          <Lock className="h-4 w-4" />
          definir senha
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-perestroika-bege border-perestroika-preto/15">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-3xl leading-none">
              define sua senha
            </DialogTitle>
            <DialogDescription className="font-body text-perestroika-preto/70">
              mínimo 6 caracteres. usa algo que você lembre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              type="password"
              autoFocus
              placeholder="nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full h-12 px-4 rounded-2xl bg-transparent border-2 border-perestroika-preto/15 focus:border-perestroika-preto focus:outline-none font-body text-base"
            />
            <PasswordStrength password={password} />
            <input
              type="password"
              placeholder="confirma a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full h-12 px-4 rounded-2xl bg-transparent border-2 border-perestroika-preto/15 focus:border-perestroika-preto focus:outline-none font-body text-base"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-perestroika-preto text-perestroika-bege font-body font-medium uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] transition-transform"
            >
              {submitting ? "salvando..." : (
                <>
                  salvar senha
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
