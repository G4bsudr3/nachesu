import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, Linkedin, Calendar, Sparkles, Rocket, Menu, X } from "lucide-react";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import joaoTutor from "@/assets/joao-de-barro-tutor.png";
const frattzPhoto = "/__l5e/assets-v1/879997e7-97df-4ee0-b10d-69dac45457fa/frattz.png";
const duduPhoto = "/__l5e/assets-v1/645ee65a-208b-4f4e-9a28-e2481ae26d97/dudu.png";

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
      { n: "01", titulo: "fundamentos & ia", desc: "o que ia faz hoje, como conversar com ela, quando usar no-code.", color: "#fe7b02", range: "módulos 1-5" },
      { n: "02", titulo: "problema & decisão", desc: "achar uma dor real, escolher a sua, escopar e vender em 60 segundos.", color: "#fd4644", range: "módulos 6-10" },
      { n: "03", titulo: "construção no lovable", desc: "do briefing ao mvp, ux que faz sentido, ia dentro do seu app.", color: "#f756a6", range: "módulos 11-15" },
      { n: "04", titulo: "validação & evolução", desc: "testa com gente real, itera com base no feedback, entrega.", color: "#6f77fc", range: "módulos 16-20" },
    ],
  },
  "economia-circular": {
    n: "02",
    nome: "economia circular",
    professor: "com dudu",
    pitch: "desenhe um negócio que regenera, do sistema ao protótipo validado.",
    accent: "#6f77fc",
    trilhas: [
      { n: "01", titulo: "enxergar", desc: "abrir o olho pro sistema. ver fluxos, resíduos e oportunidades onde os outros veem rotina.", color: "#fe7b02", range: "módulos 1-5" },
      { n: "02", titulo: "entender", desc: "mapear causas, atores e ciclos. desenhar o sistema antes de propor solução.", color: "#fd4644", range: "módulos 6-10" },
      { n: "03", titulo: "criar", desc: "prototipar negócios regenerativos, com ia te ajudando a iterar rápido.", color: "#f756a6", range: "módulos 11-15" },
      { n: "04", titulo: "validar", desc: "testa com gente real, mede impacto, ajusta o modelo. dossiê final pronto.", color: "#6f77fc", range: "módulos 16-20" },
    ],
  },
};

const facilitadores: Record<EletivaKey, { nick: string; nome: string; frase: string; photo: string; linkedin: string }> = {
  "ia-na-pratica": {
    nick: "frattz",
    nome: "Mateus Frattezi",
    frase: "constrói na frente da turma, com a turma decidindo o caminho.",
    photo: frattzPhoto,
    linkedin: "https://www.linkedin.com/in/frattin/",
  },
  "economia-circular": {
    nick: "dudu",
    nome: "Eduardo Obregon",
    frase: "ex-perestroika, ex-500 global. junta empreender com aprender.",
    photo: duduPhoto,
    linkedin: "https://www.linkedin.com/in/duduobregon/",
  },
};

const heroContainer = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } };
const heroItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const STORAGE_KEY = "home:eletiva-preferida";

