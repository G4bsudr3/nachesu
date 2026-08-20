import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ChangelogV2Value } from "@/components/eletiva/pills/PillChangelogV2";

interface Props {
  moduleId: string;
}

export function ModuloConclusaoChangelogV2({ moduleId }: Props) {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const q = useQuery({
    queryKey: ["ecc-m18-changelog-deliv", moduleId, user?.id],
    enabled: !!user && !!moduleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("module_deliverables")
        .select("content")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data?.content ?? {}) as { changelog_aula18?: Record<string, ChangelogV2Value> };
    },
  });

  const map = q.data?.changelog_aula18 ?? {};
  const value = Object.values(map)[0];
  if (!value) return null;

  const mudancas = value.mudancas ?? [];
  const diag = value.diagnostico ?? {};

  return (
    <motion.section
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 space-y-6"
      aria-label="versão 2 do projeto"
    >
      <header>
        <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
          exercício cumprido
        </p>
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          versão 2 na mão
        </h2>
        <p className="font-body text-sm text-perestroika-preto/70 mt-2 max-w-2xl">
          semana que vem: preparar o pitch.
        </p>
      </header>

      <article className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-4 space-y-3">
        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
            diagnóstico
          </p>
          <p className="font-body text-sm text-perestroika-preto/90">
            experimento <strong>{diag.resultado ?? "—"}</strong>
            {diag.resultado === "refutou" && diag.decisao && (
              <> · decisão: <strong>{diag.decisao}</strong></>
            )}
          </p>
          {diag.prox_suposicao && (
            <p className="font-body text-xs text-perestroika-preto/70 mt-1 italic">
              próxima suposição: {diag.prox_suposicao}
            </p>
          )}
        </div>

        <div>
          <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
            changelog · {mudancas.length} {mudancas.length === 1 ? "mudança" : "mudanças"}
          </p>
          <div className="grid gap-2">
            {mudancas.map((m, i) => (
              <div key={m.id} className="rounded-xl border border-perestroika-preto/15 bg-white p-3">
                <p className="font-display uppercase text-xs text-perestroika-preto/60 mb-1">
                  #{i + 1} · {m.elemento || "—"}
                </p>
                <p className="font-body text-xs text-perestroika-preto/85">
                  <span className="text-perestroika-preto/50">antes:</span> {m.antes || "—"}
                </p>
                <p className="font-body text-xs text-perestroika-preto/85">
                  <span className="text-perestroika-preto/50">depois:</span> {m.depois || "—"}
                </p>
                <p className="font-body text-[11px] italic text-perestroika-preto/70 mt-1">
                  “{m.dado}”
                </p>
              </div>
            ))}
          </div>
        </div>

        {value.manter_1_coisa && (
          <div>
            <p className="font-body text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              a semente que fica
            </p>
            <p className="font-body text-sm text-perestroika-preto/90">{value.manter_1_coisa}</p>
          </div>
        )}
      </article>
    </motion.section>
  );
}
