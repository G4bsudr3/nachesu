import { useEffect, useState } from "react";

interface CountdownProps {
  target: Date;
}

type Remaining = {
  dias: number;
  horas: number;
  minutos: number;
  expirado: boolean;
};

const calcular = (target: Date): Remaining => {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { dias: 0, horas: 0, minutos: 0, expirado: true };
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diff / (1000 * 60)) % 60);
  return { dias, horas, minutos, expirado: false };
};

const Bloco = ({ valor, label }: { valor: number; label: string }) => (
  <div className="flex flex-col items-center min-w-[64px] sm:min-w-[80px]">
    <span className="font-display text-4xl sm:text-5xl md:text-6xl text-perestroika-preto leading-none tabular-nums">
      {String(valor).padStart(2, "0")}
    </span>
    <span className="mt-1 font-body text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
      {label}
    </span>
  </div>
);

export const Countdown = ({ target }: CountdownProps) => {
  const [r, setR] = useState<Remaining>(() => calcular(target));

  useEffect(() => {
    const id = setInterval(() => setR(calcular(target)), 60_000);
    return () => clearInterval(id);
  }, [target]);

  if (r.expirado) {
    return (
      <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-5 py-4">
        <span className="w-2 h-2 rounded-full bg-perestroika-preto animate-pulse" />
        <span className="font-display uppercase text-xl sm:text-2xl text-perestroika-preto">
          é hoje!
        </span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-col gap-3 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege px-5 py-4"
      aria-label={`faltam ${r.dias} dias, ${r.horas} horas e ${r.minutos} minutos`}
    >
      <span className="font-body text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
        faltam
      </span>
      <div className="flex items-end gap-3 sm:gap-5">
        <Bloco valor={r.dias} label="dias" />
        <span className="font-display text-3xl sm:text-4xl text-perestroika-preto/30 leading-none pb-5">:</span>
        <Bloco valor={r.horas} label="horas" />
        <span className="font-display text-3xl sm:text-4xl text-perestroika-preto/30 leading-none pb-5">:</span>
        <Bloco valor={r.minutos} label="min" />
      </div>
    </div>
  );
};
