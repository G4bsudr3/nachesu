import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, MessageCircle, Sparkles, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaSwitcher } from "@/components/dashboard/EletivaSwitcher";
import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { supabase } from "@/integrations/supabase/client";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";

interface CourseCounts {
  materials: number;
  materialsNew: number;
  modules: number;
}

const useCourseCounts = (courseId: string | null) => {
  const [counts, setCounts] = useState<CourseCounts>({ materials: 0, materialsNew: 0, modules: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!courseId) {
      setCounts({ materials: 0, materialsNew: 0, modules: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      // materiais do curso + globais
      const filter = `course_id.eq.${courseId},course_id.is.null`;
      const [mats, matsNew, mods] = await Promise.all([
        supabase.from("hub_materials").select("id", { count: "exact", head: true }).eq("published", true).or(filter),
        supabase.from("hub_materials").select("id", { count: "exact", head: true }).eq("published", true).gte("created_at", sevenDaysAgo).or(filter),
        supabase
          .from("modules")
          .select("id, trails!inner(course_id)", { count: "exact", head: true })
          .eq("published", true)
          .eq("trails.course_id", courseId),
      ]);
      if (cancelled) return;
      setCounts({
        materials: mats.count ?? 0,
        materialsNew: matsNew.count ?? 0,
        modules: mods.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { counts, loading };
};

interface PortaCardProps {
  to: string;
  title: string;
  copy: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
  delay?: number;
}

const PortaCard = ({ to, title, copy, hint, icon, accent, delay = 0 }: PortaCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    <Link
      to={to}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-perestroika-preto/15 bg-white/50 p-6 sm:p-8 transition-all hover:-translate-y-1 hover:border-perestroika-preto/40 hover:shadow-2xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-15 blur-3xl transition-opacity group-hover:opacity-30"
        style={{ background: accent }}
      />

      <div className="relative">
        <div
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-perestroika-bege shadow-md"
          style={{ background: accent }}
        >
          {icon}
        </div>
        <h2 className="font-display text-4xl uppercase leading-[0.9] sm:text-5xl">{title}</h2>
        <p className="mt-2 max-w-xs font-body text-sm text-perestroika-preto/70 sm:text-base">{copy}</p>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3">
        <span className="font-body text-xs uppercase tracking-wide text-perestroika-preto/55">{hint}</span>
        <ArrowRight className="h-5 w-5 text-perestroika-preto/40 transition-transform group-hover:translate-x-1 group-hover:text-perestroika-preto" />
      </div>
    </Link>
  </motion.div>
);

const HubIndex = () => {
  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug } = useActiveEletiva();
  const { enabled: extrasEnabled } = useEletivaExtras();

  const activeEnrollment = useMemo(() => {
    if (!enrollments?.length) return null;
    if (activeSlug) {
      const match = enrollments.find((e) => e.course?.slug === activeSlug);
      if (match) return match;
    }
    return enrollments[0];
  }, [enrollments, activeSlug]);

  const activeCourse = activeEnrollment?.course ?? null;
  const { counts, loading } = useCourseCounts(activeCourse?.id ?? null);

  const portas: PortaCardProps[] = [
    {
      to: activeCourse ? `/app/trilhas?eletiva=${activeCourse.slug}` : "/app/trilhas",
      title: "trilhas",
      copy: "as 4 trilhas e os módulos da sua eletiva",
      hint: loading ? "carregando…" : `${counts.modules} módulos publicados`,
      icon: <Layers className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #f756a6 0%, #6f77fc 100%)",
    },
    {
      to: "/app/hub/materiais",
      title: "materiais",
      copy: "leituras, slides e referências da sua eletiva",
      hint: loading
        ? "carregando…"
        : counts.materialsNew > 0
          ? `${counts.materialsNew} novo${counts.materialsNew > 1 ? "s" : ""} essa semana`
          : `${counts.materials} no total`,
      icon: <BookOpen className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #6f77fc 0%, #f756a6 100%)",
    },
    {
      to: "/app/tutor",
      title: "tutor IA",
      copy: "tira dúvida do conteúdo a qualquer hora",
      hint: "respostas guiadas pela trilha",
      icon: <MessageCircle className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #fe7b02 0%, #fd4644 100%)",
    },
    {
      to: "/app/entregas",
      title: "entregas",
      copy: "tuas missões e entregáveis dessa eletiva",
      hint: "acompanhe o que falta",
      icon: <Sparkles className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #fd4644 0%, #fe7b02 100%)",
    },
  ];

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        actions={
          <Link
            to="/app"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            voltar ao app
          </Link>
        }
      />

      <main className="container max-w-6xl py-8 sm:py-12">
        <header className="mb-6 sm:mb-10">
          <p className="mb-3 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            seu hub
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
            tudo da sua<br />eletiva<br />num lugar só
          </h1>
          {activeCourse && (
            <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
              você tá vendo o conteúdo de <strong className="font-semibold">{activeCourse.title.toLowerCase()}</strong>. troca abaixo se quiser ir pra outra.
            </p>
          )}
        </header>

        {(enrollments?.length ?? 0) > 1 && (
          <div className="mb-6 sm:mb-8">
            <EletivaSwitcher />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          {portas.map((p, i) => (
            <PortaCard key={p.to} {...p} delay={i * 0.06} />
          ))}
        </div>

        {extrasEnabled && (
          <div className="mt-10 rounded-2xl border border-perestroika-preto/10 bg-white/40 p-5 text-sm text-perestroika-preto/70">
            <p className="font-body">
              <strong className="font-semibold">extras Chŏra ligados:</strong>{" "}
              <Link to="/app/hub/galeria" className="underline hover:text-perestroika-preto">galeria</Link>
              {" · "}
              <Link to="/app/hub/projetos" className="underline hover:text-perestroika-preto">projetos</Link>
              {" · "}
              <Link to="/app/hub/turma" className="underline hover:text-perestroika-preto">turma</Link>
              {" · "}
              <Link to="/app/hub/album" className="underline hover:text-perestroika-preto">álbum</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HubIndex;
