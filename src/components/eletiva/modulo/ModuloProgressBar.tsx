import { useEffect, useState } from "react";

interface Props {
  total: number;
  done: number;
  trailColor: string;
  moduleNumber: number;
  moduleTitle: string;
}

/**
 * barra sticky no topo do módulo: mostra "pílula X de N" + progress bar fina.
 * aparece só depois que o aluno rola um pouco, pra não competir com o header.
 */
export const ModuloProgressBar = ({
  total,
  done,
  trailColor,
  moduleNumber,
  moduleTitle,
}: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (total === 0) return null;
  if (!visible) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="fixed top-0 inset-x-0 z-40 transition-transform duration-300 translate-y-0">

      <div className="bg-perestroika-bege/95 backdrop-blur border-b border-perestroika-preto/10">
        <div className="container max-w-3xl py-2.5 flex items-center gap-3">
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55 shrink-0">
            mód {String(moduleNumber).padStart(2, "0")}
          </p>
          <p className="font-body text-xs text-perestroika-preto/85 truncate flex-1 min-w-0">
            {moduleTitle.toLowerCase()}
          </p>
          <p className="font-body text-[11px] tabular-nums text-perestroika-preto/65 shrink-0">
            {done}/{total} pílulas
          </p>
        </div>
        <div className="h-[3px] bg-perestroika-preto/10 overflow-hidden">
          <div
            className="h-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: trailColor }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`progresso do módulo: ${pct}%`}
          />
        </div>
      </div>
    </div>
  );
};
