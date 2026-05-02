import buildingUrl from "@/assets/joao/building.png";
import thinkingUrl from "@/assets/joao/thinking.png";
import talkingUrl from "@/assets/joao/talking.png";
import celebratingUrl from "@/assets/joao/celebrating.png";
import restingUrl from "@/assets/joao/resting.png";
import peekingUrl from "@/assets/joao/peeking.png";

export type JoaoPose =
  | "building"
  | "thinking"
  | "talking"
  | "celebrating"
  | "resting"
  | "peeking";

const POSE_SRC: Record<JoaoPose, string> = {
  building: buildingUrl,
  thinking: thinkingUrl,
  talking: talkingUrl,
  celebrating: celebratingUrl,
  resting: restingUrl,
  peeking: peekingUrl,
};

interface EletivaSymbolProps {
  size?: number;
  className?: string;
  rotate?: number;
  /**
   * pose narrativa do joão-de-barro. cada contexto da app usa uma pose
   * diferente pra que ele seja um personagem vivo, não uma imagem repetida.
   *
   * - `building` (default): construindo o ninho. usar em loadings.
   * - `thinking`: pensando, com "...". usar no estado de loading do tutor.
   * - `talking`: falando com asa em gesto. usar como avatar do tutor.
   * - `celebrating`: asas abertas + confete. usar em conquistas/heros.
   * - `resting`: parado no galho ao lado do ninho vazio. usar em empty states.
   * - `peeking`: espiando do canto. usar como decoração de fundo/canto.
   */
  pose?: JoaoPose;
}

/**
 * símbolo-marca da eletiva ia na prática. usa o mascote tutor
 * (joão-de-barro) como signature visual recorrente, com 6 poses
 * narrativas distintas pra que ele seja um personagem vivo em vez
 * de uma imagem repetida.
 *
 * herda paleta perestroika do próprio asset — mantém a regra de
 * "mascotes mantêm cores perestroika mesmo no contexto sebrae".
 */
export const EletivaSymbol = ({
  size = 64,
  className,
  rotate = 0,
  pose = "building",
}: EletivaSymbolProps) => {
  return (
    <img
      src={POSE_SRC[pose]}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: "auto", transform: `rotate(${rotate}deg)` }}
      className={`select-none ${className ?? ""}`}
      draggable={false}
    />
  );
};
