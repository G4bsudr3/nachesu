import estrelaPretaUrl from "@/assets/brand/estrela-preta.png";
import estrelaBegeUrl from "@/assets/brand/estrela-bege.png";
import estrelaRosaUrl from "@/assets/brand/estrela-rosa.png";
import estrelaBrancaUrl from "@/assets/brand/estrela-branca.png";

interface EletivaStarProps {
  size?: number;
  className?: string;
  color?: "preta" | "bege" | "rosa" | "branca";
}

const SRC_MAP: Record<NonNullable<EletivaStarProps["color"]>, string> = {
  preta: estrelaPretaUrl,
  bege: estrelaBegeUrl,
  rosa: estrelaRosaUrl,
  branca: estrelaBrancaUrl,
};

/**
 * estrela ornamental da eletiva ia na prática.
 * o glifo em si é geométrico (4 pontas, vibe bauhaus) e funciona
 * sem amarrar a marca perestroika. drop-in replace de
 * <EstrelaPerestroika /> nas páginas-aluno (mesma api).
 */
export const EletivaStar = ({
  size = 120,
  className,
  color = "preta",
}: EletivaStarProps) => {
  return (
    <img
      src={SRC_MAP[color]}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: "auto" }}
      className={`select-none ${className ?? ""}`}
      draggable={false}
    />
  );
};
