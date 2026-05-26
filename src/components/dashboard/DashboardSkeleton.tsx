import { PageHeader } from "@/components/layout/PageHeader";

/**
 * skeleton do dashboard que mantém o esqueleto da tela real
 * (header + saudação + faixa de cadência + hero da eletiva) pra evitar
 * flash de "tijolinho centralizado" → "layout completo".
 */
export const DashboardSkeleton = () => {
  return (
    <div
      className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">carregando seu início</span>
      <PageHeader showLogo logoLink="/" />

      <main className="relative z-10">
        <div className="container max-w-5xl space-y-8 pt-6 sm:space-y-10 sm:pt-10">
          {/* saudação */}
          <div className="space-y-3 motion-safe:animate-pulse">
            <div className="h-9 sm:h-10 w-56 rounded bg-perestroika-preto/15" />
            <div className="h-4 w-72 rounded bg-perestroika-preto/10" />
          </div>

          {/* faixa de cadência da semana */}
          <div className="h-12 rounded-2xl border border-perestroika-preto/10 bg-white/40 motion-safe:animate-pulse" />

          {/* hero da eletiva (mesma silhueta do EletivaCard real) */}
          <div className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-preto/[0.03] p-8 sm:p-12 motion-safe:animate-pulse">
            <div className="h-3 w-40 bg-perestroika-preto/15 rounded mb-6" />
            <div className="h-12 sm:h-16 w-11/12 bg-perestroika-preto/15 rounded mb-3" />
            <div className="h-12 sm:h-16 w-2/3 bg-perestroika-preto/15 rounded mb-6" />
            <div className="h-4 w-3/4 bg-perestroika-preto/10 rounded mb-2" />
            <div className="h-4 w-1/2 bg-perestroika-preto/10 rounded mb-8" />
            <div className="flex flex-wrap gap-3">
              <div className="h-12 w-48 rounded-full bg-perestroika-preto/15" />
              <div className="h-12 w-36 rounded-full bg-perestroika-preto/10" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
