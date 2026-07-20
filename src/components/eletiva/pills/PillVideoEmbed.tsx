import { ArrowRight, CheckCircle2 } from "lucide-react";

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
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const url = schema.embed_url ?? "";

  return (
    <div className="space-y-5">
      <header>
        <h3 className="font-display uppercase text-2xl sm:text-3xl leading-[0.95] mb-2">
          {title}
        </h3>
        {bodyMd && (
          <p className="font-body text-perestroika-preto/70 whitespace-pre-wrap text-sm sm:text-base">
            {bodyMd}
          </p>
        )}
      </header>

      {url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/95">
          <iframe
            src={url}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => !isCompleted && onComplete()}
          disabled={isCompleted || isCompleting}
          aria-busy={isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-body font-medium text-sm uppercase tracking-wide text-perestroika-bege bg-perestroika-preto transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              já vi
            </>
          ) : (
            <>
              vi, bora pra missão
              <ArrowRight className="h-4 w-4" aria-hidden="true" style={{ color: accent }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
