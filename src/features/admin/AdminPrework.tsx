import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface PreworkItem {
  id: string;
  ordem: number;
  tipo: string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  duracao_min: number | null;
  obrigatorio: boolean;
  published: boolean;
}

type FormState = Omit<PreworkItem, "id"> & { id?: string };

const emptyForm = (ordem: number): FormState => ({
  ordem,
  tipo: "leitura",
  titulo: "",
  descricao: "",
  url: "",
  duracao_min: null,
  obrigatorio: false,
  published: true,
});

const tipoLabel: Record<string, string> = {
  video: "vídeo",
  leitura: "leitura",
  exercicio: "exercício",
};

export const AdminPrework = () => {
  const [items, setItems] = useState<PreworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prework_items")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) toast.error("não foi possível carregar os itens");
    setItems((data ?? []) as PreworkItem[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const togglePublished = async (item: PreworkItem) => {
    const next = !item.published;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, published: next } : i)));
    const { error } = await supabase
      .from("prework_items")
      .update({ published: next })
      .eq("id", item.id);
    if (error) {
      toast.error("não foi possível alterar");
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, published: !next } : i)));
    } else {
      toast.success(next ? "item publicado" : "item despublicado");
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.titulo.trim()) {
      toast.error("o título é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      ordem: editing.ordem,
      tipo: editing.tipo,
      titulo: editing.titulo.trim(),
      descricao: editing.descricao?.trim() || null,
      url: editing.url?.trim() || null,
      duracao_min: editing.duracao_min,
      obrigatorio: editing.obrigatorio,
      published: editing.published,
    };

    const { error } = editing.id
      ? await supabase.from("prework_items").update(payload).eq("id", editing.id)
      : await supabase.from("prework_items").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("não foi possível salvar");
      return;
    }
    toast.success(editing.id ? "item atualizado" : "item criado");
    setEditing(null);
    fetchItems();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("prework_items").delete().eq("id", deleteId);
    if (error) {
      toast.error("não foi possível excluir");
    } else {
      toast.success("item excluído");
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
    }
    setDeleteId(null);
  };

  const nextOrdem = items.length > 0 ? Math.max(...items.map((i) => i.ordem)) + 1 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            pré-work · curadoria
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${items.length} ${items.length === 1 ? "item" : "itens"} cadastrados`}
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyForm(nextOrdem))}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          novo item
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-perestroika-bege/40 border border-perestroika-preto/10 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-perestroika-preto/20 p-12 text-center">
          <p className="font-body text-perestroika-preto/60">nenhum item cadastrado por enquanto. cria o primeiro.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-3xl border p-5 flex items-start gap-4 transition-all ${
                item.published
                  ? "border-perestroika-preto/10 bg-perestroika-bege/80"
                  : "border-perestroika-preto/10 bg-perestroika-bege/30 opacity-70"
              }`}
            >
              <div className="shrink-0 flex flex-col items-center gap-1 pt-1 text-perestroika-preto/40">
                <GripVertical className="h-4 w-4" />
                <span className="font-body text-xs tabular-nums">{item.ordem}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {tipoLabel[item.tipo] ?? item.tipo}
                  </Badge>
                  {item.duracao_min && (
                    <span className="font-body text-xs text-perestroika-preto/50">
                      {item.duracao_min} min
                    </span>
                  )}
                  {item.obrigatorio && (
                    <Badge className="bg-perestroika-preto text-perestroika-bege text-[10px] uppercase">
                      obrigatório
                    </Badge>
                  )}
                  {!item.published && (
                    <Badge variant="outline" className="text-[10px] uppercase border-perestroika-preto/40">
                      rascunho
                    </Badge>
                  )}
                </div>
                <h3 className="font-display uppercase text-xl sm:text-2xl leading-tight">
                  {item.titulo}
                </h3>
                {item.descricao && (
                  <p className="mt-1 font-body text-sm text-perestroika-preto/70 line-clamp-2">
                    {item.descricao}
                  </p>
                )}
                {item.url && (
                  <p className="mt-1 font-body text-xs text-perestroika-preto/50 truncate">{item.url}</p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => togglePublished(item)}
                  aria-label={item.published ? "despublicar" : "publicar"}
                  title={item.published ? "despublicar" : "publicar"}
                  className="h-9 w-9 rounded-full hover:bg-perestroika-preto/5 flex items-center justify-center transition-colors"
                >
                  {item.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ ...item })}
                  aria-label="editar"
                  title="editar"
                  className="h-9 w-9 rounded-full hover:bg-perestroika-preto/5 flex items-center justify-center transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(item.id)}
                  aria-label="excluir"
                  title="excluir"
                  className="h-9 w-9 rounded-full hover:bg-perestroika-vermelho/10 flex items-center justify-center transition-colors text-perestroika-vermelho"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* dialog edit/create */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg bg-perestroika-bege max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-2xl">
              {editing?.id ? "editar item" : "novo item"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wide">ordem</Label>
                  <Input
                    type="number"
                    value={editing.ordem}
                    onChange={(e) => setEditing({ ...editing, ordem: parseInt(e.target.value) || 0 })}
                    className="mt-1 bg-white/60"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide">tipo</Label>
                  <Select
                    value={editing.tipo}
                    onValueChange={(v) => setEditing({ ...editing, tipo: v })}
                  >
                    <SelectTrigger className="mt-1 bg-white/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leitura">leitura</SelectItem>
                      <SelectItem value="video">vídeo</SelectItem>
                      <SelectItem value="exercicio">exercício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide">título</Label>
                <Input
                  value={editing.titulo}
                  onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
                  placeholder="ex: lovable em 10 minutos"
                  className="mt-1 bg-white/60"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide">descrição</Label>
                <Textarea
                  value={editing.descricao ?? ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                  placeholder="o que esse item entrega"
                  rows={3}
                  className="mt-1 bg-white/60 resize-y"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide">link</Label>
                <Input
                  type="url"
                  value={editing.url ?? ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 bg-white/60"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wide">duração (min)</Label>
                <Input
                  type="number"
                  value={editing.duracao_min ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      duracao_min: e.target.value === "" ? null : parseInt(e.target.value),
                    })
                  }
                  placeholder="ex: 10"
                  className="mt-1 bg-white/60"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-perestroika-preto/10 p-3">
                <div>
                  <Label className="text-sm">obrigatório</Label>
                  <p className="text-xs text-perestroika-preto/60">conta para o % de pré-work completo</p>
                </div>
                <Switch
                  checked={editing.obrigatorio}
                  onCheckedChange={(v) => setEditing({ ...editing, obrigatorio: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-perestroika-preto/10 p-3">
                <div>
                  <Label className="text-sm">publicado</Label>
                  <p className="text-xs text-perestroika-preto/60">visível para os builders</p>
                </div>
                <Switch
                  checked={editing.published}
                  onCheckedChange={(v) => setEditing({ ...editing, published: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saving}
              className="px-5 h-11 rounded-full font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity disabled:opacity-30"
            >
              cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-perestroika-bege">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase text-2xl">excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              isso remove o item permanentemente. o progresso dos builders neste item também é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-perestroika-vermelho hover:bg-perestroika-vermelho/90"
            >
              excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};
