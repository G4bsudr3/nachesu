import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useGiphy, type GiphyItem } from "@/features/hub/useGiphy";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (gif: GiphyItem) => void;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
}

export const GifPicker = ({ onPick, trigger, align = "end" }: Props) => {
  const [open, setOpen] = useState(false);
  const { query, setQuery, items, loading, error } = useGiphy();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[320px] p-3 sm:w-[360px] bg-perestroika-bege border-perestroika-preto/15"
      >
        <div className="mb-2 flex items-center gap-2 rounded-full border border-perestroika-preto/15 bg-white/70 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-perestroika-preto/45" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="busca um gif…"
            className="w-full bg-transparent font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/40 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="relative max-h-[300px] overflow-y-auto rounded-xl">
          {loading && (
            <div className="flex h-[120px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-perestroika-preto/40" />
            </div>
          )}
          {!loading && error && (
            <div className="px-3 py-6 text-center font-body text-xs text-perestroika-vermelho">
              {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="px-3 py-6 text-center font-body text-xs text-perestroika-preto/45">
              nenhum gif encontrado
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onPick(g);
                    setOpen(false);
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border border-transparent bg-white/30 transition-all hover:border-perestroika-preto/30 hover:scale-[1.02]",
                  )}
                >
                  <img
                    src={g.preview_url}
                    alt={g.title || "gif"}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-2 text-center font-body text-[10px] uppercase tracking-wide text-perestroika-preto/40">
          powered by giphy
        </p>
      </PopoverContent>
    </Popover>
  );
};
