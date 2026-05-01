import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Rocket, Camera, MessageCircle, FolderOpen, Sparkles } from "lucide-react";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { EstrelaPerestroika } from "@/components/brand/EstrelaPerestroika";
import { BalaoSerrado } from "@/components/brand/BalaoSerrado";

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const continuar = [
  {
    n: "01",
    titulo: "veja os projetos publicados",
    desc: "tudo que a turma construiu nos dois dias tá no hub. entra, explora, comenta, deixa um joinha pra quem te inspirou.",
  },
  {
    n: "02",
    titulo: "pergunta pro chŏra bot",
    desc: "uma IA treinada com as aulas, os projetos, os materiais e o histórico da turma. tira dúvida técnica, relembra um conceito, pede pra ele te explicar teu arquétipo de novo.",
  },
  {
    n: "03",
    titulo: "revive o evento pelas fotos",
    desc: "o álbum oficial tá no ar com os melhores momentos. baixa, compartilha, marca a galera.",
  },
  {
    n: "04",
    titulo: "continue construindo",
    desc: "apresentações, materiais de apoio e gravações ficam disponíveis pra você revisitar quando quiser. a imersão acabou, a jornada não.",
  },
];

const espacos = [
  { icon: FolderOpen, titulo: "projetos da turma", desc: "todos os builds publicados, prontos pra você explorar." },
  { icon: Sparkles, titulo: "chŏra bot", desc: "a IA do evento, pronta pra conversar quando bater dúvida ou saudade." },
  { icon: MessageCircle, titulo: "comentários e trocas", desc: "interage com os projetos, deixa feedback, puxa papo." },
  { icon: Camera, titulo: "álbum do evento", desc: "fotos oficiais dos dois dias no Caldeira." },
  { icon: Rocket, titulo: "materiais de apoio", desc: "slides, gravações e tudo que rolou nas aulas." },
];

const botPrompts = [
  "como faço deploy de uma edge function?",
  "me explica meu arquétipo de novo",
  "qual projeto da turma usou realtime?",
];

