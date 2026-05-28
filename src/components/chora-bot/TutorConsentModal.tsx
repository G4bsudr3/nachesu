import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ tutor_consent_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error("não consegui registrar agora, tenta de novo");
      return;
    }
    onAccepted();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">como o tutor guarda suas perguntas</DialogTitle>
          <DialogDescription className="pt-2 text-foreground/80 leading-relaxed space-y-3">
            <span className="block">
              suas perguntas ficam guardadas por até <strong>90 dias</strong> pra melhorar o tutor.
            </span>
            <span className="block">
              educadores podem ver <strong>agregados anônimos</strong> (sem nome, email ou telefone) pra entender as dúvidas da turma.
            </span>
            <span className="block">
              mensagens que envolvem situação de risco ficam por <strong>365 dias</strong> pra que adultos responsáveis possam acompanhar.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={loading} className="w-full sm:w-auto">
            {loading ? "registrando..." : "entendi, quero usar o tutor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