const Index = () => {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EletivaKey>(() => {
    if (typeof window === "undefined") return "ia-na-pratica";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "economia-circular" || saved === "ia-na-pratica" ? saved : "ia-na-pratica";
  });

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("error") || hashParams.get("error_code")) {
      navigate(`/auth#${hash}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);
  useEffect(() => {
    const ids = ["como-funciona", "eletivas", "tutor", "trilhas", "faq"];
    const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setMenuOpen(false);
  };

  const navItems: { id: string; label: string }[] = [
    { id: "como-funciona", label: "como funciona" },
    { id: "eletivas", label: "eletivas" },
    { id: "tutor", label: "tutor" },
    { id: "faq", label: "faq" },
  ];

  const activeEletiva = eletivas[activeTab];

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      {/* topbar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-30 backdrop-blur-md bg-perestroika-bege/85"
      >
        <div className="container flex items-center justify-between gap-4 py-4">
          <NachesULogo variant="ink" />

          <nav className="flex items-center gap-5 lg:gap-6" aria-label="seções da página">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleAnchorClick(e, item.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`hidden relative font-body text-sm uppercase tracking-wide transition-opacity py-1 ${
                    isActive ? "opacity-100 text-perestroika-preto" : "opacity-70 hover:opacity-100"
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
              className="hidden sm:inline-flex items-center min-h-10 rounded-full bg-perestroika-preto text-perestroika-bege px-4 sm:px-5 py-2 font-body text-xs sm:text-sm uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
            >
              entrar
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "fechar menu" : "abrir menu"}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-perestroika-preto/20 text-perestroika-preto hover:bg-perestroika-preto/5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"

            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </nav>
        </div>

        {/* menu hamburguer mobile/tablet */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="lg:hidden border-t border-perestroika-preto/10 bg-perestroika-bege/95 backdrop-blur-md"
            >
              <nav aria-label="menu" className="container py-4 flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => handleAnchorClick(e, item.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex items-center justify-between min-h-12 px-3 rounded-xl font-display uppercase text-2xl tracking-wide transition-colors ${
                        isActive
                          ? "bg-perestroika-preto/5 text-perestroika-preto"
                          : "text-perestroika-preto/75 hover:bg-perestroika-preto/5 hover:text-perestroika-preto"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: activeEletiva.accent }}
                        />
                      )}
                    </a>
                  );
                })}
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="sm:hidden mt-3 inline-flex items-center justify-center min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-5 font-body text-sm uppercase tracking-wide"
                >
                  entrar
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
      {/* hero */}
      <section className="container relative pt-20 pb-20 sm:pt-24 sm:pb-28">
        <motion.div
          className="absolute right-4 top-3 sm:right-12 sm:top-6 pointer-events-none z-0 opacity-90 scale-x-[-1]"
          animate={prefersReducedMotion ? undefined : { rotate: [6, 12, 6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <span className="block sm:hidden">
            <EletivaSymbol size={64} rotate={0} pose="celebrating" />
          </span>
          <span className="hidden sm:block md:hidden">
            <EletivaSymbol size={112} rotate={6} pose="celebrating" />
          </span>
          <span className="hidden md:block">
            <EletivaSymbol size={160} rotate={6} pose="celebrating" />
          </span>
        </motion.div>


        <motion.div variants={heroContainer} initial="hidden" animate="show" className="max-w-3xl relative z-10">
          <motion.p variants={heroItem} className="font-body text-xs font-medium uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6">
            uma plataforma naches · em parceria com escola sebrae
          </motion.p>
          <motion.h1 variants={heroItem} className="font-display uppercase display-clamp-hero">
            <span className="block">duas eletivas.</span>
            <span className="block">uma naches u.</span>
          </motion.h1>
          <motion.p variants={heroItem} className="mt-8 max-w-xl font-body font-normal text-lg sm:text-xl leading-relaxed text-perestroika-preto/75">
            o lugar onde você aprende construindo.&nbsp;<br />
            uma aula por semana, um tutor ia do seu lado e, no fim do ano, um projeto de verdade no ar.
          </motion.p>

          <motion.div variants={heroItem} className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <Link
              to="/comecar"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como-funciona"
              onClick={(ev) => handleAnchorClick(ev, "como-funciona")}
              className="inline-flex items-center min-h-11 px-1 font-body text-sm sm:text-base uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors underline-offset-4 hover:underline rounded"
            >
              como funciona ↓
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* o que é o nachesu */}
      <section
        id="como-funciona"
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
            o que é o nachesu
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            aqui você aprende<br />fazendo.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            esqueça aula longa e prova no fim.&nbsp;<br />
            toda semana você abre um módulo, faz uma coisinha e essa coisinha&nbsp;no fim do ano, vira um projeto seu pra mostrar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              step: "01",
              icon: Calendar,
              pose: "resting" as const,
              titulo: "no seu ritmo",
              desc: "1 aula por semana, 50 minutinhos. dá pra fazer no contraturno, sem sufoco.",
            },
            {
              step: "02",
              icon: Sparkles,
              pose: "talking" as const,
              titulo: "tutor ia 24/7",
              desc: "o joão (nosso tutor de ia) tá ali pra tirar dúvida, dar exemplo e te empurrar pra frente.",
            },
            {
              step: "03",
              icon: Rocket,
              pose: "celebrating" as const,
              titulo: "projeto de verdade",
              desc: "no fim do ano você sai com algo publicado. não é trabalho de escola. é portfólio.",
            },
          ].map((card, i) => (
            <motion.div
              key={card.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8"
            >
              {/* topo: passo + mascote */}
              <div className="flex items-start justify-between mb-4 sm:mb-5">
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl sm:text-4xl leading-none text-perestroika-preto/30">
                    {card.step}
                  </span>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-perestroika-preto text-perestroika-bege">
                    <card.icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>
                <EletivaSymbol size={52} pose={card.pose} rotate={-4} />
              </div>
              <h3 className="font-display uppercase text-3xl sm:text-3xl leading-[0.95] mb-2 sm:mb-3">
                {card.titulo}
              </h3>
              <p className="font-body text-[15px] sm:text-base text-perestroika-preto/75 leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* eletivas + facilitadores enxutos */}
      <section
        id="eletivas"
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
            escolha sua eletiva
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            duas portas,<br />um mesmo combinado.
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            mesma duração, mesmo método, mesmo tutor. o que muda é por onde você quer entrar e quem te conduz.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {(Object.keys(eletivas) as EletivaKey[]).map((key, i) => {
            const e = eletivas[key];
            const f = facilitadores[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-7 sm:p-9 flex flex-col"
              >
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: e.accent }} aria-hidden="true" />

                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <span className="font-display text-7xl sm:text-8xl leading-none" style={{ color: e.accent }}>
                    {e.n}
                  </span>
                  <span className="font-body text-xs uppercase tracking-[0.15em] text-perestroika-preto/55 inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    20 semanas
                  </span>
                </div>

                <h3 className="font-display uppercase text-3xl sm:text-4xl mb-4 leading-tight">
                  {e.nome}
                </h3>
                <p className="font-body text-base sm:text-lg text-perestroika-preto/75 leading-relaxed mb-6">
                  {e.pitch}
                </p>

                {/* bloco facilitador enxuto */}
                <div className="flex items-center gap-4 pt-5 mt-auto border-t border-perestroika-preto/10">
                  <img
                    src={f.photo}
                    alt={f.nome}
                    className="shrink-0 w-14 h-14 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 3px ${e.accent}33` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display uppercase text-xl leading-none">{f.nick}</p>
                      <a
                        href={f.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`linkedin de ${f.nick}`}
                        className="text-perestroika-preto/50 hover:text-perestroika-preto transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="font-body text-xs text-perestroika-preto/65 mt-1 leading-snug">
                      {f.frase}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <a
                    href="#trilhas"
                    onClick={(ev) => {
                      setActiveTab(key);
                      handleAnchorClick(ev, "trilhas");
                    }}
                    className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body text-xs sm:text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                  >
                    ver trilhas <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* tutor joão-de-barro com história */}
      <section
        id="tutor"
        className="relative bg-perestroika-preto text-perestroika-bege py-20 sm:py-28 overflow-hidden scroll-mt-32"
      >
        <div className="container relative grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto md:mx-0 w-44 sm:w-56 md:w-64"
          >
            <img src={joaoTutor} alt="joão-de-barro tutor da naches u" className="w-full h-auto rounded-3xl" loading="lazy" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center md:text-left"
          >
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-bege/60 mb-4">
              o tutor da escola
            </p>
            <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
              por que um<br />joão-de-barro?
            </h2>
            <div className="mt-6 max-w-xl space-y-4 font-body text-base sm:text-lg text-perestroika-bege/85 mx-auto md:mx-0">
              <p>
                o joão-de-barro é o pássaro construtor do brasil. ele pega barro, palha e paciência e levanta uma casa firme, pedaço por pedaço. ninguém ensinou. ele aprende fazendo, com o que tem na mão.
              </p>
              <p>
                é exatamente isso que a gente faz aqui. cada semana você coloca mais um tijolinho. no fim, você olha pra trás e tem uma obra sua.
              </p>
              <p className="text-perestroika-bege/70 text-sm sm:text-base">
                e tem mais: o joão é nosso tutor de ia. ele te acompanha nas duas eletivas, muda de tom em cada uma e tá disponível 24/7 pra te ajudar quando travar.
              </p>
            </div>
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
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            por dentro das trilhas
          </p>
          <h2 className="font-display uppercase display-clamp-section mb-6 leading-[0.95]">
            4 trilhas,<br />20 módulos,<br />1 projeto seu.
          </h2>
          <p className="font-body text-base sm:text-lg text-perestroika-preto/75 mb-6">
            cada eletiva tem 4 trilhas. cada trilha tem 5 módulos. cada módulo tem 50 minutos. troque ali embaixo pra ver a outra.
          </p>

          {/* tab inline simples */}
          <div
            role="tablist"
            aria-label="escolha sua eletiva"
            className="inline-flex rounded-full border-2 border-perestroika-preto/15 bg-perestroika-bege p-1"
          >
            {(Object.keys(eletivas) as EletivaKey[]).map((key) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(key)}
                  className="relative z-10 px-4 sm:px-5 py-2 rounded-full font-body text-xs sm:text-sm uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                  style={{ color: isActive ? "#f2e4d8" : undefined }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="trilhas-tab-bg"
                      className="absolute inset-0 rounded-full bg-perestroika-preto -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{eletivas[key].nome}</span>
                </button>
              );
            })}
          </div>
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
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: t.color }} aria-hidden="true" />
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <span className="font-display text-6xl sm:text-7xl leading-none" style={{ color: t.color }}>
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

      {/* faq */}
      <section
        id="faq"
        className="container py-20 sm:py-28 border-t border-perestroika-preto/10 scroll-mt-32"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-start"
        >
          <div className="md:sticky md:top-32">
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
              perguntas frequentes
            </p>
            <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
              tira a<br />dúvida.
            </h2>
            <p className="mt-6 font-body text-base sm:text-lg text-perestroika-preto/75 max-w-sm">
              o que mais perguntam por aqui. clica pra abrir.
            </p>
            <div className="mt-6 hidden md:block">
              <EletivaSymbol size={120} pose="thinking" rotate={-6} />
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "preciso saber programar pra entrar?",
                a: "não. a maioria dos estudantes começa do zero. a gente usa ferramentas de no-code e ia que fazem o trabalho pesado. você foca em pensar, decidir e construir.",
              },
              {
                q: "como funciona a aula na prática?",
                a: "toda semana abre 1 módulo novo, com 50 minutos no total. tem vídeo curto, exercício pra fazer ali na hora e o tutor ia te acompanhando. você faz no seu tempo, dentro da semana.",
              },
              {
                q: "quem é o joão e quando eu falo com ele?",
                a: "o joão é o tutor de ia da naches u, e ele tá disponível 24/7 dentro da plataforma. quando travar num exercício, quando quiser um exemplo, quando precisar de ideia, é só chamar. ele responde em segundos.",
              },
              {
                q: "o joão substitui o professor?",
                a: "não. o joão tira dúvida na hora, mas o frattz e o dudu conduzem a turma, dão feedback no que você entrega e aparecem em momentos ao vivo. um não tira o outro.",
              },
              {
                q: "o que eu entrego no fim do ano?",
                a: "um projeto seu de verdade, publicado e funcionando. na ia na prática é um app no ar resolvendo uma dor. na economia circular é um modelo de negócio regenerativo com protótipo e validação.",
              },
              {
                q: "e se eu perder uma semana?",
                a: "tranquilo. o conteúdo fica disponível pra você recuperar quando der. só não deixa acumular muito, senão o projeto final fica apertado no fim.",
              },
              {
                q: "posso fazer as duas eletivas?",
                a: "no momento você escolhe uma por vez. quando matricular, foca naquela. a outra continua ali, esperando.",
              },
              {
                q: "tenho que ter computador?",
                a: "ajuda bastante, principalmente na ia na prática (você vai construir um app). dá pra fazer parte das coisas no celular, mas pros módulos de construção um computador faz diferença.",
              },
            ].map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`faq-${i}`}
                className="border-b border-perestroika-preto/15 last:border-b-0"
              >
                <AccordionTrigger className="font-display uppercase text-left text-xl sm:text-2xl leading-tight tracking-wide hover:no-underline py-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="font-body text-base text-perestroika-preto/75 leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
            bora colocar<br />o primeiro tijolo?
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/comecar"
              className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-10 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              começar agora <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <p className="font-body text-xs sm:text-sm text-perestroika-preto/60 max-w-md">
            já tem matrícula?{" "}
            <Link to="/auth" className="underline underline-offset-4 hover:text-perestroika-preto">
              entrar direto
            </Link>
          </p>
        </div>
      </section>
      </main>

      <footer className="container py-10">
        <EletivaFooter />
      </footer>
    </div>
  );
};

export default Index;
