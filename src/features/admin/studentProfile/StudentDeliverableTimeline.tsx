import { useState } from "react";
import { useStudentDeliverables } from "./useStudentDeliverables";
import { Badge } from "@/components/ui/badge";

const StatusBadge = ({ status, reviewed }: { status: string; reviewed: boolean }) => {
  if (status === "ajuste")
    return <Badge className="bg-[#fd4644] text-white uppercase text-[10px]">ajuste</Badge>;
  if (reviewed)
    return (
      <Badge variant="outline" className="uppercase text-[10px]">
        revisado
      </Badge>
    );
  if (status === "enviado")
    return (
      <Badge className="bg-perestroika-laranja text-white uppercase text-[10px]">pendente</Badge>
    );
  return (
    <Badge variant="outline" className="uppercase text-[10px]">
      rascunho
    </Badge>
  );
};
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";
import { FeedbackReviewDrawer } from "@/features/admin/FeedbackReviewDrawer";
import { useDeliverableThread } from "@/features/hub/useDeliverableThread";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
import type { DeliverableInbox } from "@/features/admin/usePendingDeliverables";

interface Props {
  userId: string;
}

const Thread = ({ deliverableId }: { deliverableId: string }) => {
  const { messages, isLoading } = useDeliverableThread(deliverableId);
  if (isLoading) {
    return <p className="text-[11px] text-perestroika-preto/45">carregando conversa…</p>;
  }
  if (messages.length === 0) {
    return <p className="text-[11px] italic text-perestroika-preto/60">sem mensagens</p>;
  }
  return (
    <ul className="space-y-2">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`rounded-lg p-2.5 text-xs ${
            m.author_role === "student"
              ? "bg-perestroika-bege/70 border border-perestroika-preto/10"
              : "bg-perestroika-preto/5 border border-perestroika-preto/15"
          }`}
        >
          <div className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 mb-1">
            {m.author_role === "student" ? m.author_name ?? "estudante" : m.author_name ?? "educador"} ·{" "}
            {new Date(m.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <FeedbackMarkdown>{m.body_md}</FeedbackMarkdown>
        </li>
      ))}
    </ul>
  );
};

export const StudentDeliverableTimeline = ({ userId }: Props) => {
  const { data, isLoading } = useStudentDeliverables(userId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<DeliverableInbox | null>(null);

  if (isLoading) {
    return <p className="text-sm text-perestroika-preto/55">carregando entregas…</p>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-perestroika-preto/15 p-6 text-center text-sm text-perestroika-preto/55">
        ainda não enviou nenhuma entrega
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {data.map((d) => {
          const content = (d.content ?? {}) as Record<string, unknown>;
          const readAt = content.feedback_read_at as string | null;
          const expanded = expandedId === d.id;
          const modLabel = d.module
            ? `módulo ${String(d.module.number).padStart(2, "0")} · ${d.module.title}`
            : "módulo";
          return (
            <li
              key={d.id}
              className="rounded-xl border border-perestroika-preto/10 bg-perestroika-bege/60"
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : d.id)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-perestroika-preto truncate">{modLabel}</p>
                  <p className="text-[11px] text-perestroika-preto/55 mt-0.5">
                    {d.submitted_at
                      ? `enviado ${new Date(d.submitted_at).toLocaleDateString("pt-BR")}`
                      : "rascunho"}
                    {d.reviewed_at && (
                      <>
                        {" · "}revisado {new Date(d.reviewed_at).toLocaleDateString("pt-BR")}
                      </>
                    )}
                  </p>
                </div>
                <StatusBadge status={d.status} reviewed={!!d.reviewed_at} />
                {d.reviewed_at && (
                  <span
                    className="inline-flex items-center text-[10px] text-perestroika-preto/55"
                    title={readAt ? `feedback lido em ${new Date(readAt).toLocaleString("pt-BR")}` : "feedback ainda não lido"}
                  >
                    {readAt ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </span>
                )}
              </button>

              {expanded && (
                <div className="border-t border-perestroika-preto/10 p-3 space-y-3">
                  {d.feedback && (
                    <div className="rounded-lg bg-perestroika-bege/40 p-3 text-sm">
                      <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 mb-1.5">
                        feedback do educador
                      </p>
                      <FeedbackMarkdown>{d.feedback}</FeedbackMarkdown>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 mb-1.5 inline-flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> conversa
                    </p>
                    <Thread deliverableId={d.id} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerItem(d);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-[11px] uppercase tracking-wide"
                  >
                    abrir revisão
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <FeedbackReviewDrawer
        open={!!drawerItem}
        onOpenChange={(o) => !o && setDrawerItem(null)}
        deliverable={drawerItem}
      />
    </>
  );
};
