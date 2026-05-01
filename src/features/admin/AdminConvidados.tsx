import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Search, UserPlus, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useInvitedParticipants, type InvitedWithStatus } from "./useInvitedParticipants";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "email obrigatório")
    .email("email inválido")
    .max(255, "email muito longo"),
  name: z.string().trim().min(1, "nome obrigatório").max(100, "nome muito longo"),
  nickname: z.string().trim().max(60).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  instagram: z.string().trim().max(60).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  trabalho: z.string().trim().max(120).optional().or(z.literal("")),
});

const editSchema = schema.omit({ email: true });
type EditValues = z.infer<typeof editSchema>;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AdminConvidados = () => {
  const { rows, loading, create, remove, update } = useInvitedParticipants();
  const [search, setSearch] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<InvitedWithStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<InvitedWithStatus | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    name: "",
    nickname: "",
    whatsapp: "",
    instagram: "",
    cidade: "",
    trabalho: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (r: InvitedWithStatus) => {
    setEditValues({
      name: r.name ?? "",
      nickname: r.nickname ?? "",
      whatsapp: r.whatsapp ?? "",
      instagram: r.instagram ?? "",
      cidade: r.cidade ?? "",
      trabalho: r.trabalho ?? "",
    });
    setEditing(r);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const parsed = editSchema.safeParse(editValues);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "dados inválidos");
      return;
    }
    setSavingEdit(true);
    const result = await update(editing.id, parsed.data);
    setSavingEdit(false);
    if (result.ok === false) {
      toast.error(result.reason);
      return;
    }
    toast.success("convidado atualizado");
    setEditing(null);
  };

  const [form, setForm] = useState({
    email: "",
    name: "",
    nickname: "",
    whatsapp: "",
    instagram: "",
    cidade: "",
    trabalho: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.email, r.name, r.nickname].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? "dados inválidos");
      return;
    }
    setSubmitting(true);
    const result = await create({
      email: parsed.data.email,
      name: parsed.data.name,
      nickname: parsed.data.nickname || null,
      whatsapp: parsed.data.whatsapp || null,
      instagram: parsed.data.instagram || null,
      cidade: parsed.data.cidade || null,
      trabalho: parsed.data.trabalho || null,
    });
    setSubmitting(false);

    if (result.ok === false) {
      toast.error(result.reason);
      return;
    }

    const firstName = parsed.data.name.split(" ")[0].toLowerCase();
    const fbiUrl = `${window.location.origin}/forms`;
    toast.success(`${firstName} cadastrada, ela já pode responder o fbi`, {
      description: fbiUrl,
      action: {
        label: "copiar link",
        onClick: () => {
          navigator.clipboard.writeText(fbiUrl).then(
            () => toast.success("link copiado"),
            () => toast.error("não consegui copiar"),
          );
        },
      },
      duration: 8000,
    });

    setForm({
      email: "",
      name: "",
      nickname: "",
      whatsapp: "",
      instagram: "",
      cidade: "",
      trabalho: "",
    });
  };

  const updateField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            convidados
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            cadastra alguém pra liberar o fbi e o hub.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/forms`;
            navigator.clipboard.writeText(url).then(
              () => toast.success("link do fbi copiado"),
              () => toast.error("não consegui copiar"),
            );
          }}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wide px-3 py-2 rounded-md bg-perestroika-preto/5 hover:bg-perestroika-preto/10 transition-colors self-start"
        >
          <Copy className="w-3.5 h-3.5" />
          copiar link público do fbi
        </button>
      </div>

      {/* form de cadastro */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-perestroika-preto/15 bg-perestroika-preto/[0.04] p-5 sm:p-6 mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="email *">
            <Input
              type="email"
              required
              value={form.email}
              onChange={updateField("email")}
              placeholder="amanda.marangonii@gmail.com"
              className="bg-white/70 border-perestroika-preto/20"
            />
          </Field>
          <Field label="nome completo *">
            <Input
              required
              value={form.name}
              onChange={updateField("name")}
              placeholder="Amanda Marangoni"
              className="bg-white/70 border-perestroika-preto/20"
            />
          </Field>
          <Field label="apelido (opcional)">
            <Input
              value={form.nickname}
              onChange={updateField("nickname")}
              placeholder="amanda"
              className="bg-white/70 border-perestroika-preto/20"
            />
          </Field>
        </div>

        {showMore && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Field label="whatsapp">
              <Input
                value={form.whatsapp}
                onChange={updateField("whatsapp")}
                placeholder="51 99999-9999"
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="instagram">
              <Input
                value={form.instagram}
                onChange={updateField("instagram")}
                placeholder="@amanda"
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="cidade">
              <Input
                value={form.cidade}
                onChange={updateField("cidade")}
                placeholder="Porto Alegre"
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="trabalho">
              <Input
                value={form.trabalho}
                onChange={updateField("trabalho")}
                placeholder="designer freelance"
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mt-5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto transition-colors"
          >
            {showMore ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                menos campos
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                + mais campos
              </>
            )}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? "cadastrando…" : "cadastrar convidado"}
          </button>
        </div>
      </form>

      {/* lista */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-display uppercase text-2xl">
          {loading ? "carregando…" : `${filtered.length} de ${rows.length} convidados`}
        </h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar por nome ou email"
            className="pl-9 bg-white/60 border-perestroika-preto/20"
          />
        </div>
      </div>

      <div className="rounded-lg border border-perestroika-preto/15 bg-white/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">cadastrado</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">email</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">nome</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">apelido</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">fbi</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-perestroika-preto/50">
                  carregando convidados…
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-perestroika-preto/50">
                  ninguém por aqui ainda. cadastra o primeiro acima.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-perestroika-preto/5">
                  <TableCell className="text-xs text-perestroika-preto/70 whitespace-nowrap">
                    {formatDate(r.imported_at)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{r.email}</TableCell>
                  <TableCell className="text-perestroika-preto/80 whitespace-nowrap">
                    {r.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-perestroika-preto/80 whitespace-nowrap">
                    {r.nickname ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.has_fbi ? (
                      <span className="text-xs text-perestroika-preto/70" title="data de submissão do fbi">
                        {formatDate(r.fbi_submitted_at)}
                      </span>
                    ) : r.fbi_started ? (
                      <span className="text-xs text-perestroika-preto/50 italic">rascunho</span>
                    ) : (
                      <span className="text-xs text-perestroika-preto/30">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {r.has_account ? (
                        <Badge className="bg-perestroika-azul/15 text-perestroika-azul border-0 text-[10px] uppercase tracking-wide">
                          tem conta
                        </Badge>
                      ) : r.has_fbi ? (
                        <Badge className="bg-perestroika-rosa/15 text-perestroika-rosa border-0 text-[10px] uppercase tracking-wide">
                          aguarda criar conta
                        </Badge>
                      ) : r.fbi_started ? (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-perestroika-preto/60 border-perestroika-preto/30">
                          fbi em andamento
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-perestroika-preto/50">
                          convidado
                        </Badge>
                      )}
                      {r.has_fbi && (
                        <Badge className="bg-perestroika-laranja/15 text-perestroika-laranja border-0 text-[10px] uppercase tracking-wide">
                          fbi ok
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        title="editar convidado"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-perestroika-preto/50 hover:text-perestroika-azul hover:bg-perestroika-azul/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (r.has_fbi) {
                            toast.error("essa pessoa já submeteu o fbi, não dá pra apagar");
                            return;
                          }
                          setToDelete(r);
                        }}
                        disabled={r.has_fbi}
                        title={r.has_fbi ? "fbi submetido, não dá pra apagar" : "apagar convidado"}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-perestroika-preto/50 hover:text-perestroika-vermelho hover:bg-perestroika-vermelho/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-perestroika-preto/50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <AlertDialogContent className="bg-perestroika-bege">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase text-3xl">
              apagar convidado?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-perestroika-preto/70">
              vai sumir <span className="font-semibold text-perestroika-preto">{toDelete?.name ?? toDelete?.email}</span> ({toDelete?.email}) da lista. essa pessoa perde o acesso ao fbi público.
              {toDelete?.has_account && (
                <span className="block mt-2 text-perestroika-laranja">
                  atenção: já criaram conta com esse email. a conta continua existindo, só some dos convidados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="uppercase tracking-wide text-xs">
              cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!toDelete) return;
                setDeleting(true);
                const result = await remove(toDelete.id);
                setDeleting(false);
                if (result.ok === false) {
                  toast.error(result.reason);
                  return;
                }
                toast.success(`${toDelete.name ?? toDelete.email} removido`);
                setToDelete(null);
              }}
              className="bg-perestroika-vermelho text-perestroika-bege hover:bg-perestroika-vermelho/90 uppercase tracking-wide text-xs"
            >
              {deleting ? "apagando…" : "apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && !savingEdit && setEditing(null)}>
        <DialogContent className="bg-perestroika-bege max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-3xl">
              editar convidado
            </DialogTitle>
            <DialogDescription className="text-perestroika-preto/70">
              {editing?.email}{" "}
              <span className="text-perestroika-preto/40">(email não pode mudar)</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Field label="nome *">
              <Input
                value={editValues.name}
                onChange={(e) => setEditValues((p) => ({ ...p, name: e.target.value }))}
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="apelido">
              <Input
                value={editValues.nickname ?? ""}
                onChange={(e) => setEditValues((p) => ({ ...p, nickname: e.target.value }))}
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="whatsapp">
              <Input
                value={editValues.whatsapp ?? ""}
                onChange={(e) => setEditValues((p) => ({ ...p, whatsapp: e.target.value }))}
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="instagram">
              <Input
                value={editValues.instagram ?? ""}
                onChange={(e) => setEditValues((p) => ({ ...p, instagram: e.target.value }))}
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="cidade">
              <Input
                value={editValues.cidade ?? ""}
                onChange={(e) => setEditValues((p) => ({ ...p, cidade: e.target.value }))}
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
            <Field label="trabalho">
              <Input
                value={editValues.trabalho ?? ""}
                onChange={(e) => setEditValues((p) => ({ ...p, trabalho: e.target.value }))}
                className="bg-white/70 border-perestroika-preto/20"
              />
            </Field>
          </div>

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={savingEdit}
              className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-5 py-2.5 text-xs uppercase tracking-wide hover:border-perestroika-preto/50 transition-colors disabled:opacity-40"
            >
              cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 text-xs uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
            >
              {savingEdit ? "salvando…" : "salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] uppercase tracking-wide text-perestroika-preto/60">
      {label}
    </span>
    {children}
  </label>
);
