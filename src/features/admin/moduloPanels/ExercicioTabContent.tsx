import { Suspense } from "react";
import { Info } from "lucide-react";
import { PanelHeader } from "./PanelHeader";
import { PanelSkeleton } from "./PanelSkeleton";
import { getModuloPanel } from "./registry";

interface ExercicioTabContentProps {
  slug: string | undefined;
  number: number | undefined;
}

/**
 * corpo da aba "painel do exercício" do admin.
 * a aba existe sempre nas duas eletivas: quando o registry tem entrada pro
 * par curso:módulo, monta o painel sob medida (lazy, com skeleton);
 * quando não tem, mostra o estado vazio explicativo.
 */
export function ExercicioTabContent({ slug, number }: ExercicioTabContentProps) {
  const ExercicioPanel = getModuloPanel(slug, number);

  if (ExercicioPanel) {
    return (
      <Suspense fallback={<PanelSkeleton />}>
        <ExercicioPanel />
      </Suspense>
    );
  }

  return (
    <>
      <PanelHeader title="sem painel específico" />
      <div className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5 flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-perestroika-preto/5 flex items-center justify-center"
        >
          <Info className="w-4 h-4 text-perestroika-preto/60" />
        </span>
        <div className="space-y-2 text-sm text-perestroika-preto/70 max-w-2xl">
          <p>
            painéis do exercício são feitos sob medida para exercícios pbl com métricas próprias.
            este módulo ainda não tem um.
          </p>
          <p>
            enquanto isso, use a aba{" "}
            <span className="font-semibold text-perestroika-preto">turma</span>{" "}
            para ver entregas, status e revisar respostas dos estudantes.
          </p>
        </div>
      </div>
    </>
  );
}

export default ExercicioTabContent;
