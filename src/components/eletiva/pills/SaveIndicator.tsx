import { useEffect, useRef } from "react";
import { Check, Loader2, AlertTriangle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import type { AutosaveFieldStatus } from "./autosaveTelemetry";

type LegacyStatus = "idle" | "saving" | "saved" | "error";
type Status = LegacyStatus | "retry";

type Props = {
  status: Status | AutosaveFieldStatus;
};

const isRich = (s: Props["status"]): s is AutosaveFieldStatus =>
  typeof s === "object" && s !== null && "state" in s;

export function SaveIndicator({ status }: Props) {
  const state: Status = isRich(status) ? status.state : status;
  const attempts = isRich(status) ? status.attempts : 0;
  const nextRetryAt = isRich(status) ? status.nextRetryAt : null;

  const lastState = useRef<Status>(state);
  useEffect(() => {
    if (state === "error" && lastState.current !== "error") {
      toast.error(
        "não consegui salvar mesmo após várias tentativas. confere sua conexão e tenta digitar de novo.",
      );
    }
    lastState.current = state;
  }, [state]);

  if (state === "idle") return null;

  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        salvando
      </span>
    );
  }

  if (state === "retry") {
    const seconds = nextRetryAt
      ? Math.max(0, Math.round((nextRetryAt - Date.now()) / 1000))
      : null;
    return (
      <span
        className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider"
        style={{ color: "#fe7b02" }}
        role="status"
        aria-live="polite"
      >
        <RotateCw className="h-3 w-3 animate-spin" aria-hidden="true" />
        tentando de novo{seconds !== null ? ` em ${seconds}s` : ""} · {attempts}ª
      </span>
    );
  }

  if (state === "saved") {
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
      não salvou após {attempts} tentativas · tenta digitar de novo
    </span>
  );
}
