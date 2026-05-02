import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { EletivaStar } from "@/components/brand/EletivaStar";
import joaoTutor from "@/assets/joao-de-barro-tutor.png";

const trilhas = [
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
    desc: "achar uma dor real, escolher a tua, escopar e vender em 60 segundos.",
    color: "#fd4644",
    range: "módulos 6-10",
  },
  {
    n: "03",
    titulo: "construção no lovable",
    desc: "do briefing ao mvp, ux que faz sentido, ia dentro do teu app.",
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
];

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
        <nav>
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
            <EletivaSymbol size={84} rotate={12} />
          </span>
          <span className="hidden sm:block">
            <EletivaSymbol size={140} rotate={12} />
          </span>
        </motion.div>

        <motion.div variants={heroContainer} initial="hidden" animate="show" className="max-w-3xl relative z-10">
          <motion.p
            variants={heroItem}
            className="font-body text-xs sm:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6"
          >
            eletiva · escola do sebrae · 1º ano em
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="font-display uppercase display-clamp-hero"
          >
            <span className="block">ia na prática.</span>
            <span className="block">teu primeiro app.</span>
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/80"
          >
            uma eletiva de 20 semanas pra você sair daqui com um app de verdade, no ar, resolvendo um problema que importa pra você.
          </motion.p>

          <motion.p
            variants={heroItem}
            className="mt-5 max-w-xl font-body text-base sm:text-lg text-perestroika-preto/70"
          >
            sem precisar saber programar. usando ia o tempo todo. construindo no lovable.
          </motion.p>

          <motion.div variants={heroItem} className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#trilhas"
              className="inline-flex items-center min-h-11 px-1 font-body text-sm sm:text-base uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors underline-offset-4 hover:underline rounded"
            >
              ver as trilhas ↓
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* tese */}
      <section className="container py-16 sm:py-24 border-t border-perestroika-preto/10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            a ideia é simples
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            ideia boa é<br />ideia construída.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            durante 20 semanas você escolhe um problema seu, da tua escola, da tua cidade, da tua vida, e constrói um app pra resolver. com ia, com o lovable, e com o joão-de-barro do teu lado.
          </p>
        </motion.div>
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
              <span className="block">esse é o joão.</span>
              <span className="block">teu tutor de ia.</span>
            </h2>
            <p className="mt-6 max-w-lg font-body text-base sm:text-lg text-perestroika-bege/80 mx-auto md:mx-0">
              ele tira dúvida quando você empaca, dá ideia quando você trava, e provoca quando você tá no piloto automático. respondendo no teu ritmo, em português.
            </p>
          </motion.div>
        </div>
      </section>

      {/* trilhas */}
      <section id="trilhas" className="container py-20 sm:py-28 scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            como a eletiva é feita
          </p>
          <h2 className="font-display uppercase display-clamp-section mb-4 leading-[0.95]">
            4 trilhas, 20 módulos, 1 projeto seu
          </h2>
          <p className="font-body text-base sm:text-lg text-perestroika-preto/75">
            cada módulo tem 50 minutos, sai um por semana. no fim, teu app no ar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {trilhas.map((t, i) => (
            <motion.article
              key={t.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
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
        </div>
      </section>

      {/* manifesto */}
      <section className="relative container py-24 sm:py-36 border-t border-perestroika-preto/10">
        <div
          className="absolute -right-16 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none"
          aria-hidden="true"
        >
          <EletivaStar size={420} color="preta" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-3xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            o combinado
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            penso, logo crio.<br />itero, logo fica foda.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            você não precisa saber tudo antes de começar. precisa começar e ir aprendendo enquanto constrói. a eletiva é exatamente esse caminho.
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
            já tem conta? o login te leva direto pra tua trilha.
          </p>
        </div>
      </section>

      <footer className="container py-10 text-center">
        <p className="font-body text-xs text-perestroika-preto/55">
          eletiva ia na prática · escola do sebrae · construído com lovable
        </p>
      </footer>
    </div>
  );
};

export default Index;
