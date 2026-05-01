import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BuilderCard, CardRow } from "./types";
import { logger } from "@/lib/logger";

/** carrega e mantém a lista de cartas (mescla fbi_responses + profiles + builder_cards) */
export const useBuilderCardsData = () => {
  const [rows, setRows] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: fbiRows, error: fbiErr } = await supabase
      .from("fbi_responses")
      .select("user_id, invited_participant_id, email, nome, nickname, submitted_at")
      .eq("submitted", true)
      .order("submitted_at", { ascending: false });

    if (fbiErr) {
      logger.error("[useBuilderCardsData] fbi:", fbiErr);
      toast.error("erro ao carregar respostas");
      setLoading(false);
      return;
    }

    if (!fbiRows || fbiRows.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const authUserIds = fbiRows.filter((r) => r.user_id).map((r) => r.user_id as string);
    const invitedIds = fbiRows
      .filter((r) => !r.user_id && r.invited_participant_id)
      .map((r) => r.invited_participant_id as string);

    // cards podem estar indexados por user_id real OU por invited_participant_id (órfã)
    const cardLookupIds = [...authUserIds, ...invitedIds];

    const [{ data: profiles }, { data: cards }] = await Promise.all([
      authUserIds.length > 0
        ? supabase.from("profiles").select("user_id, display_name, nickname").in("user_id", authUserIds)
        : Promise.resolve({ data: [] as { user_id: string; display_name: string | null; nickname: string | null }[] }),
      cardLookupIds.length > 0
        ? supabase.from("builder_cards").select("*").in("user_id", cardLookupIds)
        : Promise.resolve({ data: [] as BuilderCard[] }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const cardMap = new Map((cards ?? []).map((c) => [c.user_id, c]));

    const merged: CardRow[] = fbiRows.map((f) => {
      const isOrphan = !f.user_id;
      const lookupId = (f.user_id ?? f.invited_participant_id) as string;
      const profile = f.user_id ? profileMap.get(f.user_id) : undefined;
      return {
        user_id: lookupId,
        submitted_at: f.submitted_at,
        display_name: profile?.display_name ?? f.nome ?? null,
        nickname: profile?.nickname ?? f.nickname ?? null,
        card: cardMap.get(lookupId) ?? null,
        is_orphan: isOrphan,
        email: f.email ?? null,
      };
    });

    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, reload: load };
};
