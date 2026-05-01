import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BuilderCard, CardRow } from "./types";
import { logger } from "@/lib/logger";

type Args = {
  rows: CardRow[];
  reload: () => Promise<void>;
};

/** gera carta nova, expande campos (mantendo arquétipo) e refaz pipeline completo.
 *  imagem da carta agora é compartilhada por arquétipo (archetype_artworks),
 *  então nunca mais geramos imagem por aluno individualmente. */
export const useBuilderCardGenerate = ({ rows, reload }: Args) => {
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const generate = useCallback(
    async (userId: string) => {
      setGeneratingFor(userId);
      try {
        const row = rows.find((r) => r.user_id === userId);
        const body = row?.is_orphan
          ? { invited_participant_id: userId }
          : { user_id: userId };
        const { data, error } = await supabase.functions.invoke("generate-builder-card", { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // depois de gerar texto + arquétipo, copia o artwork compartilhado
        const card = data?.card as BuilderCard | undefined;
        if (card?.archetype && card.id) {
          await applyArchetypeArtwork(card.id, card.archetype);
        }

        toast.success("carta gerada");
        await reload();
        return card;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro ao gerar";
        toast.error(msg);
        await reload();
      } finally {
        setGeneratingFor(null);
      }
    },
    [reload, rows],
  );

  /** expande os 4 campos novos (tagline, superpoder, sombra, próximo movimento)
   *  preservando a classificação original (archetype, emoji, full_text, essence_phrase). */
  const expandFields = useCallback(
    async (userId: string) => {
      setGeneratingFor(userId);
      try {
        const row = rows.find((r) => r.user_id === userId);
        const body = row?.is_orphan
          ? { invited_participant_id: userId, expand_only: true }
          : { user_id: userId, expand_only: true };
        const { data, error } = await supabase.functions.invoke("generate-builder-card", { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        await reload();
        return data?.card as BuilderCard;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro ao expandir";
        throw new Error(msg);
      } finally {
        setGeneratingFor(null);
      }
    },
    [reload, rows],
  );

  /** pipeline completo: texto+arquetipo → atribui artwork compartilhado → og:image.
   *  zero geração de imagem por aluno. */
  const regenerateFull = useCallback(
    async (userId: string) => {
      const row = rows.find((r) => r.user_id === userId);
      const baseBody = row?.is_orphan ? { invited_participant_id: userId } : { user_id: userId };

      // 1. texto + arquetipo
      const text = await supabase.functions.invoke("generate-builder-card", { body: baseBody });
      if (text.error) throw new Error(text.error.message);
      if (text.data?.error) throw new Error(text.data.error);
      const card = text.data?.card as BuilderCard | undefined;

      // 2. atribui artwork compartilhado do arquétipo (sem gerar imagem nova)
      if (card?.archetype && card.id) {
        await applyArchetypeArtwork(card.id, card.archetype);
      }

      // 3. og:image
      if (card?.id) {
        const og = await supabase.functions.invoke("generate-card-og-image", {
          body: { card_id: card.id, force: true },
        });
        if (og.error) throw new Error(og.error.message);
        if (og.data?.error) throw new Error(og.data.error);
      }
    },
    [rows],
  );

  return {
    generate,
    expandFields,
    regenerateFull,
    generatingFor,
  };
};

/** lê archetype_artworks pelo arquétipo e copia image_url pro builder_cards.
 *  noop silencioso se ainda não tem artwork gerado pra esse arquétipo
 *  (admin precisa rodar a aba "artworks" antes). */
const applyArchetypeArtwork = async (cardId: string, archetype: string) => {
  const { data: artwork, error } = await supabase
    .from("archetype_artworks")
    .select("image_url")
    .eq("archetype", archetype as never)
    .maybeSingle();

  if (error) {
    logger.warn("[applyArchetypeArtwork] erro:", error);
    return;
  }

  if (!artwork?.image_url) {
    // ainda não tem artwork gerado pra esse arquétipo. o admin verá o card sem imagem
    // e pode gerar na aba "artworks".
    return;
  }

  await supabase
    .from("builder_cards")
    .update({
      image_url: artwork.image_url,
      image_generated_at: new Date().toISOString(),
    })
    .eq("id", cardId);
};
