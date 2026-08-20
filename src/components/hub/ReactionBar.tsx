import { useReactions, HUB_EMOJIS, type ReactionTargetKind } from "@/features/hub/useReactions";
import { cn } from "@/lib/utils";

interface Props {
  targetId: string;
  targetKind?: ReactionTargetKind;
  size?: "sm" | "md";
  className?: string;
}

export const ReactionBar = ({ targetId, targetKind = "submission", size = "md", className }: Props) => {
  const { state, toggle, loading } = useReactions(targetId, targetKind);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {HUB_EMOJIS.map((emoji) => {
        const count = state.counts[emoji];
        const mine = state.mine.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={loading}
            aria-label={`reagir com ${emoji}`}
            aria-pressed={mine}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-body transition-all active:scale-95",
              size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
              mine
                ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
                : "border-perestroika-preto/15 bg-perestroika-bege/60 text-perestroika-preto hover:border-perestroika-preto/30",
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-semibold tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
