import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FbiData } from "./schema";
import { logger } from "@/lib/logger";

/**
 * busca a linha do invited_participants pelo email do usuário logado
 * e devolve um patch pronto pra mesclar no fbi_responses.
 * só preenche os campos que vieram da planilha — aluno pode editar tudo.
 */
export const usePrefillFromInvited = () => {
  const { user } = useAuth();
  const [prefill, setPrefill] = useState<FbiData>({});
  const [prefillKeys, setPrefillKeys] = useState<Set<keyof FbiData>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("invited_participants")
        .select("*")
        .eq("email", user.email!.toLowerCase())
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        logger.warn("[fbi] prefill load skipped:", error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setLoading(false);
        return;
      }

      const patch: FbiData = {};
      const keys = new Set<keyof FbiData>();
      const set = <K extends keyof FbiData>(k: K, v: FbiData[K] | null | undefined) => {
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          patch[k] = v as FbiData[K];
          keys.add(k);
        }
      };

      set("nome", data.name);
      set("nickname", data.nickname);
      // whatsapp removido do form (galera já está no grupo)
      set("instagram", data.instagram);
      // trabalho não vem mais pre-fill: queremos que a pessoa descreva com detalhe
      set("cidade", data.cidade);
      // sim/não vindo da planilha — normaliza
      if (data.ja_fez_perestroika) {
        const v = data.ja_fez_perestroika.trim().toLowerCase();
        if (v === "sim" || v === "nao" || v === "não") {
          set("ja_fez_perestroika", v === "não" ? "nao" : v);
        }
      }
      set("quais_cursos_perestroika", data.quais_cursos_perestroika);
      set("expectativa_chora", data.ctx_expectativa);
      set("maior_desafio", data.ctx_maior_trava);
      // experiencia_lovable: planilha já traz padronizado pelo importador
      if (
        data.ctx_experiencia_lovable &&
        ["nunca-usei", "ja-mexi", "ja-publiquei", "uso-diario"].includes(
          data.ctx_experiencia_lovable,
        )
      ) {
        set("experiencia_lovable", data.ctx_experiencia_lovable);
      }

      setPrefill(patch);
      setPrefillKeys(keys);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  return { prefill, prefillKeys, loading };
};
