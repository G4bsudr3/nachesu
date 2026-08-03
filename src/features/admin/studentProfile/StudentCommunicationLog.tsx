import { Bell, Clock, Mail, MailWarning } from "lucide-react";
import { useStudentCommunication } from "./useStudentCommunication";

interface Props {
  userId: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const EMAIL_BADGE: Record<string, { text: string; cls: string }> = {
  sent: { text: "enviado", cls: "bg-emerald-500/15 text-emerald-800" },
  pending: { text: "na fila", cls: "bg-amber-500/15 text-amber-800" },
  dlq: { text: "falhou", cls: "bg-red-500/15 text-red-800" },
  failed: { text: "falhou", cls: "bg-red-500/15 text-red-800" },
  bounced: { text: "rejeitado", cls: "bg-red-500/15 text-red-800" },
  suppressed: { text: "bloqueado", cls: "bg-amber-500/15 text-amber-800" },
};

export const StudentCommunicationLog = ({ userId }: Props) => {
  const { data, isLoading } = useStudentCommunication(userId);

  if (isLoading) {
    return <p className="text-sm text-perestroika-preto/55">carregando histórico…</p>;
  }

  const nudges = data?.nudges ?? [];
  const notifications = data?.notifications ?? [];
  const emails = data?.emails ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2 text-xs inline-flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        <span className="text-perestroika-preto/60">último acesso:</span>
        <strong>
          {data?.lastSignInAt ? fmt(data.lastSignInAt) : "nunca entrou"}
        </strong>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 mb-2 inline-flex items-center gap-2">
            <MailWarning className="w-3.5 h-3.5" /> nudges de evasão
          </h3>
          {nudges.length === 0 ? (
            <p className="text-xs italic text-perestroika-preto/40">nenhum nudge disparado</p>
          ) : (
            <ul className="space-y-1.5">
              {nudges.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2 text-xs flex items-center justify-between"
                >
                  <span>
                    <strong className="uppercase">{n.level}</strong> · {n.days_inactive}d parado
                    {n.email_sent && (
                      <span className="ml-2 text-[10px] text-perestroika-preto/55">email enviado</span>
                    )}
                  </span>
                  <span className="text-[10px] text-perestroika-preto/55">{fmt(n.sent_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 mb-2 inline-flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" /> notificações (90d)
          </h3>
          {notifications.length === 0 ? (
            <p className="text-xs italic text-perestroika-preto/40">nenhuma notificação recente</p>
          ) : (
            <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium">{n.title}</span>
                    <span className="text-[10px] text-perestroika-preto/55">{fmt(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <p className="text-perestroika-preto/65 text-[11px] line-clamp-2">{n.body}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-perestroika-preto/45">
                    <span className="uppercase">{n.kind}</span>
                    {n.read_at ? (
                      <span>lida em {fmt(n.read_at)}</span>
                    ) : (
                      <span className="text-perestroika-laranja">não lida</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 mb-2 inline-flex items-center gap-2">
          <Mail className="w-3.5 h-3.5" /> e-mails enviados (90d)
          {data?.email && (
            <span className="normal-case tracking-normal text-perestroika-preto/45">
              {data.email}
            </span>
          )}
        </h3>
        {emails.length === 0 ? (
          <p className="text-xs italic text-perestroika-preto/40">
            nenhum e-mail saiu pra esse estudante ainda
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {emails.map((e, i) => {
              const badge = EMAIL_BADGE[e.status] ?? {
                text: e.status,
                cls: "bg-perestroika-preto/10 text-perestroika-preto/70",
              };
              return (
                <li
                  key={`${e.message_id ?? e.created_at}-${i}`}
                  className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.template_name}</span>
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${badge.cls}`}>
                        {badge.text}
                      </span>
                      <span className="text-[10px] text-perestroika-preto/55">
                        {fmt(e.created_at)}
                      </span>
                    </span>
                  </div>
                  {e.error_message && (
                    <p className="text-[10px] text-red-800/80 mt-1">{e.error_message}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[10px] text-perestroika-preto/45 mt-2">
          abertura de e-mail não é rastreada: o status mostra entrega, não leitura.
        </p>
      </div>
    </div>
  );
};
