interface Props {
  done: number;
  total: number;
}

/** barra de progresso semântica usando <progress> nativo. */
export const JourneyProgress = ({ done, total }: Props) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-2">
        <label htmlFor="journey-progress" className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/60">
          sua jornada
        </label>
        <span className="font-display text-2xl leading-none text-perestroika-preto">
          {done}<span className="text-perestroika-preto/40">/{total}</span>
        </span>
      </div>
      <progress
        id="journey-progress"
        value={done}
        max={total}
        className="w-full h-2 appearance-none [&::-webkit-progress-bar]:bg-perestroika-preto/10 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-perestroika-preto [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-perestroika-preto [&::-moz-progress-bar]:rounded-full rounded-full overflow-hidden"
      />
      <p className="sr-only">{pct}% concluído</p>
    </div>
  );
};
