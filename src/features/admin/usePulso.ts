import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RATING_CHECKPOINTS } from "@/features/hub/useModuleRating";

export interface PulsoRating {
  user_id: string;
  module_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  module_number: number;
  module_title: string;
  trail_title: string;
  trail_color: string | null;
  course_id: string;
  course_title: string;
  course_slug: string;
}

export interface PulsoInsight {
  id: string;
  summary_md: string;
  generated_at: string;
  model: string | null;
  period_start: string | null;
  period_end: string | null;
}

const RANGE_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  tudo: null,
};

async function fetchRatings(): Promise<PulsoRating[]> {
  const { data, error } = await supabase
    .from("module_ratings")
    .select(
      "user_id, module_id, rating, comment, created_at, updated_at, modules!inner(number, title, trails!inner(title, color, course_id, courses!inner(title, slug)))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    user_id: r.user_id,
    module_id: r.module_id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    updated_at: r.updated_at,
    module_number: r.modules?.number ?? 0,
    module_title: r.modules?.title ?? "",
    trail_title: r.modules?.trails?.title ?? "",
    trail_color: r.modules?.trails?.color ?? null,
    course_id: r.modules?.trails?.course_id ?? "",
    course_title: r.modules?.trails?.courses?.title ?? "",
    course_slug: r.modules?.trails?.courses?.slug ?? "",
  }));
}

/** conclusões de módulos-checkpoint, base pra taxa de resposta */
async function fetchCheckpointCompletions(): Promise<
  { user_id: string; module_id: string; completed_at: string }[]
> {
  const { data: mods, error: modErr } = await supabase
    .from("modules")
    .select("id, number")
    .in("number", RATING_CHECKPOINTS);
  if (modErr) throw modErr;
  const ids = (mods ?? []).map((m) => m.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("student_module_progress")
    .select("user_id, module_id, completed_at")
    .in("module_id", ids)
    .not("completed_at", "is", null);
  if (error) throw error;
  return (data ?? []) as { user_id: string; module_id: string; completed_at: string }[];
}

async function fetchProfiles(): Promise<
  Map<string, { name: string; email: string | null; is_test: boolean }>
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, nickname, is_test");
  if (error) throw error;
  const map = new Map<string, { name: string; email: string | null; is_test: boolean }>();
  (data ?? []).forEach((p: any) => {
    map.set(p.user_id, {
      name: p.display_name || p.nickname || "sem nome",
      email: null,
      is_test: !!p.is_test,
    });
  });
  return map;
}

const avg = (arr: number[]) =>
  arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;

