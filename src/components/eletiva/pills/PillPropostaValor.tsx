import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SaveIndicator } from "./SaveIndicator";
import { useAutoSaveField, type DeliverableContent } from "./useDeliverable";

export type PropostaValorValue = {
  problema?: string;
  publico?: string;
  solucao?: string;
  como_circula?: string;
  por_que_agora?: string;
  frase_ancora?: string;
};

type Bloco = {
  id: keyof PropostaValorValue;
  titulo: string;
  hint: string;
  min_chars?: number;
  require_atributos?: number;
};

type Schema = {
  type?: "proposta_valor";
  ideia_source_module_id?: string;
  impactos_source_module_id?: string;
  blocos?: Bloco[];
  frase_ancora?: { max_palavras?: number; template?: string; exemplo?: string };
  palavras_vagas?: string[];
  completion?: { label?: string };
};

interface Props {
  pillId: string;
  title: string;
  schema: Schema;
  accent: string;
  initial: PropostaValorValue;
  propostaMap: Record<string, PropostaValorValue>;
  save: (patch: DeliverableContent) => Promise<unknown>;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting?: boolean;
}

function useIdeiaAula12(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula13-ideia", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        selecao_aula12?: Record<string, { ideia_final?: string; versao_a?: string; versao_b?: string; versao_c?: string }>;
      };
      for (const entry of Object.values(content.selecao_aula12 ?? {})) {
        if (entry?.ideia_final || entry?.versao_a) {
          return {
            ideia: entry.versao_a || entry.ideia_final || "",
            versao_b: entry.versao_b ?? "",
            versao_c: entry.versao_c ?? "",
          };
        }
      }
      return null;
    },
  });
}

function useImpactosAula9(sourceModuleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aula13-impactos", sourceModuleId, user?.id],
    enabled: !!user && !!sourceModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", sourceModuleId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const content = (data?.content ?? {}) as {
        impactos_aula9?: Record<string, { linhas?: Array<{ dimensao?: string; estado_desejado?: string; metrica?: string }> }>;
      };
      const out: Array<{ dimensao: string; estado_desejado: string; metrica: string }> = [];
      for (const entry of Object.values(content.impactos_aula9 ?? {})) {
        for (const l of entry?.linhas ?? []) {
          if (l?.estado_desejado || l?.metrica) {
            out.push({
              dimensao: l.dimensao ?? "",
              estado_desejado: l.estado_desejado ?? "",
              metrica: l.metrica ?? "",
            });
          }
        }
      }
      return out;
    },
  });
}

const contarAtributos = (texto: string) => {
  const t = texto.toLowerCase();
  let n = 0;
  // idade / faixa etária
  if (/\d{1,2}\s*(a|-|até|à)\s*\d{1,2}\s*anos|\d{1,2}\s*anos|jovens|adolescentes|adultos|crianças/.test(t)) n++;
  // contexto/local
  if (/bh|belo horizonte|sebrae|escola|comunidad|bairro|periferia|centro|zona|região|regiao|rural|urbana|cidade|estado/.test(t)) n++;
  // comportamento/hábito/renda
  if (/renda|trabalha|estuda|consome|compra|usa|frequent|mora|reside|hábito|habito|comportament|prefere|busca/.test(t)) n++;
  // segmento profissional/curso
  if (/técnico|tecnico|integrad|administraç|marketing|1º ano|primeiro ano|ensino médio|ensino medio|em técnico|em tecnico/.test(t)) n++;
  return n;
};

