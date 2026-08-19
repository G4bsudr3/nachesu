import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { MATERIAL_CATEGORIES, type HubMaterial, detectKind } from "@/features/hub/useHubMaterials";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: HubMaterial | null;
}

type Mode = "link" | "file";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50mb

export const MaterialFormModal = ({ open, onClose, onSaved, editing }: Props) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("link");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("apresentacao");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMode(editing.external_url ? "link" : "file");
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setCategory(editing.category);
      setExternalUrl(editing.external_url ?? "");
      setFile(null);
      setOrderIndex(editing.order_index);
      setPublished(editing.published);
    } else {
      setMode("link");
      setTitle("");
      setDescription("");
      setCategory("apresentacao");
      setExternalUrl("");
      setFile(null);
      setOrderIndex(0);
      setPublished(true);
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("dá um título");
      return;
    }
    if (mode === "link" && !externalUrl.trim()) {
      toast.error("cola o link");
      return;
    }
    if (mode === "file" && !file && !editing?.file_url) {
      toast.error("escolhe um arquivo");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error("arquivo passou de 50mb");
      return;
    }

    setSaving(true);
    try {
      let fileUrl = editing?.file_url ?? null;
      let fileMime = editing?.file_mime ?? null;
      let fileSize = editing?.file_size_bytes ?? null;

      if (mode === "file" && file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("hub-materials").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("hub-materials").getPublicUrl(path);
        fileUrl = pub.publicUrl;
        fileMime = file.type || null;
        fileSize = file.size;
      }

      const finalExternal = mode === "link" ? externalUrl.trim() : null;
      const finalFileUrl = mode === "file" ? fileUrl : null;
      const kind = detectKind(finalExternal ?? finalFileUrl, fileMime);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        kind,
        external_url: finalExternal,
        file_url: finalFileUrl,
        file_mime: mode === "file" ? fileMime : null,
        file_size_bytes: mode === "file" ? fileSize : null,
        order_index: orderIndex,
        published,
      };

      if (editing) {
        const { error } = await supabase.from("hub_materials").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
        if (error) throw error;
        toast.success("material atualizado 🤙");
      } else {
        const { error } = await supabase.from("hub_materials").insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("material publicado 🔥");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      logger.error("[material save]", err);
      toast.error(err?.message ?? "deu ruim ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-perestroika-bege max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl uppercase">
            {editing ? "editar material" : "novo material"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                mode === "link" ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege" : "border-perestroika-preto/15 bg-perestroika-bege/50 hover:border-perestroika-preto/40",
              )}
            >
              <LinkIcon className="mb-1.5 h-4 w-4" />
              <div className="font-body text-sm font-semibold">link externo</div>
              <div className={cn("font-body text-[11px]", mode === "link" ? "text-perestroika-bege/70" : "text-perestroika-preto/60")}>
                google slides, drive, youtube, figma, notion…
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("file")}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                mode === "file" ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege" : "border-perestroika-preto/15 bg-perestroika-bege/50 hover:border-perestroika-preto/40",
              )}
            >
              <Upload className="mb-1.5 h-4 w-4" />
              <div className="font-body text-sm font-semibold">arquivo</div>
              <div className={cn("font-body text-[11px]", mode === "file" ? "text-perestroika-bege/70" : "text-perestroika-preto/60")}>
                pdf, png, jpg, mp4 (até 50mb)
              </div>
            </button>
          </div>

          {/* link OR file */}
          {mode === "link" ? (
            <div>
              <label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">url</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/…"
                className="mt-1 bg-perestroika-bege/70"
              />
            </div>
          ) : (
            <div>
              <label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">arquivo</label>
              <input
                type="file"
                accept="application/pdf,image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full rounded-md border border-perestroika-preto/20 bg-perestroika-bege/70 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-perestroika-preto file:px-3 file:py-1.5 file:text-xs file:uppercase file:text-perestroika-bege"
              />
              {editing?.file_url && !file && (
                <p className="mt-1 font-body text-xs text-perestroika-preto/55">
                  arquivo atual mantido. escolhe um novo pra substituir.
                </p>
              )}
            </div>
          )}

          {/* título */}
          <div>
            <label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: slides da abertura" className="mt-1 bg-perestroika-bege/70" />
          </div>

          {/* descrição */}
          <div>
            <label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="o que é, pra que serve, por que vale a pena ler"
              rows={3}
              maxLength={280}
              className="mt-1 w-full rounded-md border border-perestroika-preto/20 bg-perestroika-bege/70 px-3 py-2 font-body text-sm placeholder:text-perestroika-preto/60 focus:outline-none focus:border-perestroika-preto"
            />
            <div className="mt-1 text-right font-body text-[10px] text-perestroika-preto/60">{description.length}/280</div>
          </div>

          {/* categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 bg-perestroika-bege/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-body text-xs uppercase tracking-wide text-perestroika-preto/60">ordem</label>
              <Input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value || "0", 10))}
                className="mt-1 bg-perestroika-bege/70"
              />
            </div>
          </div>

          {/* publicado */}
          <label className="flex items-center gap-2 font-body text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-perestroika-preto/30"
            />
            publicar agora (turma vê)
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-perestroika-preto/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
            >
              cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? "salvar" : "publicar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
