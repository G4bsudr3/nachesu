import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { EletivaLogo } from "@/components/brand/EletivaLogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

type EletivaKey = "ia-na-pratica" | "economia-circular";

const eletivas: Record<
  EletivaKey,
  {
    n: string;
    nome: string;
    professor: string;
    pitch: string;
    descLonga: string;
    accent: string;
    tag: string;
    trilhas: { n: string; titulo: string; desc: string; color: string; range: string }[];
  }
> = {
  "ia-na-pratica": {
    n: "01",
    nome: "ia na prática",
    professor: "com frattz",
    pitch: "construa seu primeiro app com ia, do problema ao mvp no ar.",
    descLonga:
      "20 módulos curtos pra você sair da ideia ao app no ar, com o tutor ia te provocando do seu lado.",
    accent: "#f756a6",
    tag: "4 trilhas · 20 módulos · tutor ia",
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
    descLonga:
      "20 semanas pra enxergar fluxos, mapear ciclos e prototipar negócios regenerativos usando a escola sebrae bh como laboratório vivo.",
    accent: "#6f77fc",
    tag: "4 trilhas · 20 módulos · pbl real",
    trilhas: [
      { n: "01", titulo: "enxergar", desc: "abrir o olho pro sistema. ver fluxos, resíduos e oportunidades onde os outros veem rotina.", color: "#fe7b02", range: "módulos 1-5" },
      { n: "02", titulo: "entender", desc: "mapear causas, atores e ciclos. desenhar o sistema antes de propor solução.", color: "#fd4644", range: "módulos 6-10" },
      { n: "03", titulo: "criar", desc: "ideação guiada, proposta de valor regenerativa, protótipo tangível pra mostrar pra alguém.", color: "#f756a6", range: "módulos 11-15" },
      { n: "04", titulo: "validar", desc: "testa com gente real, mede impacto, ajusta o modelo. dossiê final pronto.", color: "#6f77fc", range: "módulos 16-20" },
    ],
  },
};

const Eletivas = () => {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;
    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("error") || hashParams.get("error_code")) {
      navigate(`/auth#${hash}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      {/* topbar */}
      <header className="container flex items-center justify-between pt-8 pb-4">
        <EletivaLogo variant="dark" />
        <nav className="flex items-center gap-5 sm:gap-7">
          <Link
            to="/auth"
            className="font-body text-sm sm:text-base uppercase tracking-wide hover:opacity-60 transition-opacity"
          >
            entrar
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="container relative pt-10 pb-14 sm:pt-16 sm:pb-20">
        <motion.div
          className="absolute right-2 top-0 sm:right-12 sm:top-6 pointer-events-none z-0"
          animate={prefersReducedMotion ? undefined : { rotate: [8, 14, 8] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <span className="block sm:hidden">
            <EletivaSymbol size={88} rotate={6} pose="thinking" />
          </span>
          <span className="hidden sm:block">
            <EletivaSymbol size={140} rotate={6} pose="thinking" />
          </span>
        </motion.div>

        <div className="max-w-3xl relative z-10">
          <p className="font-body text-xs sm:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6">
            escolha sua eletiva
          </p>
          <h1 className="font-display uppercase display-clamp-hero">
            <span className="block">duas portas.</span>
            <span className="block">qual é a sua?</span>
          </h1>
          <p className="mt-8 max-w-xl font-body text-lg sm:text-xl text-perestroika-preto/80">
            cada eletiva tem 4 trilhas e 20 módulos. mesmo método, recortes diferentes. escolha por onde começar.
          </p>
        </div>
      </section>

      {/* cards das eletivas */}
      <section className="container pb-24 sm:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {(Object.keys(eletivas) as EletivaKey[]).map((key, i) => {
            const e = eletivas[key];
            return (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-perestroika-preto bg-perestroika-bege"
              >
                {/* header do card: número + tag */}
                <div
                  className="flex items-center justify-between gap-4 border-b-2 border-perestroika-preto px-6 py-4 sm:px-8 sm:py-5"
                  style={{ backgroundColor: `${e.accent}10` }}
                >
                  <span
                    className="font-display text-4xl sm:text-5xl leading-none"
                    style={{ color: e.accent }}
                  >
                    {e.n}
                  </span>
                  <span className="font-body text-[10px] sm:text-xs uppercase tracking-[0.2em] text-perestroika-preto/70 text-right">
                    {e.tag}
                  </span>
                </div>

                {/* corpo do card */}
                <div className="flex flex-col flex-1 p-6 sm:p-8">
                  {/* professor */}
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-4">
                    {e.professor}
                  </p>

                  {/* título */}
                  <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-4">
                    {e.nome}
                  </h2>

                  {/* pitch */}
                  <p className="font-body text-base sm:text-lg text-perestroika-preto/90 leading-snug mb-3">
                    {e.pitch}
                  </p>

                  {/* descrição longa */}
                  <p className="font-body text-sm text-perestroika-preto/65 leading-relaxed mb-6">
                    {e.descLonga}
                  </p>

                  {/* trilhas */}
                  <div className="rounded-xl border border-perestroika-preto/10 bg-perestroika-preto/[0.02] p-4 mb-6">
                    <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50 mb-3">
                      o que você vai percorrer
                    </p>
                    <ul className="space-y-2.5">
                      {e.trilhas.map((t) => (
                        <li
                          key={t.n}
                          className="flex items-start gap-3 font-body text-sm text-perestroika-preto/85"
                        >
                          <span
                            className="font-display text-lg leading-none pt-0.5 shrink-0"
                            style={{ color: t.color }}
                          >
                            {t.n}
                          </span>
                          <span className="flex-1 leading-snug">
                            <span className="font-semibold">{t.titulo}</span>
                            <span className="text-perestroika-preto/55"> · {t.range}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* cta */}
                  <div className="mt-auto pt-2">
                    <Link
                      to={`/app/trilhas?eletiva=${key}`}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-12 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide text-perestroika-bege hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                      style={{ backgroundColor: e.accent }}
                    >
                      entrar nas trilhas <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Eletivas;
