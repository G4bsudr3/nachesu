import estrelaPretaUrl from "@/assets/brand/estrela-preta.png";
import estrelaBegeUrl from "@/assets/brand/estrela-bege.png";
import estrelaRosaUrl from "@/assets/brand/estrela-rosa.png";
import estrelaBrancaUrl from "@/assets/brand/estrela-branca.png";

interface EstrelaPerestroikaProps {
  size?: number;
  className?: string;
  color?: "preta" | "bege" | "rosa" | "branca";
}

const SRC_MAP: Record<NonNullable<EstrelaPerestroikaProps["color"]>, string> = {
  preta: estrelaPretaUrl,
  bege: estrelaBegeUrl,
  rosa: estrelaRosaUrl,
  branca: estrelaBrancaUrl,
};

/**
 * estrela oficial perestroika (4 pontas, "a" estilizado).
 * usa o png oficial — não recriar.
 */
export const EstrelaPerestroika = ({
  size = 120,
  className,
  color = "preta",
}: EstrelaPerestroikaProps) => {
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
