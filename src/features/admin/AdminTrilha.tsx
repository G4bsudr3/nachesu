import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Save, ScanEye, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { AdminPillsEditor } from "./AdminPillsEditor";
import { AdminModulePreview } from "./AdminModulePreview";

type Trail = {
  id: string;
  order_index: number;
  title: string;
  color: string | null;
};

type ModuleRow = {
  id: string;
  number: number;
  title: string;
  objective: string | null;
  trail_id: string;
  total_minutes: number;
  available_from: string | null;
  published: boolean;
  updated_at: string;
};

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

// schema do form de edição. server-side rls já protege; isso é guardrail de UX.
const editSchema = z.object({
  number: z.coerce.number().int().min(1, "mín 1").max(99, "máx 99"),
  title: z.string().trim().min(1, "obrigatório").max(120, "máx 120 caracteres"),
  objective: z.string().trim().max(500, "máx 500 caracteres").optional().or(z.literal("")),
  trail_id: z.string().uuid("trilha inválida"),
  total_minutes: z.coerce.number().int().min(1, "mín 1").max(600, "máx 600"),
  available_from: z.string().optional().or(z.literal("")),
});

type EditValues = z.infer<typeof editSchema>;

const formatLocalDateTime = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  // converte pra value de input datetime-local (YYYY-MM-DDTHH:mm em horário local)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const parseLocalDateTime = (val: string): string | null => {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const formatDisplayDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isAvailableNow = (m: Pick<ModuleRow, "published" | "available_from">): boolean => {
  if (!m.published) return false;
  if (!m.available_from) return true;
  return new Date(m.available_from).getTime() <= Date.now();
};

