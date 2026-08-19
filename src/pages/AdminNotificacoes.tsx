import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Download, RefreshCw } from "lucide-react";
import {
  AdminTable,
  AdminTableWrapper,
  AdminTBody,
  AdminTD,
  AdminTH,
  AdminTHead,
  AdminTR,
} from "@/components/admin/ui/AdminTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationLog } from "@/features/admin/notifications/useNotificationLog";

const KIND_LABEL: Record<string, string> = {
  deliverable_reviewed: "entrega corrigida",
  deliverable_changes_requested: "ajuste pedido",
  deliverable_message: "mensagem na entrega",
  module_released: "módulo liberado",
  evasion_nudge: "nudge de evasão",
  admin_direct_message: "mensagem direta",
  system: "sistema",
};

const EMAIL_LABEL: Record<string, { text: string; cls: string }> = {
  sent: { text: "enviado", cls: "bg-emerald-500/15 text-emerald-800" },
  pending: { text: "na fila", cls: "bg-amber-500/15 text-amber-800" },
  dlq: { text: "falhou", cls: "bg-red-500/15 text-red-800" },
  failed: { text: "falhou", cls: "bg-red-500/15 text-red-800" },
  bounced: { text: "rejeitado", cls: "bg-red-500/15 text-red-800" },
  suppressed: { text: "bloqueado", cls: "bg-amber-500/15 text-amber-800" },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/60 px-4 py-3">
    <p className="text-[10px] uppercase tracking-wide text-perestroika-preto/55">{label}</p>
    <p className="font-display text-3xl leading-none text-perestroika-preto mt-1">{value}</p>
    {hint && <p className="text-[11px] text-perestroika-preto/50 mt-1">{hint}</p>}
  </div>
);

