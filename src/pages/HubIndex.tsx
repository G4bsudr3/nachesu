import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, Sparkles, Users, FolderOpen, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { FutureLetterBanner } from "@/components/hub/FutureLetterBanner";


interface HubCounts {
  builders: number;
  materials: number;
  materialsNew: number;
  projects: number;
}

const useHubCounts = () => {
  const [counts, setCounts] = useState<HubCounts>({ builders: 0, materials: 0, materialsNew: 0, projects: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [builders, mats, matsNew, projs, subs] = await Promise.all([
        supabase.from("builder_cards").select("id", { count: "exact", head: true }).eq("is_published", true).eq("status", "pronta"),
        supabase.from("hub_materials").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("hub_materials").select("id", { count: "exact", head: true }).eq("published", true).gte("created_at", sevenDaysAgo),
        supabase.from("hub_projects").select("id", { count: "exact", head: true }),
        supabase.from("mission_submissions").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setCounts({
        builders: builders.count ?? 0,
        materials: mats.count ?? 0,
        materialsNew: matsNew.count ?? 0,
        projects: (projs.count ?? 0) + (subs.count ?? 0),
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const { counts, loading } = useHubCounts();

  const portas: PortaCardProps[] = [
    {
      to: "/app/hub/galeria",
      title: "galeria",
      copy: "as cartas de quem tá construindo com a gente",
      hint: loading ? "carregando…" : `${counts.builders} builders · 6 arquétipos`,
      icon: <Sparkles className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #f756a6 0%, #6f77fc 100%)",
    },
    {
      to: "/app/hub/turma",
      title: "turma",
      copy: "panorama da turma, mascotes e o coletivo",
      hint: "qual mascote vai ganhar?",
      icon: <Users className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #fe7b02 0%, #fd4644 100%)",
    },
    {
      to: "/app/hub/materiais",
      title: "materiais",
      copy: "apresentações, leituras e referências da imersão",
      hint: loading
        ? "carregando…"
        : counts.materialsNew > 0
          ? `${counts.materialsNew} novo${counts.materialsNew > 1 ? "s" : ""} essa semana`
          : `${counts.materials} no total`,
      icon: <BookOpen className="h-7 w-7" />,
      accent: "linear-gradient(135deg, #6f77fc 0%, #f756a6 100%)",
    },
    {
      to: "/app/hub/projetos",
      title: "projetos",
      copy: "o feed da turma. reaja, comente, poste o seu",
      hint: loading ? "carregando…" : `${counts.projects} no feed`,
      icon: <FolderOpen className="h-7 w-7" />,
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
        <header className="mb-8 sm:mb-12">
          <p className="mb-3 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            hub da turma
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
            tudo que rola<br />entre nós<br />tá aqui
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
            galeria, materiais, projetos e a turma toda. escolhe por onde começar 🤙
          </p>
        </header>

        {/* fotos do chora lovable - álbum coletivo */}
        <Link
          to="/app/hub/album"
          className="group relative mb-10 block overflow-hidden rounded-3xl border border-perestroika-preto/15 p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          style={{
            background: "linear-gradient(110deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-perestroika-bege/95 text-perestroika-preto shadow-lg transition-transform group-hover:scale-110 group-hover:-rotate-6">
                <Camera className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-bege/85">
                  álbum coletivo
                </p>
                <h2 className="font-display text-3xl uppercase leading-none text-perestroika-bege sm:text-4xl">
                  fotos do chora lovable
                </h2>
                <p className="mt-2 max-w-md font-body text-sm text-perestroika-bege/90">
                  manda tuas fotos e vê o álbum que a turma tá montando 📸
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors group-hover:bg-perestroika-bege group-hover:text-perestroika-preto sm:self-center">
              entrar no álbum <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        {/* convite carta pro futuro - se auto-esconde se não tem sessão aberta */}
        <FutureLetterBanner />

        {/* 4 portas */}
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          {portas.map((p, i) => (
            <PortaCard key={p.to} {...p} delay={i * 0.06} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default HubIndex;
