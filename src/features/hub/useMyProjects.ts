import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type HubProject = Database["public"]["Tables"]["hub_projects"]["Row"];

export interface ProjectInput {
  title: string;
  description: string;
  link: string;
  cover_url?: string | null;
  tags?: string[];
}

const isHttp = (s: string) => /^https?:\/\//i.test(s);

const validate = (i: ProjectInput): string | null => {
  if (!i.title.trim()) return "dá um título 🤙";
  if (i.title.trim().length > 80) return "título passou de 80 caracteres";
  if (!i.description.trim()) return "conta o que tu fez";
  if (i.description.trim().length > 500) return "descrição passou de 500 caracteres";
  if (!isHttp(i.link.trim())) return "link tem que começar com http(s)://";
  return null;
};

export const useMyProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<HubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("hub_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProjects((data ?? []) as HubProject[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: ProjectInput) => {
      if (!user) return { ok: false, error: "sem sessão" };
      const err = validate(input);
      if (err) return { ok: false, error: err };
      setSaving(true);
      const { error } = await supabase.from("hub_projects").insert({
        user_id: user.id,
        title: input.title.trim(),
        description: input.description.trim(),
        link: input.link.trim(),
        cover_url: input.cover_url?.trim() || null,
        tags: input.tags ?? [],
      });
      setSaving(false);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [user, refresh],
  );

  const update = useCallback(
    async (id: string, input: ProjectInput) => {
      const err = validate(input);
      if (err) return { ok: false, error: err };
      setSaving(true);
      const { error } = await supabase
        .from("hub_projects")
        .update({
          title: input.title.trim(),
          description: input.description.trim(),
          link: input.link.trim(),
          cover_url: input.cover_url?.trim() || null,
          tags: input.tags ?? [],
        })
        .eq("id", id);
      setSaving(false);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setSaving(true);
      const { error } = await supabase.from("hub_projects").delete().eq("id", id);
      setSaving(false);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  return { projects, loading, saving, create, update, remove, refresh };
};
