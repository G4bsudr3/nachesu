import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileEdit, MessageSquareReply, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Status = "vazio" | "rascunho" | "enviado" | "revisado";

interface Props {
  moduleId: string;
}

/**
 * mostra ao aluno o ciclo: rascunho → enviado → revisado.
 * "revisado" só aparece quando educador escreveu feedback ou marcou
 * `reviewed_at`. enquanto isso fica "enviado · aguardando retorno"
 * pra não dar a sensação de vácuo após concluir o módulo.
 */
export const DeliverableStatusPill = ({ moduleId }: Props) => {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["module-deliverable-status", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("status, submitted_at, reviewed_at, feedback")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const status: Status = !data
    ? "vazio"
    : data.reviewed_at || (data.feedback && data.feedback.trim().length > 0)
      ? "revisado"
      : data.submitted_at
        ? "enviado"
        : "rascunho";

  const config: Record<Status, { label: string; helper: string; Icon: typeof FileEdit; tone: string }> = {
    vazio: {
      label: "sem entrega ainda",
      helper: "comece a escrever em qualquer pílula pra abrir o rascunho.",
      Icon: FileEdit,
      tone: "bg-perestroika-preto/[0.04] border-perestroika-preto/15 text-perestroika-preto/70",
    },
    rascunho: {
      label: "rascunho",
      helper: "sua entrega é salva conforme você escreve.",
      Icon: FileEdit,
      tone: "bg-perestroika-preto/[0.04] border-perestroika-preto/15 text-perestroika-preto/70",
    },
    enviado: {
      label: "enviado · aguardando retorno",
      helper: "seu educador vai responder por aqui em alguns dias.",
      Icon: Send,
      tone: "bg-[#6f77fc]/10 border-[#6f77fc]/40 text-perestroika-preto",
    },
    revisado: {
      label: "revisado pelo educador",
      helper: data?.feedback
        ? `“${data.feedback.length > 110 ? data.feedback.slice(0, 110) + "…" : data.feedback}”`
        : "abra o módulo pra ler o retorno completo.",
      Icon: MessageSquareReply,
      tone: "bg-[#fe7b02]/10 border-[#fe7b02]/40 text-perestroika-preto",
    },
  };

  const { label, helper, Icon, tone } = config[status];

  if (status === "vazio") return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 mb-6 ${tone}`}
      role="status"
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] opacity-70 mb-0.5">
          entrega
        </p>
        <p className="font-body text-sm font-medium flex items-center gap-2">
          {label}
          {status === "revisado" && (
            <CheckCircle2 className="h-3.5 w-3.5 text-[#fe7b02]" />
          )}
        </p>
        <p className="font-body text-xs opacity-75 mt-0.5">{helper}</p>
      </div>
    </div>
  );
};
