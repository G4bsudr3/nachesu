import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TurmaPessoa = {
  user_id: string;
  display_name: string;
  nickname: string | null;
  avatar_url: string | null;
  instagram: string | null;
  linkedin: string | null;
};

export function useTurmaRedes() {
  const [people, setPeople] = useState<TurmaPessoa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from("profiles_public")
      .select("user_id, display_name, nickname, avatar_url, instagram, linkedin")
      .eq("status", "active")
      .order("display_name", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("[useTurmaRedes]", error);
          setPeople([]);
        } else {
          setPeople(
            (data ?? []).map((p) => ({
              user_id: p.user_id,
              display_name: p.display_name ?? "sem nome",
              nickname: p.nickname,
              avatar_url: p.avatar_url,
              instagram: p.instagram,
              linkedin: p.linkedin,
            })),
          );
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { people, loading };
}