export const AdminTrilha = () => {
  const qc = useQueryClient();
  const [trailFilter, setTrailFilter] = useState<string>("todas");
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const [pillsModule, setPillsModule] = useState<ModuleRow | null>(null);
  const [previewModule, setPreviewModule] = useState<ModuleRow | null>(null);

  const { data: trails, isLoading: trailsLoading } = useQuery({
    queryKey: ["admin-trails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trails")
        .select("id, order_index, title, color")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Trail[];
    },
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(
          "id, number, title, objective, trail_id, total_minutes, available_from, published, updated_at",
        )
        .order("number");
      if (error) throw error;
      return (data ?? []) as ModuleRow[];
    },
  });

  const togglePublishedMutation = useMutation({
    mutationFn: async (vars: { id: string; next: boolean }) => {
      const { error } = await supabase
        .from("modules")
        .update({ published: vars.next, updated_at: new Date().toISOString() })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.next ? "módulo publicado" : "módulo despublicado");
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
    },
    onError: (e: Error) => {
      logger.error("[admin/trilha] toggle publish:", e);
      toast.error(e.message ?? "deu ruim ao mudar status");
    },
  });

  const saveModuleMutation = useMutation({
    mutationFn: async (vars: { id: string; values: EditValues }) => {
      const { error } = await supabase
        .from("modules")
        .update({
          number: vars.values.number,
          title: vars.values.title.trim(),
          objective: vars.values.objective?.trim() || null,
          trail_id: vars.values.trail_id,
          total_minutes: vars.values.total_minutes,
          available_from: parseLocalDateTime(vars.values.available_from ?? ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("módulo salvo");
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      qc.invalidateQueries({ queryKey: ["eletiva-progress"] });
      setEditing(null);
    },
    onError: (e: Error) => {
      logger.error("[admin/trilha] save:", e);
      toast.error(e.message ?? "deu ruim ao salvar");
    },
  });

  const filtered = useMemo(() => {
    if (!modules) return [];
    if (trailFilter === "todas") return modules;
    return modules.filter((m) => m.trail_id === trailFilter);
  }, [modules, trailFilter]);

  const stats = useMemo(() => {
    if (!modules) return { total: 0, published: 0, available: 0 };
    return {
      total: modules.length,
      published: modules.filter((m) => m.published).length,
      available: modules.filter(isAvailableNow).length,
    };
  }, [modules]);

  const trailById = useMemo(() => {
    const map = new Map<string, Trail>();
    (trails ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [trails]);

  const isLoading = trailsLoading || modulesLoading;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="font-display text-3xl uppercase tracking-tight">
          eletiva · trilha
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          publique módulos e configure quando ficam disponíveis pros alunos. um módulo só
          aparece pra turma quando está <strong>publicado</strong> e a data de liberação
          já passou (ou está vazia).
        </p>
      </header>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className="rounded-2xl border border-perestroika-preto/15 bg-white/60 p-4">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            total
          </p>
          <p className="font-display text-3xl">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-perestroika-preto/15 bg-white/60 p-4">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            publicados
          </p>
          <p className="font-display text-3xl">{stats.published}</p>
        </div>
        <div className="rounded-2xl border border-perestroika-preto/15 bg-white/60 p-4">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
            visíveis agora
          </p>
          <p className="font-display text-3xl">{stats.available}</p>
        </div>
      </div>

      {/* filtro por trilha */}
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs uppercase tracking-wide">filtrar por trilha</Label>
        <Select value={trailFilter} onValueChange={setTrailFilter}>
          <SelectTrigger className="w-64 bg-white/60 border-perestroika-preto/20">
            <SelectValue placeholder="todas as trilhas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">todas as trilhas</SelectItem>
            {trails?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.order_index}. {t.title.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* tabela */}
      <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide w-16">nº</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">título</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">trilha</TableHead>
              <TableHead className="uppercase text-xs tracking-wide whitespace-nowrap">
                disponível em
              </TableHead>
              <TableHead className="uppercase text-xs tracking-wide w-24">status</TableHead>
              <TableHead className="uppercase text-xs tracking-wide w-56 text-right">
                ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                  carregando módulos…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                  nenhum módulo nessa trilha.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              filtered.map((m) => {
                const trail = trailById.get(m.trail_id);
                const trailColor =
                  trailColorByOrder[trail?.order_index ?? 1] ?? trail?.color ?? "#090909";
                const available = isAvailableNow(m);
                return (
                  <TableRow key={m.id} className="hover:bg-perestroika-preto/5">
                    <TableCell className="font-display text-lg">
                      {String(m.number).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="font-medium">{m.title}</p>
                      {m.objective && (
                        <p className="text-xs text-perestroika-preto/60 line-clamp-1 mt-0.5">
                          {m.objective}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: trailColor }}
                          aria-hidden="true"
                        />
                        {trail?.title?.toLowerCase() ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-perestroika-preto/70 whitespace-nowrap">
                      {formatDisplayDate(m.available_from)}
                    </TableCell>
                    <TableCell>
                      {m.published ? (
                        available ? (
                          <Badge className="bg-perestroika-preto text-perestroika-bege">
                            ao vivo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-perestroika-preto/30">
                            agendado
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="border-perestroika-preto/15 text-perestroika-preto/55">
                          rascunho
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            togglePublishedMutation.mutate({ id: m.id, next: !m.published })
                          }
                          disabled={togglePublishedMutation.isPending}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-perestroika-preto/10 transition-colors disabled:opacity-40"
                          aria-label={m.published ? "despublicar" : "publicar"}
                          title={m.published ? "despublicar" : "publicar"}
                        >
                          {m.published ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPillsModule(m)}
                          className="text-xs uppercase tracking-wide"
                        >
                          pílulas
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(m)}
                          className="text-xs uppercase tracking-wide"
                        >
                          editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <EditModuleDialog
        module={editing}
        trails={trails ?? []}
        onClose={() => setEditing(null)}
        onSave={(values) =>
          editing && saveModuleMutation.mutate({ id: editing.id, values })
        }
        isSaving={saveModuleMutation.isPending}
      />

      <AdminPillsEditor
        moduleId={pillsModule?.id ?? null}
        moduleNumber={pillsModule?.number ?? null}
        moduleTitle={pillsModule?.title ?? null}
        onClose={() => setPillsModule(null)}
      />
    </div>
  );
};

// ─── dialog de edição ──────────────────────────────────────────────────────────

interface EditDialogProps {
  module: ModuleRow | null;
  trails: Trail[];
  onClose: () => void;
  onSave: (values: EditValues) => void;
  isSaving: boolean;
}

const EditModuleDialog = ({
  module,
  trails,
  onClose,
  onSave,
  isSaving,
}: EditDialogProps) => {
  const [values, setValues] = useState<EditValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof EditValues, string>>>({});

  // sincroniza o form quando abre um módulo novo
  const open = !!module;
  const moduleId = module?.id ?? null;
  // useMemo pra resetar quando troca de módulo
  useMemo(() => {
    if (module) {
      setValues({
        number: module.number,
        title: module.title,
        objective: module.objective ?? "",
        trail_id: module.trail_id,
        total_minutes: module.total_minutes,
        available_from: formatLocalDateTime(module.available_from),
      });
      setErrors({});
    } else {
      setValues(null);
      setErrors({});
    }
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = <K extends keyof EditValues>(key: K, val: EditValues[K]) => {
    setValues((prev) => (prev ? { ...prev, [key]: val } : prev));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values) return;
    const parsed = editSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof EditValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof EditValues | undefined;
        if (k && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    onSave(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-2xl">
            editar módulo {module ? String(module.number).padStart(2, "0") : ""}
          </DialogTitle>
        </DialogHeader>

        {values && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-number" className="text-xs uppercase tracking-wide">
                  número
                </Label>
                <Input
                  id="m-number"
                  type="number"
                  min={1}
                  max={99}
                  value={values.number}
                  onChange={(e) => handleChange("number", Number(e.target.value))}
                />
                {errors.number && (
                  <p className="text-xs text-destructive">{errors.number}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-trail" className="text-xs uppercase tracking-wide">
                  trilha
                </Label>
                <Select
                  value={values.trail_id}
                  onValueChange={(v) => handleChange("trail_id", v)}
                >
                  <SelectTrigger id="m-trail">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trails.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.order_index}. {t.title.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.trail_id && (
                  <p className="text-xs text-destructive">{errors.trail_id}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-title" className="text-xs uppercase tracking-wide">
                título
              </Label>
              <Input
                id="m-title"
                value={values.title}
                onChange={(e) => handleChange("title", e.target.value)}
                maxLength={120}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-objective" className="text-xs uppercase tracking-wide">
                objetivo (opcional)
              </Label>
              <Textarea
                id="m-objective"
                value={values.objective ?? ""}
                onChange={(e) => handleChange("objective", e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="o que o aluno vai sair sabendo ou fazendo depois desse módulo"
              />
              {errors.objective && (
                <p className="text-xs text-destructive">{errors.objective}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="m-minutes" className="text-xs uppercase tracking-wide">
                  duração total (min)
                </Label>
                <Input
                  id="m-minutes"
                  type="number"
                  min={1}
                  max={600}
                  value={values.total_minutes}
                  onChange={(e) => handleChange("total_minutes", Number(e.target.value))}
                />
                {errors.total_minutes && (
                  <p className="text-xs text-destructive">{errors.total_minutes}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="m-available"
                  className="text-xs uppercase tracking-wide"
                >
                  disponível a partir de
                </Label>
                <Input
                  id="m-available"
                  type="datetime-local"
                  value={values.available_from ?? ""}
                  onChange={(e) => handleChange("available_from", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  vazio = libera assim que publicar
                </p>
              </div>
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
        )}
      </DialogContent>
    </Dialog>
  );
};
