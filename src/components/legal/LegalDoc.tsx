import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { EletivaFooter } from "@/components/layout/EletivaFooter";

interface LegalDocProps {
  title: string;
  version: string;
  updatedAt: string;
  content: string;
}

/**
 * página de documento legal (política de privacidade / termos de uso).
 * renderiza markdown com a tipografia da marca (sem depender do plugin prose).
 * pública, sem auth.
 */
export const LegalDoc = ({ title, version, updatedAt, content }: LegalDocProps) => {
  return (
    <div className="min-h-dvh bg-perestroika-bege">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 hover:text-perestroika-preto transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          voltar
        </Link>

        <header className="mt-6 mb-8 border-b border-perestroika-preto/15 pb-6">
          <h1 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] text-perestroika-preto">
            {title}
          </h1>
          <p className="mt-3 font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/55">
            versão {version} · vigente desde {updatedAt}
          </p>
        </header>

        <article className="font-body text-sm sm:text-base leading-relaxed text-perestroika-preto/85 space-y-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h2 className="font-display uppercase text-xl sm:text-2xl leading-tight tracking-wide text-perestroika-preto pt-6 first:pt-0">
                  {children}
                </h2>
              ),
              h2: ({ children }) => (
                <h2 className="font-display uppercase text-xl sm:text-2xl leading-tight tracking-wide text-perestroika-preto pt-6 first:pt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-display uppercase text-base sm:text-lg leading-tight tracking-wide text-perestroika-preto/90 pt-3">
                  {children}
                </h3>
              ),
              p: ({ children }) => <p>{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-perestroika-preto">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              a: ({ children, href }) =>
                href?.startsWith("/") ? (
                  <Link
                    to={href}
                    className="underline underline-offset-2 decoration-current/60 hover:decoration-solid font-medium"
                  >
                    {children}
                  </Link>
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 decoration-current/50 hover:decoration-current font-medium break-words"
                  >
                    {children}
                  </a>
                ),
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-perestroika-preto/30 pl-4 italic text-perestroika-preto/75">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-t border-perestroika-preto/15 my-6" />,
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse my-2">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-perestroika-preto/15 px-2 py-1 text-left font-semibold text-perestroika-preto">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-perestroika-preto/15 px-2 py-1 align-top">{children}</td>
              ),
              img: () => null,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>

        <EletivaFooter tone="muted" />
      </div>
    </div>
  );
};
