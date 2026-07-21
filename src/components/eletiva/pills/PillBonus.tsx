import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Sparkles, Check } from "lucide-react";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

type Schema = {
  type?: "bonus_text";
  search_query?: string;
  search_url?: string;
  badge?: string;
  response?: {
    label?: string;
    template?: string;
    fields?: { id: string; label: string; min_chars?: number }[];
  };
};

type BonusValue = Record<string, string>;

interface Props {
  title: string;
  bodyMd?: string | null;
  schema: Schema;
  accent: string;
  initial: BonusValue;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

/**
 * pílula 05 — bônus opcional. busca no youtube + 2 campos curtos.
 * ganha selo dourado quando aluno preenche os 2 campos no mínimo de chars.
 */
export function PillBonus({
  title,
  bodyMd,
  schema,
  accent,
  initial,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const [value, setValue] = useState<BonusValue>(initial ?? {});

  useEffect(() => {
    setValue((prev) => ({ ...initial, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useAutoSaveField({
    value,
    initial,
    save,
    field: "bonus",
  });

  const fields = schema.response?.fields ?? [];
  const earnedBadge = useMemo(
    () => fields.length > 0 && fields.every((f) => (value[f.id]?.trim().length ?? 0) >= (f.min_chars ?? 0)),
    [fields, value],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
            opcional
          </p>
          <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-2">{title}</h2>
          {bodyMd && (
            <p className="font-body text-perestroika-preto/75 whitespace-pre-wrap text-sm sm:text-base">
              {bodyMd}
            </p>
          )}
        </div>
        <SaveIndicator status={status} />
      </header>

      {schema.search_url && (
        <a
          href={schema.search_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border-2 border-perestroika-preto px-4 py-2 font-body text-sm uppercase tracking-wider hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
        >
          buscar "{schema.search_query ?? ""}" no youtube
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}

      {fields.length > 0 && (
        <div className="space-y-3 rounded-2xl border-2 border-perestroika-preto/15 p-4 sm:p-5 bg-perestroika-bege">
          {schema.response?.label && (
            <p className="font-body text-sm font-medium text-perestroika-preto">
              {schema.response.label}
            </p>
          )}
          {fields.map((f) => {
            const v = value[f.id] ?? "";
            const min = f.min_chars ?? 0;
            return (
              <div key={f.id}>
                <label
                  htmlFor={f.id}
                  className="block font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60 mb-1"
                >
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type="text"
                  value={v}
                  onChange={(e) => setValue((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  className="w-full rounded-lg border-2 border-perestroika-preto/15 bg-perestroika-bege px-3 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
                  placeholder={f.label}
                />
                {min > 0 && v.trim().length < min && (
                  <p className="font-body text-[11px] text-perestroika-preto/50 mt-1">
                    mín {min} caracteres
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* selo */}
      {earnedBadge && (
        <div
          className="rounded-2xl border-2 p-4 flex items-center gap-3"
          style={{ borderColor: "#EFD7A9", backgroundColor: "#EFD7A933" }}
          role="status"
        >
          <Sparkles className="h-5 w-5" style={{ color: "#a37b1f" }} aria-hidden="true" />
          <div>
            <p className="font-display uppercase text-base leading-tight" style={{ color: "#7a5a14" }}>
              {schema.badge ?? "selo bônus dourado"}
            </p>
            <p className="font-body text-xs text-perestroika-preto/65">
              tu foi além do combinado. fica registrado.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55">
          opcional. tu pode pular sem prejuízo.
        </p>
        <button
          type="button"
          onClick={onComplete}
          disabled={isCompleted || isCompleting}
          aria-busy={isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide text-perestroika-bege transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" /> bônus concluído
            </>
          ) : (
            <>finalizar aula</>
          )}
        </button>
      </div>
    </div>
  );
}
