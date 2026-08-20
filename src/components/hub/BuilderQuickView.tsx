import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CartaCompleta } from "@/components/carta/CartaCompleta";
import { useBuilderProfile } from "@/features/hub/useBuilderProfile";
import { ARCHETYPE_TOKENS, getArchetypeView } from "@/components/carta/cartaTokens";
import { detectGender } from "@/lib/gender";
import type { HubBuilder } from "@/features/hub/useHubGallery";

interface BuilderQuickViewProps {
  builder: HubBuilder | null;
  onClose: () => void;
}

export const BuilderQuickView = ({ builder, onClose }: BuilderQuickViewProps) => {
  const open = Boolean(builder);
  const slug = builder?.slug;
  const { profile, loading } = useBuilderProfile(open ? slug : undefined);

  const displayName = builder?.nickname || builder?.display_name || "builder";
  const tokens = builder?.archetype ? ARCHETYPE_TOKENS[builder.archetype] : null;
  const gender = detectGender(builder?.display_name ?? builder?.nickname ?? null);
  const view = builder?.archetype ? getArchetypeView(builder.archetype, gender) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-3xl bg-perestroika-bege border-perestroika-preto/15 max-h-[92dvh]"
      >
        <DialogTitle className="sr-only">carta de {displayName}</DialogTitle>
        <DialogDescription className="sr-only">preview da carta de builder</DialogDescription>

        {/* header sticky */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-perestroika-preto/15 bg-perestroika-bege/95 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/50">
              {builder?.cidade ?? "builder"}
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="truncate font-display text-2xl uppercase leading-none">{displayName}</h2>
              {view && tokens && (
                <span className={`shrink-0 font-body text-[10px] uppercase tracking-[0.2em] ${tokens.text}`}>
                  {tokens.emoji} {view.label}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="fechar"
            className="shrink-0 rounded-full p-1.5 text-perestroika-preto/60 hover:bg-perestroika-preto/5 hover:text-perestroika-preto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* corpo scrollável */}
        <div className="overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-8">
              <div className="h-10 w-2/3 animate-pulse rounded bg-perestroika-preto/5" />
              <div className="h-64 animate-pulse rounded-2xl bg-perestroika-preto/5" />
              <div className="h-32 animate-pulse rounded-2xl bg-perestroika-preto/5" />
            </div>
          ) : profile?.archetype && profile.card ? (
            <CartaCompleta
              embedded
              data={{
                display_name: profile.display_name,
                nickname: profile.nickname,
                archetype: profile.archetype,
                emoji: profile.card.emoji,
                essence_phrase: profile.card.essence_phrase,
                tagline: profile.card.tagline,
                superpower_text: profile.card.superpower_text,
                shadow_text: profile.card.shadow_text,
                next_move_text: profile.card.next_move_text,
                full_text: profile.card.full_text,
                gender,
              }}
            />
          ) : (
            <div className="p-10 text-center">
              <p className="font-body text-sm italic text-perestroika-preto/60">
                carta ainda não publicada.
              </p>
            </div>
          )}
        </div>

        {/* footer sticky com CTA */}
        {slug && (
          <div className="sticky bottom-0 z-10 border-t border-perestroika-preto/15 bg-perestroika-bege/95 px-5 py-3 backdrop-blur">
            <Link
              to={`/app/hub/builder/${slug}`}
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-perestroika-preto px-5 py-2.5 font-body text-sm uppercase tracking-wide text-perestroika-bege hover:bg-perestroika-laranja hover:text-perestroika-preto transition-colors"
            >
              ver perfil completo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
