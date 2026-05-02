import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

type PillKind =
  | "pilula_a"
  | "pilula_b"
  | "pilula_c"
  | "exercicio_pbl"
  | "registro";

const KIND_LABEL: Record<PillKind, string> = {
  pilula_a: "pílula a",
  pilula_b: "pílula b",
  pilula_c: "pílula c",
  exercicio_pbl: "exercício pbl",
  registro: "registro",
};

const KIND_OPTIONS: PillKind[] = [
  "pilula_a",
  "pilula_b",
  "pilula_c",
  "exercicio_pbl",
  "registro",
];

type Pill = {
  id: string;
  module_id: string;
  title: string;
  kind: PillKind;
  body_md: string;
  video_url: string | null;
  attachment_url: string | null;
  duration_min_low: number | null;
  duration_min_high: number | null;
  required: boolean;
  order_index: number;
};

const pillSchema = z.object({
  title: z.string().trim().min(1, "obrigatório").max(140, "máx 140"),
  kind: z.enum([
    "pilula_a",
    "pilula_b",
    "pilula_c",
    "exercicio_pbl",
    "registro",
  ]),
  body_md: z.string().max(20000, "máx 20k").optional().or(z.literal("")),
  video_url: z
    .string()
    .trim()
    .url("url inválida")
    .max(500)
    .optional()
    .or(z.literal("")),
  attachment_url: z
    .string()
    .trim()
    .url("url inválida")
    .max(500)
    .optional()
    .or(z.literal("")),
  duration_min_low: z.coerce.number().int().min(0).max(600).optional(),
  duration_min_high: z.coerce.number().int().min(0).max(600).optional(),
  required: z.boolean(),
});

type PillForm = z.infer<typeof pillSchema>;

interface Props {
  moduleId: string | null;
  moduleNumber?: number | null;
  moduleTitle?: string | null;
  onClose: () => void;
}

