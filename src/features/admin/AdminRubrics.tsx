import { useState } from "react";
import { Loader2, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useRubrics, useUpsertRubric, useDeleteRubric, type Rubric, type RubricCriterion } from "./useRubrics";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const AdminRubrics = () => {
  const { data: rubrics = [], isLoading } = useRubrics();
  const upsert = useUpsertRubric();
  const remove = useDeleteRubric();
  const [editing, setEditing] = useState<Partial<Rubric> | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-perestroika-preto/60">
        <Loader2 className="w-4 h-4 animate-spin" /> carregando rubricas...
      </div>
    );
  }

  const openNew = () =>
    setEditing({
      name: "",
      slug: "",
      description: "",
      is_default: false,
      criteria: [{ label: "", description: "" }],
    });

  const handleSave = async () => {
    if (!editing) return;
    const name = (editing.name ?? "").trim();
    if (!name) return toast.error("dá um nome pra rubrica");
    const slug = editing.slug?.trim() || slugify(name);
    const criteria = (editing.criteria ?? []).filter((c) => c.label.trim().length > 0);
    if (criteria.length === 0) return toast.error("adiciona pelo menos 1 critério");
    try {
      await upsert.mutateAsync({
        id: editing.id,
        name,
        slug,
        description: editing.description ?? null,
        is_default: editing.is_default ?? false,
        criteria,
      });
      toast.success(editing.id ? "rubrica atualizada" : "rubrica criada");
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message ?? "erro ao salvar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display uppercase text-2xl">rubricas de feedback</h2>
          <p className="text-xs text-perestroika-preto/60 mt-1">
            critérios que viram chips no drawer de revisão e contexto pro rascunho com IA.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-xs uppercase tracking-wide min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" /> nova rubrica
        </button>
      </div>

      <ul className="space-y-3">
        {rubrics.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-perestroika-preto/15 bg-white/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display uppercase text-lg">{r.name}</h3>
                  {r.is_default && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-perestroika-preto/10 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" /> padrão
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="text-xs text-perestroika-preto/60 mt-1">{r.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.criteria.map((c, i) => (
                    <span
                      key={i}
                      title={c.description}
                      className="rounded-full bg-perestroika-preto/5 border border-perestroika-preto/15 px-2.5 py-0.5 text-[11px]"
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  className="text-[11px] uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                >
                  editar
                </button>
                {!r.is_default && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`apagar rubrica "${r.name}"?`)) return;
                      await remove.mutateAsync(r.id);
                      toast.success("rubrica removida");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-red-700/80 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" /> apagar
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-perestroika-bege rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display uppercase text-xl mb-4">
              {editing.id ? "editar rubrica" : "nova rubrica"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">nome</label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="bg-white/60"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">descrição</label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="bg-white/60"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editing.is_default ?? false}
                  onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                />
                marcar como rubrica padrão (substitui a anterior)
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                    critérios
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        criteria: [...(editing.criteria ?? []), { label: "", description: "" }],
                      })
                    }
                    className="text-[11px] uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto"
                  >
                    + adicionar
                  </button>
                </div>
                <ul className="space-y-2">
                  {(editing.criteria ?? []).map((c: RubricCriterion, i: number) => (
                    <li key={i} className="rounded-md border border-perestroika-preto/15 p-2 space-y-1.5">
                      <Input
                        placeholder="label (ex: clareza)"
                        value={c.label}
                        onChange={(e) => {
                          const next = [...(editing.criteria ?? [])];
                          next[i] = { ...next[i], label: e.target.value };
                          setEditing({ ...editing, criteria: next });
                        }}
                        className="bg-white/60 text-sm h-8"
                      />
                      <Input
                        placeholder="descrição curta (opcional, ajuda a IA)"
                        value={c.description ?? ""}
                        onChange={(e) => {
                          const next = [...(editing.criteria ?? [])];
                          next[i] = { ...next[i], description: e.target.value };
                          setEditing({ ...editing, criteria: next });
                        }}
                        className="bg-white/60 text-xs h-8"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (editing.criteria ?? []).filter((_, j) => j !== i);
                          setEditing({ ...editing, criteria: next });
                        }}
                        className="text-[10px] uppercase text-red-700/70 hover:text-red-700"
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full px-4 py-2 text-xs uppercase tracking-wide border border-perestroika-preto/30 min-h-[36px]"
              >
                cancelar
              </button>
              <button
                type="button"
                disabled={upsert.isPending}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-4 py-2 text-xs uppercase tracking-wide disabled:opacity-50 min-h-[36px]"
              >
                {upsert.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
