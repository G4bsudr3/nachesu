import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

const LS_KEY = "chora.authChecklistDone";

interface FirstTimeChecklistProps {
  emailFilled: boolean;
  passwordFilled: boolean;
  submitted: boolean;
  sent: boolean;
  className?: string;
}

const STEPS = [
  {
    n: 1,
    color: "bg-perestroika-rosa",
    title: "coloca seu email",
    desc: "o mesmo do convite da escola sebrae",
  },
  {
    n: 2,
    color: "bg-perestroika-laranja",
    title: "escolhe como entrar",
    desc: "link mágico (só email) ou senha",
  },
  {
    n: 3,
    color: "bg-perestroika-azul",
    title: "clica em entrar",
    desc: "cai direto na sua eletiva",
  },
];

const LEARNINGS = [
  "pra entrar aqui, email basta",
  "senha é só atalho pra próximas vezes",
  "o link mágico expira em 1 hora",
];

export const FirstTimeChecklist = ({
  emailFilled,
  passwordFilled,
  submitted,
  sent,
  className = "",
}: FirstTimeChecklistProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) !== "true") setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(LS_KEY, "true"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  const checks = [emailFilled, passwordFilled || submitted, sent];

  return (
    <div className={`rounded-3xl border border-perestroika-preto/15 bg-perestroika-bege/60 backdrop-blur p-5 sm:p-6 animate-fade-up relative ${className}`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="fechar"
        className="absolute top-3 right-3 inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-perestroika-preto/5 transition-colors"
      >
        <X className="h-4 w-4 text-perestroika-preto/60" />
      </button>

      <h2 className="font-display uppercase text-2xl sm:text-3xl leading-none mb-4 pr-8">
        primeira vez por aqui?
      </h2>

      <ul className="space-y-3 mb-5">
        {STEPS.map((step, i) => {
          const done = checks[i];
          return (
            <li key={step.n} className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full font-display text-base text-perestroika-bege transition-opacity ${step.color} ${done ? "opacity-50" : ""}`}
              >
                {step.n}
              </span>
              <div className="flex-1 min-w-0 pt-1">
                <p className={`font-body text-sm font-medium leading-tight ${done ? "line-through text-perestroika-preto/50" : "text-perestroika-preto"}`}>
                  {step.title}
                </p>
                <p className="font-body text-xs text-perestroika-preto/60 mt-0.5">
                  {step.desc}
                </p>
              </div>
              <span
                className={`flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full border transition-all mt-1 ${done ? "bg-perestroika-preto border-perestroika-preto" : "border-perestroika-preto/25"}`}
                aria-hidden
              >
                {done && <Check className="h-3.5 w-3.5 text-perestroika-bege" strokeWidth={3} />}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-perestroika-preto/15 pt-4">
        <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/50 mb-2">
          o que você acabou de aprender
        </p>
        <ul className="space-y-1.5 mb-4">
          {LEARNINGS.map((l) => (
            <li key={l} className="font-body text-sm text-perestroika-preto/80 flex gap-2">
              <span className="text-perestroika-preto/40">•</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center min-h-11 px-2 font-body text-sm uppercase tracking-wide underline underline-offset-4 hover:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
        >
          entendi, fechar
        </button>
      </div>
    </div>
  );
};
