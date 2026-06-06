import { useEffect, useRef } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Status = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: Status }) {
  // dispara toast quando entra em erro, pra estudante notar mesmo em mobile
  const lastStatus = useRef<Status>(status);
  useEffect(() => {
    if (status === "error" && lastStatus.current !== "error") {
      toast.error(
        "não consegui salvar agora. confere sua conexão e tenta digitar de novo.",
      );
    }
    lastStatus.current = status;
  }, [status]);

  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        salvando
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
        <Check className="h-3 w-3" aria-hidden="true" />
        salvo
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider"
      style={{ color: "#fd4644" }}
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      não salvou · tenta digitar de novo
    </span>
  );
}