export const AdminPillsEditor = ({
  moduleId,
  moduleNumber,
  moduleTitle,
  onClose,
}: Props) => {
  const qc = useQueryClient();
  const open = !!moduleId;
  const [editing, setEditing] = useState<Pill | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Pill | null>(null);

  const { data: pills, isLoading } = useQuery({
    queryKey: ["admin-pills", moduleId],
    enabled: !!moduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_pills")
        .select(
          "id, module_id, title, kind, body_md, video_url, attachment_url, duration_min_low, duration_min_high, required, order_index",
        )
        .eq("module_id", moduleId!)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Pill[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-pills", moduleId] });
    qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
    // a página /app/modulo/:n também usa as pílulas
    qc.invalidateQueries({ queryKey: ["modulo"] });
  };

  // garante que order_index seja sequencial (0..n-1) sem gaps nem duplicatas.
  // lê o estado atual do banco pra não confiar no cache, e só atualiza linhas
  // que de fato precisam mudar. ignora erros silenciosamente: a normalização é
  // best-effort, não deve quebrar o fluxo principal.
  const normalizeOrder = async (mid: string): Promise<void> => {
    const { data, error } = await supabase
      .from("module_pills")
      .select("id, order_index")
      .eq("module_id", mid)
      .order("order_index")
      .order("created_at"); // tiebreaker estável quando order_index empata
    if (error || !data) {
      logger.error("[admin/pills] normalize fetch:", error);
      return;
    }
    const updates = data
      .map((row, i) => ({ id: row.id, order_index: i, prev: row.order_index }))
      .filter((u) => u.prev !== u.order_index);
    if (updates.length === 0) return;
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("module_pills")
          .update({ order_index: u.order_index })
          .eq("id", u.id),
      ),
    );
    const firstErr = results.find((r) => r.error);
    if (firstErr?.error) {
      logger.error("[admin/pills] normalize update:", firstErr.error);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (values: PillForm) => {
      if (!moduleId) throw new Error("módulo inválido");
      // posiciona no fim: usa o maior order_index existente + 1.
      // assim evita colisão mesmo se o cache estiver desatualizado.
      const maxOrder = (pills ?? []).reduce(
        (acc, p) => (p.order_index > acc ? p.order_index : acc),
        -1,
      );
      const { error } = await supabase.from("module_pills").insert({
        module_id: moduleId,
        title: values.title.trim(),
        kind: values.kind,
        body_md: values.body_md ?? "",
        video_url: values.video_url?.trim() || null,
        attachment_url: values.attachment_url?.trim() || null,
        duration_min_low: values.duration_min_low ?? null,
        duration_min_high: values.duration_min_high ?? null,
        required: values.required,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
      await normalizeOrder(moduleId);
    },
    onSuccess: () => {
      toast.success("pílula criada");
      invalidate();
      setCreating(false);
    },
    onError: (e: Error) => {
      logger.error("[admin/pills] create:", e);
      toast.error(e.message ?? "deu ruim ao criar");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { id: string; values: PillForm }) => {
      const { error } = await supabase
        .from("module_pills")
        .update({
          title: vars.values.title.trim(),
          kind: vars.values.kind,
          body_md: vars.values.body_md ?? "",
          video_url: vars.values.video_url?.trim() || null,
          attachment_url: vars.values.attachment_url?.trim() || null,
          duration_min_low: vars.values.duration_min_low ?? null,
          duration_min_high: vars.values.duration_min_high ?? null,
          required: vars.values.required,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("pílula salva");
      invalidate();
      setEditing(null);
    },
    onError: (e: Error) => {
      logger.error("[admin/pills] update:", e);
      toast.error(e.message ?? "deu ruim ao salvar");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("module_pills").delete().eq("id", id);
      if (error) throw error;
      if (moduleId) await normalizeOrder(moduleId);
    },
    onSuccess: () => {
      toast.success("pílula removida");
      invalidate();
      setPendingDelete(null);
    },
    onError: (e: Error) => {
      logger.error("[admin/pills] delete:", e);
      toast.error(e.message ?? "deu ruim ao remover");
    },
  });

  // mover: aplica a nova ordem completa (0..n-1) baseada num array reordenado.
  // mais robusto que swap pontual porque qualquer gap herdado já fica corrigido.
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const results = await Promise.all(
        orderedIds.map((id, i) =>
          supabase
            .from("module_pills")
            .update({ order_index: i })
            .eq("id", id),
        ),
      );
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (e: Error) => {
      logger.error("[admin/pills] reorder:", e);
      toast.error(e.message ?? "deu ruim ao reordenar");
    },
  });

  const move = (index: number, direction: -1 | 1) => {
    if (!pills) return;
    const target = index + direction;
    if (target < 0 || target >= pills.length) return;
    const next = [...pills];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    reorderMutation.mutate(next.map((p) => p.id));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-2xl">
            pílulas · módulo{" "}
            {moduleNumber ? String(moduleNumber).padStart(2, "0") : ""}
          </DialogTitle>
          {moduleTitle && (
            <DialogDescription className="text-sm">
              {moduleTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {pills?.length ?? 0} pílula(s). a ordem aqui é a que o aluno vê no
            módulo.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreating(true)}
            className="bg-perestroika-preto text-perestroika-bege hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-1" /> nova pílula
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading && (
            <p className="text-center py-8 text-perestroika-preto/50 text-sm">
              carregando…
            </p>
          )}
          {!isLoading && (pills?.length ?? 0) === 0 && (
            <p className="text-center py-8 text-perestroika-preto/50 text-sm">
              nenhuma pílula ainda. clica em "nova pílula" pra começar.
            </p>
          )}
          {!isLoading &&
            pills?.map((p, i) => (
              <div
                key={p.id}
                className="flex items-start gap-3 rounded-lg border border-perestroika-preto/15 bg-white/60 p-3"
              >
                <div className="flex flex-col gap-1 pt-0.5">
                  <button
                    type="button"
                    aria-label="mover pra cima"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reorderMutation.isPending}
                    className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-perestroika-preto/10 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="mover pra baixo"
                    onClick={() => move(i, 1)}
                    disabled={
                      i === (pills.length - 1) || reorderMutation.isPending
                    }
                    className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-perestroika-preto/10 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium truncate">{p.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {KIND_LABEL[p.kind]}
                    </Badge>
                    {!p.required && (
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase border-perestroika-preto/20"
                      >
                        opcional
                      </Badge>
                    )}
                    {(p.duration_min_low || p.duration_min_high) && (
                      <span className="text-[11px] text-muted-foreground">
                        {p.duration_min_low ?? "?"}–
                        {p.duration_min_high ?? "?"} min
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-perestroika-preto/60">
                    {p.video_url && <span>🎬 vídeo</span>}
                    {p.attachment_url && <span>📎 anexo</span>}
                    {p.body_md && <span>📝 {p.body_md.length} caracteres</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setEditing(p)}
                  >
                    editar
                  </Button>
                  <button
                    type="button"
                    aria-label="remover pílula"
                    onClick={() => setPendingDelete(p)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            fechar
          </Button>
        </DialogFooter>

        {/* form de criar/editar */}
        <PillFormDialog
          open={creating || !!editing}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(values) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, values });
            } else {
              createMutation.mutate(values);
            }
          }}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />

        {/* confirmar delete */}
        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(o) => !o && setPendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>remover esta pílula?</AlertDialogTitle>
              <AlertDialogDescription>
                "{pendingDelete?.title}" vai sumir pra todos os alunos. essa
                ação não dá pra desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                )}
                remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

// ─── form ─────────────────────────────────────────────────────────────────────

interface FormProps {
  open: boolean;
  initial: Pill | null;
  onClose: () => void;
  onSubmit: (values: PillForm) => void;
  isSaving: boolean;
}

const emptyValues: PillForm = {
  title: "",
  kind: "pilula_a",
  body_md: "",
  video_url: "",
  attachment_url: "",
  duration_min_low: undefined,
  duration_min_high: undefined,
  required: true,
};

const PillFormDialog = ({
  open,
  initial,
  onClose,
  onSubmit,
  isSaving,
}: FormProps) => {
  const [values, setValues] = useState<PillForm>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<keyof PillForm, string>>>(
    {},
  );

  // sincroniza quando abre
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setValues({
        title: initial.title,
        kind: initial.kind,
        body_md: initial.body_md ?? "",
        video_url: initial.video_url ?? "",
        attachment_url: initial.attachment_url ?? "",
        duration_min_low: initial.duration_min_low ?? undefined,
        duration_min_high: initial.duration_min_high ?? undefined,
        required: initial.required,
      });
    } else {
      setValues(emptyValues);
    }
    setErrors({});
  }, [open, initial]);

  const change = <K extends keyof PillForm>(k: K, v: PillForm[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pillSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof PillForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof PillForm | undefined;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-xl">
            {initial ? "editar pílula" : "nova pílula"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="p-title" className="text-xs uppercase tracking-wide">
              título
            </Label>
            <Input
              id="p-title"
              value={values.title}
              onChange={(e) => change("title", e.target.value)}
              maxLength={140}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-kind" className="text-xs uppercase tracking-wide">
                tipo
              </Label>
              <Select
                value={values.kind}
                onValueChange={(v) => change("kind", v as PillKind)}
              >
                <SelectTrigger id="p-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between gap-3 pb-1">
              <div>
                <Label
                  htmlFor="p-required"
                  className="text-xs uppercase tracking-wide"
                >
                  obrigatória
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  desliga se for material extra/opcional
                </p>
              </div>
              <Switch
                id="p-required"
                checked={values.required}
                onCheckedChange={(v) => change("required", v)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="p-low"
                className="text-xs uppercase tracking-wide"
              >
                duração mín (min)
              </Label>
              <Input
                id="p-low"
                type="number"
                min={0}
                max={600}
                value={values.duration_min_low ?? ""}
                onChange={(e) =>
                  change(
                    "duration_min_low",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="p-high"
                className="text-xs uppercase tracking-wide"
              >
                duração máx (min)
              </Label>
              <Input
                id="p-high"
                type="number"
                min={0}
                max={600}
                value={values.duration_min_high ?? ""}
                onChange={(e) =>
                  change(
                    "duration_min_high",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-video" className="text-xs uppercase tracking-wide">
              url do vídeo (opcional)
            </Label>
            <Input
              id="p-video"
              type="url"
              placeholder="https://youtube.com/..."
              value={values.video_url ?? ""}
              onChange={(e) => change("video_url", e.target.value)}
            />
            {errors.video_url && (
              <p className="text-xs text-destructive">{errors.video_url}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="p-attach"
              className="text-xs uppercase tracking-wide"
            >
              url do anexo (opcional)
            </Label>
            <Input
              id="p-attach"
              type="url"
              placeholder="https://..."
              value={values.attachment_url ?? ""}
              onChange={(e) => change("attachment_url", e.target.value)}
            />
            {errors.attachment_url && (
              <p className="text-xs text-destructive">{errors.attachment_url}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-body" className="text-xs uppercase tracking-wide">
              conteúdo (markdown)
            </Label>
            <Textarea
              id="p-body"
              value={values.body_md ?? ""}
              onChange={(e) => change("body_md", e.target.value)}
              rows={10}
              maxLength={20000}
              className="font-mono text-xs"
              placeholder="suporta markdown: **negrito**, _itálico_, listas, links, etc."
            />
            <p className="text-[11px] text-muted-foreground">
              {values.body_md?.length ?? 0} / 20000
            </p>
            {errors.body_md && (
              <p className="text-xs text-destructive">{errors.body_md}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" /> cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-perestroika-preto text-perestroika-bege hover:opacity-90"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

