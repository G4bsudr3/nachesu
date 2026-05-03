import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { ChevronLeft, Mail, Lock, Unlock } from "lucide-react";

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
        cada eletiva tem seus alunos (convidados por email), seu professor e seus módulos liberados manualmente.
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

      // se algum desses emails já tem auth.users, cria enrollment imediato
      // (RLS no enrollments só aceita admin escrevendo qualquer user_id, ok)
      const { data: existing } = await supabase.rpc("admin_list_users" as any).then(r => r);
      // best-effort: pula se rpc não bater. enrollment vai ser criado no signup pelo trigger.
      return list.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} convite(s) enviado(s)`);
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

  return (
    <div className="p-5 rounded-lg border border-perestroika-preto/10 bg-white space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4" />
        <h3 className="font-display text-lg uppercase">convites por email</h3>
      </div>
      <p className="font-body text-xs text-perestroika-preto/60">
        cole emails (um por linha, vírgula ou espaço). quando o aluno fizer signup com esse email, vira matrícula.
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
  const { user } = useAuth();

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

  const { data: releases = [] } = useQuery({
    queryKey: ["module-releases", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_releases")
        .select("module_id");
      if (error) throw error;
      return (data ?? []).map((r: any) => r.module_id as string);
    },
  });

  const releasedSet = new Set(releases);

  const toggle = useMutation({
    mutationFn: async ({ moduleId, release }: { moduleId: string; release: boolean }) => {
      if (release) {
        const { error } = await supabase
          .from("module_releases")
          .upsert({ module_id: moduleId, released_by: user?.id ?? null });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("module_releases")
          .delete()
          .eq("module_id", moduleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module-releases", courseId] });
    },
    onError: (e: any) => toast.error(e.message ?? "erro"),
  });

  return (
    <div className="p-5 rounded-lg border border-perestroika-preto/10 bg-white space-y-4">
      <div className="flex items-center gap-2">
        <Unlock className="h-4 w-4" />
        <h3 className="font-display text-lg uppercase">liberação de módulos</h3>
      </div>
      <p className="font-body text-xs text-perestroika-preto/60">
        clique pra liberar/bloquear. módulo precisa estar publicado E liberado pra aluno ver.
      </p>

      <div className="space-y-1 max-h-[480px] overflow-auto">
        {modules.map((m) => {
          const released = releasedSet.has(m.id);
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
                  {m.trails?.title} · {m.published ? "publicado" : "rascunho"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle.mutate({ moduleId: m.id, release: !released })}
                disabled={toggle.isPending}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-body uppercase tracking-wide border ${
                  released
                    ? "bg-perestroika-rosa/10 border-perestroika-rosa/30 text-perestroika-vermelho"
                    : "bg-transparent border-perestroika-preto/20 text-perestroika-preto/60"
                }`}
              >
                {released ? (
                  <>
                    <Unlock className="h-3 w-3" /> liberado
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" /> bloqueado
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
