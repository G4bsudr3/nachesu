import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


/**
 * fase A · modal de consentimento LGPD. abre 1x por estudante e persiste a aceitação
 * em profiles.tutor_consent_at. enquanto não aceitar, o backend devolve 412.
 */
type Props = {
  open: boolean;
  onAccepted: () => void;
};

export const TutorConsentModal = ({ open, onAccepted }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, tutor_consent_at: now },
        { onConflict: "user_id" },
      );
    setLoading(false);
    if (error) {
      toast.error("não consegui registrar agora, tenta de novo");
      return;
    }
    // fecha o modal imediatamente atualizando o cache antes do refetch
    queryClient.setQueryData(["tutor-consent", user.id], { accepted: true, at: now });
    onAccepted();
  };


  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">antes de começar, um aviso rápido</DialogTitle>
          <DialogDescription className="pt-2 text-foreground/80 leading-relaxed space-y-3">
            <span className="block">
              suas perguntas ficam guardadas por até <strong>30 dias</strong>, sem texto cru: a gente salva só uma versão <strong>anonimizada</strong> (nome, telefone, email, cpf são removidos automaticamente).
            </span>
            <span className="block">
              educadores veem só <strong>agregados anônimos</strong> da turma pra entender as dúvidas. ninguém lê suas mensagens uma a uma.
            </span>
            <span className="block">
              <strong>uma exceção importante:</strong> se você escrever sobre se machucar, sofrer bullying ou estar em perigo, seu educador é avisado na hora. isso existe pra te proteger.
            </span>
            <span className="block text-sm text-foreground/60">
              o tutor não é terapeuta nem amigo. pra desabafo de verdade, fala com gente. tô aqui pra te ajudar a aprender.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={loading} className="w-full sm:w-auto">
            {loading ? "registrando..." : "entendi, bora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
