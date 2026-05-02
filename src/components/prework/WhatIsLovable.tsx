import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BuilderLevel } from "@/lib/builderLevel";
import { isNovice } from "@/lib/builderLevel";

interface WhatIsLovableProps {
  level: BuilderLevel;
}

const STEPS = [
  { n: "01", t: "você descreve", d: "em português, conta o que quer criar." },
  { n: "02", t: "a ia constrói", d: "código real, não mockup. roda mesmo." },
  { n: "03", t: "app pronto", d: "funciona no celular e no computador." },
];

const FEATURES = [
  { t: "vibe coding", d: "linguagem natural vira app funcional." },
  { t: "lovable cloud", d: "auth, banco, storage, edge functions sem dor." },
  { t: "ai gateway", d: "claude, gpt-5, gemini sem precisar de api key." },
  { t: "integrações nativas", d: "twilio, stripe, slack, notion, granola." },
];

const WORKS_GREAT = ["mvps validados em horas", "ferramentas internas", "landing pages", "dashboards", "protótipos clicáveis"];
const NOT_IDEAL = ["sistemas legados complexos", "mission-critical em escala absurda", "código que precisa de zero abstração"];

/**
 * card fixo de introdução ao lovable. expansível.
 * novato/iniciante: aberto por padrão. intermediário/avançado: fechado.
 */
export const WhatIsLovable = ({ level }: WhatIsLovableProps) => {
  const [open, setOpen] = useState(isNovice(level));

  return (
    <section className="rounded-3xl border border-perestroika-preto/15 bg-perestroika-preto/[0.04] backdrop-blur overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-5 sm:p-7 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-inset"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/55">degrau zero</p>
            <h2 className="font-display uppercase text-3xl sm:text-4xl leading-none mt-1">
              o que é o lovable
            </h2>
          </div>
        </div>
        <span className="shrink-0 font-body text-[11px] uppercase tracking-wide text-perestroika-preto/60 inline-flex items-center gap-1">
          {open ? "fechar" : isNovice(level) ? "ver mais" : "lembrar o básico"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="px-5 sm:px-7 pb-7 pt-1 flex flex-col gap-7">
          <p className="font-body text-base sm:text-lg text-perestroika-preto/85 max-w-2xl text-pretty">
            uma plataforma de vibe coding. você descreve, ela constrói. código real, não mockup. sem instalar nada, sem saber programar.
          </p>

          {/* como funciona */}
          <div>
            <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-3">
              como funciona
            </h3>
            <ol className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/70 p-4"
                >
                  <span className="font-display text-3xl text-perestroika-rosa leading-none">{s.n}</span>
                  <p className="mt-2 font-display uppercase text-xl leading-none">{s.t}</p>
                  <p className="mt-2 font-body text-sm text-perestroika-preto/70">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* features */}
          <div>
            <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60 mb-3">
              o que vem dentro
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li
                  key={f.t}
                  className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/70 p-4"
                >
                  <p className="font-display uppercase text-xl leading-none">{f.t}</p>
                  <p className="mt-1.5 font-body text-sm text-perestroika-preto/70">{f.d}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* onde faz sentido */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-perestroika-azul/30 bg-perestroika-azul/[0.08] p-4">
              <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/70 mb-2">
                onde brilha
              </h3>
              <ul className="flex flex-col gap-1.5">
                {WORKS_GREAT.map((w) => (
                  <li key={w} className="font-body text-sm text-perestroika-preto/85 flex gap-2">
                    <span className="text-perestroika-azul">→</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/50 p-4">
              <h3 className="font-body text-xs uppercase tracking-wide text-perestroika-preto/70 mb-2">
                ainda não é ideal pra
              </h3>
              <ul className="flex flex-col gap-1.5">
                {NOT_IDEAL.map((w) => (
                  <li key={w} className="font-body text-sm text-perestroika-preto/70 flex gap-2">
                    <span className="text-perestroika-preto/40">·</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* números */}
          <div className="rounded-2xl bg-perestroika-preto text-perestroika-bege p-5 flex flex-wrap items-baseline gap-x-6 gap-y-3">
            <div>
              <p className="font-display text-3xl leading-none text-perestroika-rosa">$400M</p>
              <p className="font-body text-[11px] uppercase tracking-wide opacity-70 mt-1">arr</p>
            </div>
            <div>
              <p className="font-display text-3xl leading-none text-perestroika-laranja">146</p>
              <p className="font-body text-[11px] uppercase tracking-wide opacity-70 mt-1">pessoas no time</p>
            </div>
            <div>
              <p className="font-display text-3xl leading-none text-perestroika-azul">$6.6B</p>
              <p className="font-body text-[11px] uppercase tracking-wide opacity-70 mt-1">valuation</p>
            </div>
            <p className="font-body text-sm opacity-85 flex-1 min-w-[200px]">
              a startup de vibe coding que mais cresce no mundo.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
