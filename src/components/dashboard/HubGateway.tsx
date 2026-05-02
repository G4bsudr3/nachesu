import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";

interface GatewayLink {
  to: string;
  title: string;
  copy: string;
  icon: React.ReactNode;
  accent: string;
}

// links sempre visíveis na eletiva sebrae
const baseLinks: GatewayLink[] = [
  {
    to: "/app/hub/materiais",
    title: "materiais",
    copy: "leituras, refs e apresentações das aulas",
    icon: <BookOpen className="h-5 w-5" />,
    accent: "linear-gradient(135deg, #6f77fc 0%, #f756a6 100%)",
  },
  {
    to: "/app/tutor",
    title: "tutor IA",
    copy: "tira dúvida das aulas, prompt, código",
    icon: <Sparkles className="h-5 w-5" />,
    accent: "linear-gradient(135deg, #fe7b02 0%, #fd4644 100%)",
  },
];

// links extras (mural de projetos, galeria, álbum) só aparecem
// se o admin ativar a flag eletiva_extras_enabled.
const extrasLinks: GatewayLink[] = [
  {
    to: "/app/hub/galeria",
    title: "galeria",
    copy: "as cartas dos builders da turma",
    icon: <Sparkles className="h-5 w-5" />,
    accent: "linear-gradient(135deg, #f756a6 0%, #6f77fc 100%)",
  },
  {
    to: "/app/hub/projetos",
    title: "projetos",
    copy: "feed da turma. reaja, comente, poste o seu",
    icon: <BookOpen className="h-5 w-5" />,
    accent: "linear-gradient(135deg, #fd4644 0%, #fe7b02 100%)",
  },
];

export const HubGateway = () => {
  const { enabled: extrasEnabled } = useEletivaExtras();
  const links = extrasEnabled ? [...baseLinks, ...extrasLinks] : baseLinks;

  return (
    <section
      aria-labelledby="hub-gateway-title"
      className="rounded-3xl border border-perestroika-preto/15 bg-white/55 p-6 sm:p-8"
    >
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55">
            apoio
          </p>
          <h2
            id="hub-gateway-title"
            className="font-display text-3xl uppercase leading-none text-perestroika-preto sm:text-4xl"
          >
            quando travar, vem aqui
          </h2>
        </div>
        <Link
          to="/app/hub"
          className="hidden shrink-0 items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto sm:inline-flex"
        >
          ver hub completo <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group relative overflow-hidden rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege p-4 transition-all hover:-translate-y-0.5 hover:border-perestroika-preto/30 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-perestroika-bege shadow-sm"
                style={{ background: link.accent }}
              >
                {link.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl uppercase leading-none text-perestroika-preto">
                  {link.title}
                </h3>
                <p className="mt-1 font-body text-xs text-perestroika-preto/65">
                  {link.copy}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-perestroika-preto/30 transition-transform group-hover:translate-x-1 group-hover:text-perestroika-preto" />
            </div>
          </Link>
        ))}
      </div>

      <Link
        to="/app/hub"
        className="mt-4 inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto sm:hidden"
      >
        ver hub completo <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
};
