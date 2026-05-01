interface UserMessageProps {
  content: string;
  initials?: string;
}

/**
 * balão do user — minimalista, sem fundo, só texto à direita
 * com bolinha de iniciais bege com borda preta. deixa o bot ser o protagonista.
 */
export const UserMessage = ({ content, initials = "tu" }: UserMessageProps) => {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="flex-1 min-w-0 max-w-[85%] flex justify-end">
        <p className="whitespace-pre-wrap text-sm font-body text-perestroika-preto bg-perestroika-preto/[0.04] rounded-2xl px-4 py-3">
          {content}
        </p>
      </div>
      <div
        className="shrink-0 w-9 h-9 rounded-full bg-perestroika-bege border-2 border-perestroika-preto flex items-center justify-center font-display uppercase text-xs tracking-wider text-perestroika-preto"
        aria-hidden="true"
      >
        {initials.slice(0, 2)}
      </div>
    </div>
  );
};
