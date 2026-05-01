import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Compass, ListChecks, Mail, Target } from "lucide-react";

interface ArchiveLink {
  to: string;
  title: string;
  hint: string;
  icon: React.ReactNode;
}

const items: ArchiveLink[] = [
  {
    to: "/app/carta",
    title: "minha carta de builder",
    hint: "arquétipo, superpoder, sombra",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    to: "/app/prework",
    title: "pré-work",
    hint: "leituras e provocações da preparação",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    to: "/app/tutorial",
    title: "tutorial",
    hint: "primeiro app no lovable, passo a passo",
    icon: <Compass className="h-4 w-4" />,
  },
  {
    to: "/app/entregas",
    title: "entregas",
    hint: "5 desafios curtos pra revisitar",
    icon: <Target className="h-4 w-4" />,
  },
];

export const ArchiveSection = () => {
  return (
    <details className="group rounded-2xl border border-perestroika-preto/10 bg-white/40 open:bg-white/55">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-body text-sm text-perestroika-preto/75 hover:text-perestroika-preto">
        <span className="inline-flex items-center gap-2 uppercase tracking-wide">
          <ListChecks className="h-4 w-4" />
          memórias da preparação
        </span>
        <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
      </summary>
      <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3 rounded-xl border border-perestroika-preto/10 bg-perestroika-bege px-4 py-3 transition-colors hover:border-perestroika-preto/30"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-perestroika-preto/5 text-perestroika-preto/70">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-body text-sm text-perestroika-preto">
                  {item.title}
                </span>
                <span className="block font-body text-xs text-perestroika-preto/55">
                  {item.hint}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-perestroika-preto/30" />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
};
