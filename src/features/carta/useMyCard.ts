import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type MyCard = Database["public"]["Tables"]["builder_cards"]["Row"];

/** estado da carta do aluno logado:
 *  - none: ainda não tem carta (fbi não rodou ou admin não gerou)
 *  - gerando: edge function rodando
 *  - erro: falhou
 *  - revisao: pronta no banco mas admin ainda não publicou
 *  - publicada: pronta + publicada (única em que `card` vem preenchida)
 */
export type MyCardState = "none" | "gerando" | "erro" | "revisao" | "publicada";

export const useMyCard = () => {
  const { user } = useAuth();
  const [card, setCard] = useState<MyCard | null>(null);
  const [state, setState] = useState<MyCardState>("none");
  const [loading, setLoading] = useState(true);
  const [viewCount, setViewCount] = useState<number>(0);
  const [firstViewedAt, setFirstViewedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // 1. RPC security definer: pega status, is_published, view_count, first_viewed_at
      const { data: stateRows } = await supabase.rpc("get_my_card_state");
      const stateRow = Array.isArray(stateRows) ? stateRows[0] : null;

      let computedState: MyCardState = "none";
      let cardData: MyCard | null = null;

      if (stateRow) {
        if (stateRow.status === "gerando") computedState = "gerando";
        else if (stateRow.status === "erro") computedState = "erro";
        else if (stateRow.status === "pronta" && stateRow.is_published) computedState = "publicada";
        else if (stateRow.status === "pronta") computedState = "revisao";
      }

      // 2. Só busca o conteúdo da carta se publicada (RLS deixa passar)
      if (computedState === "publicada") {
        const { data } = await supabase
          .from("builder_cards")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        cardData = (data as MyCard) ?? null;

        // 3. sobrescreve image_url com a artwork oficial atual do baralho (se existir),
        // pra refletir mudanças de baralho promovidas pelo admin sem precisar regerar a carta.
        if (cardData?.archetype) {
          const { data: artwork } = await supabase
            .from("archetype_artworks")
            .select("image_url")
            .eq("archetype", cardData.archetype)
            .maybeSingle();
          if (artwork?.image_url) {
            cardData = { ...cardData, image_url: artwork.image_url };
          }
        }
      }

      if (cancelled) return;
      setState(computedState);
      setCard(cardData);
      setViewCount(stateRow?.view_count ?? 0);
      setFirstViewedAt(stateRow?.first_viewed_at ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { card, state, loading, viewCount, firstViewedAt };
};
