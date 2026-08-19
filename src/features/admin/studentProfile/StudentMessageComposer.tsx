import { useState } from "react";
import { useStudentAdminMessages, useSendAdminMessage } from "./useAdminMessages";
import { FeedbackMarkdown } from "@/components/eletiva/FeedbackMarkdown";
import { Send, Mail } from "lucide-react";

interface Props {
  userId: string;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

export const StudentMessageComposer = ({ userId }: Props) => {
  const { data: messages = [], isLoading } = useStudentAdminMessages(userId);
  const sendMutation = useSendAdminMessage(userId);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && !sendMutation.isPending;

  const handleSend = () => {
    if (!canSend) return;
    sendMutation.mutate(
      {
        recipient_id: userId,
        subject: subject.trim(),
        body_md: body.trim(),
        link: link.trim() || null,
        send_email: sendEmail,
      },
      {
        onSuccess: () => {
          setSubject(""); setBody(""); setLink("");
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-4 sm:p-5 space-y-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
            assunto
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 200))}
            placeholder="ex: gostei demais da sua entrega"
            className="w-full bg-perestroika-bege/70 border border-perestroika-preto/15 rounded-lg px-3 py-2 text-sm text-perestroika-preto placeholder:text-perestroika-preto/60 focus:outline-none focus:border-perestroika-preto/45"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
            mensagem · markdown leve (**negrito**, *itálico*, [link](url))
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 4000))}
            rows={6}
            placeholder="escreva direto, primeira pessoa, sem corporativês"
            className="w-full bg-perestroika-bege/70 border border-perestroika-preto/15 rounded-lg px-3 py-2 text-sm text-perestroika-preto placeholder:text-perestroika-preto/60 focus:outline-none focus:border-perestroika-preto/45 resize-y"
          />
          <p className="text-[10px] text-perestroika-preto/60 mt-1 text-right">
            {body.length}/4000
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
              link opcional (caminho interno tipo /app/modulo/3)
            </label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/app/modulo/..."
              className="w-full bg-perestroika-bege/70 border border-perestroika-preto/15 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-end gap-2 text-sm text-perestroika-preto/80 pb-2">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> enviar também por e-mail
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wider font-medium disabled:opacity-50 hover:bg-perestroika-preto/90 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {sendMutation.isPending ? "enviando…" : "enviar mensagem"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-wider text-perestroika-preto/55 mb-2">
          histórico de mensagens manuais
        </h3>
        {isLoading ? (
          <p className="text-sm text-perestroika-preto/55">carregando…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-perestroika-preto/55 italic">
            nenhuma mensagem manual enviada ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-perestroika-preto/12 bg-perestroika-bege/60 p-4"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-medium text-perestroika-preto text-sm">{m.subject}</p>
                  <span className="text-[10px] uppercase tracking-wider text-perestroika-preto/45">
                    {formatDateTime(m.created_at)}
                  </span>
                </div>
                <FeedbackMarkdown>{m.body_md}</FeedbackMarkdown>
                <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-perestroika-preto/45">
                  <span>{m.email_sent ? "in-app + e-mail" : "in-app"}</span>
                  {m.read_at && <span>lido {formatDateTime(m.read_at)}</span>}
                  {m.link && <span>→ {m.link}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
