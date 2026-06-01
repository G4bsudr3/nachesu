import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { ChevronLeft, Mail, Lock, Unlock, Send } from "lucide-react";

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  professor_name: string;
  order_index: number;
  published: boolean;
};

type ModuleRow = {
  id: string;
  trail_id: string;
  number: number;
  order_index: number;
  title: string;
  published: boolean;
  trails?: { id: string; title: string; course_id: string };
};

export function AdminEletivas() {
  const [selected, setSelected] = useState<Course | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  if (selected) {
    return <CourseManager course={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl uppercase">eletivas</h2>
      <p className="font-body text-sm text-perestroika-preto/70">
        cada eletiva tem seus estudantes (convidados por email), seu professor e seus módulos liberados manualmente.
      </p>

      {isLoading ? (
        <p className="font-body text-sm">carregando...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-lg border border-perestroika-preto/10 bg-white cursor-pointer hover:bg-perestroika-bege/40 transition"
              onClick={() => setSelected(c)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl uppercase">{c.title}</h3>
                  <p className="font-body text-xs text-perestroika-preto/60">
                    prof. {c.professor_name}
                  </p>
                  {c.subtitle && (
                    <p className="font-body text-sm mt-2">{c.subtitle}</p>
                  )}
                </div>
                {c.published ? (
                  <Badge variant="secondary">publicada</Badge>
                ) : (
                  <Badge variant="outline">rascunho</Badge>
                )}
              </div>
              <p className="font-body text-xs text-perestroika-preto/55 mt-3">slug: {c.slug}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseManager({ course, onBack }: { course: Course; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto"
      >
        <ChevronLeft className="h-4 w-4" /> voltar
      </button>

      <div>
        <h2 className="font-display text-2xl uppercase">{course.title}</h2>
        <p className="font-body text-sm text-perestroika-preto/60">
          prof. {course.professor_name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InvitesPanel courseId={course.id} />
        <ModulesPanel courseId={course.id} />
      </div>
    </div>
  );
}

function InvitesPanel({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [emails, setEmails] = useState("");

  const { data: invites = [] } = useQuery({
    queryKey: ["course-invites", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_invites")
        .select("id, email_normalized, invited_at, claimed_at")
        .eq("course_id", courseId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addInvites = useMutation({
    mutationFn: async (raw: string) => {
      const list = raw
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes("@"));
      if (list.length === 0) throw new Error("nenhum email válido");

      const rows = list.map((email_normalized) => ({
        course_id: courseId,
        email_normalized,
        invited_by: user?.id ?? null,
      }));
      const { error } = await supabase.from("course_invites").upsert(rows, {
        onConflict: "course_id,email_normalized",
        ignoreDuplicates: true,
      });
      if (error) throw error;

      // se algum email já é estudante cadastrado, cria a matrícula direto
      const { data: existingUsers } = await supabase.rpc("admin_list_users");
      const matched = (existingUsers ?? []).filter((u: any) =>
        list.includes(String(u.email).toLowerCase())
      );
      const conflicts: string[] = [];
      if (matched.length > 0) {
        for (const u of matched as any[]) {
          const { error: enrollErr } = await supabase
            .from("enrollments")
            .upsert(
              { user_id: u.user_id, course_id: courseId },
              { onConflict: "user_id,course_id", ignoreDuplicates: true },
            );
          if (enrollErr) {
            if ((enrollErr as any).code === "23514" || /outra eletiva/i.test(enrollErr.message)) {
              conflicts.push(String(u.email).toLowerCase());
              continue;
            }
            throw enrollErr;
          }
        }
        // marca convites como claimed só para quem foi de fato matriculado
        const enrolledEmails = (matched as any[])
          .map((u) => String(u.email).toLowerCase())
          .filter((e) => !conflicts.includes(e));
        if (enrolledEmails.length > 0) {
          await supabase
            .from("course_invites")
            .update({ claimed_at: new Date().toISOString() })
            .eq("course_id", courseId)
            .in("email_normalized", enrolledEmails);
        }
      }

      // enrollments futuros virão automaticamente no signup pelo trigger.
      return { total: list.length, conflicts };
    },
    onSuccess: (res) => {
      toast.success(`${res.total} convite(s) enviado(s)`);
      if (res.conflicts.length > 0) {
        toast.error(
          `${res.conflicts.length} já matriculado(s) em outra eletiva – não migrado(s): ${res.conflicts.join(", ")}`,
          { duration: 8000 },
        );
      }
      setEmails("");
      qc.invalidateQueries({ queryKey: ["course-invites", courseId] });
    },
    onError: (e: any) => toast.error(e.message ?? "erro ao convidar"),
  });

  const removeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course-invites", courseId] }),
  });

  const sendInviteEmails = useMutation({
    mutationFn: async (opts: { onlyUnclaimed: boolean; extras?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("send-course-invites-batch", {
        body: {
          course_id: courseId,
          only_unclaimed: opts.onlyUnclaimed,
          extra_recipients: opts.extras ?? [],
        },
      });
      if (error) throw error;
      return data as { queued: number; total: number; errors: { email: string; error: string }[] };
    },
    onSuccess: (res) => {
      toast.success(`${res.queued} convite(s) por email enfileirado(s)`);
      if (res.errors?.length) {
        toast.error(`${res.errors.length} falha(s): ${res.errors.slice(0, 3).map(e => e.email).join(", ")}`, { duration: 8000 });
      }
      qc.invalidateQueries({ queryKey: ["course-invites", courseId] });
    },
    onError: (e: any) => toast.error(e.message ?? "erro ao enviar convites"),
  });

  return (
    <div className="p-5 rounded-lg border border-perestroika-preto/10 bg-white space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4" />
        <h3 className="font-display text-lg uppercase">convites por email</h3>
      </div>
      <p className="font-body text-xs text-perestroika-preto/60">
        cole emails (um por linha, vírgula ou espaço). quando o estudante fizer signup com esse email, vira matrícula.
      </p>
      <Textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="aluno1@escola.br&#10;aluno2@escola.br"
        rows={4}
        className="font-body text-sm"
      />
      <Button
        onClick={() => addInvites.mutate(emails)}
        disabled={!emails.trim() || addInvites.isPending}
        className="w-full"
      >
        {addInvites.isPending ? "convidando..." : "convidar"}
      </Button>

      <div className="pt-2 border-t border-perestroika-preto/10 space-y-2">
        <p className="font-body text-xs text-perestroika-preto/60">
          dispara o email de convite "entrar na nachesu" pra todo mundo da lista que ainda não logou.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const pending = invites.filter((i: any) => !i.claimed_at).length;
            if (!confirm(`enviar email de convite pra ${pending} estudante(s) que ainda não logou?`)) return;
            sendInviteEmails.mutate({ onlyUnclaimed: true });
          }}
          disabled={sendInviteEmails.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {sendInviteEmails.isPending ? "enviando..." : "enviar email pra quem não logou"}
        </Button>
      </div>



      <div className="space-y-1 max-h-80 overflow-auto">
        <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/55">
          {invites.length} convite(s)
        </p>
        {invites.map((i: any) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-2 py-1.5 border-b border-perestroika-preto/5"
          >
            <span className="font-body text-sm truncate">{i.email_normalized}</span>
            <div className="flex items-center gap-2 shrink-0">
              {i.claimed_at ? (
                <Badge variant="secondary" className="text-[10px]">matriculado</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">aguardando</Badge>
              )}
              <button
                type="button"
                onClick={() => removeInvite.mutate(i.id)}
                className="font-body text-xs text-perestroika-preto/50 hover:text-perestroika-vermelho"
              >
                remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModulesPanel({ courseId }: { courseId: string }) {
  const qc = useQueryClient();

  const { data: modules = [] } = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, trail_id, number, order_index, title, published, trails!inner(id, title, course_id)")
        .eq("trails.course_id", courseId)
        .order("number");
      if (error) throw error;
      return (data ?? []) as ModuleRow[];
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ moduleId, published }: { moduleId: string; published: boolean }) => {
      const { error } = await supabase
        .from("modules")
        .update({ published })
        .eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-modules", courseId] });
      toast.success("visibilidade atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "erro"),
  });

  return (
    <div className="p-5 rounded-lg border border-perestroika-preto/10 bg-white space-y-4">
      <div className="flex items-center gap-2">
        <Unlock className="h-4 w-4" />
        <h3 className="font-display text-lg uppercase">publicação de módulos</h3>
      </div>
      <p className="font-body text-xs text-perestroika-preto/60">
        clique pra publicar/despublicar. estudante matriculado vê na hora.
      </p>

      <div className="space-y-1 max-h-[480px] overflow-auto">
        {modules.map((m) => {
          const published = m.published;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 py-2 border-b border-perestroika-preto/5"
            >
              <div className="min-w-0">
                <p className="font-body text-sm truncate">
                  <span className="font-mono text-xs text-perestroika-preto/50">#{m.number}</span>{" "}
                  {m.title}
                </p>
                <p className="font-body text-[11px] text-perestroika-preto/50">
                  {m.trails?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePublished.mutate({ moduleId: m.id, published: !published })}
                disabled={togglePublished.isPending}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-body uppercase tracking-wide border ${
                  published
                    ? "bg-perestroika-rosa/10 border-perestroika-rosa/30 text-perestroika-vermelho"
                    : "bg-transparent border-perestroika-preto/20 text-perestroika-preto/60"
                }`}
              >
                {published ? (
                  <>
                    <Unlock className="h-3 w-3" /> publicado
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" /> rascunho
                  </>
                )}
              </button>
            </div>
          );
        })}
        {modules.length === 0 && (
          <p className="font-body text-xs text-perestroika-preto/50">
            nenhum módulo nessa eletiva ainda.
          </p>
        )}
      </div>
    </div>
  );
}

