import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, ThumbsUp, Timer, Users, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EventRow = {
  id: string;
  user_id: string;
  trail_id: string | null;
  pill_title: string | null;
  user_chars: number;
  assistant_chars: number;
  tokens_estimate: number;
  latency_ms: number | null;
  off_scope: boolean;
  helpful: number | null;
  created_at: string;
};

type TrailRow = { id: string; title: string; order_index: number };

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

export const AdminTutorCommand = () => {
  const qc = useQueryClient();
  const [windowDays, setWindowDays] = useState<7 | 30>(7);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - windowDays);
    return d.toISOString();
  }, [windowDays]);

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["admin-tutor-events", windowDays],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("tutor_message_events")
        .select("id, user_id, trail_id, pill_title, user_chars, assistant_chars, tokens_estimate, latency_ms, off_scope, helpful, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const { data: trails } = useQuery({
    queryKey: ["admin-tutor-trails-cmd"],
    queryFn: async (): Promise<TrailRow[]> => {
      const { data, error } = await supabase.from("trails").select("id, title, order_index").order("order_index");
      if (error) throw error;
      return (data ?? []) as TrailRow[];
    },
  });

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["admin-tutor-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_settings")
        .select("id, enabled, per_user_daily_limit, model, system_prompt_addon, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: digest } = useQuery({
    queryKey: ["admin-tutor-digest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_insights")
        .select("summary_md, generated_at")
        .eq("scope", "tutor:7d")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-admin-digest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        },
      );
      if (!resp.ok) throw new Error(await resp.text());
      return resp.json();
    },
    onSuccess: () => {
      toast.success("digest regenerado");
      qc.invalidateQueries({ queryKey: ["admin-tutor-digest"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "erro ao gerar"),
  });

  const saveSettings = useMutation({
    mutationFn: async (patch: Partial<{ enabled: boolean; per_user_daily_limit: number; model: string; system_prompt_addon: string }>) => {
      const { error } = await supabase.from("tutor_settings").update(patch).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ajustes salvos");
      qc.invalidateQueries({ queryKey: ["admin-tutor-settings"] });
      qc.invalidateQueries({ queryKey: ["tutor-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "não salvou"),
  });

  const kpis = useMemo(() => {
    const list = events ?? [];
    const uniqStudents = new Set(list.map((e) => e.user_id)).size;
    const totalMsgs = list.length;
    const rated = list.filter((e) => e.helpful !== null);
    const helpful = rated.filter((e) => (e.helpful ?? 0) > 0).length;
    const helpfulRate = rated.length > 0 ? Math.round((helpful / rated.length) * 100) : null;
    const latencies = list.map((e) => e.latency_ms).filter((v): v is number => typeof v === "number");
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
    const offScope = list.filter((e) => e.off_scope).length;
    return { uniqStudents, totalMsgs, helpfulRate, avgLatency, offScope };
  }, [events]);

  const sparkline = useMemo(() => {
    const list = events ?? [];
    const buckets = new Map<string, number>();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    list.forEach((e) => {
      const k = e.created_at.slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    });
    return Array.from(buckets.entries());
  }, [events, windowDays]);

  const perTrail = useMemo(() => {
    const tMap = new Map<string, TrailRow>();
    (trails ?? []).forEach((t) => tMap.set(t.id, t));
    const acc = new Map<string, { trail_id: string; title: string; msgs: number; students: Set<string>; order: number }>();
    (events ?? []).forEach((e) => {
      if (!e.trail_id) return;
      const trail = tMap.get(e.trail_id);
      const cur = acc.get(e.trail_id) ?? {
        trail_id: e.trail_id,
        title: trail?.title ?? "trilha removida",
        msgs: 0,
        students: new Set<string>(),
        order: trail?.order_index ?? 999,
      };
      cur.msgs += 1;
      cur.students.add(e.user_id);
      acc.set(e.trail_id, cur);
    });
    return Array.from(acc.values()).sort((a, b) => a.order - b.order);
  }, [events, trails]);

  const maxSpark = Math.max(1, ...sparkline.map(([, v]) => v));
  const maxTrail = Math.max(1, ...perTrail.map((t) => t.msgs));

  if (loadingEvents || loadingSettings) {
    return (
      <div className="flex items-center gap-2 text-perestroika-preto/60 font-body text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando dados do tutor...
      </div>
    );
  }

  const s = settings ?? { enabled: true, per_user_daily_limit: 50, model: "google/gemini-2.5-flash", system_prompt_addon: "" };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">tutor IA · central</h1>
          <p className="font-body text-sm text-perestroika-preto/65 mt-2 max-w-xl">
            métricas finas por evento, controle operacional e leitura editorial das dores da turma com o joão-de-barro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={windowDays === 7 ? "default" : "outline"}
            onClick={() => setWindowDays(7)}
            className="rounded-full"
          >
            7d
          </Button>
          <Button
            size="sm"
            variant={windowDays === 30 ? "default" : "outline"}
            onClick={() => setWindowDays(30)}
            className="rounded-full"
          >
            30d
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<MessageCircle className="h-4 w-4" />} label="perguntas" value={kpis.totalMsgs} hint={`${kpis.uniqStudents} estudantes únicos`} />
        <Kpi
          icon={<ThumbsUp className="h-4 w-4" />}
          label="taxa útil"
          value={kpis.helpfulRate === null ? "—" : `${kpis.helpfulRate}%`}
          hint="👍 sobre avaliadas"
        />
        <Kpi
          icon={<Timer className="h-4 w-4" />}
          label="latência média"
          value={kpis.avgLatency === null ? "—" : `${(kpis.avgLatency / 1000).toFixed(1)}s`}
          hint="resposta completa"
        />
        <Kpi
          icon={<Sparkles className="h-4 w-4" />}
          label="fora de escopo"
          value={kpis.offScope}
          hint="heurística automática"
        />
      </section>

      <section className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display uppercase text-xl">volume diário</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55 font-body">
            últimos {windowDays} dias
          </span>
        </div>
        <div className="flex items-end gap-1 h-24">
          {sparkline.map(([day, v]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-primary/70 rounded-sm transition-colors group-hover:bg-primary"
                style={{ height: `${(v / maxSpark) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
                title={`${day}: ${v}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
          <h2 className="font-display uppercase text-xl mb-4">por trilha</h2>
          {perTrail.length === 0 ? (
            <p className="font-body text-sm text-perestroika-preto/55">sem perguntas no período.</p>
          ) : (
            <div className="space-y-3">
              {perTrail.map((t) => (
                <div key={t.trail_id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-body text-sm lowercase">{t.title}</span>
                    <span className="font-body text-xs text-perestroika-preto/60 tabular-nums">
                      {t.msgs} perguntas · {t.students.size} alunos
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-perestroika-preto/5 overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${(t.msgs / maxTrail) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display uppercase text-xl">leitura da turma</h2>
            <Button
              size="sm"
              variant="outline"
              disabled={regenerate.isPending}
              onClick={() => regenerate.mutate()}
              className="rounded-full"
            >
              {regenerate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              regenerar
            </Button>
          </div>
          {digest?.payload ? (
            <div className="space-y-3 font-body text-sm text-perestroika-preto/85 whitespace-pre-wrap">
              {typeof digest.payload === "string"
                ? digest.payload
                : JSON.stringify(digest.payload, null, 2)}
              <p className="text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/45 mt-2">
                gerado em {fmtDate(digest.generated_at as string)}
              </p>
            </div>
          ) : (
            <p className="font-body text-sm text-perestroika-preto/55">
              ainda não foi gerado. clica em regenerar pra puxar as últimas 200 mensagens.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
        <h2 className="font-display uppercase text-xl mb-4">controles operacionais</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-perestroika-preto/10 p-4">
            <div>
              <Label className="font-display uppercase text-xs tracking-wide">tutor ativo</Label>
              <p className="font-body text-xs text-perestroika-preto/60 mt-1">
                desligado, devolve aviso editorial pro estudante.
              </p>
            </div>
            <Switch
              checked={!!s.enabled}
              onCheckedChange={(v) => saveSettings.mutate({ enabled: v })}
              disabled={saveSettings.isPending}
            />
          </div>

          <div className="rounded-xl border border-perestroika-preto/10 p-4">
            <Label className="font-display uppercase text-xs tracking-wide">limite diário por aluno</Label>
            <p className="font-body text-xs text-perestroika-preto/60 mt-1 mb-2">0 = sem limite.</p>
            <Input
              type="number"
              min={0}
              defaultValue={s.per_user_daily_limit ?? 50}
              onBlur={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n) && n !== s.per_user_daily_limit) {
                  saveSettings.mutate({ per_user_daily_limit: n });
                }
              }}
              className="bg-white/60"
            />
          </div>

          <div className="rounded-xl border border-perestroika-preto/10 p-4">
            <Label className="font-display uppercase text-xs tracking-wide">modelo</Label>
            <p className="font-body text-xs text-perestroika-preto/60 mt-1 mb-2">
              flash padrão, pro só pra teste.
            </p>
            <Select
              defaultValue={s.model ?? "google/gemini-2.5-flash"}
              onValueChange={(v) => saveSettings.mutate({ model: v })}
            >
              <SelectTrigger className="bg-white/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google/gemini-2.5-flash">gemini 2.5 flash</SelectItem>
                <SelectItem value="google/gemini-2.5-flash-lite">gemini 2.5 flash lite</SelectItem>
                <SelectItem value="google/gemini-2.5-pro">gemini 2.5 pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-perestroika-preto/10 p-4 md:col-span-2">
            <Label className="font-display uppercase text-xs tracking-wide">addon de instrução</Label>
            <p className="font-body text-xs text-perestroika-preto/60 mt-1 mb-2">
              concatenado ao system prompt. use pra ajustes pontuais (ex: "evite jargão técnico").
            </p>
            <Textarea
              defaultValue={s.system_prompt_addon ?? ""}
              rows={3}
              onBlur={(e) => {
                if (e.target.value !== (s.system_prompt_addon ?? "")) {
                  saveSettings.mutate({ system_prompt_addon: e.target.value });
                }
              }}
              className="bg-white/60 font-body text-sm"
              placeholder="ex: sempre devolva 1 contraexemplo curto antes da resposta"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const Kpi = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
}) => (
  <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
    <div className="flex items-center gap-2 text-perestroika-preto/60 mb-2">
      {icon}
      <span className="font-body text-[10px] uppercase tracking-[0.2em]">{label}</span>
    </div>
    <p className="font-display text-4xl leading-none tabular-nums">{value}</p>
    <p className="font-body text-xs text-perestroika-preto/55 mt-2">{hint}</p>
  </div>
);
