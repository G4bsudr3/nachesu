import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Archetype = Database["public"]["Enums"]["builder_archetype"];
export type MissionStatus = Database["public"]["Enums"]["mission_status"];

export interface BuilderProfile {
  user_id: string;
  slug: string;
  display_name: string | null;
  nickname: string | null;
  cidade: string | null;
  archetype: Archetype | null;
  image_url: string | null;
  card: {
    emoji: string | null;
    tagline: string | null;
    essence_phrase: string | null;
    superpower_text: string | null;
    shadow_text: string | null;
    next_move_text: string | null;
    full_text: string | null;
  } | null;
  submissions: {
    id: string;
    mission_id: string;
    mission_titulo: string;
    mission_ordem: number;
    link: string;
    descricao: string;
    status: MissionStatus;
    created_at: string;
  }[];
}

export const useBuilderProfile = (slug: string | undefined) => {
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        // tenta por slug; fallback por user_id curto (8 chars iniciais)
        let prof:
          | {
              user_id: string;
              slug: string | null;
              display_name: string | null;
              nickname: string | null;
              cidade: string | null;
            }
          | null = null;

        const { data: bySlug } = await supabase
          .from("profiles")
          .select("user_id, slug, display_name, nickname, cidade")
          .eq("slug", slug)
          .maybeSingle();

        if (bySlug) {
          prof = bySlug;
        } else {
          // fallback: prefixo de user_id (8 chars)
          const { data: byPrefix } = await supabase
            .from("profiles")
            .select("user_id, slug, display_name, nickname, cidade")
            .ilike("user_id", `${slug}%`)
            .limit(1)
            .maybeSingle();
          prof = byPrefix;
        }

        if (!prof) {
          if (!cancelled) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const [{ data: card }, { data: artworks }, { data: subs }] = await Promise.all([
          supabase
            .from("builder_cards")
            .select(
              "archetype, emoji, image_url, tagline, essence_phrase, superpower_text, shadow_text, next_move_text, full_text, status, is_published",
            )
            .eq("user_id", prof.user_id)
            .eq("is_published", true)
            .eq("status", "pronta")
            .maybeSingle(),
          supabase.from("archetype_artworks").select("archetype, image_url"),
          supabase
            .from("mission_submissions")
            .select("id, mission_id, link, descricao, status, created_at, missions(titulo, ordem)")
            .eq("user_id", prof.user_id)
            .order("created_at", { ascending: false }),
        ]);

        const artworkMap = new Map((artworks ?? []).map((a) => [a.archetype, a.image_url]));
        const archetype = (card?.archetype ?? null) as Archetype | null;
        const image_url = archetype
          ? artworkMap.get(archetype) ?? card?.image_url ?? null
          : card?.image_url ?? null;

        const submissions = (subs ?? []).map((s) => {
          const m = s.missions as { titulo?: string | null; ordem?: number | null } | null;
          return {
            id: s.id,
            mission_id: s.mission_id,
            mission_titulo: m?.titulo ?? "missão",
            mission_ordem: m?.ordem ?? 0,
            link: s.link,
            descricao: s.descricao,
            status: s.status as MissionStatus,
            created_at: s.created_at,
          };
        });

        if (!cancelled) {
          setProfile({
            user_id: prof.user_id,
            slug: prof.slug ?? prof.user_id.slice(0, 8),
            display_name: prof.display_name,
            nickname: prof.nickname,
            cidade: prof.cidade,
            archetype,
            image_url,
            card: card
              ? {
                  emoji: card.emoji,
                  tagline: card.tagline,
                  essence_phrase: card.essence_phrase,
                  superpower_text: card.superpower_text,
                  shadow_text: card.shadow_text,
                  next_move_text: card.next_move_text,
                  full_text: card.full_text,
                }
              : null,
            submissions,
          });
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as Error).message ?? "erro ao carregar perfil");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { profile, loading, error };
};
