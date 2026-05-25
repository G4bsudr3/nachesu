import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { BotAvatar } from "@/components/chora-bot/BotAvatar";

/**
 * floating action button do tutor IA (mascote joão-de-barro).
 *
 * o avatar circular do tutor fica permanente no canto, com label editorial
 * "tire sua dúvida" pulsando periodicamente no mobile pra chamar atenção
 * sem ser invasivo. respeita --mobile-nav-h, safe-area iOS e
 * prefers-reduced-motion.
 */
export const ChoraBotFab = () => {
  const { pathname } = useLocation();
  const [breathe, setBreathe] = useState(false);
  const [pressed, setPressed] = useState(false);

  // não mostra o FAB dentro da própria tela do tutor (evita CTA apontando pra si mesmo)
  const isOnTutorRoute =
    pathname.startsWith("/app/tutor") || pathname.startsWith("/app/chora-bot");
  if (isOnTutorRoute) return null;

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
      to="/app/tutor"
      onClick={handleClick}
      aria-label="abrir tutor IA — tire sua dúvida"
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
        tire sua dúvida
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
        tire sua dúvida
      </span>

      {/* indicador permanente mobile: pontinho rosa minúsculo, sempre visível mas discreto */}
      <span
        className="sm:hidden absolute -top-0.5 -right-0.5 z-10 w-2 h-2 rounded-full bg-perestroika-rosa border border-perestroika-bege pointer-events-none"
        aria-hidden="true"
      />

      {/* avatar joão-de-barro com glow sutil + ripple no clique */}
      <div className="relative w-[68px] h-[68px] grid place-items-center shrink-0">
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

        {pressed && (
          <span
            key={Date.now()}
            className="absolute inset-0 rounded-full border-2 border-perestroika-rosa pointer-events-none animate-fab-ripple"
            aria-hidden="true"
          />
        )}

        <div className="relative drop-shadow-[0_6px_16px_rgba(253,70,68,0.35)]">
          <BotAvatar size={64} ring />
        </div>
      </div>
    </Link>
  );
};
