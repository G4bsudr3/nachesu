import { PageHeader } from "@/components/layout/PageHeader";

/**
 * skeleton do módulo que mantém o mesmo esqueleto visual da tela real
 * (header + breadcrumb + bloco de título + 3 pílulas) pra evitar flash
 * de "tijolinho centralizado" → "layout completo". usa motion-safe.
 */
export const ModuloSkeleton = () => {
  return (
    <div
      className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">carregando módulo</span>
      <PageHeader showLogo logoLink="/app" />

      <main className="container max-w-3xl pt-6 pb-16 sm:pt-10">
        {/* breadcrumb */}
        <div className="h-3 w-28 rounded bg-perestroika-preto/10 mb-6 motion-safe:animate-pulse" />

        {/* header do módulo: eyebrow + título + objetivo + meta */}
        <div className="mb-10 motion-safe:animate-pulse">
          <div className="h-3 w-40 rounded bg-perestroika-preto/15 mb-4" />
          <div className="h-10 sm:h-14 w-11/12 rounded bg-perestroika-preto/15 mb-3" />
          <div className="h-10 sm:h-14 w-2/3 rounded bg-perestroika-preto/15 mb-5" />
          <div className="h-4 w-3/4 rounded bg-perestroika-preto/10 mb-2" />
          <div className="h-4 w-1/2 rounded bg-perestroika-preto/10 mb-5" />
          <div className="flex gap-3">
            <div className="h-5 w-20 rounded-full bg-perestroika-preto/10" />
            <div className="h-5 w-28 rounded-full bg-perestroika-preto/10" />
          </div>
        </div>

        {/* lista de pílulas */}
        <div className="space-y-4 mb-10">
          <div className="h-7 w-28 rounded bg-perestroika-preto/15 motion-safe:animate-pulse mb-2" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] motion-safe:animate-pulse"
            />
          ))}
        </div>

        {/* footer de navegação */}
        <div className="flex items-center justify-between gap-4 motion-safe:animate-pulse">
          <div className="h-10 w-32 rounded-full bg-perestroika-preto/10" />
          <div className="h-10 w-32 rounded-full bg-perestroika-preto/10" />
        </div>
      </main>
    </div>
  );
};
