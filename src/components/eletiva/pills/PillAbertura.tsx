import { ChevronDown, ArrowRight, CheckCircle2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VideoFacade } from "./VideoFacade";

type Schema = {
  type?: "video_with_transcript";
  video_placeholder?: boolean;
  video_url?: string;
  video_poster?: string;
  provider?: string | null;
  transcript?: string;
  transcript_collapsible?: boolean;
  completion?: { type?: string; label?: string };
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

/** arquivo de vídeo tocado direto no <video>. o resto vira iframe (loom, youtube, vimeo). */
const isDirectFile = (url: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);

/**
 * pílula de abertura: vídeo do educador + transcrição recolhida embaixo.
 * quando não tem vídeo, a pílula fica despublicada no banco e o estudante
 * nem chega aqui. o placeholder abaixo só aparece na pré-visualização do admin.
 */
export function PillAbertura({
  title,
  bodyMd,
  schema,
  accent,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const transcript = (schema.transcript ?? "").trim();

  const url = (schema.video_url ?? "").trim();
  const ctaLabel = schema.completion?.label ?? "começar o módulo";

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">
          {title}
        </h2>
        {bodyMd && (
          <p className="font-body text-perestroika-preto/75 whitespace-pre-wrap text-sm sm:text-base">
            {bodyMd}
          </p>
        )}
      </header>

      {/* vídeo: arquivo direto, embed, ou placeholder (só admin vê) */}
      {url ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-preto/95">
          {isDirectFile(url) ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={schema.video_poster}
              className="absolute inset-0 h-full w-full"
              src={url}
            >
              seu navegador não suporta vídeo embedado.
            </video>
          ) : (
            <VideoFacade url={url} title={title} accent={accent} poster={schema.video_poster} />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/20 bg-perestroika-preto/[0.03] p-5 sm:p-6">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55">
            abertura em texto
          </p>
          <p className="mt-2 font-body text-sm sm:text-base text-perestroika-preto/80 leading-relaxed">
            o vídeo desta abertura ainda não está no ar. o conteúdo dela está escrito acima e no
            resto do módulo, então nada fica faltando pra você seguir.
          </p>
        </div>
      )}


      {/* transcrição em accordion fechado por padrão */}
      {transcript && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="transcript" className="border-2 border-perestroika-preto/15 rounded-xl px-4">
            <AccordionTrigger className="hover:no-underline font-body text-sm uppercase tracking-wider [&>svg]:hidden">
              <span className="inline-flex items-center gap-2">
                <ChevronDown className="h-4 w-4 transition-transform" aria-hidden="true" />
                ler a transcrição
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="font-body text-sm sm:text-base text-perestroika-preto/85 whitespace-pre-wrap leading-relaxed pb-2">
                {transcript}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="flex justify-end pt-2">
        {isCompleted ? (
          <p
            className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto/15 px-5 py-2.5 font-body text-sm uppercase tracking-wide text-perestroika-preto/70"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
            você já concluiu este passo
          </p>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting}
            aria-busy={isCompleting}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide text-perestroika-bege transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: accent }}
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

      </div>
    </div>
  );
}
