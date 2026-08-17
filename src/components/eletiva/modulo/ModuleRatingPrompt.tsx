import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useModuleRating } from "@/features/hub/useModuleRating";

interface Props {
  moduleId: string;
  accent: string;
  /** avisa a pílula se a pergunta obrigatória já foi respondida (mesmo sem rede) */
  onAnswered?: (value: number | null) => void;
}

const OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "tranquilo demais" },
  { value: 2, label: "no ponto" },
  { value: 3, label: "pesado demais" },
];

/**
 * avaliação de fim de módulo. fica dentro da pílula de registro, depois do
 * conteúdo e antes do botão de concluir.
 *
 * grava em module_ratings (upsert por user_id + module_id): 1 tranquilo demais,
 * 2 no ponto, 3 pesado demais. o comentário é opcional.
 *
 * nunca trava a conclusão: se a rede falhar, mostra um aviso discreto e o
 * botão de concluir segue funcionando normalmente.
 */
export const ModuleRatingPrompt = ({ moduleId, accent, onAnswered }: Props) => {
  const { rating, loading, save, saving } = useModuleRating(moduleId);
  const [picked, setPicked] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [failed, setFailed] = useState(false);
  const [savedComment, setSavedComment] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !rating) return;
    hydrated.current = true;
    setPicked(rating.rating);
    onAnswered?.(rating.rating);
    if (rating.comment) setComment(rating.comment);
  }, [rating, onAnswered]);

  if (loading) return null;

  const persist = async (value: number, text?: string) => {
    try {
      await save({ rating: value, ...(text !== undefined ? { comment: text } : {}) });
      setFailed(false);
      if (text !== undefined) setSavedComment(true);
    } catch {
      setFailed(true);
    }
  };

  const onPick = (value: number) => {
    setPicked(value);
    onAnswered?.(value);
    setSavedComment(false);
    void persist(value);
  };

  const onCommentBlur = () => {
    if (picked === null) return;
    if ((rating?.comment ?? "") === comment.trim()) return;
    void persist(picked, comment);
  };

  return (
    <section
      aria-label="avaliação do módulo"
      className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 sm:p-6"
    >
      <p className="font-display uppercase text-2xl sm:text-3xl leading-none mb-4">
        esse módulo foi...
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="group">
        {OPTIONS.map((o) => {
          const active = picked === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              disabled={saving}
              onClick={() => onPick(o.value)}
              className={`min-h-[60px] rounded-2xl border-2 px-4 py-4 font-body text-sm sm:text-base leading-tight transition-transform active:scale-[0.98] ${
                active
                  ? "text-perestroika-bege"
                  : "border-perestroika-preto/20 bg-perestroika-bege hover:border-perestroika-preto"
              }`}
              style={active ? { backgroundColor: accent, borderColor: accent } : undefined}
            >
              <span className="inline-flex items-center gap-2">
                {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                {o.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label
          htmlFor={`travou-${moduleId}`}
          className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1"
        >
          o que travou? (opcional)
        </label>
        <input
          id={`travou-${moduleId}`}
          type="text"
          value={comment}
          maxLength={280}
          onChange={(e) => {
            setComment(e.target.value);
            setSavedComment(false);
          }}
          onBlur={onCommentBlur}
          className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2.5 font-body text-sm focus:border-perestroika-preto focus:outline-none min-h-[44px]"
        />
      </div>

      <p className="mt-2 font-body text-xs text-perestroika-preto/55 min-h-[18px]" role="status">
        {saving ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> salvando
          </span>
        ) : failed ? (
          "não deu pra salvar sua resposta agora. pode concluir do mesmo jeito."
        ) : savedComment ? (
          "valeu, isso ajuda a calibrar os próximos módulos."
        ) : picked !== null ? (
          "resposta registrada."
        ) : (
          "escolhe uma das três pra seguir."
        )}
      </p>
    </section>
  );
};
