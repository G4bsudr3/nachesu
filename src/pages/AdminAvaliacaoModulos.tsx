import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseBySlug } from "@/hooks/useCourses";

type Row = {
  number: number;
  title: string;
  counts: [number, number, number];
  total: number;
  comments: { name: string; text: string }[];
};

const LABELS = ["tranquilo demais", "no ponto", "pesado demais"];

/**
 * leitura das avaliações de fim de módulo (module_ratings).
 * uma linha por módulo com a distribuição das 3 respostas e os comentários.
 */
const AdminAvaliacaoModulos = () => {
  const { slug } = useParams<{ slug: string }>();
  const course = useCourseBySlug(slug);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-avaliacoes", course.data?.id],
    enabled: !!course.data?.id,
    queryFn: async (): Promise<Row[]> => {
      const { data: trails } = await supabase
        .from("trails")
        .select("id")
        .eq("course_id", course.data!.id);
      const trailIds = (trails ?? []).map((t) => t.id);
      if (!trailIds.length) return [];
      const { data: mods } = await supabase
        .from("modules")
        .select("id, number, title")
        .in("trail_id", trailIds)
        .order("number");
      const modules = (mods ?? []) as { id: string; number: number; title: string }[];
      if (!modules.length) return [];

      const { data: ratings } = await supabase
        .from("module_ratings")
        .select("module_id, user_id, rating, comment")
        .in("module_id", modules.map((m) => m.id));
      const list = (ratings ?? []) as {
        module_id: string;
        user_id: string;
        rating: number;
        comment: string | null;
      }[];

      const userIds = [...new Set(list.map((r) => r.user_id))];
      const nameById = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, nickname")
          .in("user_id", userIds);
        for (const p of (profs ?? []) as { user_id: string; display_name: string | null; nickname: string | null }[]) {
          nameById.set(p.user_id, p.display_name ?? p.nickname ?? "estudante");
        }
      }

      return modules.map((m) => {
        const rs = list.filter((r) => r.module_id === m.id);
        const counts: [number, number, number] = [0, 0, 0];
        for (const r of rs) if (r.rating >= 1 && r.rating <= 3) counts[r.rating - 1] += 1;
        return {
          number: m.number,
          title: m.title,
          counts,
          total: rs.length,
          comments: rs
            .filter((r) => (r.comment ?? "").trim())
            .map((r) => ({ name: nameById.get(r.user_id) ?? "estudante", text: r.comment!.trim() })),
        };
      });
    },
  });

  if (course.isLoading) return <div className="p-8 text-perestroika-preto/50">carregando…</div>;
  if (!course.data) return <Navigate to="/admin" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/admin/eletiva/${slug}/modulos`} className="hover:text-perestroika-preto">
          {course.data.title}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">avaliações</span>
      </nav>

      <h1 className="font-display uppercase text-4xl leading-[0.95] mb-1">
        como cada módulo caiu
      </h1>
      <p className="text-sm text-perestroika-preto/60 mb-6">
        resposta obrigatória no fim do módulo, comentário opcional.
      </p>

      {isLoading ? (
        <p className="text-perestroika-preto/50">carregando…</p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((r) => (
            <li
              key={r.number}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-3xl leading-none tabular-nums">
                  {String(r.number).padStart(2, "0")}
                </span>
                <span className="flex-1 min-w-[180px] text-sm">{r.title.toLowerCase()}</span>
                <span className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                  {r.total} avaliaram
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {r.counts.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege px-3 py-2"
                  >
                    <p className="font-display text-2xl leading-none tabular-nums">{c}</p>
                    <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 mt-0.5">
                      {LABELS[i]}
                    </p>
                  </div>
                ))}
              </div>

              {r.comments.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {r.comments.map((c, i) => (
                    <li key={i} className="text-sm text-perestroika-preto/80 flex gap-2">
                      <MessageSquare className="w-3.5 h-3.5 mt-1 shrink-0 text-perestroika-preto/40" />
                      <span>
                        <strong className="font-medium">{c.name}:</strong> {c.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {r.total === 0 && (
                <p className="mt-3 text-[11px] text-perestroika-preto/45">
                  ninguém avaliou esse módulo ainda.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminAvaliacaoModulos;