const contarPalavras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function PillPropostaValor({
  pillId,
  schema,
  accent,
  initial,
  propostaMap,
  save,
  onComplete,
  isCompleted,
  isCompleting,
}: Props) {
  const blocos = schema.blocos ?? [];
  const maxPalavras = schema.frase_ancora?.max_palavras ?? 30;
  const template = schema.frase_ancora?.template ?? "";
  const exemplo = schema.frase_ancora?.exemplo ?? "";
  const palavrasVagas = schema.palavras_vagas ?? [];
  const ctaLabel = schema.completion?.label ?? "entregar proposta";

  const ideiaQ = useIdeiaAula12(schema.ideia_source_module_id);
  const impactosQ = useImpactosAula9(schema.impactos_source_module_id);

  const [value, setValue] = useState<PropostaValorValue>(() => ({
    problema: initial?.problema ?? "",
    publico: initial?.publico ?? "",
    solucao: initial?.solucao ?? "",
    como_circula: initial?.como_circula ?? "",
    por_que_agora: initial?.por_que_agora ?? "",
    frase_ancora: initial?.frase_ancora ?? "",
  }));

  const status = useAutoSaveField({
    value: { ...propostaMap, [pillId]: value },
    initial: propostaMap,
    save,
    field: "proposta_valor_aula13",
  });

  const setBloco = (id: keyof PropostaValorValue, v: string) =>
    setValue((prev) => ({ ...prev, [id]: v }));

  const blocosStatus = useMemo(() => {
    return blocos.map((b) => {
      const texto = (value[b.id] ?? "").toString();
      const min = b.min_chars ?? 50;
      const okLen = texto.trim().length >= min;
      let okAtributos = true;
      if (b.require_atributos && b.require_atributos > 0) {
        okAtributos = contarAtributos(texto) >= b.require_atributos;
      }
      return { bloco: b, texto, okLen, okAtributos, ok: okLen && okAtributos };
    });
  }, [blocos, value]);

  const blocosOk = blocosStatus.every((b) => b.ok);

  const frase = (value.frase_ancora ?? "").trim();
  const nPalavras = contarPalavras(frase);
  const fraseLenOk = nPalavras >= 6 && nPalavras <= maxPalavras;

  const palavrasVagasEncontradas = useMemo(() => {
    const found = new Set<string>();
    const alvos = [
      value.problema,
      value.solucao,
      value.como_circula,
      value.por_que_agora,
      value.frase_ancora,
    ]
      .join(" \n ")
      .toLowerCase();
    palavrasVagas.forEach((w) => {
      const w2 = w.toLowerCase();
      if (alvos.includes(w2)) found.add(w);
    });
    return Array.from(found);
  }, [value, palavrasVagas]);

  const ready = blocosOk && fraseLenOk;

  return (
    <div className="space-y-5">
      {/* pull automático */}
      <aside
        className="rounded-2xl p-4 sm:p-5 space-y-3"
        style={{ backgroundColor: `${accent}12`, border: `2px solid ${accent}55` }}
      >
        <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/60">
          o que puxamos das módulos anteriores
        </p>
        {ideiaQ.isLoading ? (
          <p className="font-body text-xs text-perestroika-preto/60">carregando sua ideia do módulo 12…</p>
        ) : ideiaQ.data?.ideia ? (
          <div>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50 mb-0.5">
              ideia refinada · módulo 12 (versão A)
            </p>
            <p className="font-body text-sm text-perestroika-preto/85 leading-snug">
              {ideiaQ.data.ideia}
            </p>
          </div>
        ) : (
          <p className="font-body text-xs text-perestroika-vermelho/85">
            você ainda não fechou a seleção do módulo 12. volta lá antes de escrever a proposta.
          </p>
        )}
        {impactosQ.data && impactosQ.data.length > 0 && (
          <div>
            <p className="font-body text-[10px] uppercase tracking-wider text-perestroika-preto/50 mb-0.5">
              impactos desejados · módulo 9
            </p>
            <ul className="space-y-0.5">
              {impactosQ.data.map((imp, i) => (
                <li key={i} className="font-body text-xs text-perestroika-preto/75 leading-snug">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-perestroika-preto/60">
                    {imp.dimensao || "—"}
                  </span>{" "}
                  · {imp.estado_desejado}
                  {imp.metrica && <span className="text-perestroika-preto/55"> ({imp.metrica})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* canvas 5 blocos */}
      <section aria-label="canvas" className="space-y-3">
        <header>
          <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
            canvas de proposta de valor regenerativa
          </h3>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            5 blocos, cada um com mín. 50 caracteres. escreve com aresta — nome de público, número, contexto.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          {blocosStatus.map((bs, i) => {
            const bloco = bs.bloco;
            const fullWidth = i >= 2; // solução em diante ocupa linha inteira
            return (
              <div
                key={bloco.id}
                className={`rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-2 ${
                  fullWidth ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display uppercase text-lg leading-none" style={{ color: accent }}>
                      {bloco.titulo}
                    </p>
                    <p className="font-body text-[11px] italic text-perestroika-preto/55 mt-1">
                      {bloco.hint}
                    </p>
                  </div>
                  {bs.ok && (
                    <span
                      className="rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-wider"
                      style={{ backgroundColor: `${accent}22`, color: accent }}
                    >
                      <Check className="inline h-3 w-3 -mt-0.5" aria-hidden /> ok
                    </span>
                  )}
                </div>
                <textarea
                  value={bs.texto}
                  onChange={(e) => setBloco(bloco.id, e.target.value)}
                  rows={fullWidth ? 3 : 4}
                  className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto focus:border-perestroika-preto focus:outline-none resize-y"
                  maxLength={600}
                  placeholder={bloco.id === "publico" ? "ex: estudantes de 14-15 anos do 1º ano do técnico de administração do sebrae bh, moradores de bairros de renda média…" : ""}
                />
                <div className="flex items-center justify-between text-[11px] font-body">
                  <span className={bs.okLen ? "text-perestroika-preto/50" : "text-perestroika-vermelho/85"}>
                    {bs.texto.trim().length}/{bloco.min_chars ?? 50}
                  </span>
                  {bloco.require_atributos && bloco.require_atributos > 0 && (
                    <span className={bs.okAtributos ? "text-perestroika-preto/50" : "text-perestroika-vermelho/85"}>
                      atributos: {contarAtributos(bs.texto)}/{bloco.require_atributos}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* frase-âncora */}
      <section aria-label="frase-ancora" className="space-y-2">
        <header>
          <h3 className="font-display uppercase text-2xl leading-none text-perestroika-preto">
            frase-âncora
          </h3>
          <p className="font-body text-xs text-perestroika-preto/60 mt-1">
            1 frase, até {maxPalavras} palavras. sua bandeira.
          </p>
        </header>

        {(template || exemplo) && (
          <div className="rounded-xl bg-perestroika-preto/[0.04] p-3 space-y-1.5">
            {template && (
              <p className="font-body text-[11px] text-perestroika-preto/70">
                <span className="uppercase tracking-wider text-perestroika-preto/50">template · </span>
                {template}
              </p>
            )}
            {exemplo && (
              <p className="font-body text-[11px] italic text-perestroika-preto/60">
                exemplo: {exemplo}
              </p>
            )}
          </div>
        )}

        <textarea
          value={value.frase_ancora ?? ""}
          onChange={(e) => setBloco("frase_ancora", e.target.value)}
          rows={3}
          className="w-full rounded-xl border-2 border-perestroika-preto/15 bg-white px-3 py-2 font-body text-sm text-perestroika-preto focus:border-perestroika-preto focus:outline-none resize-y"
          maxLength={400}
        />
        <div className="flex items-center justify-between text-[11px] font-body">
          <span className={fraseLenOk ? "text-perestroika-preto/55" : "text-perestroika-vermelho/85"}>
            {nPalavras} palavras (máx {maxPalavras})
          </span>
        </div>

        {palavrasVagasEncontradas.length > 0 && (
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}55` }}
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} aria-hidden />
            <div>
              <p className="font-body text-[11px] uppercase tracking-wider mb-0.5" style={{ color: accent }}>
                palavras vagas detectadas
              </p>
              <p className="font-body text-xs text-perestroika-preto/75 leading-snug">
                {palavrasVagasEncontradas.join(", ")} — cada uma dessas cabe em 300 propostas. troca por número, contexto BH ou verbo específico.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          {!ready && (
            <p className="font-body text-xs text-perestroika-preto/60 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" aria-hidden />
              falta: {[
                !blocosOk && "preencher os 5 blocos",
                !fraseLenOk && `frase-âncora até ${maxPalavras} palavras`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={!ready || isCompleted || isCompleting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-body text-sm uppercase tracking-wider transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isCompleted ? "rgba(9,9,9,0.15)" : accent,
            color: isCompleted ? "rgba(9,9,9,0.6)" : "#fff",
          }}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> entregue
            </>
          ) : (
            <>
              {ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
