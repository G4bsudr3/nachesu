import { useEffect, useState } from "react";
import { useNudgeTemplates, useUpdateNudgeTemplate, type NudgeTemplateRow, type NudgeLevel } from "./useNudgeTemplates";
import { Save } from "lucide-react";

const LEVEL_LABEL: Record<NudgeLevel, { label: string; sub: string }> = {
  medium: { label: "nível 1 · cutucada", sub: "~7 dias sem aparecer · tom leve" },
  high: { label: "nível 2 · falta sentida", sub: "~14 dias · tom mais direto" },
  lost: { label: "nível 3 · última chamada", sub: "~21 dias · tom de resgate" },
};

const PLACEHOLDERS = "{nome} · {curso} · {professor} · {dias}";

interface FormRowProps {
  row: NudgeTemplateRow;
  onSave: (next: NudgeTemplateRow) => void;
  saving: boolean;
}

const TemplateForm = ({ row, onSave, saving }: FormRowProps) => {
  const [draft, setDraft] = useState(row);
  useEffect(() => setDraft(row), [row]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(row);
  const meta = LEVEL_LABEL[row.level];

  const field = (key: keyof NudgeTemplateRow, label: string, multiline = false) => (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-perestroika-preto/55 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={(draft as any)[key] ?? ""}
          rows={6}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          className="w-full bg-perestroika-bege/70 border border-perestroika-preto/15 rounded-lg px-3 py-2 text-sm resize-y font-mono"
        />
      ) : (
        <input
          value={(draft as any)[key] ?? ""}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          className="w-full bg-perestroika-bege/70 border border-perestroika-preto/15 rounded-lg px-3 py-2 text-sm"
        />
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl uppercase leading-none">{meta.label}</h3>
          <p className="text-xs text-perestroika-preto/55 mt-1">{meta.sub}</p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => onSave(draft)}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-xs uppercase tracking-wider disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? "salvando…" : "salvar"}
        </button>
      </div>
      <p className="text-[10px] text-perestroika-preto/45 uppercase tracking-wider">
        variáveis disponíveis: {PLACEHOLDERS}
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("notification_title", "título da notificação")}
        {field("notification_body", "corpo da notificação")}
      </div>
      {field("email_subject", "assunto do e-mail")}
      {field("email_body_md", "corpo do e-mail (markdown)", true)}
    </div>
  );
};

export const AdminNudgeTemplates = () => {
  const { data: rows = [], isLoading } = useNudgeTemplates();
  const update = useUpdateNudgeTemplate();

  if (isLoading) return <p className="text-sm text-perestroika-preto/55">carregando…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
          nudges editáveis
        </h1>
        <p className="mt-3 text-perestroika-preto/70 max-w-2xl">
          a edge function de evasão usa esses templates ao acionar nudges. ajuste a voz por nível.
          variáveis entre chaves são substituídas em runtime.
        </p>
      </div>
      <div className="space-y-6">
        {rows.map((row) => (
          <TemplateForm
            key={row.level}
            row={row}
            saving={update.isPending}
            onSave={(next) => update.mutate(next)}
          />
        ))}
      </div>
    </div>
  );
};
