import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Circle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

/**
 * pílula MÓDULO 20 — carta de encerramento (comparação temporal).
 * puxa q3-expectativa da módulo 5 e q3-manchete da módulo 9. compara com as respostas de hoje.
 */

export type CartaEncerramentoValue = {
  hoje_expectativa?: string;
  hoje_manchete?: string;
  reflexao_comparativa?: string;
};

type Schema = {
  type?: "carta_encerramento";
  aula5_module_id?: string;
  aula9_module_id?: string;
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: CartaEncerramentoValue;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

function useAntigasRespostas(schema: Schema) {
  const { user } = useAuth();
  const ids = [schema.aula5_module_id, schema.aula9_module_id].filter(Boolean) as string[];
  const q = useQuery({
    queryKey: ["carta-antigas", ids, user?.id],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("module_id, content")
        .in("module_id", ids)
        .eq("user_id", user!.id);
      const byId = new Map<string, Record<string, unknown>>();
      (data ?? []).forEach((r) => byId.set(r.module_id, (r.content ?? {}) as Record<string, unknown>));

      const pickAnswer = (modId: string | undefined, qid: string): string | null => {
        if (!modId) return null;
        const content = byId.get(modId) as { quiz_answers?: Record<string, Record<string, unknown>> } | undefined;
        if (!content?.quiz_answers) return null;
        for (const answers of Object.values(content.quiz_answers)) {
          const v = answers?.[qid];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
        return null;
      };

      return {
        expectativa_antiga: pickAnswer(schema.aula5_module_id, "q3-expectativa"),
        manchete_antiga: pickAnswer(schema.aula9_module_id, "q3-manchete"),
      };
    },
    staleTime: 60_000,
  });
  return q.data ?? { expectativa_antiga: null, manchete_antiga: null };
}

export function PillCartaEncerramento({ pillId, schema, accent, initial, save, onComplete, isCompleted, isCompleting }: Props) {
  const [value, setValue] = useState<CartaEncerramentoValue>(initial ?? {});
  const antigas = useAntigasRespostas(schema);

  const status = useAutoSaveField({
    value: { [pillId]: value },
    initial: { [pillId]: initial },
    save,
    field: "carta_encerramento",
  });

  const ok1 = (value.hoje_expectativa ?? "").trim().length >= 100;
  const ok2 = (value.hoje_manchete ?? "").trim().length >= 100;
  const ok3 = (value.reflexao_comparativa ?? "").trim().length >= 80;
  const ready = ok1 && ok2 && ok3;

  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-perestroika-preto/75 leading-relaxed">
        no módulo 5 e no 9 você respondeu duas perguntas. hoje responde as MESMAS.
        depois olha as duas versões lado a lado — quem você era, quem você é agora.
      </p>

      <ComparacaoPar
        n={1}
        pergunta="o que você espera ter aprendido sobre você mesmo até o final dessa eletiva?"
        origem="no módulo 5 você respondeu:"
        antiga={antigas.expectativa_antiga}
        placeholderNovo="hoje, olhando pra trás — o que você DE FATO aprendeu sobre você?"
        valorNovo={value.hoje_expectativa ?? ""}
        onChange={(v) => setValue((s) => ({ ...s, hoje_expectativa: v }))}
        minChars={100}
        accent={accent}
      />

      <ComparacaoPar
        n={2}
        pergunta="se um jornalista te entrevistasse daqui a 5 anos sobre esse projeto, e perguntasse 'o que mudou no mundo?', qual seria a resposta que você quer poder dar?"
        origem="no módulo 9 você respondeu:"
        antiga={antigas.manchete_antiga}
        placeholderNovo="hoje, com projeto testado — qual é a manchete real que você quer daqui a 5 anos?"
        valorNovo={value.hoje_manchete ?? ""}
        onChange={(v) => setValue((s) => ({ ...s, hoje_manchete: v }))}
        minChars={100}
        accent={accent}
      />

      <section className="space-y-2 rounded-2xl p-4" style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}44` }}>
        <h3 className="font-display uppercase text-lg tracking-wide text-perestroika-preto">reflexão comparativa</h3>
        <p className="font-body text-sm text-perestroika-preto/75">
          olha as duas respostas. em 2 frases: o que mais mudou em você nessas 20 semanas?
        </p>
        <textarea
          value={value.reflexao_comparativa ?? ""}
          onChange={(e) => setValue((s) => ({ ...s, reflexao_comparativa: e.target.value }))}
          rows={4}
          className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
          placeholder="ex: em fevereiro eu achava que ia aprender a fazer projeto. hoje sei que aprendi a testar sem medo de errar."
        />
        <p className={`font-body text-[11px] ${ok3 ? "text-perestroika-preto/55" : "text-[#fd4644]"}`}>
          {(value.reflexao_comparativa ?? "").trim().length}/80 caracteres.
        </p>
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-perestroika-preto/10">
        <SaveIndicator status={status} />
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip ok={ok1} label="hoje · expectativa" accent={accent} />
          <StatusChip ok={ok2} label="hoje · manchete" accent={accent} />
          <StatusChip ok={ok3} label="reflexão" accent={accent} />
        </div>
        <button
          type="button"
          onClick={() => !isCompleted && ready && onComplete()}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display uppercase text-sm text-perestroika-bege transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{ backgroundColor: isCompleted ? "#090909" : accent }}
        >
          {isCompleted ? <><Check className="h-4 w-4" aria-hidden /> entregue</> : <>entregar carta <ArrowRight className="h-4 w-4" aria-hidden /></>}
        </button>
      </div>
    </div>
  );
}

function ComparacaoPar({ n, pergunta, origem, antiga, placeholderNovo, valorNovo, onChange, minChars, accent }: {
  n: number; pergunta: string; origem: string; antiga: string | null;
  placeholderNovo: string; valorNovo: string; onChange: (v: string) => void;
  minChars: number; accent: string;
}) {
  const len = valorNovo.trim().length;
  const ok = len >= minChars;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/50">pergunta {n}</span>
        <h3 className="font-display uppercase text-lg tracking-wide text-perestroika-preto">{pergunta}</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
        <article className="rounded-2xl bg-perestroika-preto/5 border border-perestroika-preto/15 p-3">
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1.5">{origem}</p>
          {antiga ? (
            <p className="font-body text-sm text-perestroika-preto/80 whitespace-pre-wrap leading-relaxed">{antiga}</p>
          ) : (
            <p className="font-body text-sm text-perestroika-preto/45 italic flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden />
              você não deixou registrada essa resposta no módulo anterior. tudo bem — só responda a nova hoje.
            </p>
          )}
        </article>

        <article className="rounded-2xl bg-white border-2 p-3" style={{ borderColor: `${accent}55` }}>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1.5">hoje você responde:</p>
          <textarea
            value={valorNovo}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/35 focus:border-perestroika-preto focus:outline-none resize-y"
            placeholder={placeholderNovo}
          />
          <p className={`font-body text-[11px] mt-1 ${ok ? "text-perestroika-preto/55" : "text-[#fd4644]"}`}>
            {len}/{minChars} caracteres.
          </p>
        </article>
      </div>
    </section>
  );
}

function StatusChip({ ok, label, accent }: { ok: boolean; label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-body text-[10px] uppercase tracking-wider"
      style={{
        backgroundColor: ok ? `${accent}18` : "transparent",
        border: `1px solid ${ok ? accent : "rgba(9,9,9,0.2)"}`,
        color: ok ? "#090909" : "rgba(9,9,9,0.6)",
      }}
    >
      {ok ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-2.5 w-2.5" aria-hidden />} {label}
    </span>
  );
}
