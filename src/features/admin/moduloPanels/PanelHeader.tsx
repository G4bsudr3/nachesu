import type { ReactNode } from "react";

/**
 * cabeçalho padrão da aba "painel do exercício".
 * mantém o mesmo bloco (eyebrow · título · descrição) nos módulos que têm
 * painel registrado e no estado vazio de quem não tem, pra não parecer
 * duas telas diferentes dentro do mesmo admin.
 */
export function PanelHeader({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      <p className="eyebrow text-perestroika-preto/55">painel do exercício</p>
      <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[1.05] text-perestroika-preto">
        {title}
      </h2>
      {description && (
        <p className="font-body text-sm text-perestroika-preto/70 max-w-2xl">
          {description}
        </p>
      )}
    </header>
  );
}

export default PanelHeader;
