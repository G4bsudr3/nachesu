import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, CheckCircle2, MessageSquare, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

type EscalationRow = {
  id: string;
  safety_event_id: string;
  user_id: string | null;
  category: string | null;
  severity: string | null;
  sla_hours: number;
  status: "open" | "acknowledged" | "followed_up" | "closed";
  notified_at: string;
  notified_emails: string[];
  acknowledged_at: string | null;
  offline_followup_at: string | null;
  followup_notes: string | null;
  closed_at: string | null;
};

type SafetyEvent = {
  id: string;
  message_redacted: string | null;
  message_excerpt: string | null;
  risk_level: string;
  created_at: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  self_harm: "risco a si mesmo",
  abuse: "abuso ou violência",
  illegal: "tema ilegal",
  hate: "discurso de ódio",
  bullying: "bullying",
  emotional_distress: "sofrimento emocional",
  other_serious: "tema sensível",
};

const STATUS_LABEL: Record<EscalationRow["status"], string> = {
  open: "aberto",
  acknowledged: "ciente",
  followed_up: "acolhido",
  closed: "fechado",
};

const STATUS_TONE: Record<EscalationRow["status"], string> = {
  open: "bg-perestroika-vermelho/15 text-perestroika-vermelho border-perestroika-vermelho/40",
  acknowledged: "bg-perestroika-laranja/15 text-perestroika-laranja border-perestroika-laranja/40",
  followed_up: "bg-primary/10 text-primary border-primary/30",
  closed: "bg-perestroika-preto/5 text-perestroika-preto/55 border-perestroika-preto/15",
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "–";

const slaState = (notifiedAt: string, slaHours: number, status: string) => {
  if (status !== "open") return null;
  const deadline = new Date(notifiedAt).getTime() + slaHours * 3_600_000;
  const remainingMs = deadline - Date.now();
  if (remainingMs < 0) return { tone: "alert", label: `sla vencido há ${Math.ceil(-remainingMs / 3_600_000)}h` };
  const hours = Math.floor(remainingMs / 3_600_000);
  const mins = Math.floor((remainingMs % 3_600_000) / 60_000);
  return { tone: hours < 1 ? "warn" : "ok", label: `sla em ${hours}h${mins.toString().padStart(2, "0")}` };
};

export const TutorSafetyEscalations = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showClosed, setShowClosed] = useState(false);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const { data: escalations, isLoading } = useQuery({
    queryKey: ["admin-tutor-escalations", showClosed],
    queryFn: async (): Promise<EscalationRow[]> => {
      let q = supabase
        .from("tutor_safety_escalations")
        .select("id, safety_event_id, user_id, category, severity, sla_hours, status, notified_at, notified_emails, acknowledged_at, offline_followup_at, followup_notes, closed_at")
        .order("notified_at", { ascending: false })
        .limit(50);
      if (!showClosed) q = q.neq("status", "closed");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EscalationRow[];
    },
    refetchInterval: 30_000,
  });

  const eventIds = useMemo(
    () => (escalations ?? []).map((e) => e.safety_event_id),
    [escalations],
  );

  const { data: events } = useQuery({
    queryKey: ["admin-tutor-escalation-events", eventIds.join(",")],
    enabled: eventIds.length > 0,
    queryFn: async (): Promise<Record<string, SafetyEvent>> => {
      const { data, error } = await supabase
        .from("tutor_safety_events")
        .select("id, message_redacted, message_excerpt, risk_level, created_at")
        .in("id", eventIds);
      if (error) throw error;
      const map: Record<string, SafetyEvent> = {};
      (data ?? []).forEach((row: any) => { map[row.id] = row as SafetyEvent; });
      return map;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EscalationRow> }) => {
      const { error } = await supabase.from("tutor_safety_escalations").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tutor-escalations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "não rolou"),
  });

  const acknowledge = (id: string) =>
    update.mutate(
      { id, patch: { status: "acknowledged", acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id } as any },
      { onSuccess: () => toast.success("ciência registrada") },
    );

  const markFollowedUp = (id: string) => {
    const notes = notesDraft[id]?.trim();
    if (!notes) {
      toast.error("escreve o que foi feito antes de marcar como acolhido");
      return;
    }
    update.mutate(
      {
        id,
        patch: {
          status: "followed_up",
          offline_followup_at: new Date().toISOString(),
          followup_notes: notes,
        } as any,
      },
      {
        onSuccess: () => {
          toast.success("acolhimento registrado");
          setNotesDraft((d) => ({ ...d, [id]: "" }));
        },
      },
    );
  };

  const close = (id: string) =>
    update.mutate(
      { id, patch: { status: "closed", closed_at: new Date().toISOString(), closed_by: user?.id } as any },
      { onSuccess: () => toast.success("fechado") },
    );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-perestroika-preto/60 font-body text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> carregando fila de segurança...
      </div>
    );
  }

  const list = escalations ?? [];

  return (
    <section className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-perestroika-vermelho" />
          <h2 className="font-display uppercase text-xl">fila de escalações de segurança</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-xs"
          onClick={() => setShowClosed((v) => !v)}
        >
          {showClosed ? "esconder fechados" : "mostrar fechados"}
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="font-body text-sm text-perestroika-preto/55">
          nenhum evento pendente. tudo no jeito.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((esc) => {
            const ev = events?.[esc.safety_event_id];
            const sla = slaState(esc.notified_at, esc.sla_hours, esc.status);
            const slaColor =
              sla?.tone === "alert"
                ? "text-perestroika-vermelho"
                : sla?.tone === "warn"
                  ? "text-perestroika-laranja"
                  : "text-perestroika-preto/60";

            return (
              <div key={esc.id} className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-body text-[10px] uppercase tracking-[0.18em] rounded-full px-2 py-1 border ${STATUS_TONE[esc.status]}`}>
                      {STATUS_LABEL[esc.status]}
                    </span>
                    <span className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/70">
                      {esc.category ? (CATEGORY_LABEL[esc.category] ?? esc.category) : "tema sensível"}
                    </span>
                    {esc.severity && (
                      <span className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                        severidade {esc.severity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {sla && (
                      <span className={`font-body text-[10px] uppercase tracking-[0.18em] flex items-center gap-1 ${slaColor}`}>
                        <Clock className="h-3 w-3" /> {sla.label}
                      </span>
                    )}
                    <span className="font-body text-[10px] text-perestroika-preto/55 tabular-nums">
                      {fmtDate(esc.notified_at)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-perestroika-bege/60 border-l-2 border-perestroika-vermelho/60 px-3 py-2">
                  <p className="font-body text-sm text-perestroika-preto/85 leading-snug whitespace-pre-wrap">
                    {ev?.message_redacted || ev?.message_excerpt || "(trecho anonimizado indisponível)"}
                  </p>
                  <p className="font-body text-[10px] text-perestroika-preto/45 mt-1">
                    estudante #{esc.user_id?.slice(0, 6) ?? "?"} · evento {fmtDate(ev?.created_at ?? null)}
                  </p>
                </div>

                {esc.notified_emails?.length > 0 && (
                  <p className="font-body text-[10px] text-perestroika-preto/55">
                    notificou: {esc.notified_emails.join(", ")}
                  </p>
                )}

                {esc.followup_notes && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
                    <p className="font-body text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
                      acolhimento registrado {esc.offline_followup_at ? `em ${fmtDate(esc.offline_followup_at)}` : ""}
                    </p>
                    <p className="font-body text-sm text-perestroika-preto/85 whitespace-pre-wrap">
                      {esc.followup_notes}
                    </p>
                  </div>
                )}

                {esc.status !== "closed" && esc.status !== "followed_up" && (
                  <Textarea
                    rows={2}
                    placeholder="o que foi feito? (acolhimento, encaminhamento, conversa)"
                    value={notesDraft[esc.id] ?? ""}
                    onChange={(e) => setNotesDraft((d) => ({ ...d, [esc.id]: e.target.value }))}
                    className="bg-perestroika-bege/80 font-body text-sm"
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  {esc.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledge(esc.id)}
                      disabled={update.isPending}
                      className="rounded-full text-xs"
                    >
                      <CheckCircle2 className="h-3 w-3" /> dar ciência
                    </Button>
                  )}
                  {(esc.status === "open" || esc.status === "acknowledged") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markFollowedUp(esc.id)}
                      disabled={update.isPending}
                      className="rounded-full text-xs"
                    >
                      <MessageSquare className="h-3 w-3" /> registrar acolhimento
                    </Button>
                  )}
                  {esc.status !== "closed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => close(esc.id)}
                      disabled={update.isPending}
                      className="rounded-full text-xs text-perestroika-preto/55"
                    >
                      <XCircle className="h-3 w-3" /> fechar caso
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
