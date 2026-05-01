interface Props {
  current: number;
  total: number;
}

export const ProgressBar = ({ current, total }: Props) => {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-perestroika-preto/55">
        <span>passo {current} de {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-perestroika-preto/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
          }}
        />
      </div>
    </div>
  );
};
