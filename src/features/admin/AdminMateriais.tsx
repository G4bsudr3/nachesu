import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Copy, Camera, Check } from "lucide-react";
import { useHubMaterials, MATERIAL_CATEGORIES, MATERIAL_KIND_LABELS, type HubMaterial, type MaterialKind, materialOpenUrl } from "@/features/hub/useHubMaterials";
import { useHubSetting } from "@/features/hub/useHubAlbum";
import { MaterialFormModal } from "./MaterialFormModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export const AdminMateriais = () => {
  const { materials, loading, refresh } = useHubMaterials({ adminMode: true });
  const { value: officialPhotosUrl, save: saveOfficialUrl } = useHubSetting("official_photos_url");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HubMaterial | null>(null);
  const [albumDraft, setAlbumDraft] = useState<string>("");
  const [savingAlbum, setSavingAlbum] = useState(false);

  // hidrata draft quando o setting carrega
  useEffect(() => {
    setAlbumDraft(officialPhotosUrl ?? "");
  }, [officialPhotosUrl]);

  const saveAlbumLink = async () => {
    setSavingAlbum(true);
    try {
      const v = albumDraft.trim() || null;
      await saveOfficialUrl(v);
      toast.success(v ? "link das fotos oficiais salvo" : "link removido");
    } catch {
      toast.error("não consegui salvar");
    } finally {
      setSavingAlbum(false);
    }
  };

  const togglePublished = async (m: HubMaterial) => {
    const { error } = await supabase.from("hub_materials").update({ published: !m.published }).eq("id", m.id);
    if (error) {
      toast.error("não consegui atualizar");
      return;
    }
    toast.success(m.published ? "despublicado" : "publicado");
    refresh();
  };

  const remove = async (m: HubMaterial) => {
    if (!confirm(`apagar "${m.title}"?`)) return;
    const { error } = await supabase.from("hub_materials").delete().eq("id", m.id);
    if (error) {
      toast.error("não consegui apagar");
      return;
    }
    toast.success("apagado");
    refresh();
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/app/hub/materiais`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("link copiado pra mandar no zap 🤙"),
      () => toast.error("não consegui copiar"),
    );
  };

  const openForm = (m?: HubMaterial) => {
    setEditing(m ?? null);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            materiais do hub
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${materials.length} ${materials.length === 1 ? "material cadastrado" : "materiais cadastrados"}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyPublicLink}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto/5 px-4 py-2 font-body text-xs uppercase tracking-wide text-perestroika-preto hover:bg-perestroika-preto/10"
          >
            <Copy className="h-3.5 w-3.5" />
            link público
          </button>
          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            novo material
          </button>
        </div>
      </div>

      {/* card: link das fotos oficiais do álbum */}
      <div className="mb-8 rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/40 p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-perestroika-bege"
            style={{ background: "linear-gradient(135deg, #6f77fc, #f756a6, #fd4644)" }}
          >
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl uppercase leading-none">álbum: link das fotos oficiais</h2>
            <p className="mt-1 font-body text-sm text-perestroika-preto/65">
              cola aqui o link do drive/álbum do fotógrafo. aparece no topo de <code>/app/hub/album</code>.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={albumDraft}
                onChange={(e) => setAlbumDraft(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="flex-1 rounded-full border border-perestroika-preto/20 bg-perestroika-bege/70 px-4 py-2 font-body text-sm focus:border-perestroika-preto focus:outline-none"
              />
              <button
                type="button"
                onClick={saveAlbumLink}
                disabled={savingAlbum || albumDraft === (officialPhotosUrl ?? "")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-perestroika-preto px-5 py-2 font-body text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90 disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
                {savingAlbum ? "salvando…" : "salvar"}
              </button>
            </div>
            {officialPhotosUrl && (
              <a
                href={officialPhotosUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
              >
                abrir link atual <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {!loading && materials.length === 0 && (
        <div className="rounded-2xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/30 p-12 text-center">
          <p className="font-display text-3xl uppercase text-perestroika-preto/60">nenhum material ainda</p>
          <p className="mt-2 font-body text-sm text-perestroika-preto/55">
            clica em "novo material" pra subir uma apresentação ou colar um link.
          </p>
        </div>
      )}

      {!loading && materials.length > 0 && (
        <div className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/40 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
                <TableHead className="uppercase text-xs tracking-wide w-12">#</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">título</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">categoria</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">tipo</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">criado</TableHead>
                <TableHead className="uppercase text-xs tracking-wide text-right">ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => {
                const cat = MATERIAL_CATEGORIES.find((c) => c.value === m.category);
                const url = materialOpenUrl(m);
                return (
                  <TableRow key={m.id} className="hover:bg-perestroika-preto/5">
                    <TableCell className="font-body text-xs text-perestroika-preto/50 tabular-nums">{m.order_index}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${m.published ? "bg-emerald-500" : "bg-perestroika-preto/20"}`} />
                        <span className="font-body font-medium">{m.title}</span>
                      </div>
                      {m.description && <div className="font-body text-xs text-perestroika-preto/55 line-clamp-1 mt-0.5">{m.description}</div>}
                    </TableCell>
                    <TableCell className="font-body text-xs">{cat ? `${cat.emoji} ${cat.label}` : m.category}</TableCell>
                    <TableCell className="font-body text-xs uppercase">{MATERIAL_KIND_LABELS[m.kind as MaterialKind] ?? m.kind}</TableCell>
                    <TableCell className="font-body text-xs text-perestroika-preto/60">{formatDate(m.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="abrir"
                            className="rounded-md p-1.5 text-perestroika-preto/60 hover:bg-perestroika-preto/8 hover:text-perestroika-preto"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePublished(m)}
                          aria-label={m.published ? "despublicar" : "publicar"}
                          className="rounded-md p-1.5 text-perestroika-preto/60 hover:bg-perestroika-preto/8 hover:text-perestroika-preto"
                        >
                          {m.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openForm(m)}
                          aria-label="editar"
                          className="rounded-md p-1.5 text-perestroika-preto/60 hover:bg-perestroika-preto/8 hover:text-perestroika-preto"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m)}
                          aria-label="apagar"
                          className="rounded-md p-1.5 text-perestroika-preto/60 hover:bg-red-100 hover:text-perestroika-vermelho"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <MaterialFormModal
        open={showForm}
        editing={editing}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSaved={refresh}
      />
    </div>
  );
};
