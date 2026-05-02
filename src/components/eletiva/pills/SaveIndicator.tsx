import { Check, Loader2, AlertTriangle } from "lucide-react";

type Status = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: Status }) {
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
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      tenta de novo
    </span>
  );
}
