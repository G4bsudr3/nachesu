// normalização de alternativas vindas do banco.
// existem dois formatos de options convivendo nas pílulas:
//   antigo: { value: "a", label: "..." } + q.correct: ["a"] + q.feedback_wrong
//   novo:   { id: "a", label: "...", correct: true } + q.feedback_incorrect
// os componentes liam só o formato antigo, então no formato novo opt.value era
// undefined e a escolha nunca marcava nem salvava. este módulo unifica os dois.

export type RawOption = {
  value?: string;
  id?: string;
  label: string;
  correct?: boolean;
};

export type NormOption = { value: string; label: string };

export type RawChoiceQuestion = {
  id: string;
  options?: RawOption[];
  correct?: string[];
  feedback_correct?: string;
  feedback_wrong?: string;
  feedback_incorrect?: string;
  min_chars?: number;
  min_length?: number;
};

/** devolve sempre {value,label}, aceitando opt.value ou opt.id */
export function normOptions(options?: RawOption[]): NormOption[] {
  return (options ?? [])
    .map((o, i) => ({
      value: String(o.value ?? o.id ?? i),
      label: o.label,
    }))
    .filter((o) => o.label != null);
}

/** valores corretos, seja via q.correct[] ou via option.correct === true */
export function correctValues(q: RawChoiceQuestion): string[] {
  if (Array.isArray(q.correct) && q.correct.length > 0) return q.correct.map(String);
  // usa o índice do array COMPLETO (igual normOptions) antes de filtrar. senão,
  // opções sem value/id caíam no índice do array já filtrado (só corretas) e o
  // fallback divergia de normOptions -> feedback de acerto/erro invertido.
  return (q.options ?? [])
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.correct === true)
    .map(({ o, i }) => String(o.value ?? o.id ?? i));
}

/** feedback de erro em qualquer uma das duas chaves */
export function wrongFeedback(q: RawChoiceQuestion): string | undefined {
  return q.feedback_wrong ?? q.feedback_incorrect;
}

/** mínimo de caracteres em qualquer uma das duas chaves */
export function minChars(q: { min_chars?: number; min_length?: number }): number {
  return q.min_chars ?? q.min_length ?? 0;
}

/** classes compartilhadas do alvo de toque de uma alternativa (linha inteira) */
export const optionRowClass =
  "flex items-start gap-3 rounded-xl border-2 p-3.5 min-h-[52px] cursor-pointer select-none touch-manipulation transition-colors";
