import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RATING_CHECKPOINTS } from "@/features/hub/useModuleRating";

/**
 * duas perguntas diferentes moram na mesma tabela module_ratings:
 *
 *  - ritmo (1 a 3), usada na eletiva ia-na-pratica:
 *      1 tranquilo demais · 2 no ponto · 3 pesado demais
 *  - satisfação (1 a 5 estrelas), usada nas demais eletivas
 *
 * misturar as duas numa média só produz leitura errada (ritmo 1.6 vira
 * "nota baixa"). tudo aqui é particionado por escala.
 */
export type PulsoScale = "ritmo" | "satisfacao";

const RITMO_COURSES = new Set(["ia-na-pratica"]);

export const scaleOfCourse = (slug: string): PulsoScale =>
  RITMO_COURSES.has(slug) ? "ritmo" : "satisfacao";

export const RITMO_LABELS: Record<number, string> = {
  1: "tranquilo demais",
  2: "no ponto",
  3: "pesado demais",
};

export const answerLabel = (scale: PulsoScale, rating: number) =>
  scale === "ritmo" ? (RITMO_LABELS[rating] ?? String(rating)) : `${rating} de 5`;

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
  scale: PulsoScale;
}

export interface PulsoEntry extends PulsoRating {
  student: string;
  answer: string;
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
  return (data ?? []).map((r: any) => {
    const slug = r.modules?.trails?.courses?.slug ?? "";
    return {
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
      course_slug: slug,
      scale: scaleOfCourse(slug),
    };
  });
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

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

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

  const profiles = profilesQ.data;
  const isTest = (userId: string) => !!profiles?.get(userId)?.is_test;

