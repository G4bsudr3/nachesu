import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface QueueItem {
  count: number;
  label: string;
  to: string;
  tone?: "neutral" | "warn" | "alert";
  hint?: string;
}

interface Props {
  items: QueueItem[];
  loading?: boolean;
  emptyMessage?: string;
  rightSlot?: ReactNode;
}

const TONE: Record<NonNullable<QueueItem["tone"]>, string> = {
  neutral:
    "bg-perestroika-bege text-perestroika-preto border-perestroika-preto/15 hover:border-perestroika-preto/30",
  warn:
    "bg-perestroika-laranja/15 text-perestroika-preto border-perestroika-laranja/30 hover:border-perestroika-laranja/60",
  alert:
    "bg-perestroika-vermelho/15 text-perestroika-preto border-perestroika-vermelho/40 hover:border-perestroika-vermelho/70",
};

const today = () =>
  new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

export const ActionQueue = ({ items, loading, emptyMessage, rightSlot }: Props) => {
  const visible = items.filter((i) => i.count > 0);

  return (
    <section className="rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 backdrop-blur p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50">
            hoje
          </p>
          <p className="font-display text-2xl sm:text-3xl uppercase text-perestroika-preto leading-none mt-1">
            {today()}
          </p>
        </div>
        {rightSlot}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-perestroika-preto/5 animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/15 bg-perestroika-bege/40 px-4 py-8 text-center">
          <p className="font-display text-xl uppercase text-perestroika-preto">
            tudo no jeito
          </p>
          <p className="font-body text-sm text-perestroika-preto/60 mt-1">
            {emptyMessage ?? "nenhuma ação pendente agora."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map((it) => (
            <Link
              key={it.label}
              to={it.to}
              className={cn(
                "group rounded-2xl border px-4 py-3 flex items-center gap-3 transition-colors",
                TONE[it.tone ?? "neutral"],
              )}
            >
              <span className="font-display text-3xl leading-none w-12 text-perestroika-preto tabular-nums">
                {it.count}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-perestroika-preto leading-snug">
                  {it.label}
                </p>
                {it.hint && (
                  <p className="font-body text-[11px] text-perestroika-preto/55 mt-0.5">
                    {it.hint}
                  </p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-perestroika-preto/60 group-hover:translate-x-0.5 group-hover:text-perestroika-preto transition-all" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
