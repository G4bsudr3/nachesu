import { Sparkles } from "lucide-react";
import { ARCHETYPE_TOKENS } from "@/components/carta/cartaTokens";
import type { HubBuilder } from "@/features/hub/useHubGallery";

interface Props {
  builder: HubBuilder;
  reason: string;
  onOpen: (b: HubBuilder) => void;
}

export const MatchCard = ({ builder, reason, onOpen }: Props) => {
  const tokens = builder.archetype ? ARCHETYPE_TOKENS[builder.archetype] : null;
  const displayName = builder.nickname || builder.display_name || "builder";

  return (
    <button
      type="button"
      onClick={() => onOpen(builder)}
      className="group flex w-full gap-4 rounded-2xl border border-perestroika-preto/10 bg-white/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-perestroika-preto/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-perestroika-preto/5 sm:h-24 sm:w-20">
        {builder.image_url ? (
          <img
            src={builder.image_url}
            alt={`carta de ${displayName}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-perestroika-preto/30">
            <Sparkles className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-display text-xl uppercase leading-none">{displayName}</h3>
            {builder.emoji && <span className="text-base">{builder.emoji}</span>}
          </div>
          {tokens && (
            <p className={`mt-0.5 font-body text-[10px] uppercase tracking-[0.18em] ${tokens.text}`}>
              {tokens.labels.m}
            </p>
          )}
        </div>
        <p className="line-clamp-3 font-body text-sm leading-snug text-perestroika-preto/80">
          {reason}
        </p>
      </div>
    </button>
  );
};
