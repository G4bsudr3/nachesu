import { Skeleton } from "@/components/ui/skeleton";

/**
 * placeholder do painel do exercício enquanto o chunk lazy do registry carrega.
 * espelha o esqueleto real de todo painel: cabeçalho, faixa de kpis e blocos
 * de leitura da turma, pra não haver salto de layout quando o conteúdo chega.
 */
export function PanelSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">carregando painel do exercício</span>

      <header className="space-y-2">
        <Skeleton className="h-3 w-32 rounded-full bg-perestroika-preto/10" />
        <Skeleton className="h-8 w-72 max-w-full rounded-xl bg-perestroika-preto/10" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-full bg-perestroika-preto/5" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5 space-y-3"
          >
            <Skeleton className="h-3 w-24 rounded-full bg-perestroika-preto/10" />
            <Skeleton className="h-7 w-16 rounded-lg bg-perestroika-preto/10" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full bg-perestroika-preto/10" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-5 space-y-3"
          >
            <Skeleton className="h-4 w-40 rounded-full bg-perestroika-preto/10" />
            <Skeleton className="h-3 w-full rounded-full bg-perestroika-preto/5" />
            <Skeleton className="h-3 w-4/5 rounded-full bg-perestroika-preto/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelSkeleton;
