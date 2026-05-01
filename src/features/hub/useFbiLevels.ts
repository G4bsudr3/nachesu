import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * busca o nivel de experiencia_lovable de cada usuario com fbi respondido.
 * usado pra mostrar chip nos cards e barras no panorama.
 * retorna map<user_id, nivel|null>.
 */
export const useFbiLevels = () => {
  const [byUser, setByUser] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("fbi_responses")
        .select("user_id, experiencia_lovable")
        .not("user_id", "is", null);
      if (cancelled) return;
      const map = new Map<string, string | null>();
      for (const r of data ?? []) {
        if (r.user_id) map.set(r.user_id, r.experiencia_lovable);
      }
      setByUser(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { byUser, loading };
};

export const LEVEL_LABELS: Record<string, string> = {
  "nunca-usei": "nunca usei",
  "ja-mexi": "já mexi",
  "ja-publiquei": "já publiquei",
  "uso-diario": "uso diário",
};
