import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { fnErrorInfo, refSuffix } from "@/lib/fnError";
import { logger } from "@/lib/logger";

type CourseOpt = { slug: string; title: string };

type Props = {
  onDone?: () => void;
};

export const AdminInviteUserForm = ({ onDone }: Props) => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<"participant" | "admin">("participant");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("slug, title")
        .order("title");
      setCourses((data ?? []) as CourseOpt[]);
    })();
  }, [open]);

  const toggleSlug = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const reset = () => {
    setEmail("");
    setName("");
    setNickname("");
    setRole("participant");
    setSelectedSlugs([]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("preencha email e nome");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: {
        email: email.trim(),
        name: name.trim(),
        nickname: nickname.trim() || null,
        role,
        course_slugs: selectedSlugs,
      },
    });

    if (error || (data as { error?: string })?.error) {
      const info = await fnErrorInfo(error, data);
      logger.error("[admin-invite-user] fail", error ?? data);
      toast.error(info.message ?? "não rolou convidar", { description: refSuffix(info) });
    } else {
      toast.success(`convite enviado pra ${email}`, {
        description: "o link mágico foi disparado por email",
      });
      reset();
      setOpen(false);
      onDone?.();
    }
    setSending(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-4 py-2 text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90 transition-opacity"
      >
        <UserPlus className="h-4 w-4" />
        convidar pessoa
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display uppercase text-2xl">convidar pessoa</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-perestroika-preto/60 hover:text-perestroika-preto"
          aria-label="fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wide mb-1 text-perestroika-preto/70">email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@dominio.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide mb-1 text-perestroika-preto/70">nome completo</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Maria da Silva"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide mb-1 text-perestroika-preto/70">apelido (opcional)</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="como quer ser chamado"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide mb-1 text-perestroika-preto/70">papel</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("participant")}
              className={`px-3 py-2 rounded-full text-xs uppercase tracking-wide border ${
                role === "participant"
                  ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                  : "border-perestroika-preto/30 text-perestroika-preto/70"
              }`}
            >
              estudante
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`px-3 py-2 rounded-full text-xs uppercase tracking-wide border ${
                role === "admin"
                  ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                  : "border-perestroika-preto/30 text-perestroika-preto/70"
              }`}
            >
              admin
            </button>
          </div>
        </div>
      </div>

      {courses.length > 0 && (
        <div>
          <label className="block text-xs uppercase tracking-wide mb-2 text-perestroika-preto/70">
            matricular em eletivas (opcional)
          </label>
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => {
              const active = selectedSlugs.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => toggleSlug(c.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    active
                      ? "bg-perestroika-rosa text-white border-perestroika-rosa"
                      : "border-perestroika-preto/30 text-perestroika-preto/70 hover:border-perestroika-preto/60"
                  }`}
                >
                  {c.title.toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-xs uppercase tracking-wide text-perestroika-preto/70"
        >
          cancelar
        </button>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-4 py-2 text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Send className="h-4 w-4" />
          {sending ? "enviando…" : "criar e enviar email"}
        </button>
      </div>

      <p className="text-[11px] text-perestroika-preto/50">
        a pessoa recebe um link mágico pra entrar sem senha. o link vale por 1 hora.
      </p>
    </form>
  );
};

export default AdminInviteUserForm;
