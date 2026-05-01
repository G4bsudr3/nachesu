import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BuilderCard, BuilderCardUpdate } from "./types";

type Args = { reload: () => Promise<void> };

/** edição inline de campos textuais da carta */
export const useBuilderCardEdit = ({ reload }: Args) => {
  const updateEssence = useCallback(
    async (cardUserId: string, essence: string) => {
      const trimmed = essence.trim();
      const { error } = await supabase
        .from("builder_cards")
        .update({ essence_phrase: trimmed.length > 0 ? trimmed : null })
        .eq("user_id", cardUserId);
      if (error) {
        toast.error("não rolou salvar a essência");
        return false;
      }
      toast.success("essência atualizada");
      await reload();
      return true;
    },
    [reload],
  );

  /** atualiza um ou mais campos editáveis da carta (tagline, superpower, sombra, próximo movimento) */
  const updateCardFields = useCallback(
    async (
      cardUserId: string,
      fields: Partial<
        Pick<BuilderCard, "tagline" | "superpower_text" | "shadow_text" | "next_move_text" | "essence_phrase">
      >,
    ) => {
      // normaliza strings vazias pra null
      const cleaned: BuilderCardUpdate = {};
      for (const [k, v] of Object.entries(fields)) {
        const t = (v ?? "").toString().trim();
        (cleaned as Record<string, string | null>)[k] = t.length > 0 ? t : null;
      }
      const { error } = await supabase.from("builder_cards").update(cleaned).eq("user_id", cardUserId);
      if (error) {
        toast.error("não rolou salvar");
        return false;
      }
      toast.success("salvo");
      await reload();
      return true;
    },
    [reload],
  );

  return { updateEssence, updateCardFields };
};
