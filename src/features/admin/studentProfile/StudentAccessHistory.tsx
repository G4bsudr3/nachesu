import { Clock, Monitor, Smartphone, CalendarCheck } from "lucide-react";
import { deviceLabel, useStudentAccessHistory } from "./useStudentAccessHistory";

interface Props {
  userId: string;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtDay = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55">{label}</p>
    <p className="font-display text-xl uppercase leading-none mt-1">{value}</p>
  </div>
);

export const StudentAccessHistory = ({ userId }: Props) => {
  const { data, isLoading } = useStudentAccessHistory(userId);

  if (isLoading) {
    return <p className="text-sm text-perestroika-preto/55">carregando acessos…</p>;
  }

  const sessions = data?.sessions ?? [];
  const days = data?.days ?? [];
  const weeks = data?.weeks ?? [];
  const maxWeek = Math.max(1, ...weeks.map((w) => w.days));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="último acesso" value={data?.lastSignInAt ? fmtDateTime(data.lastSignInAt) : "nunca"} />
        <Stat label="dias com acesso" value={String(data?.totalDays ?? 0)} />
        <Stat label="sessões registradas" value={String(sessions.length)} />
        <Stat
          label="primeiro registro"
          value={data?.firstSeenAt ? fmtDateTime(data.firstSeenAt) : "sem dado"}
        />
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 mb-2">
          frequência das últimas 8 semanas
        </h3>
        <div className="flex items-end gap-2 h-20 rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2">
          {weeks.map((w) => (
            <div key={w.label} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
              <div
                className="w-full rounded-t bg-primary/70 min-h-[2px]"
                style={{ height: `${(w.days / maxWeek) * 100}%` }}
                title={`${w.days} dia(s) com acesso`}
              />
              <span className="text-[9px] text-perestroika-preto/45">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 mb-2 inline-flex items-center gap-2">
            <CalendarCheck className="w-3.5 h-3.5" /> dias com acesso
          </h3>
          {days.length === 0 ? (
            <p className="text-xs italic text-perestroika-preto/40">
              nenhum dia registrado ainda (o registro começa no próximo login)
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {days.map((d) => (
                <li
                  key={d.access_date}
                  className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2 text-xs flex items-center justify-between gap-2"
                >
                  <span className="inline-flex items-center gap-2">
                    {d.device_kind === "celular" ? (
                      <Smartphone className="w-3.5 h-3.5" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5" />
                    )}
                    {fmtDay(d.access_date)}
                  </span>
                  <span className="text-[10px] text-perestroika-preto/55">
                    {fmtTime(d.first_seen_at)} às {fmtTime(d.last_seen_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wide text-perestroika-preto/60 mb-2 inline-flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> sessões de login
          </h3>
          {sessions.length === 0 ? (
            <p className="text-xs italic text-perestroika-preto/40">nenhuma sessão viva</p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <li
                  key={s.session_id}
                  className="rounded-lg border border-perestroika-preto/10 bg-perestroika-bege/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{fmtDateTime(s.started_at)}</span>
                    {s.is_active && (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-800 px-2 py-0.5 text-[10px]">
                        ativa
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-perestroika-preto/50 mt-0.5">
                    {deviceLabel(s.user_agent)} · última atividade {fmtDateTime(s.last_active_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-[10px] text-perestroika-preto/45">
        acesso é registrado uma vez por dia, sem ip e sem rastrear navegação. sessões antigas somem
        quando expiram, o registro diário permanece.
      </p>
    </div>
  );
};
