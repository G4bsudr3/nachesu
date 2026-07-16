import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, ShieldCheck, Clock } from "lucide-react";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

const beneficios = [
  {
    pose: "building" as const,
    titulo: "tudo num lugar só",
    desc: "suas aulas, exercícios, projeto e o tutor ia vivem dentro da naches u. sem caderno solto, sem pasta perdida.",
  },
  {
    pose: "talking" as const,
    titulo: "tutor ia 24/7",
    desc: "o joão te responde em segundos, com exemplo, dica e empurrãozinho. nunca trava o aluno sozinho.",
  },
  {
    pose: "celebrating" as const,
    titulo: "projeto seu publicado",
    desc: "no fim do ano você sai com algo de verdade no ar. portfólio que dá pra mostrar pra família, faculdade, trampo.",
  },
];

const passos = [
  { n: "01", titulo: "criar acesso", desc: "rapidinho, com seu e-mail." },
  { n: "02", titulo: "escolher eletiva", desc: "ia na prática ou economia circular." },
  { n: "03", titulo: "abrir o módulo 1", desc: "50 minutos e você já começou." },
];

const Comecar = () => {
  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-perestroika-bege/85 border-b border-perestroika-preto/10">
        <div className="container flex items-center justify-between gap-4 py-4">
          <Link to="/" aria-label="voltar pra home">
            <NachesULogo variant="dark" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 font-body text-xs sm:text-sm uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto transition-colors"
          >
            entrar
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="container relative pt-12 pb-12 sm:pt-20 sm:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-2 top-2 sm:right-12 sm:top-6 pointer-events-none"
          aria-hidden="true"
        >
          <span className="block sm:hidden">
            <EletivaSymbol size={88} pose="peeking" rotate={-4} />
          </span>
          <span className="hidden sm:block">
            <EletivaSymbol size={140} pose="peeking" rotate={-4} />
          </span>
        </motion.div>

        <div className="max-w-3xl relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-body text-xs sm:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6"
          >
            tá quase lá
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display uppercase display-clamp-hero leading-[0.95]"
          >
            <span className="block">antes de entrar,</span>
            <span className="block">o que te espera.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/80"
          >
            criar seu acesso leva 1 minuto. antes disso, dá uma olhada no que você ganha e em como começa.
          </motion.p>
        </div>
      </section>

      {/* benefícios */}
      <section className="container py-12 sm:py-16 border-t border-perestroika-preto/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {beneficios.map((b, i) => (
            <motion.article
              key={b.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-6 sm:p-8"
            >
              <div className="mb-4">
                <EletivaSymbol size={64} pose={b.pose} rotate={-3} />
              </div>
              <h3 className="font-display uppercase text-2xl sm:text-3xl leading-[0.95] mb-2">
                {b.titulo}
              </h3>
              <p className="font-body text-[15px] sm:text-base text-perestroika-preto/75 leading-relaxed">
                {b.desc}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* próximo passo */}
      <section className="container py-16 sm:py-24 border-t border-perestroika-preto/10">
        <div className="max-w-2xl mb-10">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
            o que acontece agora
          </p>
          <h2 className="font-display uppercase display-clamp-section leading-[0.95]">
            3 passos.<br />nada complicado.
          </h2>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {passos.map((p, i) => (
            <motion.li
              key={p.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="relative rounded-2xl bg-perestroika-preto/[0.04] p-6 sm:p-7"
            >
              <span className="font-display text-5xl sm:text-6xl leading-none text-perestroika-preto/25">
                {p.n}
              </span>
              <h3 className="mt-3 font-display uppercase text-xl sm:text-2xl leading-tight">
                {p.titulo}
              </h3>
              <p className="mt-1 font-body text-sm text-perestroika-preto/70 leading-relaxed">
                {p.desc}
              </p>
            </motion.li>
          ))}
        </ol>

        {/* selos rápidos */}
        <div className="mt-10 flex flex-col items-center sm:flex-row sm:flex-wrap justify-center gap-x-6 gap-y-3 text-xs sm:text-sm text-perestroika-preto/65">
          <span className="inline-flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> leva 1 minuto
          </span>
          <span className="inline-flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> só precisa do seu e-mail
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> seus dados ficam com você
          </span>
        </div>
      </section>

      {/* cta final */}
      <section className="relative bg-gradient-screen py-20 sm:py-28">
        <div className="container flex flex-col items-center text-center gap-7">
          <h2 className="font-display uppercase display-clamp-section leading-[0.95] max-w-2xl">
            bora colocar<br />o primeiro tijolo?
          </h2>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 min-h-12 rounded-full bg-perestroika-preto text-perestroika-bege px-10 py-4 font-body font-medium text-sm sm:text-base uppercase tracking-wide hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          >
            criar meu acesso <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="font-body text-xs sm:text-sm text-perestroika-preto/65">
            já tem matrícula?{" "}
            <Link to="/auth" className="underline underline-offset-4 hover:text-perestroika-preto">
              entrar
            </Link>
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

export default Comecar;
