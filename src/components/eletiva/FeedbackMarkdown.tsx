import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
  className?: string;
}

/**
 * markdown leve usado em feedback educador↔aluno e nas mensagens da thread.
 * whitelist: parágrafo, ênfase, lista, link (target=_blank), code inline, citação, tabela.
 */
export const FeedbackMarkdown = ({ children, className }: Props) => {
  return (
    <div
      className={`font-body text-sm leading-relaxed text-perestroika-preto/85 [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&>blockquote]:border-l-2 [&>blockquote]:border-perestroika-preto/30 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-perestroika-preto/70 [&_code]:bg-perestroika-preto/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.85em] [&_a]:underline [&_a]:decoration-perestroika-preto/40 hover:[&_a]:decoration-perestroika-preto ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          h1: ({ children }) => <p className="font-display uppercase text-base mb-2">{children}</p>,
          h2: ({ children }) => <p className="font-display uppercase text-base mb-2">{children}</p>,
          h3: ({ children }) => <p className="font-display uppercase text-sm mb-1.5">{children}</p>,
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
