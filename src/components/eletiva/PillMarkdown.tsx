import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight } from "lucide-react";

interface Props {
  children: string;
  /** cor de destaque da trilha, usada em link e citação */
  accent?: string;
  className?: string;
}

/**
 * markdown editorial das pílulas: link clicável, itálico, subtítulo com
 * hierarquia própria, lista numerada, citação e código inline.
 * substitui o renderizador caseiro que só entendia negrito e lista.
 */
export function PillMarkdown({ children, accent, className }: Props) {
  const linkStyle = accent ? { color: accent, textDecorationColor: accent } : undefined;

  return (
    <div
      className={`font-body text-sm sm:text-base leading-relaxed text-perestroika-preto/85 space-y-4 ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-perestroika-preto">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-perestroika-preto/90">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
              className="inline-flex items-baseline gap-0.5 underline underline-offset-2 decoration-current/50 hover:decoration-current font-medium break-words"
            >
              {children}
              <ArrowUpRight className="h-3 w-3 shrink-0 self-center" aria-hidden="true" />
            </a>
          ),
          h1: ({ children }) => <Subtitulo>{children}</Subtitulo>,
          h2: ({ children }) => <Subtitulo>{children}</Subtitulo>,
          h3: ({ children }) => <Subtitulo>{children}</Subtitulo>,
          h4: ({ children }) => <Subtitulo>{children}</Subtitulo>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 pl-4 italic text-perestroika-preto/75"
              style={accent ? { borderColor: accent } : undefined}
            >
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-perestroika-preto/10 px-1 py-0.5 text-[0.85em] font-mono">
              {children}
            </code>
          ),
          hr: () => <hr className="border-t border-perestroika-preto/15" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-perestroika-preto/15 px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-perestroika-preto/15 px-2 py-1 align-top">{children}</td>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display uppercase text-lg sm:text-xl leading-tight tracking-wide text-perestroika-preto pt-3 first:pt-0">
      {children}
    </p>
  );
}
