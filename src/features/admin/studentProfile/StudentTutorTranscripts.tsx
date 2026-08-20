import { useState } from "react";
import { ChevronDown, MessageSquareText } from "lucide-react";
import { useStudentTutorConversations } from "./useStudentTutorConversations";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";

interface Props {
  userId: string;
}

export const StudentTutorTranscripts = ({ userId }: Props) => {
  const { data, isLoading } = useStudentTutorConversations(userId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-sm text-perestroika-preto/55">carregando conversas…</p>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-perestroika-preto/15 p-6 text-center text-sm text-perestroika-preto/55">
        ainda não conversou com o tutor IA
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((c) => {
        const open = openId === c.id;
        const firstUser = c.messages.find((m) => m.role === "user");
        return (
          <li key={c.id} className="rounded-xl border border-perestroika-preto/15 bg-perestroika-bege/60">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : c.id)}
              className="w-full text-left p-3 flex items-start gap-3"
            >
              <MessageSquareText className="w-4 h-4 mt-0.5 text-perestroika-preto/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-perestroika-preto truncate">
                  {c.trail_title ?? "trilha"} · {c.messageCount} mensagens
                </p>
                {firstUser && (
                  <p className="text-[11px] text-perestroika-preto/55 mt-0.5 line-clamp-1">
                    primeira: "{firstUser.content.slice(0, 90)}"
                  </p>
                )}
                <p className="text-[10px] text-perestroika-preto/45 mt-0.5">
                  última atividade {new Date(c.updated_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-perestroika-preto/55 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="border-t border-perestroika-preto/15 p-3">
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {c.messages
                    .filter((m) => m.role !== "system")
                    .map((m, i) => (
                      <li
                        key={i}
                        className={`rounded-lg p-2.5 text-xs ${
                          m.role === "user"
                            ? "bg-perestroika-bege/70 border border-perestroika-preto/15"
                            : "bg-perestroika-preto/5 border border-perestroika-preto/15"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 mb-1">
                          {m.role === "user" ? "estudante" : "tutor"}
                        </div>
                        <FeedbackMarkdown>{m.content}</FeedbackMarkdown>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
