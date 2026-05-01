import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BuilderCardUpdate } from "./types";
import { logger } from "@/lib/logger";

type Args = { reload: () => Promise<void> };

/** publica/despublica a carta. ao publicar pela primeira vez, gera share_token. */
export const useBuilderCardPublish = ({ reload }: Args) => {
  const togglePublish = useCallback(
    async (cardUserId: string, publish: boolean, currentToken: string | null) => {
      const update: BuilderCardUpdate = { is_published: publish };
      if (publish && !currentToken) {
        const { data: tokenData, error: tokenErr } = await supabase.rpc("generate_share_token");
        if (tokenErr || !tokenData) {
          toast.error("não rolou gerar o link");
          return false;
        }
        update.share_token = tokenData as string;
      }
      const { error } = await supabase.from("builder_cards").update(update).eq("user_id", cardUserId);
      if (error) {
        toast.error(publish ? "não rolou publicar" : "não rolou despublicar");
        return false;
      }
      toast.success(publish ? "carta publicada" : "carta despublicada");
      // ao publicar, dispara geração da og:image em background (não bloqueia)
      if (publish) {
        supabase.functions
          .invoke("generate-card-og-image", { body: { user_id: cardUserId } })
          .catch((e) => logger.error("[og:image background] falhou:", e));
      }
      await reload();
      return true;
    },
    [reload],
  );

  return { togglePublish };
};
