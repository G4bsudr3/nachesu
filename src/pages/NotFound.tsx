import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body relative [overflow-x:clip] flex flex-col">
      {/* decor: joão-de-barro espiando atrás do conteúdo */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-16 -right-16 sm:-bottom-20 sm:-right-20 opacity-20">
          <EletivaSymbol size={360} rotate={-14} pose="peeking" />
        </div>
      </div>

      <header className="container relative z-10 pt-6 sm:pt-8 flex items-center justify-center">
        <Link
          to="/"
          aria-label="ir para o início"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto rounded-xl"
        >
          <NachesULogo variant="ink" className="h-6 sm:h-7 w-auto" />
        </Link>
      </header>

      <main className="container max-w-2xl flex-1 relative z-10 flex items-center py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-3"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/60">
            erro 404
          </p>
          <h1 className="font-display uppercase text-6xl sm:text-8xl leading-[0.85]">
            essa página<br />sumiu.
          </h1>

          <div className="mt-6 space-y-3 text-base sm:text-lg text-perestroika-preto/80 max-w-lg">
            <p>o link que você abriu não existe mais ou nunca existiu.</p>
            <p className="text-sm text-perestroika-preto/60 break-all">
              tentou acessar: <span className="font-mono">{location.pathname}</span>
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              <Home className="w-4 h-4" />
              ir pro início
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full border-2 border-perestroika-preto/15 px-7 py-4 text-sm uppercase tracking-wide hover:border-perestroika-preto/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              <ArrowLeft className="w-4 h-4" />
              voltar
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="container py-8 relative z-10">
        <EletivaFooter />
      </footer>
    </div>
  );
};

export default NotFound;
