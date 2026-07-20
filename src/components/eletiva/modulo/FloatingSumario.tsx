import { useState } from "react";
import { CheckCircle2, ChevronUp, Circle, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ModuloPill } from "./ModuloPillList";

interface Props {
  pills: ModuloPill[] | undefined;
  completedPillIds: Set<string>;
  unlockedPillIds: Set<string>;
  trailColor: string;
}

/**
 * sumário flutuante: pill fixa no rodapé com progresso + expansível pra pular entre blocos.
 * escrolla pra âncora `#pilula-{n}` definida em PillCardShell.
 */
export const FloatingSumario = ({ pills, completedPillIds, unlockedPillIds, trailColor }: Props) => {
  const [open, setOpen] = useState(false);
  if (!pills || pills.length === 0) return null;

  const total = pills.length;
  const done = pills.filter((p) => completedPillIds.has(p.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const jumpTo = (idx: number) => {
    const el = document.getElementById(`pilula-${idx + 1}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false);
    }
  };

  return (
    <>
      {/* backdrop quando aberto */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-perestroika-preto/40 z-40"
            style={{ marginBottom: "var(--mobile-nav-h, 0px)" }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* painel expansível */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-md bg-perestroika-preto text-perestroika-bege rounded-3xl shadow-2xl overflow-hidden"
            style={{
              bottom: `calc(5.5rem + var(--mobile-nav-h, 0px))`,
            }}
            role="dialog"
            aria-label="sumário dos blocos"
          >
            <div className="px-5 py-4 border-b border-perestroika-bege/10">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display uppercase text-lg">sumário · {total} blocos</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="fechar sumário"
                  className="text-perestroika-bege/70 hover:text-perestroika-bege"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-baseline justify-between mb-2 gap-3">
                <p className="font-body text-[10px] uppercase tracking-[0.22em] text-perestroika-bege/60">
                  progresso do módulo
                </p>
                <p className="font-body text-xs tabular-nums text-perestroika-bege/85">
                  <span className="font-semibold text-perestroika-bege">{done}/{total}</span>
                  <span className="text-perestroika-bege/40 mx-1.5">·</span>
                  <span className="font-semibold text-perestroika-bege">{pct}%</span>
                </p>
              </div>
              <div
                className="h-1.5 w-full rounded-full bg-perestroika-bege/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, backgroundColor: trailColor }}
                />
              </div>
            </div>
            <ol className="max-h-[50vh] overflow-y-auto py-2">
              {pills.map((p, idx) => {
                const isDone = completedPillIds.has(p.id);
                const isLocked = !unlockedPillIds.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => !isLocked && jumpTo(idx)}
                      disabled={isLocked}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${
                        isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-perestroika-bege/5"
                      }`}
                    >
                      <span
                        className="font-display text-lg tabular-nums w-8 shrink-0"
                        style={{ color: isDone ? trailColor : undefined }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-body text-[10px] uppercase tracking-widest text-perestroika-bege/50 block">
                          bloco {idx + 1} de {total}
                        </span>
                        <span className="font-body text-sm truncate block">{p.title.toLowerCase()}</span>
                      </span>
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5 text-perestroika-bege/40 shrink-0" />
                      ) : isDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: trailColor }} />
                      ) : (
                        <Circle className="h-4 w-4 text-perestroika-bege/40 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      {/* pill fixa */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-md"
        style={{ bottom: `calc(1.25rem + var(--mobile-nav-h, 0px))` }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full bg-perestroika-bege text-perestroika-preto border-2 border-perestroika-preto/15 rounded-full p-2 pl-4 flex items-center justify-between shadow-2xl hover:border-perestroika-preto/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
          aria-expanded={open}
          aria-label={`sumário do módulo, ${done} de ${total} blocos concluídos`}
        >
          <div className="flex items-center gap-3">
            <div
              className="relative h-9 w-9 rounded-full flex items-center justify-center font-body text-[10px] font-semibold tabular-nums"
              style={{
                background: `conic-gradient(${trailColor} ${pct}%, rgba(9,9,9,0.08) ${pct}%)`,
              }}
              aria-hidden
            >
              <span className="absolute inset-1 rounded-full bg-perestroika-bege flex items-center justify-center">
                {pct}%
              </span>
            </div>
            <div className="text-left leading-tight">
              <p className="font-body text-[9px] uppercase tracking-[0.22em] text-perestroika-preto/55">
                sumário
              </p>
              <p className="font-body text-xs font-semibold">
                {done}/{total} blocos
              </p>
            </div>
          </div>
          <span
            className="h-9 w-9 rounded-full flex items-center justify-center text-perestroika-preto transition-transform bg-perestroika-preto/5"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            <ChevronUp className="h-4 w-4" />
          </span>
        </button>
      </div>
    </>
  );
};