const AdminNotificacoes = () => {
  const [range, setRange] = useState("30d");
  const [kind, setKind] = useState("todas");
  const [emailStatus, setEmailStatus] = useState("todos");
  const [includeTest, setIncludeTest] = useState(false);
  const { data, isLoading, refetch, isFetching } = useNotificationLog(range, includeTest);


  const rows = useMemo(() => {
    let list = data?.rows ?? [];
    if (kind !== "todas") list = list.filter((r) => r.kind === kind);
    if (emailStatus === "sem-email") list = list.filter((r) => !r.email_status);
    else if (emailStatus === "enviado") list = list.filter((r) => r.email_status === "sent");
    else if (emailStatus === "falhou")
      list = list.filter((r) => ["dlq", "failed", "bounced"].includes(r.email_status ?? ""));
    else if (emailStatus === "fila") list = list.filter((r) => r.email_status === "pending");
    return list;
  }, [data, kind, emailStatus]);

  const readPct = data?.stats.total
    ? Math.round((data.stats.read / data.stats.total) * 100)
    : 0;

  const exportCsv = () => {
    const header = ["estudante", "turma", "tipo", "quando", "lida em", "email", "status email", "erro"];
    const lines = rows.map((r) =>
      [
        r.student_label,
        r.turma ?? "",
        KIND_LABEL[r.kind] ?? r.kind,
        r.created_at,
        r.read_at ?? "",
        r.email ?? "",
        r.email_status ?? "",
        (r.email_error ?? "").replace(/[\n;]/g, " "),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notificacoes-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body">
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-3"
      >
        <Link to="/admin" className="hover:text-perestroika-preto">
          admin
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-perestroika-preto font-semibold">notificações</span>
      </nav>

      <header className="mb-5">
        <h1 className="font-display text-4xl uppercase leading-none">notificações & e-mails</h1>
        <p className="text-sm text-perestroika-preto/60 mt-2 max-w-2xl">
          o que saiu pra cada estudante, se foi lido no app e o que aconteceu com o e-mail. abertura
          de e-mail não é rastreada, só entrega.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="notificações" value={String(data?.stats.total ?? 0)} hint={`últimos ${range}`} />
        <Stat label="lidas" value={`${readPct}%`} hint={`${data?.stats.read ?? 0} abertas no app`} />
        <Stat label="e-mails enviados" value={String(data?.stats.emailsSent ?? 0)} />
        <Stat
          label="e-mails com falha"
          value={String(data?.stats.emailsFailed ?? 0)}
          hint={`${data?.stats.emailsPending ?? 0} na fila`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[60vh]">
            <SelectItem value="7d">últimos 7 dias</SelectItem>
            <SelectItem value="30d">últimos 30 dias</SelectItem>
            <SelectItem value="90d">últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[60vh]">
            <SelectItem value="todas">todos os tipos</SelectItem>
            {(data?.kinds ?? []).map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k] ?? k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={emailStatus} onValueChange={setEmailStatus}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[60vh]">
            <SelectItem value="todos">e-mail: todos</SelectItem>
            <SelectItem value="enviado">enviado</SelectItem>
            <SelectItem value="fila">na fila</SelectItem>
            <SelectItem value="falhou">com falha</SelectItem>
            <SelectItem value="sem-email">sem e-mail</SelectItem>
          </SelectContent>
        </Select>

        {((data?.hiddenTestCount ?? 0) > 0 || includeTest) && (
          <Button
            variant={includeTest ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeTest((v) => !v)}
            title="contas marcadas como teste ficam fora por padrão"
          >
            {includeTest ? "ocultar teste" : `incluir teste (${data?.hiddenTestCount ?? 0})`}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          atualizar
        </Button>

        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          exportar csv
        </Button>
      </div>

      <p className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
        {rows.length} registro{rows.length === 1 ? "" : "s"}
      </p>

      <AdminTableWrapper scroll>
        <AdminTable>
          <AdminTHead>
            <tr>
              <AdminTH>estudante</AdminTH>
              <AdminTH>tipo</AdminTH>
              <AdminTH>quando</AdminTH>
              <AdminTH>lida</AdminTH>
              <AdminTH>e-mail</AdminTH>
            </tr>
          </AdminTHead>
          <AdminTBody>
            {isLoading ? (
              <AdminTR interactive={false}>
                <AdminTD colSpan={5}>carregando…</AdminTD>
              </AdminTR>
            ) : rows.length === 0 ? (
              <AdminTR interactive={false}>
                <AdminTD colSpan={5}>
                  nada disparado nesse recorte. mude o período ou responda uma entrega pra ver o
                  primeiro registro aqui.
                </AdminTD>
              </AdminTR>
            ) : (
              rows.map((r) => {
                const badge = r.email_status ? EMAIL_LABEL[r.email_status] : null;
                return (
                  <AdminTR key={r.id} interactive={false}>
                    <AdminTD>
                      <Link
                        to={`/admin/aluno/${r.user_id}`}
                        className="font-medium hover:underline"
                      >
                        {r.student_label}
                      </Link>
                      {r.turma && (
                        <span className="ml-2 text-[10px] text-perestroika-preto/50">{r.turma}</span>
                      )}
                    </AdminTD>
                    <AdminTD>{KIND_LABEL[r.kind] ?? r.kind}</AdminTD>
                    <AdminTD className="whitespace-nowrap">{fmt(r.created_at)}</AdminTD>
                    <AdminTD className="whitespace-nowrap">
                      {r.read_at ? (
                        <span className="text-emerald-800">{fmt(r.read_at)}</span>
                      ) : (
                        <span className="text-perestroika-preto/45">não lida</span>
                      )}
                    </AdminTD>
                    <AdminTD>
                      {badge ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${badge.cls}`}>
                          {badge.text}
                        </span>
                      ) : (
                        <span className="text-perestroika-preto/60 text-[11px]">só in-app</span>
                      )}
                      {r.email_error && (
                        <p className="text-[10px] text-red-800/80 mt-1 max-w-xs truncate">
                          {r.email_error}
                        </p>
                      )}
                    </AdminTD>
                  </AdminTR>
                );
              })
            )}
          </AdminTBody>
        </AdminTable>
      </AdminTableWrapper>
    </div>
  );
};

export default AdminNotificacoes;
