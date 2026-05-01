import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeedItemKind = "submission" | "project";

export interface FeedAuthor {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
  slug: string | null;
}

export interface FeedItem {
  id: string;
  kind: FeedItemKind;
  user_id: string;
  title: string;
  description: string;
  link: string;
  cover_url: string | null;
  tags: string[];
  /** ts em ISO usado pra ordenação */
  created_at: string;
  /** mission_submission só */
  mission_titulo?: string | null;
  /** mission_submission só */
  status?: "pendente" | "aprovada" | "ajustar" | null;
  author: FeedAuthor;
}

interface MissionRow {
  id: string;
  user_id: string;
  link: string;
  descricao: string;
  status: "pendente" | "aprovada" | "ajustar";
  created_at: string;
  mission_id: string;
}
interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  link: string;
  cover_url: string | null;
  tags: string[];
  created_at: string;
}

const isHttp = (s: string) => /^https?:\/\//i.test(s);

export const useHubFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [projRes, subsRes] = await Promise.all([
      supabase
        .from("hub_projects")
        .select("id, user_id, title, description, link, cover_url, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("mission_submissions")
        .select("id, user_id, link, descricao, status, created_at, mission_id")
        .eq("status", "aprovada")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const projects = (projRes.data ?? []) as ProjectRow[];
    const subs = (subsRes.data ?? []) as MissionRow[];

    // missoes pra título
    const missionIds = Array.from(new Set(subs.map((s) => s.mission_id)));
    const userIds = Array.from(new Set([...projects.map((p) => p.user_id), ...subs.map((s) => s.user_id)]));

    const [missionsRes, profilesRes] = await Promise.all([
      missionIds.length > 0
        ? supabase.from("missions").select("id, titulo").in("id", missionIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from("profiles").select("user_id, nickname, display_name, slug").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const missionMap = new Map<string, string>(
      ((missionsRes.data ?? []) as { id: string; titulo: string }[]).map((m) => [m.id, m.titulo]),
    );
    const profileMap = new Map<string, FeedAuthor>(
      ((profilesRes.data ?? []) as FeedAuthor[]).map((p) => [p.user_id, p]),
    );

    const fromProjects: FeedItem[] = projects
      .filter((p) => isHttp(p.link))
      .map((p) => ({
        id: p.id,
        kind: "project",
        user_id: p.user_id,
        title: p.title,
        description: p.description,
        link: p.link,
        cover_url: p.cover_url,
        tags: p.tags ?? [],
        created_at: p.created_at,
        author: profileMap.get(p.user_id) ?? {
          user_id: p.user_id,
          nickname: null,
          display_name: null,
          slug: null,
        },
      }));

    const fromSubs: FeedItem[] = subs
      .filter((s) => isHttp(s.link))
      .map((s) => ({
        id: s.id,
        kind: "submission",
        user_id: s.user_id,
        title: missionMap.get(s.mission_id) ?? "missão",
        description: s.descricao,
        link: s.link,
        cover_url: null,
        tags: [],
        mission_titulo: missionMap.get(s.mission_id) ?? null,
        status: s.status,
        created_at: s.created_at,
        author: profileMap.get(s.user_id) ?? {
          user_id: s.user_id,
          nickname: null,
          display_name: null,
          slug: null,
        },
      }));

    const merged = [...fromProjects, ...fromSubs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
};
