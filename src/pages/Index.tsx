import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

import joaoTutor from "@/assets/joao-de-barro-tutor.png";

type EletivaKey = "ia-na-pratica" | "economia-circular";

const eletivas: Record<
  EletivaKey,
  {
    n: string;
    nome: string;
    professor: string;
    pitch: string;
    accent: string;
    trilhas: { n: string; titulo: string; desc: string; color: string; range: string }[];
  }
> = {
  "ia-na-pratica": {
    n: "01",
    nome: "ia na prática",
    professor: "com frattz",
    pitch: "construa seu primeiro app com ia, do problema ao mvp no ar.",
    accent: "#f756a6",
    trilhas: [
      {
        n: "01",
        titulo: "fundamentos & ia",
        desc: "o que ia faz hoje, como conversar com ela, quando usar no-code.",
        color: "#fe7b02",
        range: "módulos 1-5",
      },
      {
        n: "02",
        titulo: "problema & decisão",
        desc: "achar uma dor real, escolher a sua, escopar e vender em 60 segundos.",
        color: "#fd4644",
        range: "módulos 6-10",
      },
      {
        n: "03",
        titulo: "construção no lovable",
        desc: "do briefing ao mvp, ux que faz sentido, ia dentro do seu app.",
        color: "#f756a6",
        range: "módulos 11-15",
      },
      {
        n: "04",
        titulo: "validação & evolução",
        desc: "testa com gente real, itera com base no feedback, entrega.",
        color: "#6f77fc",
        range: "módulos 16-20",
      },
    ],
  },
  "economia-circular": {
    n: "02",
    nome: "economia circular",
    professor: "com dudu",
    pitch: "desenhe um negócio que regenera, do sistema ao protótipo validado.",
    accent: "#6f77fc",
    trilhas: [
      {
        n: "01",
        titulo: "enxergar",
        desc: "abrir o olho pro sistema. ver fluxos, resíduos e oportunidades onde os outros veem rotina.",
        color: "#fe7b02",
        range: "módulos 1-5",
      },
      {
        n: "02",
        titulo: "entender",
        desc: "mapear causas, atores e ciclos. desenhar o sistema antes de propor solução.",
        color: "#fd4644",
        range: "módulos 6-10",
      },
      {
        n: "03",
        titulo: "criar",
        desc: "prototipar negócios regenerativos, com ia te ajudando a iterar rápido.",
        color: "#f756a6",
        range: "módulos 11-15",
      },
      {
        n: "04",
        titulo: "validar",
        desc: "testa com gente real, mede impacto, ajusta o modelo. dossiê final pronto.",
        color: "#6f77fc",
        range: "módulos 16-20",
      },
    ],
  },
};

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const STORAGE_KEY = "home:eletiva-preferida";

