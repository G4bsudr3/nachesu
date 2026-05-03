import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
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

const Index = () => {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EletivaKey>("ia-na-pratica");

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

  const activeEletiva = eletivas[activeTab];

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      {/* topbar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="container flex items-center justify-between pt-8 pb-4"
      >
        <ChoraLogo variant="dark" />
        <nav className="flex items-center gap-5 sm:gap-7">
          <a
            href="#eletivas"
            className="hidden sm:inline font-body text-sm sm:text-base uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            eletivas
          </a>
          <a
            href="#trilhas"
            className="hidden sm:inline font-body text-sm sm:text-base uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            trilhas
          </a>
          <Link
            to="/auth"
            className="font-body text-sm sm:text-base uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            entrar
          </Link>
        </nav>
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
            className="font-body text-xs sm:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6"
          >
            hub das eletivas · escola sebrae · 1º ano em
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="font-display uppercase display-clamp-hero"
          >
            <span className="block">duas eletivas.</span>
            <span className="block">um hub só.</span>
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/80"
          >
            ia na prática com frattz, economia circular com dudu. dois caminhos, mesmo método: 20 semanas, tutor ia do lado e um projeto seu no ar no fim.
          </motion.p>

          <motion.div variants={heroItem} className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              entrar na minha eletiva <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#eletivas"
              className="inline-flex items-center min-h-11 px-1 font-body text-sm sm:text-base uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors underline-offset-4 hover:underline rounded"
            >
              conhecer as duas ↓
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* as duas eletivas */}
      <section id="eletivas" className="container py-20 sm:py-28 border-t border-perestroika-preto/10 scroll-mt-8">
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
      <section id="trilhas" className="container py-20 sm:py-28 scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-10 sm:mb-12 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            como cada eletiva é feita
          </p>
          <h2 className="font-display uppercase display-clamp-section mb-4 leading-[0.95]">
            4 trilhas, 20 módulos, 1 projeto seu
          </h2>
          <p className="font-body text-base sm:text-lg text-perestroika-preto/75">
            cada módulo tem 50 minutos, sai um por semana. troque entre as eletivas pra ver as trilhas de cada uma.
          </p>
        </motion.div>

        {/* tabs */}
        <div className="mb-10 sm:mb-12 inline-flex rounded-full border-2 border-perestroika-preto/15 bg-perestroika-bege p-1 relative">
          {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="relative z-10 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full font-body text-xs sm:text-sm uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                style={{ color: isActive ? "#f2e4d8" : undefined }}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-full bg-perestroika-preto -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{eletivas[key].nome}</span>
              </button>
            );
          })}
        </div>

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
            bora construir?
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-10 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              entrar na eletiva <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <p className="font-body text-xs sm:text-sm text-perestroika-preto/60 max-w-md">
            o login te leva direto pra eletiva em que você está matriculado.
          </p>
        </div>
      </section>

      <footer className="container py-10 text-center">
        <p className="font-body text-xs text-perestroika-preto/55">
          eletivas escola sebrae · 1º ano em · construído com lovable
        </p>
      </footer>
    </div>
  );
};

export default Index;
