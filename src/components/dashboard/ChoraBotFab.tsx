import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";

/**
 * floating action button do chora bot — versão editorial perestroika.
 *
 * substitui o avatar redondo genérico (que ficava confuso em 56px e
 * competia com os pretos do dashboard) pela LÁGRIMA oficial perestroika
 * com 2 olhinhos sobrepostos. mantém leitura "é um bot" mas vira marca.
 *
 * label "tira tua dúvida" agora é chip bege com borda preta fina,
 * mesmo idioma visual dos chips de progresso (carta, certificado).
 * pulsa periodicamente no mobile pra chamar atenção, sem ser invasivo.
 *
 * respeita --mobile-nav-h, safe-area iOS e prefers-reduced-motion.
 */
export const ChoraBotFab = () => {
  const [breathe, setBreathe] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = () => {
      setBreathe(true);
      setTimeout(() => setBreathe(false), 2200);
    };
    const id = setInterval(tick, 9000);
    const first = setTimeout(tick, 2500);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, []);

  const handleClick = () => {
    // haptic feedback no mobile (Android suporta; iOS ignora silenciosamente)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // navegadores que bloqueiam vibration sem gesture válido
      }
    }
    // dispara o ripple visual; reseta após a animação pra permitir cliques repetidos
    setPressed(true);
    setTimeout(() => setPressed(false), 480);
  };

  return (
    <Link
      to="/app/chora-bot"
      onClick={handleClick}
      aria-label="abrir chora bot — tira tua dúvida"
      className="group fixed right-4 z-40 flex items-center gap-2.5 sm:right-6 transition-transform duration-150 hover:scale-[1.03] active:scale-90"
      style={{
        bottom: "calc(var(--mobile-nav-h, 0px) + 1rem)",
      }}
    >
      {/* label editorial — bege com borda preta, mesmo idioma dos chips de progresso */}
      <span
        className={`hidden sm:inline-flex items-center gap-2 rounded-full border border-perestroika-preto/80 bg-perestroika-bege px-3.5 py-1.5 font-display uppercase text-[10px] tracking-[0.2em] text-perestroika-preto shadow-[0_2px_10px_-4px_rgba(9,9,9,0.25)] transition-all duration-300 ${
          breathe ? "scale-[1.04]" : "group-hover:scale-[1.04]"
        }`}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-perestroika-rosa" />
        tira tua dúvida
      </span>

      {/* mobile: super discreto. em repouso, só um pontinho rosa pulsando no canto da lágrima.
          o rótulo aparece brevemente durante o "breathe" periódico, depois some.
          isso reduz competição visual com a MobileNav (que já tem 4 ícones + labels). */}
      <span
        className={`sm:hidden absolute right-1 top-1 z-10 inline-flex items-center gap-1.5 rounded-full border border-perestroika-preto/70 bg-perestroika-bege px-2 py-0.5 font-display uppercase text-[8px] tracking-[0.18em] text-perestroika-preto shadow-[0_2px_8px_-4px_rgba(9,9,9,0.3)] transition-all duration-500 origin-right pointer-events-none ${
          breathe
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-1"
        }`}
        aria-hidden="true"
      >
        tira tua dúvida
      </span>

      {/* indicador permanente mobile: pontinho rosa minúsculo, sempre visível mas discreto */}
      <span
        className="sm:hidden absolute -top-0.5 -right-0.5 z-10 w-2 h-2 rounded-full bg-perestroika-rosa border border-perestroika-bege pointer-events-none"
        aria-hidden="true"
      />

      {/* lágrima perestroika com micro-rosto */}
      <div className="relative w-[68px] h-[68px] grid place-items-center shrink-0">
        {/* glow rosado sutil no hover */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none ${
            pressed ? "opacity-90" : "opacity-0 group-hover:opacity-60"
          }`}
          style={{
            background:
              "radial-gradient(circle, rgba(247,86,166,0.55), rgba(254,123,2,0.25) 55%, transparent 78%)",
          }}
          aria-hidden="true"
        />

        {/* ripple no clique — anel rosa que expande e some.
            usa key dinâmica pra reiniciar a animação a cada clique. */}
        {pressed && (
          <span
            key={Date.now()}
            className="absolute inset-0 rounded-full border-2 border-perestroika-rosa pointer-events-none animate-fab-ripple"
            aria-hidden="true"
          />
        )}

        {/* lágrima */}
        <div className="relative drop-shadow-[0_6px_16px_rgba(253,70,68,0.35)]">
          <LagrimaGradient size={64} />

          {/* olhinhos pretos sobrepostos — mesmo tratamento do avatar do bot */}
          <svg
            viewBox="0 0 64 64"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {/* olhos posicionados no terço superior da lágrima, espaçados */}
            <circle cx="26" cy="38" r="2.4" fill="#090909" />
            <circle cx="38" cy="38" r="2.4" fill="#090909" />
            {/* brilhinho (highlight) opcional */}
            <circle cx="26.7" cy="37.3" r="0.7" fill="#f2e4d8" />
            <circle cx="38.7" cy="37.3" r="0.7" fill="#f2e4d8" />
          </svg>
        </div>
      </div>
    </Link>
  );
};
