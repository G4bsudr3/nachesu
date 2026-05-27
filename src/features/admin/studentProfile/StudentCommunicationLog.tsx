import { Bell, MailWarning } from "lucide-react";
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

export const StudentCommunicationLog = ({ userId }: Props) => {
  const { data, isLoading } = useStudentCommunication(userId);

  if (isLoading) {
    return <p className="text-sm text-perestroika-preto/55">carregando histórico…</p>;
  }

  const nudges = data?.nudges ?? [];
  const notifications = data?.notifications ?? [];

  return (
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
                className="rounded-lg border border-perestroika-preto/10 bg-white/60 px-3 py-2 text-xs flex items-center justify-between"
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
                className="rounded-lg border border-perestroika-preto/10 bg-white/60 px-3 py-2 text-xs"
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
                  {n.read_at ? <span>lida</span> : <span className="text-perestroika-laranja">não lida</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
