import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { VideoFacade } from "./VideoFacade";

type Schema = {
  type?: "video_embed";
  provider?: "loom" | "youtube" | string;
  embed_url?: string;
};

interface Props {
  title: string;
  bodyMd?: string | null;
  schema: Schema;
  accent: string;
  /** quando true, é referência extra: não conta no tempo nem no progresso do módulo */
  optional?: boolean;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

/**
 * pílula "vídeo embedado simples" — sem entrega, sem accordion.
 * pensada pra bônus opcional (ex: vídeo de apresentação do educador).
 * suporta loom, youtube e qualquer iframe que aceite os mesmos allows.
 */
export function PillVideoEmbed({
  title,
  bodyMd,
  schema,
  accent,
  optional,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const url = schema.embed_url ?? "";

  return (
    <div className="space-y-5">
      <header>
        {optional && (
          <p className="inline-flex items-center gap-1.5 mb-2 font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            <Sparkles className="h-3 w-3" aria-hidden /> bônus opcional
          </p>
        )}
        <h3 className="font-display uppercase text-2xl sm:text-3xl leading-[0.95] mb-2">
          {title}
        </h3>
        {bodyMd && (
          <p className="font-body text-perestroika-preto/70 whitespace-pre-wrap text-sm sm:text-base">
            {bodyMd}
          </p>
        )}
        {optional && (
          <p className="mt-2 font-body text-xs text-perestroika-preto/55">
            isso aqui é referência extra. dá pra seguir o módulo sem ver, e o tempo dele não entra
            nos 50 min.
          </p>
        )}
      </header>


      {url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/95">
          <VideoFacade url={url} title={title} accent={accent} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        {optional ? (
          <p className="font-body text-xs text-perestroika-preto/55">
            pode pular sem prejuízo nenhum.
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => !isCompleted && onComplete()}
          disabled={isCompleted || isCompleting}
          aria-busy={isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-body font-medium text-sm uppercase tracking-wide text-perestroika-bege transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: accent }}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              já vi
            </>
          ) : optional ? (
            <>
              vi esse bônus
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              vi, bora pro exercício
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}
