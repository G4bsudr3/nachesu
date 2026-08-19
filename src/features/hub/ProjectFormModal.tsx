import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProjects, type HubProject } from "@/features/hub/useMyProjects";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editing?: HubProject | null;
}

const MAX_COVER_BYTES = 5 * 1024 * 1024;

export const ProjectFormModal = ({ open, onClose, onSaved, editing }: Props) => {
  const { user } = useAuth();
  const { create, update, saving } = useMyProjects();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setLink(editing.link);
      setTagsRaw((editing.tags ?? []).join(", "));
      setCoverUrl(editing.cover_url ?? "");
    } else {
      setTitle("");
      setDescription("");
      setLink("");
      setTagsRaw("");
      setCoverUrl("");
    }
  }, [open, editing]);

  const handleCover = async (f: File) => {
    if (!user) return;
    if (f.size > MAX_COVER_BYTES) {
      toast.error("capa precisa ter até 5mb");
      return;
    }
    setUploading(true);
    const ext = f.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("hub-project-covers").upload(path, f, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      toast.error(`upload falhou: ${upErr.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("hub-project-covers").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
    setUploading(false);
  };

  const submit = async () => {
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 20)
      .slice(0, 5);

    const payload = { title, description, link, cover_url: coverUrl || null, tags };
    const r = editing ? await update(editing.id, payload) : await create(payload);
    if (!r.ok) {
      toast.error(r.error ?? "deu ruim");
      return;
    }
    toast.success(editing ? "projeto atualizado" : "postado 🚀");
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-perestroika-bege border-perestroika-preto/15 sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl uppercase text-perestroika-preto">
            {editing ? "editar projeto" : "postar projeto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              título
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="o que tu construiu?"
              maxLength={80}
              className="bg-perestroika-bege/70 border-perestroika-preto/15"
            />
          </div>

          <div>
            <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="conta a história em poucas linhas"
              maxLength={500}
              rows={4}
              className="w-full rounded-md border border-perestroika-preto/15 bg-perestroika-bege/70 px-3 py-2 font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/60 focus:outline-none focus:ring-2 focus:ring-perestroika-preto/20"
            />
            <p className="mt-1 text-right font-body text-[10px] text-perestroika-preto/60">
              {description.length}/500
            </p>
          </div>

          <div>
            <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              link (lovable, github, figma…)
            </label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
              type="url"
              className="bg-perestroika-bege/70 border-perestroika-preto/15"
            />
          </div>

          <div>
            <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              tags (até 5, separa por vírgula)
            </label>
            <Input
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="ia, mvp, jogo"
              className="bg-perestroika-bege/70 border-perestroika-preto/15"
            />
          </div>

          <div>
            <label className="mb-1 block font-body text-xs uppercase tracking-wide text-perestroika-preto/60">
              capa (opcional)
            </label>
            {coverUrl ? (
              <div className="relative inline-block">
                <img src={coverUrl} alt="capa" className="max-h-32 rounded-lg" />
                <button
                  type="button"
                  onClick={() => setCoverUrl("")}
                  className="absolute -right-2 -top-2 rounded-full bg-perestroika-preto p-1 text-perestroika-bege"
                  aria-label="remover capa"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-perestroika-preto/25 bg-perestroika-bege/40 px-4 py-3 font-body text-sm text-perestroika-preto/60 hover:bg-perestroika-bege/60",
                  uploading && "opacity-60",
                )}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "enviando…" : "subir capa (até 5mb)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCover(f);
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-perestroika-preto/15 px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/70 hover:border-perestroika-preto/40"
            >
              cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || uploading}
              className="rounded-full bg-perestroika-preto px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-opacity disabled:opacity-40"
            >
              {saving ? "salvando…" : editing ? "salvar" : "postar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
