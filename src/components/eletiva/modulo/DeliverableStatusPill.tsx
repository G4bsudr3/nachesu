import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDown, CheckCircle2, FileEdit, MessageSquareReply, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Status = "vazio" | "rascunho" | "enviado" | "ajuste" | "revisado";

interface Props {
  moduleId: string;
}

/**
 * mostra ao estudante o ciclo da entrega: rascunho → enviado → revisado.
 *
 * destino do feedback: quando o educador marca como revisado, esta pílula
 * vira um atalho que rola até o <ModuloFeedbackCard id="feedback-do-educador">
 * logo abaixo no módulo. nada de toast solto que some, nada de "vá em outra
 * tela". o retorno aparece exatamente onde o estudante entregou.
 *
 * atualização em tempo real: assina mudanças em module_deliverables do
 * próprio usuário pra refletir status na hora (sem precisar refresh).
 */
export const DeliverableStatusPill = ({ moduleId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["module-deliverable-status", moduleId, user?.id] as const;

  const { data } = useQuery({
    queryKey,
    enabled: !!user && !!moduleId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("status, submitted_at, reviewed_at, feedback")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { status: string; submitted_at: string | null; reviewed_at: string | null; feedback: string | null } | null;
    },
  });

  // realtime: invalida a query (e a do feedback card) quando o educador escreve
  useEffect(() => {
    if (!user || !moduleId) return;
    const channel = supabase
      .channel(`deliverable-${moduleId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "module_deliverables",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { module_id?: string } | null;
          if (row?.module_id !== moduleId) return;
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ["student-feedback"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, moduleId, queryClient]);

  const status: Status = !data
    ? "vazio"
    : data.status === "ajuste"
      ? "ajuste"
      : data.reviewed_at || (data.feedback && data.feedback.trim().length > 0)
        ? "revisado"
        : data.submitted_at
          ? "enviado"
          : "rascunho";

  if (status === "vazio") return null;

  const config: Record<Exclude<Status, "vazio">, { label: string; helper: string; Icon: typeof FileEdit; tone: string }> = {
    rascunho: {
      label: "rascunho",
      helper: "sua entrega é salva conforme você escreve.",
      Icon: FileEdit,
      tone: "bg-perestroika-preto/[0.04] border-perestroika-preto/15 text-perestroika-preto/70",
    },
    enviado: {
      label: "enviado · aguardando retorno",
      helper: "seu educador vai responder por aqui em alguns dias. você recebe aviso no app assim que sair.",
      Icon: Send,
      tone: "bg-[#6f77fc]/10 border-[#6f77fc]/40 text-perestroika-preto",
    },
    ajuste: {
      label: "ajuste solicitado · reabra e reenvie",
      helper: "leia o retorno do educador no card laranja e clique em \"revisar e reenviar\".",
      Icon: AlertCircle,
      tone: "bg-[#fd4644]/10 border-[#fd4644]/40 text-perestroika-preto",
    },
    revisado: {
      label: "retorno do educador chegou",
      helper: "o feedback completo está logo abaixo, no card laranja.",
      Icon: MessageSquareReply,
      tone: "bg-[#fe7b02]/10 border-[#fe7b02]/40 text-perestroika-preto",
    },
  };

  const { label, helper, Icon, tone } = config[status];

  const handleJumpToFeedback = () => {
    const el = document.getElementById("feedback-do-educador");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-[#fe7b02]", "ring-offset-2");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#fe7b02]", "ring-offset-2");
    }, 1800);
  };

  const isRevisado = status === "revisado" || status === "ajuste";

  const inner = (
    <>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] opacity-70 mb-0.5">
          entrega
        </p>
        <p className="font-body text-sm font-medium flex items-center gap-2">
          {label}
          {isRevisado && <CheckCircle2 className="h-3.5 w-3.5 text-[#fe7b02]" />}
        </p>
        <p className="font-body text-xs opacity-75 mt-0.5">{helper}</p>
      </div>
      {isRevisado && (
        <span className="inline-flex items-center gap-1 self-center font-body text-[11px] uppercase tracking-[0.16em] text-[#fe7b02]">
          ler retorno
          <ArrowDown className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  const baseClass = `flex items-start gap-3 rounded-2xl border-2 px-4 py-3 mb-6 w-full ${tone}`;

  return isRevisado ? (
    <button
      type="button"
      onClick={handleJumpToFeedback}
      className={`${baseClass} text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe7b02]`}
      aria-label="ir para o feedback do educador logo abaixo"
    >
      {inner}
    </button>
  ) : (
    <div className={baseClass} role="status" aria-live="polite">
      {inner}
    </div>
  );
};
