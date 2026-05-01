import { useEffect, useMemo, useState } from "react";
import { Star, Search, MessageSquare, Trash2, History, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type HistoryConv = {
  id: string;
  title: string;
  updated_at: string;
  is_favorite: boolean;
  preview?: string;
};

interface Props {
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => Promise<void> | void;
  onToggleFavorite: (id: string, next: boolean) => Promise<void> | void;
  convs: HistoryConv[];
  refreshKey: number;
}

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("pt-BR");
};

export const HistoryPanel = ({
  activeId,
  onOpen,
  onDelete,
  onToggleFavorite,
  convs,
  refreshKey,
}: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"todas" | "favoritas">("todas");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // carrega previews (primeira msg user) quando abre o painel
  useEffect(() => {
    if (!open || !user) return;
    const ids = convs.map((c) => c.id);
    if (ids.length === 0) return;
    supabase
      .from("chora_bot_messages")
      .select("conversation_id, content, created_at, role")
      .in("conversation_id", ids)
      .eq("role", "user")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((m) => {
          if (!map[m.conversation_id]) {
            map[m.conversation_id] = m.content;
          }
        });
        setPreviews(map);
      });
  }, [open, user, convs, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = convs.filter((c) => {
      if (tab === "favoritas" && !c.is_favorite) return false;
      if (!q) return true;
      const inTitle = c.title.toLowerCase().includes(q);
      const inPreview = (previews[c.id] || "").toLowerCase().includes(q);
      return inTitle || inPreview;
    });
    return [...list].sort((a, b) => {
      const ta = new Date(a.updated_at).getTime();
      const tb = new Date(b.updated_at).getTime();
      return sort === "recent" ? tb - ta : ta - tb;
    });
  }, [convs, query, tab, previews, sort]);

  const favCount = convs.filter((c) => c.is_favorite).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="abrir histórico"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-perestroika-preto/15 hover:border-perestroika-preto/40 hover:bg-perestroika-preto/5 transition-colors text-perestroika-preto/70 hover:text-perestroika-preto"
        >
          <History className="w-3.5 h-3.5" />
          <span className="font-display uppercase text-[10px] tracking-[0.2em]">histórico</span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-perestroika-bege border-l border-perestroika-preto/10 p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-perestroika-preto/10">
          <SheetTitle className="font-display uppercase text-2xl tracking-tight text-perestroika-preto">
            histórico
          </SheetTitle>
          <p className="text-xs font-body text-perestroika-preto/60 text-left">
            {convs.length} conversa{convs.length === 1 ? "" : "s"} · {favCount} favorita{favCount === 1 ? "" : "s"}
          </p>
        </SheetHeader>

        <div className="px-5 py-3 space-y-3 border-b border-perestroika-preto/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-perestroika-preto/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar no título ou na pergunta..."
              className="pl-9 h-9 text-sm font-body bg-perestroika-bege border-perestroika-preto/15"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {(["todas", "favoritas"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-display uppercase tracking-[0.2em] transition-colors ${
                    tab === t
                      ? "bg-perestroika-preto text-perestroika-bege"
                      : "bg-transparent text-perestroika-preto/60 hover:text-perestroika-preto border border-perestroika-preto/15"
                  }`}
                >
                  {t === "favoritas" ? `★ ${t}` : t}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSort((s) => (s === "recent" ? "oldest" : "recent"))}
              aria-label={sort === "recent" ? "ordenar pelas mais antigas" : "ordenar pelas mais recentes"}
              title={sort === "recent" ? "mais recentes primeiro" : "mais antigas primeiro"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-display uppercase tracking-[0.2em] border border-perestroika-preto/15 text-perestroika-preto/70 hover:text-perestroika-preto hover:border-perestroika-preto/40 transition-colors"
            >
              {sort === "recent" ? (
                <ArrowDownWideNarrow className="w-3 h-3" />
              ) : (
                <ArrowUpWideNarrow className="w-3 h-3" />
              )}
              <span>{sort === "recent" ? "recentes" : "antigas"}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <MessageSquare className="w-8 h-8 text-perestroika-preto/20 mb-3" />
              <p className="font-body text-sm text-perestroika-preto/50">
                {query
                  ? "nada bate com a busca"
                  : tab === "favoritas"
                  ? "nenhuma favorita ainda. clica na estrela pra marcar"
                  : "sem conversas ainda"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => {
                const isActive = c.id === activeId;
                const preview = previews[c.id];
                return (
                  <li
                    key={c.id}
                    className={`group relative rounded-xl border transition-colors p-3 cursor-pointer ${
                      isActive
                        ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                        : "bg-perestroika-bege border-perestroika-preto/10 hover:border-perestroika-preto/30"
                    }`}
                    onClick={() => {
                      onOpen(c.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(c.id, !c.is_favorite);
                        }}
                        aria-label={c.is_favorite ? "desfavoritar" : "favoritar"}
                        className={`shrink-0 mt-0.5 transition-transform hover:scale-110 ${
                          c.is_favorite
                            ? "text-perestroika-laranja"
                            : isActive
                            ? "text-perestroika-bege/40 hover:text-perestroika-bege"
                            : "text-perestroika-preto/25 hover:text-perestroika-preto/70"
                        }`}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={c.is_favorite ? "currentColor" : "none"}
                          strokeWidth={2}
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p
                            className={`font-body text-sm font-medium truncate flex-1 ${
                              isActive ? "text-perestroika-bege" : "text-perestroika-preto"
                            }`}
                          >
                            {c.title}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-display uppercase tracking-wider tabular-nums ${
                              isActive ? "text-perestroika-bege/60" : "text-perestroika-preto/40"
                            }`}
                          >
                            {formatRelative(c.updated_at)}
                          </span>
                        </div>
                        {preview && (
                          <p
                            className={`text-xs font-body line-clamp-2 ${
                              isActive ? "text-perestroika-bege/70" : "text-perestroika-preto/55"
                            }`}
                          >
                            {preview}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("apagar essa conversa?")) return;
                          await onDelete(c.id);
                          toast.success("conversa apagada");
                        }}
                        aria-label="apagar conversa"
                        className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isActive
                            ? "text-perestroika-bege/60 hover:text-perestroika-bege"
                            : "text-perestroika-preto/40 hover:text-perestroika-vermelho"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