const scrollToContinuar = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById("continuar")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Index = () => {
  const prefersReducedMotion = useReducedMotion();
  const manifestoRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  // Se o link mágico cair na home com erro no hash (ex: link queimado/expirado),
  // redireciona pra /auth preservando os params pra mostrar toast claro lá.
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

  const { scrollYProgress: manifestoProgress } = useScroll({
    target: manifestoRef,
    offset: ["start end", "end start"],
  });
  const estrelaY = useTransform(manifestoProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-80, 80]);
  const estrelaRotate = useTransform(manifestoProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-15, 15]);

  const { scrollYProgress: pageProgress } = useScroll();
  const lagrimaY = useTransform(pageProgress, [0, 0.3], prefersReducedMotion ? [0, 0] : [0, 120]);

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
            entrar no hub
          </Link>
        </nav>
      </motion.header>

      {/* hero — pós-evento */}
      <section className="container relative pt-12 pb-24 sm:pt-20 sm:pb-32">
        <motion.div
          style={{ y: lagrimaY }}
          className="absolute right-4 top-0 sm:right-12 sm:top-8 pointer-events-none z-0"
          animate={prefersReducedMotion ? undefined : { rotate: [10, 16, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="block sm:hidden">
            <LagrimaGradient size={80} rotate={12} />
          </span>
          <span className="hidden sm:block">
            <LagrimaGradient size={120} rotate={12} />
          </span>
        </motion.div>

        <motion.div variants={heroContainer} initial="hidden" animate="show" className="max-w-3xl relative z-10">
          <motion.p
            variants={heroItem}
            className="font-body text-xs sm:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6"
          >
            chŏra lovable 2026 · aconteceu · 25 e 26 de abril, poa
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="font-display uppercase display-clamp-hero"
          >
            <span className="block">a imersão acabou.</span>
            <span className="block">o hub continua.</span>
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/80"
          >
            dois dias intensos no caldeira, dezenas de projetos no ar e uma turma que não vai mais te deixar construir sozinho. agora é hora de revisitar, comentar e continuar.
          </motion.p>

          <motion.p
            variants={heroItem}
            className="mt-5 max-w-xl font-body text-base sm:text-lg text-perestroika-preto/70"
          >
            e tem uma novidade: o <strong className="font-semibold text-perestroika-preto">chŏra bot</strong> tá no ar, treinado com tudo que rolou nos dois dias. pergunta o que quiser.
          </motion.p>

          <motion.div variants={heroItem} className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              voltar pro meu hub
            </Link>
            <Link
              to="/auth?next=/app/chora-bot"
              className="inline-flex items-center justify-center min-h-12 rounded-full border-2 border-perestroika-preto text-perestroika-preto px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:bg-perestroika-preto hover:text-perestroika-bege active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              conversar com o chŏra bot
            </Link>
            <a
              href="#continuar"
              onClick={scrollToContinuar}
              className="inline-flex items-center min-h-11 px-1 font-body text-sm sm:text-base uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
            >
              ver mais ↓
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* o que continuar fazendo */}
      <section id="continuar" className="container py-20 sm:py-28 border-t border-perestroika-preto/10 scroll-mt-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            o que fazer agora
          </p>
          <h2 className="font-display uppercase display-clamp-section">
            a imersão virou plataforma
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {continuar.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={prefersReducedMotion ? undefined : { y: -6 }}
              className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-8 hover:border-perestroika-preto transition-colors"
            >
              <div className="font-display text-6xl sm:text-7xl text-perestroika-preto leading-none mb-6">
                {p.n}
              </div>
              <h3 className="font-display uppercase text-2xl sm:text-3xl mb-3">
                {p.titulo}
              </h3>
              <p className="font-body text-base text-perestroika-preto/75 leading-relaxed">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* o que tem no hub agora */}
      <section className="container py-20 sm:py-28 border-t border-perestroika-preto/10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            seu hub agora é o acervo
          </p>
          <h2 className="font-display uppercase display-clamp-section mb-4">
            tudo que rolou, num lugar só
          </h2>
          <p className="font-body text-base sm:text-lg text-perestroika-preto/75">
            cinco espaços pra você não perder nada da imersão.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {espacos.map((m, i) => (
            <motion.div
              key={m.titulo}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex items-start gap-5 p-6 rounded-xl bg-perestroika-preto/[0.03] hover:bg-perestroika-preto/[0.06] transition-colors"
            >
              <div className="shrink-0 w-12 h-12 rounded-full bg-perestroika-preto text-perestroika-bege flex items-center justify-center">
                <m.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display uppercase text-xl sm:text-2xl mb-1">
                  {m.titulo}
                </h3>
                <p className="font-body text-sm sm:text-base text-perestroika-preto/75">
                  {m.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* chŏra bot — convite */}
      <section className="relative bg-perestroika-preto text-perestroika-bege py-24 sm:py-32 overflow-hidden">
        <div
          className="absolute -right-10 top-10 sm:right-12 sm:top-16 opacity-90 pointer-events-none"
          aria-hidden="true"
        >
          <span className="block sm:hidden">
            <LagrimaGradient size={90} rotate={-18} />
          </span>
          <span className="hidden sm:block">
            <LagrimaGradient size={160} rotate={-18} />
          </span>
        </div>

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-bege/60 mb-4 inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              novidade pós-evento
            </p>
            <h2 className="font-display uppercase display-clamp-section">
              <span className="block">conversa com</span>
              <span className="block">a imersão inteira.</span>
            </h2>
            <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-bege/80">
              o chŏra bot leu tudo: as aulas, os projetos publicados, os materiais, as transcrições. pergunta em português, ele responde no tom da casa.
            </p>

            <div className="mt-10">
              <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-bege/50 mb-4">
                exemplos pra começar
              </p>
              <div className="flex flex-wrap gap-3">
                {botPrompts.map((q) => (
                  <Link
                    key={q}
                    to={`/auth?next=/app/chora-bot&prompt=${encodeURIComponent(q)}`}
                    aria-label={`abrir chŏra bot com a pergunta: ${q}`}
                    className="inline-flex items-center min-h-11 rounded-full border border-perestroika-bege/30 px-5 py-2.5 font-body text-sm sm:text-base text-perestroika-bege/90 hover:bg-perestroika-bege hover:text-perestroika-preto hover:border-perestroika-bege transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-bege focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-preto"
                  >
                    "{q}"
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to="/auth?next=/app/chora-bot"
                className="inline-flex items-center justify-center min-h-12 rounded-full bg-perestroika-bege text-perestroika-preto px-8 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-bege focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-preto"
              >
                abrir o chŏra bot →
              </Link>
              <p className="font-body text-xs sm:text-sm text-perestroika-bege/60 max-w-xs">
                precisa estar logado com o email do evento.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* manifesto */}
      <section ref={manifestoRef} className="relative container py-32 sm:py-48 border-t border-perestroika-preto/10">
        <motion.div
          style={{ y: estrelaY, rotate: estrelaRotate }}
          className="absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none"
        >
          <EstrelaPerestroika size={520} color="preta" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-4xl"
        >
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            nossa tese segue de pé
          </p>
          <h2 className="font-display uppercase display-clamp-section">
            ideia boa é
            <br />
            ideia construída
          </h2>
          <div className="mt-10 h-px w-24 bg-perestroika-preto/20" aria-hidden="true" />
          <p className="mt-10 font-display uppercase text-4xl sm:text-5xl text-perestroika-preto/85">
            itero, logo fica foda.
          </p>
          <p className="mt-6 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/75">
            o evento foi o pontapé. o que vem depois é com você. volta sempre que precisar de combustível.
          </p>
        </motion.div>
      </section>

      {/* cta final */}
      <section className="relative bg-gradient-screen py-28 sm:py-40 overflow-hidden">
        <div className="container flex flex-col items-center text-center gap-10">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-body text-base sm:text-lg text-perestroika-preto/80 max-w-xl"
          >
            bora continuar?
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.03, rotate: 1 }}
            className="w-full max-w-2xl"
          >
            <BalaoSerrado>vai lá e cria!</BalaoSerrado>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <Link
              to="/auth"
              className="inline-flex items-center justify-center min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-10 py-4 font-body font-medium text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              voltar pro meu hub
            </Link>
            <Link
              to="/auth?next=/app/chora-bot"
              className="inline-flex items-center font-body text-sm sm:text-base text-perestroika-preto/70 hover:text-perestroika-preto underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
            >
              ou puxa papo com o chŏra bot →
            </Link>
            <p className="font-body text-xs sm:text-sm text-perestroika-preto/60 max-w-sm">
              entra com o mesmo email que você usou no evento.
            </p>
          </motion.div>
        </div>
      </section>

      <footer className="container py-10">
        <p className="font-body text-xs sm:text-sm text-perestroika-preto/60 text-center">
          chŏra lovable 2026 · co-produzido por perestroika + frattz
        </p>
      </footer>
    </div>
  );
};

export default Index;
