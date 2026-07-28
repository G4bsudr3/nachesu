import { useMemo, useState } from "react";
import { Download, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminAuditLog, type AuditEntry } from "@/hooks/useAdminAuditLog";

const ACTIONS = [
  "module_view",
  "module_publish",
  "module_unpublish",
  "course_publish",
  "course_unpublish",
  "override_create",
  "override_update",
  "override_delete",
];

const ACTION_LABEL: Record<string, string> = {
  module_view: "acesso a módulo",
  module_publish: "módulo publicado",
  module_unpublish: "módulo despublicado",
  course_publish: "eletiva publicada",
  course_unpublish: "eletiva despublicada",
  override_create: "override criado",
  override_update: "override alterado",
  override_delete: "override removido",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const toCSV = (rows: AuditEntry[]) => {
  const head = ["quando", "quem", "ação", "alvo", "metadata"];
  const lines = rows.map((r) =>
    [
      fmt(r.created_at),
      r.actor_email ?? r.actor_id ?? "",
      ACTION_LABEL[r.action] ?? r.action,
      r.target_label ?? r.target_id ?? "",
      JSON.stringify(r.metadata ?? {}),
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
};

export const AdminAuditoria = () => {
  const [actions, setActions] = useState<string[]>([]);
  const [actorEmail, setActorEmail] = useState("");
  const [days, setDays] = useState(7);

  const since = useMemo(
    () => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    [days],
  );

  const { data: entries = [], isLoading } = useAdminAuditLog({
    actions: actions.length > 0 ? actions : undefined,
    since,
    limit: 500,
  });

  const filtered = useMemo(() => {
    const term = actorEmail.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((e) => (e.actor_email ?? "").toLowerCase().includes(term));
  }, [entries, actorEmail]);

  const toggleAction = (a: string) =>
    setActions((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const downloadCSV = () => {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="space-y-1">
        <h2 className="font-display text-3xl uppercase tracking-tight">auditoria</h2>
        <p className="text-sm text-perestroika-preto/55">
          histórico de ações dos admins: publicações, overrides de visibilidade e acessos a módulos.
        </p>
      </header>

      <section className="rounded-xl border border-perestroika-preto/10 bg-perestroika-bege/60 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 block mb-1">
              filtrar por admin (email)
            </label>
            <Input
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              placeholder="email…"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 block mb-1">
              período
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 rounded-md border border-perestroika-preto/15 bg-perestroika-bege px-2 text-sm"
            >
              <option value={1}>último dia</option>
              <option value={7}>últimos 7 dias</option>
              <option value={30}>últimos 30 dias</option>
              <option value={90}>últimos 90 dias</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-perestroika-preto/55 block mb-1">
              filtrar por ação
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-9 inline-flex items-center gap-2 rounded-md border border-perestroika-preto/15 bg-perestroika-bege px-3 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {actions.length === 0 ? "todas as ações" : `${actions.length} ação${actions.length > 1 ? "ões" : ""}`}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 border-perestroika-preto/15 bg-perestroika-bege">
                <div className="space-y-2">
                  {ACTIONS.map((a) => (
                    <label
                      key={a}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-perestroika-preto/5 rounded px-1 py-1"
                    >
                      <Checkbox
                        checked={actions.includes(a)}
                        onCheckedChange={() => toggleAction(a)}
                      />
                      <span className="text-perestroika-preto/90">{ACTION_LABEL[a] ?? a}</span>
                    </label>
                  ))}
                </div>
                {actions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActions([])}
                    className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
                  >
                    <X className="w-3 h-3" /> limpar filtros
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={downloadCSV}
            className="h-9 inline-flex items-center gap-1.5 rounded-md border border-perestroika-preto/15 bg-perestroika-bege px-3 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5"
          >
            <Download className="w-3.5 h-3.5" /> exportar CSV
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-perestroika-preto/10 bg-perestroika-bege/60 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-perestroika-preto/55">carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-perestroika-preto/55">nenhum evento no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-perestroika-preto/5 text-[10px] uppercase tracking-wide text-perestroika-preto/60">
              <tr>
                <th className="text-left px-3 py-2">quando</th>
                <th className="text-left px-3 py-2">quem</th>
                <th className="text-left px-3 py-2">ação</th>
                <th className="text-left px-3 py-2">alvo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-perestroika-preto/5">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-perestroika-preto/5">
                  <td className="px-3 py-2 text-xs text-perestroika-preto/65 whitespace-nowrap">
                    {fmt(e.created_at)}
                  </td>
                  <td className="px-3 py-2 text-xs truncate max-w-[200px]">{e.actor_email ?? "—"}</td>
                  <td className="px-3 py-2">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="px-3 py-2 text-xs text-perestroika-preto/70">
                    {e.target_label ?? e.target_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};
