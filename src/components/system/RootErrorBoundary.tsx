import { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  /** Escopo do boundary, ajuda no log. Ex.: "root", "modulo", "dashboard". */
  scope?: string;
  /** Fallback custom; por default usa o editorial com joão-de-barro. */
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Boundary editorial com joão-de-barro pensando. Captura runtime errors,
 * loga via `logger.error` e oferece dois caminhos de saída pro estudante:
 * recarregar a tela atual ou voltar pro início.
 *
 * Pode ser usado no root (em main.tsx) ou em torno de rotas críticas pra
 * isolar falhas e não derrubar header/nav.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(
      `[errorboundary:${this.props.scope ?? "root"}]`,
      error,
      info.componentStack,
    );
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex items-center justify-center px-6 [overflow-x:clip]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-6 w-fit motion-safe:animate-[pulse_3s_ease-in-out_infinite]">
            <EletivaSymbol size={96} pose="thinking" />
          </div>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
            algo travou aqui
          </p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl leading-none mb-3">
            o joão tá pensando
          </h1>
          <p className="font-body text-sm text-perestroika-preto/70 mb-6">
            recarrega que normalmente volta. se insistir, volta pro início e tenta de novo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide min-h-[44px]"
            >
              recarregar
            </button>
            <a
              href="/app"
              className="inline-flex items-center justify-center rounded-full border-2 border-perestroika-preto/20 text-perestroika-preto px-6 py-3 font-body text-sm uppercase tracking-wide min-h-[44px] hover:border-perestroika-preto/40"
            >
              voltar pro início
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-[11px] text-perestroika-preto/50 bg-perestroika-preto/5 p-3 rounded-xl overflow-x-auto">
              {error.message}
            </pre>
          )}
        </motion.div>
      </div>
    );
  }
}
