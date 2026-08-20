import { Suspense } from "react";
import { getModuloConclusao } from "./moduloConclusaoRegistry";

type Props = {
  courseSlug: string | null | undefined;
  moduleNumber: number | null | undefined;
  moduleId: string;
};

/**
 * ponto único de montagem da síntese de turma pós-conclusão.
 * vale pras duas eletivas: basta registrar o componente em `moduloConclusaoRegistry`.
 */
export const ModuloConclusaoSlot = ({ courseSlug, moduleNumber, moduleId }: Props) => {
  const Conclusao = getModuloConclusao(courseSlug, moduleNumber);
  if (!Conclusao) return null;

  return (
    <Suspense
      fallback={
        <p className="font-body text-sm text-perestroika-preto/60 py-4">
          carregando o que a turma respondeu...
        </p>
      }
    >
      <Conclusao moduleId={moduleId} />
    </Suspense>
  );
};
