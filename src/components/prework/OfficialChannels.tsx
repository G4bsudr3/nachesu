import { Play, Youtube, Instagram, ExternalLink } from "lucide-react";

/** bloco de canais oficiais do lovable. youtube + instagram + vídeo destacado. */
export const OfficialChannels = () => {
  return (
    <section className="rounded-3xl border border-perestroika-preto/15 bg-perestroika-bege/70 backdrop-blur p-5 sm:p-7">
      <header className="mb-4">
        <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/55">extra</p>
        <h2 className="mt-1 font-display uppercase text-2xl sm:text-3xl leading-none">canais oficiais</h2>
        <p className="mt-2 font-body text-sm text-perestroika-preto/70 max-w-xl">
          conteúdo oficial em inglês, mas o visual entrega bem. cola os canais antes ou depois da imersão.
        </p>
      </header>

      {/* vídeo destaque */}
      <a
        href="https://www.youtube.com/watch?v=4NpUPggv3oU"
        target="_blank"
        rel="noreferrer"
        className="group block rounded-2xl border border-perestroika-preto/15 bg-perestroika-preto text-perestroika-bege p-5 hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-rosa focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
      >
        <div className="flex items-center gap-4">
          <div className="shrink-0 h-14 w-14 rounded-full bg-perestroika-rosa text-perestroika-preto flex items-center justify-center group-hover:scale-105 transition-transform">
            <Play className="h-6 w-6 ml-0.5 fill-perestroika-preto" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-[11px] uppercase tracking-wide opacity-70">vídeo recomendado pra começar</p>
            <p className="mt-1 font-display uppercase text-xl sm:text-2xl leading-tight">
              começa por aqui: como funciona o lovable
            </p>
            <p className="mt-1.5 font-body text-sm opacity-80 inline-flex items-center gap-1">
              youtube · ~10 min
              <ExternalLink className="h-3 w-3" />
            </p>
          </div>
        </div>
      </a>

      {/* canais */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <a
          href="https://www.youtube.com/@lovable"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege p-4 hover:border-perestroika-vermelho/50 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-perestroika-vermelho text-perestroika-bege flex items-center justify-center">
              <Youtube className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display uppercase text-lg leading-none">youtube</p>
              <p className="mt-1 font-body text-xs text-perestroika-preto/70">tutoriais oficiais</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-perestroika-preto/50" />
          </div>
        </a>

        <a
          href="https://www.instagram.com/lovable.dev/"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege p-4 hover:border-perestroika-rosa/60 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 h-10 w-10 rounded-xl bg-perestroika-rosa text-perestroika-preto flex items-center justify-center">
              <Instagram className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display uppercase text-lg leading-none">instagram</p>
              <p className="mt-1 font-body text-xs text-perestroika-preto/70">novidades e cases curtos</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-perestroika-preto/50" />
          </div>
        </a>
      </div>
    </section>
  );
};