  const allRaw = ratingsQ.data ?? [];
  const all = useMemo(
    () => (includeTest ? allRaw : allRaw.filter((r) => !isTest(r.user_id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRaw, profiles, includeTest],
  );
  const hiddenTestCount = useMemo(
    () => allRaw.filter((r) => isTest(r.user_id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRaw, profiles],
  );
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

  const completions = (complQ.data ?? []).filter(
    (c) =>
      (since ? c.completed_at >= since : true) && (includeTest || !isTest(c.user_id)),
  );

  /** linhas nominais: quem deu qual resposta, com ou sem comentário */
  const entries: PulsoEntry[] = useMemo(
    () =>
      current.map((r) => ({
        ...r,
        student: profiles?.get(r.user_id)?.name ?? "estudante",
        answer: answerLabel(r.scale, r.rating),
      })),
    [current, profiles],
  );

  /** histórico completo por estudante, fora do recorte de período */
  const historyByStudent = useMemo(() => {
    const map = new Map<string, PulsoEntry[]>();
    all.forEach((r) => {
      const list = map.get(r.user_id) ?? [];
      list.push({
        ...r,
        student: profiles?.get(r.user_id)?.name ?? "estudante",
        answer: answerLabel(r.scale, r.rating),
      });
      map.set(r.user_id, list);
    });
    map.forEach((list) => list.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    return map;
  }, [all, profiles]);

  const ritmoRows = current.filter((r) => r.scale === "ritmo");
  const satRows = current.filter((r) => r.scale === "satisfacao");

  const ritmoStats = {
    total: ritmoRows.length,
    tranquilo: ritmoRows.filter((r) => r.rating === 1).length,
    noPonto: ritmoRows.filter((r) => r.rating === 2).length,
    pesado: ritmoRows.filter((r) => r.rating === 3).length,
    noPontoPct: pct(ritmoRows.filter((r) => r.rating === 2).length, ritmoRows.length),
  };

  const prevSat = previous.filter((r) => r.scale === "satisfacao");
  const satStats = {
    total: satRows.length,
    average: avg(satRows.map((r) => r.rating)),
    previousAverage: avg(prevSat.map((r) => r.rating)),
    detractorsPct: pct(satRows.filter((r) => r.rating <= 2).length, satRows.length),
    promotersPct: pct(satRows.filter((r) => r.rating >= 4).length, satRows.length),
  };

  const stats = {
    total: current.length,
    comments: current.filter((r) => r.comment && r.comment.trim().length > 0).length,
    responseRate: completions.length
      ? Math.round((current.length / completions.length) * 100)
      : null,
    ritmo: ritmoStats,
    satisfacao: satStats,
  };

  const byCourse = useMemo(() => {
    const map = new Map<
      string,
      {
        course_id: string;
        title: string;
        slug: string;
        scale: PulsoScale;
        ratings: number[];
      }
    >();
    current.forEach((r) => {
      const e = map.get(r.course_id) ?? {
        course_id: r.course_id,
        title: r.course_title,
        slug: r.course_slug,
        scale: r.scale,
        ratings: [],
      };
      e.ratings.push(r.rating);
      map.set(r.course_id, e);
    });
    return [...map.values()].map((c) => ({
      ...c,
      average: avg(c.ratings),
      count: c.ratings.length,
      noPontoPct:
        c.scale === "ritmo" ? pct(c.ratings.filter((n) => n === 2).length, c.ratings.length) : null,
    }));
  }, [current]);

  const byTrail = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        trail: string;
        course: string;
        color: string | null;
        scale: PulsoScale;
        ratings: number[];
      }
    >();
    current.forEach((r) => {
      const key = `${r.course_title}::${r.trail_title}`;
      const e = map.get(key) ?? {
        key,
        trail: r.trail_title,
        course: r.course_title,
        color: r.trail_color,
        scale: r.scale,
        ratings: [],
      };
      e.ratings.push(r.rating);
      map.set(key, e);
    });
    return [...map.values()].map((t) => ({
      ...t,
      average: avg(t.ratings),
      count: t.ratings.length,
      /** 0 a 1, pronto pra barra: ritmo mede "no ponto", satisfação mede média/5 */
      score:
        t.scale === "ritmo"
          ? t.ratings.filter((n) => n === 2).length / (t.ratings.length || 1)
          : (avg(t.ratings) ?? 0) / 5,
    }));
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
        scale: PulsoScale;
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
        scale: r.scale,
        ratings: [],
      };
      e.ratings.push(r.rating);
      map.set(r.module_id, e);
    });
    return [...map.values()]
      .map((m) => {
        const count = m.ratings.length;
        const offPct =
          m.scale === "ritmo"
            ? pct(m.ratings.filter((n) => n !== 2).length, count)
            : pct(m.ratings.filter((n) => n <= 2).length, count);
        const tranquilo = m.ratings.filter((n) => n === 1).length;
        const pesado = m.ratings.filter((n) => n === 3).length;
        return {
          ...m,
          count,
          average: avg(m.ratings),
          /** distribuição no tamanho da escala */
          dist:
            m.scale === "ritmo"
              ? [1, 2, 3].map((n) => m.ratings.filter((r) => r === n).length)
              : [1, 2, 3, 4, 5].map((n) => m.ratings.filter((r) => r === n).length),
          offPct,
          direction:
            m.scale !== "ritmo"
              ? null
              : tranquilo === pesado
                ? tranquilo === 0
                  ? null
                  : "dividido"
                : tranquilo > pesado
                  ? "fácil demais"
                  : "pesado demais",
        };
      })
      .sort((a, b) => b.offPct - a.offPct || b.count - a.count);
  }, [current]);

  const comments = useMemo(
    () => entries.filter((r) => r.comment && r.comment.trim()),
    [entries],
  );

  return {
    loading: ratingsQ.isLoading || complQ.isLoading || profilesQ.isLoading,
    error: ratingsQ.error as Error | null,
    hiddenTestCount,

    stats,
    byCourse,
    byTrail,
    byModule,
    entries,
    historyByStudent,
    comments,
    insight: insightQ.data ?? null,
    analyze: analyze.mutateAsync,
    analyzing: analyze.isPending,
    days,
  };
}
