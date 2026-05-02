import joaoDeBarroUrl from "@/assets/joao-de-barro-tutor.png";

interface EletivaSymbolProps {
  size?: number;
  className?: string;
  rotate?: number;
}

/**
 * símbolo-marca da eletiva ia na prática. usa o mascote tutor
 * (joão-de-barro) como signature visual recorrente em loading,
 * hero, banners e estado vazio.
 *
 * api espelha <LagrimaGradient /> propositalmente pra drop-in
 * replace nas páginas-aluno (size, className, rotate).
 *
 * herda paleta perestroika do próprio asset — mantém a regra de
 * "mascotes mantêm cores perestroika mesmo no contexto sebrae".
 */
export const EletivaSymbol = ({ size = 64, className, rotate = 0 }: EletivaSymbolProps) => {
  return (
    <img
      src={joaoDeBarroUrl}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: "auto", transform: `rotate(${rotate}deg)` }}
      className={`select-none ${className ?? ""}`}
      draggable={false}
    />
  );
};
