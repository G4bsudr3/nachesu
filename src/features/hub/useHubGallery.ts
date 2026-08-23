import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Archetype = Database["public"]["Enums"]["builder_archetype"];

export interface HubBuilder {
  user_id: string;
  slug: string;
  display_name: string | null;
  nickname: string | null;
  cidade: string | null;
  archetype: Archetype | null;
  image_url: string | null;
  emoji: string | null;
  /** 1ª linha da última submissão (qualquer exercício) — preview na galeria */
  project_preview: string | null;
  has_project: boolean;
  total_reactions: number;
}

/** Busca galeria do hub: todo profile ativo com carta publicada
 * + última submissão (qualquer exercício) como preview de projeto.
 * Inclui builders sem submissão ainda (mostra "ainda construindo"). */
export const useHubGallery = () => {
  const [builders, setBuilders] = useState<HubBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. profiles ativos
        const { data: profiles, error: pErr } = await supabase
          .from("profiles_public")
          .select("user_id, slug, display_name, nickname, cidade, status")
          .eq("status", "active");

        if (pErr) throw pErr;
        if (!profiles?.length) {
          if (!cancelled) {
            setBuilders([]);
            setLoading(false);
          }
          return;
        }

        const userIds = profiles.map((p) => p.user_id);

        // 2. cartas publicadas + artwork
        const [{ data: cards }, { data: artworks }, { data: subs }, { data: reactions }] =
          await Promise.all([
            supabase
              .from("builder_cards")
              .select("user_id, archetype, emoji, image_url, is_published, status")
              .in("user_id", userIds)
              .eq("is_published", true)
              .eq("status", "pronta"),
            supabase.from("archetype_artworks").select("archetype, image_url"),
            supabase
              .from("mission_submissions")
              .select("id, user_id, descricao, created_at")
              .in("user_id", userIds)
              .order("created_at", { ascending: false }),
            supabase
              .from("hub_reactions")
              .select("target_id, target_kind")
              .eq("target_kind", "submission"),
          ]);

        const artworkMap = new Map(
          (artworks ?? []).map((a) => [a.archetype as Archetype, a.image_url]),
        );

        const cardByUser = new Map(
          (cards ?? []).map((c) => [c.user_id, c]),
        );

        // pega última submissão por user
        const lastSubByUser = new Map<string, { id: string; descricao: string | null }>();
        for (const s of subs ?? []) {
          if (!lastSubByUser.has(s.user_id)) {
            lastSubByUser.set(s.user_id, { id: s.id, descricao: s.descricao });
          }
        }

        // contagem de reações por submission_id
        const reactionsBySub = new Map<string, number>();
        for (const r of reactions ?? []) {
          reactionsBySub.set(r.target_id, (reactionsBySub.get(r.target_id) ?? 0) + 1);
        }

        const result: HubBuilder[] = profiles
          .filter((p) => cardByUser.has(p.user_id)) // só builders com carta publicada
          .map((p) => {
            const card = cardByUser.get(p.user_id)!;
            const sub = lastSubByUser.get(p.user_id);
            const previewLine = sub?.descricao
              ? sub.descricao.split(/\n/)[0].trim().slice(0, 140)
              : null;
            const totalReacts = sub ? reactionsBySub.get(sub.id) ?? 0 : 0;

            return {
              user_id: p.user_id,
              slug: p.slug ?? p.user_id.slice(0, 8),
              display_name: p.display_name,
              nickname: p.nickname,
              cidade: p.cidade,
              archetype: card.archetype as Archetype | null,
              image_url: card.archetype
                ? artworkMap.get(card.archetype as Archetype) ?? card.image_url
                : card.image_url,
              emoji: card.emoji,
              project_preview: previewLine,
              has_project: Boolean(sub),
              total_reactions: totalReacts,
            };
          })
          .sort((a, b) =>
            (a.nickname ?? a.display_name ?? "").localeCompare(
              b.nickname ?? b.display_name ?? "",
              "pt-BR",
              { sensitivity: "base" },
            ),
          );

        if (!cancelled) {
          setBuilders(result);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as Error).message ?? "erro ao carregar hub");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { builders, loading, error };
};
