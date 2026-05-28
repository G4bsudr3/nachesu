import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  id: string;
  user_id: string;
  trail_id: string | null;
  pill_title: string | null;
  user_chars: number;
  assistant_chars: number;
  latency_ms: number | null;
  off_scope: boolean;
  helpful: number | null;
  created_at: string;
};

type Trail = { id: string; title: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const TutorRecentMessages = ({ windowDays }: { windowDays: 7 | 30 }) => {
  const [open, setOpen] = useState(false);
  const [trailFilter, setTrailFilter] = useState<string>("all");
  const [helpfulFilter, setHelpfulFilter] = useState<"all" | "up" | "down" | "off_scope">("all");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - windowDays);
    return d.toISOString();
  }, [windowDays]);

  const { data: trails } = useQuery({
    queryKey: ["admin-tutor-trails-drill"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trails").select("id, title").order("order_index");
      if (error) throw error;
      return (data ?? []) as Trail[];
    },
    enabled: open,
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-tutor-drill", windowDays, trailFilter, helpfulFilter],
    queryFn: async (): Promise<Row[]> => {
      let q = supabase
        .from("tutor_message_events")
        .select("id, user_id, trail_id, pill_title, user_chars, assistant_chars, latency_ms, off_scope, helpful, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);
      if (trailFilter !== "all") q = q.eq("trail_id", trailFilter);
      if (helpfulFilter === "up") q = q.gt("helpful", 0);
      if (helpfulFilter === "down") q = q.lt("helpful", 0);
      if (helpfulFilter === "off_scope") q = q.eq("off_scope", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: open,
  });

  const trailMap = useMemo(() => {
    const m = new Map<string, string>();
    (trails ?? []).forEach((t) => m.set(t.id, t.title));
    return m;
  }, [trails]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full gap-2">
          <MessageSquare className="h-3.5 w-3.5" /> ver últimas perguntas
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-perestroika-bege">
        <SheetHeader>
          <SheetTitle className="font-display uppercase text-2xl">últimas perguntas</SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mt-4 flex-wrap">
          <Select value={trailFilter} onValueChange={setTrailFilter}>
            <SelectTrigger className="w-44 bg-white/60"><SelectValue placeholder="trilha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">todas trilhas</SelectItem>
              {(trails ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={helpfulFilter} onValueChange={(v) => setHelpfulFilter(v as typeof helpfulFilter)}>
            <SelectTrigger className="w-44 bg-white/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">todas</SelectItem>
              <SelectItem value="up">marcadas úteis</SelectItem>
              <SelectItem value="down">marcadas não úteis</SelectItem>
              <SelectItem value="off_scope">fora de escopo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-perestroika-preto/60">
              <Loader2 className="h-4 w-4 animate-spin" /> carregando...
            </div>
          ) : (rows ?? []).length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/55">nada por aqui no filtro atual.</p>
          ) : (
            (rows ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-perestroika-preto/10 bg-white/50 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-body text-[10px] uppercase tracking-[0.18em] text-perestroika-preto/55">
                    {r.trail_id ? trailMap.get(r.trail_id) ?? "—" : "sem trilha"}
                    {r.pill_title ? ` · ${r.pill_title}` : ""}
                  </span>
                  <span className="font-body text-[10px] text-perestroika-preto/55 tabular-nums">{fmt(r.created_at)}</span>
                </div>
                <p className="font-body text-sm text-perestroika-preto/85 leading-snug line-clamp-4">
                  {r.user_chars} chars enviados · resposta {r.assistant_chars} chars
                  {r.latency_ms ? ` · ${(r.latency_ms / 1000).toFixed(1)}s` : ""}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {r.helpful !== null && r.helpful > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-perestroika-preto/60">
                      <ThumbsUp className="h-3 w-3" /> útil
                    </span>
                  )}
                  {r.helpful !== null && r.helpful < 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-perestroika-vermelho">
                      <ThumbsDown className="h-3 w-3" /> não útil
                    </span>
                  )}
                  {r.off_scope && (
                    <span className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2 py-0.5 bg-perestroika-laranja/20 text-perestroika-laranja">
                      fora de escopo
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
