import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Loader2, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  useModuleRating,
  isRatingDismissed,
  dismissRating,
} from "@/features/hub/useModuleRating";

interface Props {
  moduleId: string;
  /** 0 esconde o número no título (uso inline dentro da pílula de registro) */
  moduleNumber: number;
  trailColor: string;
  /** slug da eletiva, pra oferecer o tutor quando a nota é baixa */
  courseSlug?: string | null;
  /** quando true, ignora o "agora não" e mostra o card mesmo assim */
  forceOpen?: boolean;
  /** dentro da pílula de registro: sem margem extra e sempre visível */
  inline?: boolean;
  /** avisa a pílula quando a pergunta já foi respondida */
  onAnswered?: (value: number | null) => void;
}


const LABELS: Record<number, string> = {
  1: "difícil demais, travou",
  2: "podia ser bem melhor",
  3: "deu pra levar",
  4: "gostei",
  5: "foi ótimo",
};

const placeholderFor = (n: number) =>
  n <= 2 ? "o que travou pra você aqui?" : n === 3 ? "o que dava pra melhorar?" : "o que funcionou melhor?";

/**
 * checkpoint de pulso: cinco estrelas + comentário opcional.
 * aparece dentro da celebração, só nos módulos de checkpoint. nunca bloqueia:
 * a nota salva no toque da estrela e o comentário é sempre opcional.
 */
export const ModuloRatingCard = ({
  moduleId,
  moduleNumber,
  trailColor,
  courseSlug,
  forceOpen = false,
  inline = false,
  onAnswered,
}: Props) => {
  const { rating, loading, save, saving } = useModuleRating(moduleId);
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sentComment, setSentComment] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDismissed(isRatingDismissed(moduleId));
  }, [moduleId]);

  useEffect(() => {
    if (rating && picked === null) setPicked(rating.rating);
    if (rating?.comment && !comment) setComment(rating.comment);
    if (rating) onAnswered?.(rating.rating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating]);


  if (loading) return null;

  // já avaliou e não está editando: linha discreta de confirmação
  if (rating && !editing && !forceOpen) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 font-body text-xs text-perestroika-preto/60">
        <span className="inline-flex items-center gap-1">
          você deu
          <span className="inline-flex" aria-label={`${rating.rating} de 5 estrelas`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className="h-3.5 w-3.5"
                style={{ color: trailColor }}
                fill={i < rating.rating ? trailColor : "transparent"}
              />
            ))}
          </span>
          neste módulo
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="underline underline-offset-2 hover:text-perestroika-preto min-h-[36px] px-1"
        >
          editar
        </button>
      </div>
    );
  }

  if (dismissed && !forceOpen && !editing && !inline) return null;

  const onPick = async (n: number) => {
    setPicked(n);
    onAnswered?.(n);
    try {
      await save({ rating: n });
    } catch {
      toast.error("não deu pra salvar agora, tenta de novo");
      setPicked(null);
      onAnswered?.(null);
    }
  };


  const onSendComment = async () => {
    try {
      await save({ rating: picked ?? rating?.rating ?? 5, comment });
      setSentComment(true);
      setEditing(false);
      toast.success("valeu, isso ajuda a gente a melhorar");
    } catch {
      toast.error("não deu pra enviar o comentário");
    }
  };

  const current = hover ?? picked ?? 0;

  return (
    <section
      aria-label="avaliar este módulo"
      className={
        inline
          ? "mt-6 w-full rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/70 px-5 py-5 text-center"
          : "mt-8 w-full max-w-md rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/70 px-5 py-5 text-center"
      }
    >
      <p className="font-display uppercase text-xl leading-none">
        {moduleNumber > 0
          ? `como foi o módulo ${String(moduleNumber).padStart(2, "0")} pra você?`
          : "como foi este módulo pra você?"}
      </p>


      <div
        className="mt-3 flex items-center justify-center"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} estrela${n > 1 ? "s" : ""}: ${LABELS[n]}`}
              disabled={saving}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => onPick(n)}
              className="flex h-11 w-11 items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-60"
            >
              <Star
                className="h-7 w-7"
                style={{ color: trailColor }}
                fill={n <= current ? trailColor : "transparent"}
                strokeWidth={1.75}
              />
            </button>
          );
        })}
      </div>

      <p className="font-body text-xs text-perestroika-preto/60 min-h-[18px]">
        {current ? LABELS[current] : "toque numa estrela, leva 2 segundos"}
      </p>

      {picked !== null && (
        <div className="mt-4 text-left">
          {!sentComment ? (
            <>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                placeholder={placeholderFor(picked)}
                rows={3}
                className="bg-perestroika-bege border-perestroika-preto/15 font-body text-sm"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-body text-[10px] text-perestroika-preto/45">
                  opcional, sua nota já foi registrada
                </span>
                <button
                  type="button"
                  disabled={saving || comment.trim().length === 0}
                  onClick={onSendComment}
                  className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto px-4 py-2 text-[11px] uppercase tracking-wide text-perestroika-bege disabled:opacity-40 min-h-[40px]"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  enviar
                </button>
              </div>
            </>
          ) : (
            <p className="font-body text-sm text-perestroika-preto/70 inline-flex items-center gap-1.5">
              <Check className="h-4 w-4" style={{ color: trailColor }} />
              recebido, obrigado por contar.
            </p>
          )}

          {picked <= 2 && courseSlug && (
            <Link
              to={`/app/tutor?curso=${courseSlug}`}
              className="mt-3 inline-flex items-center gap-1.5 font-body text-xs underline underline-offset-2 text-perestroika-preto/70 hover:text-perestroika-preto min-h-[36px]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              quer conversar sobre isso com o tutor?
            </Link>
          )}
        </div>
      )}

      {picked === null && !inline && (
        <button
          type="button"
          onClick={() => {
            dismissRating(moduleId);
            setDismissed(true);
          }}
          className="mt-2 font-body text-[11px] text-perestroika-preto/45 hover:text-perestroika-preto/80 min-h-[36px] px-2"
        >
          agora não
        </button>
      )}
    </section>
  );
};