const Index = () => {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EletivaKey>(() => {
    if (typeof window === "undefined") return "ia-na-pratica";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "economia-circular" || saved === "ia-na-pratica"
      ? saved
      : "ia-na-pratica";
  });

  // se um magic link cair na home com erro, manda pro /auth pra tratar
  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    if (!hash) return;
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("error") || hashParams.get("error_code")) {
      navigate(`/auth#${hash}`, { replace: true });
    }
  }, [navigate]);

  // persiste a eletiva escolhida pra próxima visita
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  // observa qual seção (#eletivas / #trilhas) está visível pra destacar no menu
  const [activeSection, setActiveSection] = useState<string | null>(null);
  useEffect(() => {
    const ids = ["eletivas", "facilitadores", "trilhas"];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // pega a entrada mais visível dentre as que estão intersectando
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      {
        // descarta o header sticky no topo (~120px) e dá margem inferior
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // scroll suave respeitando prefers-reduced-motion
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#${id}`);
  };

  const navItems: { id: string; label: string }[] = [
    { id: "eletivas", label: "eletivas" },
    { id: "facilitadores", label: "facilitadores" },
    { id: "trilhas", label: "trilhas" },
  ];

  const activeEletiva = eletivas[activeTab];

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      {/* topbar com seletor de eletiva */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-30 backdrop-blur-md bg-perestroika-bege/85 border-b border-perestroika-preto/10"
      >
        <div className="container flex items-center justify-between gap-4 py-4">
          <NachesULogo variant="dark" />

          {/* seletor central */}
          <div
            role="tablist"
            aria-label="escolha sua eletiva"
            className="hidden md:inline-flex rounded-full border-2 border-perestroika-preto/15 bg-perestroika-bege p-1 relative"
          >
            {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(key)}
                  className="relative z-10 px-4 lg:px-5 py-2 rounded-full font-body text-xs lg:text-sm uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                  style={{ color: isActive ? "#f2e4d8" : undefined }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="header-tab-bg"
                      className="absolute inset-0 rounded-full bg-perestroika-preto -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{eletivas[key].nome}</span>
                </button>
              );
            })}
          </div>

          <nav className="flex items-center gap-4 sm:gap-6" aria-label="seções da página">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleAnchorClick(e, item.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`hidden sm:inline relative font-body text-sm uppercase tracking-wide transition-opacity py-1 ${
                    isActive
                      ? "opacity-100 text-perestroika-preto"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {item.label}
                  <motion.span
                    className="absolute left-0 right-0 -bottom-0.5 h-0.5 origin-left"
                    style={{ backgroundColor: activeEletiva.accent }}
                    initial={false}
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                </a>
              );
            })}
            <Link
              to="/auth"
              className="font-body text-sm sm:text-base uppercase tracking-wide hover:opacity-60 transition-opacity"
            >
              entrar
            </Link>
          </nav>
        </div>

        {/* seletor mobile */}
        <div className="md:hidden border-t border-perestroika-preto/10">
          <div
            role="tablist"
            aria-label="escolha sua eletiva"
            className="container flex gap-2 py-2 overflow-x-auto"
          >
            {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(key)}
                  className={`shrink-0 rounded-full px-4 py-2 font-body text-xs uppercase tracking-wide border transition-colors ${
                    isActive
                      ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                      : "border-perestroika-preto/20 text-perestroika-preto/70"
                  }`}
                >
                  {eletivas[key].nome}
                </button>
              );
            })}
          </div>
        </div>
      </motion.header>

      {/* hero */}
      <section className="container relative pt-10 pb-20 sm:pt-16 sm:pb-28">
        <motion.div
          className="absolute right-2 top-0 sm:right-12 sm:top-6 pointer-events-none z-0"
          animate={prefersReducedMotion ? undefined : { rotate: [10, 16, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <span className="block sm:hidden">
            <EletivaSymbol size={96} rotate={6} pose="celebrating" />
          </span>
          <span className="hidden sm:block">
            <EletivaSymbol size={160} rotate={6} pose="celebrating" />
          </span>
        </motion.div>

        <motion.div variants={heroContainer} initial="hidden" animate="show" className="max-w-3xl relative z-10">
          <motion.p
            variants={heroItem}
            className="font-body text-xs sm:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6 inline-flex items-center gap-2"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: activeEletiva.accent }}
              aria-hidden="true"
            />
            sua escolha · {activeEletiva.nome} · {activeEletiva.professor}
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="font-display uppercase display-clamp-hero"
          >
            <span className="block">duas eletivas.</span>
            <span className="block">um hub só.</span>
          </motion.h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={`pitch-${activeTab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/80"
            >
              {activeEletiva.pitch} 20 semanas, tutor ia do lado e um projeto seu no ar no fim.
            </motion.p>
          </AnimatePresence>

          <motion.div variants={heroItem} className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full text-perestroika-bege px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
              style={{ backgroundColor: activeEletiva.accent }}
            >
              entrar em {activeEletiva.nome} <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#trilhas"
              className="inline-flex items-center min-h-11 px-1 font-body text-sm sm:text-base uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors underline-offset-4 hover:underline rounded"
            >
              ver as 4 trilhas ↓
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* as duas eletivas */}
      <section id="eletivas" className="container py-20 sm:py-28 border-t border-perestroika-preto/10 scroll-mt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            duas portas, mesmo método
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            ideia boa é<br />ideia construída.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            duas eletivas distintas, dois professores, um mesmo combinado: você sai com algo no ar. escolha a sua e cai dentro.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {(Object.keys(eletivas) as EletivaKey[]).map((key, i) => {
            const e = eletivas[key];
            return (
              <motion.a
                key={key}
                href="#trilhas"
                onClick={() => setActiveTab(key)}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                className="relative overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-7 sm:p-9 hover:border-perestroika-preto transition-colors block"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: e.accent }}
                  aria-hidden="true"
                />
                <div className="flex items-baseline justify-between gap-3 mb-6">
                  <span
                    className="font-display text-7xl sm:text-8xl leading-none"
                    style={{ color: e.accent }}
                  >
                    {e.n}
                  </span>
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-perestroika-preto/55">
                    {e.professor}
                  </span>
                </div>
                <h3 className="font-display uppercase text-3xl sm:text-4xl mb-4 leading-tight">
                  {e.nome}
                </h3>
                <p className="font-body text-base sm:text-lg text-perestroika-preto/75 leading-relaxed mb-6">
                  {e.pitch}
                </p>
                <p className="font-body text-xs uppercase tracking-[0.15em] text-perestroika-preto/60 inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  4 trilhas · 20 módulos · tutor ia
                </p>
              </motion.a>
            );
          })}
        </div>

        {/* comparação lado a lado */}
        <div className="mt-16 sm:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.55 }}
            className="mb-8 sm:mb-10 max-w-2xl"
          >
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-3">
              compare lado a lado
            </p>
            <h3 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
              o que muda entre uma e outra
            </h3>
          </motion.div>

          {/* mobile: pares de cards. desktop: tabela editorial */}
          <div className="overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege">
            {/* cabeçalho */}
            <div className="grid grid-cols-3 border-b-2 border-perestroika-preto/15">
              <div className="hidden md:block p-5 sm:p-6" />
              <div className="col-span-3 md:col-span-1 grid grid-cols-2 md:contents">
                {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
                  const e = eletivas[key];
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`relative text-left p-5 sm:p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-0 ${
                        isActive ? "bg-perestroika-preto/[0.04]" : "hover:bg-perestroika-preto/[0.02]"
                      }`}
                    >
                      <span
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ backgroundColor: e.accent }}
                        aria-hidden="true"
                      />
                      <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
                        eletiva {e.n}
                      </p>
                      <p className="font-display uppercase text-xl sm:text-2xl leading-tight">
                        {e.nome}
                      </p>
                      <p className="font-body text-xs text-perestroika-preto/60 mt-1">
                        {e.professor}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* linhas */}
            {[
              {
                label: "objetivo",
                values: {
                  "ia-na-pratica": "sair com um app real publicado, resolvendo uma dor sua.",
                  "economia-circular": "desenhar um modelo de negócio regenerativo, validado com gente real.",
                },
              },
              {
                label: "duração",
                values: {
                  "ia-na-pratica": "20 semanas · 1 módulo de 50 min por semana",
                  "economia-circular": "20 semanas · 1 módulo de 50 min por semana",
                },
              },
              {
                label: "entregáveis",
                values: {
                  "ia-na-pratica": "mvp publicado, prompt-deck pessoal, demo de 60 segundos.",
                  "economia-circular": "mapa de sistema, protótipo regenerativo, dossiê de validação.",
                },
              },
              {
                label: "professor",
                values: {
                  "ia-na-pratica": "frattz · ceo da naches, embaixador global lovable.",
                  "economia-circular": "dudu · estrategista em circularidade e negócios regenerativos.",
                },
              },
              {
                label: "tutor ia",
                values: {
                  "ia-na-pratica": "joão-de-barro provocador-builder, te empurra pro próximo mvp.",
                  "economia-circular": "joão-de-barro investigativo-sistêmico, te puxa pra ver o ciclo todo.",
                },
              },
            ].map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="grid grid-cols-3 border-b border-perestroika-preto/10 last:border-b-0"
              >
                <div className="col-span-3 md:col-span-1 px-5 sm:px-6 pt-5 md:py-6 md:border-r border-perestroika-preto/10">
                  <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                    {row.label}
                  </p>
                </div>
                {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
                  const e = eletivas[key];
                  return (
                    <div
                      key={key}
                      className="px-5 sm:px-6 py-4 md:py-6 border-t md:border-t-0 md:border-l border-perestroika-preto/10 first-of-type:border-l-0 md:first-of-type:border-l"
                    >
                      <p className="font-body text-[10px] uppercase tracking-[0.18em] text-perestroika-preto/45 mb-1.5 md:hidden">
                        {e.nome}
                      </p>
                      <p className="font-body text-sm sm:text-base text-perestroika-preto/85 leading-relaxed">
                        {row.values[key]}
                      </p>
                    </div>
                  );
                })}
              </motion.div>
            ))}

            {/* rodapé com CTAs */}
            <div className="grid grid-cols-3 bg-perestroika-preto/[0.03]">
              <div className="hidden md:block p-5 sm:p-6" />
              {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
                const e = eletivas[key];
                return (
                  <div
                    key={key}
                    className="col-span-3 md:col-span-1 p-5 sm:p-6 border-t md:border-t-0 md:border-l border-perestroika-preto/10 first-of-type:border-l-0 md:first-of-type:border-l flex flex-col sm:flex-row md:flex-col gap-2 sm:gap-3 md:gap-2"
                  >
                    <a
                      href="#trilhas"
                      onClick={(ev) => {
                        setActiveTab(key);
                        handleAnchorClick(ev, "trilhas");
                      }}
                      className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full text-perestroika-bege px-5 py-2.5 font-body text-xs sm:text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                      style={{ backgroundColor: e.accent }}
                    >
                      ver trilhas <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                    <Link
                      to="/auth"
                      className="inline-flex items-center justify-center min-h-11 px-3 font-body text-xs sm:text-sm uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors underline-offset-4 hover:underline rounded"
                    >
                      entrar
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* facilitadores */}
      <section
        id="facilitadores"
        className="container py-20 sm:py-28 border-t border-perestroika-preto/10 scroll-mt-32"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            quem conduz cada eletiva
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            dois facilitadores,<br />um jeito só.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            cada eletiva tem um nome de gente por trás. ninguém aqui é palestrante de slide. eles constroem com a turma.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {[
            {
              key: "ia-na-pratica" as EletivaKey,
              eletivaLabel: "ia na prática",
              nick: "frattz",
              nome: "Mateus Frattezi",
              tagline: "embaixador global lovable · ceo naches",
              quote:
                "construo na frente da turma, com a turma decidindo o caminho. saio deixando algo rodando.",
              bio: "lidera a naches, b2b saas de gamificação com ia pra educação. trouxe o jeito mão-na-massa do lovable pra dentro da sala de aula, do bett ao instituto caldeira.",
              tags: ["embaixador global lovable", "ceo naches", "construindo ao vivo"],
              accent: "#f756a6",
              initials: "fz",
            },
            {
              key: "economia-circular" as EletivaKey,
              eletivaLabel: "economia circular",
              nick: "dudu",
              nome: "Eduardo Obregon",
              tagline: "empreendedorismo & aprendizagem",
              quote:
                "ajudo gente e empresa a voar mais alto. carreira em três frentes: empreender, facilitar aprendizagem e mentorar.",
              bio: "ex-perestroika, ex-500 global, hoje sócio as a service. mistura bagagem de empreendedor com olhar clínico pra metodologia de aprendizagem.",
              tags: ["ex-perestroika", "ex-500 global", "sócio as a service", "stanford"],
              accent: "#6f77fc",
              initials: "do",
            },
          ].map((f, i) => (
            <motion.article
              key={f.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-7 sm:p-9 flex flex-col"
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundColor: f.accent }}
                aria-hidden="true"
              />
              <div className="flex items-start gap-5 mb-6">
                <div
                  className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-display text-3xl sm:text-4xl uppercase"
                  style={{ backgroundColor: f.accent, color: "#f2e4d8" }}
                  aria-hidden="true"
                >
                  {f.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55 mb-1">
                    facilitador · {f.eletivaLabel}
                  </p>
                  <h3 className="font-display uppercase text-3xl sm:text-4xl leading-none">
                    {f.nick}
                  </h3>
                  <p className="font-body text-sm text-perestroika-preto/60 mt-1">
                    {f.nome}
                  </p>
                  <p className="font-body text-xs uppercase tracking-[0.15em] text-perestroika-preto/70 mt-2">
                    {f.tagline}
                  </p>
                </div>
              </div>
              <p
                className="font-body italic text-base sm:text-lg text-perestroika-preto/85 leading-relaxed border-l-2 pl-4 mb-5"
                style={{ borderColor: `${f.accent}66` }}
              >
                "{f.quote}"
              </p>
              <p className="font-body text-sm sm:text-base text-perestroika-preto/75 leading-relaxed mb-5">
                {f.bio}
              </p>
              <div className="flex flex-wrap gap-2 mb-7">
                {f.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-body text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border"
                    style={{
                      borderColor: `${f.accent}55`,
                      color: "#090909",
                      backgroundColor: `${f.accent}1a`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="#trilhas"
                onClick={(ev) => {
                  setActiveTab(f.key);
                  handleAnchorClick(ev, "trilhas");
                }}
                className="mt-auto inline-flex items-center gap-2 font-body text-sm uppercase tracking-wide self-start hover:opacity-70 transition-opacity"
                style={{ color: f.accent }}
              >
                ver trilhas de {f.eletivaLabel} <ArrowRight className="h-4 w-4" />
              </a>
            </motion.article>
          ))}
        </div>
      </section>

      {/* tutor joão-de-barro */}
      <section className="relative bg-perestroika-preto text-perestroika-bege py-20 sm:py-28 overflow-hidden">
        <div className="container relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto md:mx-0 w-44 sm:w-56 md:w-64"
          >
            <img
              src={joaoTutor}
              alt="joão-de-barro tutor da eletiva"
              className="w-full h-auto"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center md:text-left"
          >
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-bege/60 mb-4">
              quem te acompanha
            </p>
            <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
              <span className="block">cada eletiva</span>
              <span className="block">tem seu tutor.</span>
            </h2>
            <p className="mt-6 max-w-lg font-body text-base sm:text-lg text-perestroika-bege/80 mx-auto md:mx-0">
              o joão te acompanha nas duas. com ia da naches por trás, ele muda de tom: provocador-builder na ia na prática, investigativo-sistêmico na economia circular.
            </p>
          </motion.div>
        </div>
      </section>

      {/* trilhas com tabs */}
      <section id="trilhas" className="container py-20 sm:py-28 scroll-mt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-10 sm:mb-12 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4 inline-flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: activeEletiva.accent }}
              aria-hidden="true"
            />
            trilhas de {activeEletiva.nome}
          </p>
          <h2 className="font-display uppercase display-clamp-section mb-4 leading-[0.95]">
            4 trilhas, 20 módulos, 1 projeto seu
          </h2>
          <p className="font-body text-base sm:text-lg text-perestroika-preto/75">
            cada módulo tem 50 minutos, sai um por semana. troque a eletiva no topo pra ver as trilhas da outra.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
          >
            {activeEletiva.trilhas.map((t, i) => (
              <motion.article
                key={`${activeTab}-${t.n}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                className="relative overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-7 sm:p-8 hover:border-perestroika-preto transition-colors"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: t.color }}
                  aria-hidden="true"
                />
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <span
                    className="font-display text-6xl sm:text-7xl leading-none"
                    style={{ color: t.color }}
                  >
                    {t.n}
                  </span>
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-perestroika-preto/55 inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {t.range}
                  </span>
                </div>
                <h3 className="font-display uppercase text-2xl sm:text-3xl mb-3 leading-tight">
                  {t.titulo}
                </h3>
                <p className="font-body text-base text-perestroika-preto/75 leading-relaxed">
                  {t.desc}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* manifesto */}
      <section className="relative container py-24 sm:py-36 border-t border-perestroika-preto/10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-3xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            o jeito da escola
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            aprender fazendo,<br />criar pra valer.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            você não precisa saber tudo antes de começar. ao longo do ano, semana a semana, você vai construindo o seu projeto e aprendendo na prática. é assim que a eletiva funciona.
          </p>
        </motion.div>
      </section>

      {/* cta final */}
      <section className="relative bg-gradient-screen py-24 sm:py-36 overflow-hidden">
        <div className="container flex flex-col items-center text-center gap-8 sm:gap-10">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display uppercase display-clamp-hero leading-[0.95] max-w-3xl"
          >
            bora construir {activeEletiva.nome}?
          </motion.h2>

          <motion.div
            key={`cta-${activeTab}`}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full text-perestroika-bege px-10 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
              style={{ backgroundColor: activeEletiva.accent }}
            >
              entrar em {activeEletiva.nome} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <p className="font-body text-xs sm:text-sm text-perestroika-preto/60 max-w-md">
            já é {activeEletiva.professor}? o login reconhece sua matrícula e te leva direto pra trilha certa.
          </p>
        </div>
      </section>

      <footer className="container py-10 text-center">
        <p className="font-body text-xs text-perestroika-preto/55">
          nachesu · uma plataforma naches · em parceria com escola sebrae
        </p>
      </footer>
    </div>
  );
};

export default Index;