export function usePulso(range: string, includeTest = false) {

  const qc = useQueryClient();

  const ratingsQ = useQuery({ queryKey: ["pulso-ratings"], queryFn: fetchRatings, staleTime: 60_000 });
  const complQ = useQuery({
    queryKey: ["pulso-completions"],
    queryFn: fetchCheckpointCompletions,
    staleTime: 60_000,
  });
  const profilesQ = useQuery({
    queryKey: ["pulso-profiles"],
    queryFn: fetchProfiles,
    staleTime: 5 * 60_000,
  });

  const insightQ = useQuery({
    queryKey: ["pulso-insight"],
    staleTime: 60_000,
    queryFn: async (): Promise<PulsoInsight | null> => {
      const { data, error } = await supabase
        .from("admin_insights")
        .select("id, summary_md, generated_at, model, period_start, period_end")
        .eq("scope", "pulso")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PulsoInsight | null) ?? null;
    },
  });

  const analyze = useMutation({
    mutationFn: async (days: number | null) => {
      const { data, error } = await supabase.functions.invoke("analyze-pulso", {
        body: { days },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as { insight: PulsoInsight }).insight;
    },
    onSuccess: (insight) => qc.setQueryData(["pulso-insight"], insight),
  });

  const days = RANGE_DAYS[range] ?? null;
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
  const prevSince = days ? new Date(Date.now() - days * 2 * 86400000).toISOString() : null;

  const all = ratingsQ.data ?? [];
  const current = useMemo(
    () => (since ? all.filter((r) => r.created_at >= since) : all),
    [all, since],
  );
  const previous = useMemo(
    () =>
      since && prevSince
        ? all.filter((r) => r.created_at >= prevSince && r.created_at < since)
        : [],
    [all, since, prevSince],
  );

  const completions = (complQ.data ?? []).filter((c) => (since ? c.completed_at >= since : true));

  const notes = current.map((r) => r.rating);
  const stats = {
    total: current.length,
    average: avg(notes),
    previousAverage: avg(previous.map((r) => r.rating)),
    detractorsPct: notes.length
      ? Math.round((notes.filter((n) => n <= 2).length / notes.length) * 100)
      : 0,
    promotersPct: notes.length
      ? Math.round((notes.filter((n) => n >= 4).length / notes.length) * 100)
      : 0,
    comments: current.filter((r) => r.comment && r.comment.trim().length > 0).length,
    responseRate: completions.length
      ? Math.round((current.length / completions.length) * 100)
      : null,
  };

  const byCourse = useMemo(() => {
    const map = new Map<
      string,
      { course_id: string; title: string; slug: string; ratings: number[] }
    >();
    current.forEach((r) => {
      const e = map.get(r.course_id) ?? {
        course_id: r.course_id,
        title: r.course_title,
        slug: r.course_slug,
        ratings: [],
      };
      e.ratings.push(r.rating);
      map.set(r.course_id, e);
    });
    return [...map.values()].map((c) => ({
      ...c,
      average: avg(c.ratings),
      count: c.ratings.length,
    }));
  }, [current]);

  const byTrail = useMemo(() => {
    const map = new Map<
      string,
      { key: string; trail: string; course: string; color: string | null; ratings: number[] }
    >();
    current.forEach((r) => {
      const key = `${r.course_title}::${r.trail_title}`;
      const e = map.get(key) ?? {
        key,
        trail: r.trail_title,
        course: r.course_title,
        color: r.trail_color,
        ratings: [],
      };
      e.ratings.push(r.rating);
      map.set(key, e);
    });
    return [...map.values()]
      .map((t) => ({ ...t, average: avg(t.ratings), count: t.ratings.length }))
      .sort((a, b) => (a.average ?? 5) - (b.average ?? 5));
  }, [current]);

  const byModule = useMemo(() => {
    const map = new Map<
      string,
      {
        module_id: string;
        number: number;
        title: string;
        course: string;
        slug: string;
        color: string | null;
        ratings: number[];
      }
    >();
    current.forEach((r) => {
      const e = map.get(r.module_id) ?? {
        module_id: r.module_id,
        number: r.module_number,
        title: r.module_title,
        course: r.course_title,
        slug: r.course_slug,
        color: r.trail_color,
        ratings: [],
      };
      e.ratings.push(r.rating);
      map.set(r.module_id, e);
    });
    return [...map.values()]
      .map((m) => ({
        ...m,
        average: avg(m.ratings),
        count: m.ratings.length,
        dist: [1, 2, 3, 4, 5].map((n) => m.ratings.filter((r) => r === n).length),
      }))
      .sort((a, b) => (a.average ?? 5) - (b.average ?? 5));
  }, [current]);

  const comments = useMemo(
    () =>
      current
        .filter((r) => r.comment && r.comment.trim())
        .map((r) => ({
          ...r,
          student: profilesQ.data?.get(r.user_id)?.name ?? "estudante",
        })),
    [current, profilesQ.data],
  );

  return {
    loading: ratingsQ.isLoading || complQ.isLoading,
    error: ratingsQ.error as Error | null,
    stats,
    byCourse,
    byTrail,
    byModule,
    comments,
    insight: insightQ.data ?? null,
    analyze: analyze.mutateAsync,
    analyzing: analyze.isPending,
    days,
  };
}
