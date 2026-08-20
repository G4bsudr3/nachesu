import { Link } from "react-router-dom";
import { KeyRound, UserRound, Mail, Calendar, ShieldCheck, Hash, IdCard, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fnErrorInfo, refSuffix } from "@/lib/fnError";
import { Badge } from "@/components/ui/badge";
import type { StudentProfile } from "./useStudentProfile";
import { logger } from "@/lib/logger";
import { useStudentRoster } from "@/hooks/useStudentRoster";


const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

interface Props {
  userId: string;
  profile: StudentProfile;
}

export const StudentProfileHeader = ({ userId, profile }: Props) => {
  const [busy, setBusy] = useState(false);
  const { lookup } = useStudentRoster();
  const roster = lookup(profile.email);
  const codigo = profile.profile?.nickname ?? profile.profile?.display_name ?? null;
  const name =
    roster?.full_name ??
    profile.profile?.display_name ??
    profile.profile?.nickname ??
    profile.email ??
    userId.slice(0, 8);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");


  const resetPassword = async () => {
    if (
      !confirm(
        `gerar uma senha nova pra ${profile.email ?? name}? ela aparece uma vez só, copie e mande pra pessoa.`,
      )
    )
      return;

    // senha aleatória de 12 chars (sem ambíguos 0/O/1/l) — SEC-05: nada de senha padrão
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const newPassword = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { target_user_id: userId, new_password: newPassword },
    });
    if (error || (data as { error?: string })?.error) {
      const info = await fnErrorInfo(error, data);
      logger.error("[admin/student] reset:", error ?? data);
      toast.error(info.message ?? "não rolou redefinir a senha", { description: refSuffix(info) });
    } else {
      try {
        await navigator.clipboard.writeText(newPassword);
      } catch {
        // sem clipboard: tudo bem, a senha já aparece no toast
      }
      toast.success(`senha nova de ${profile.email ?? name}`, {
        description: `${newPassword} (copiada pra área de transferência)`,
        duration: 20000,
      });
    }
    setBusy(false);
  };

  return (
    <header className="rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege/60 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-perestroika-preto text-perestroika-bege font-display text-2xl uppercase">
          {profile.profile?.avatar_url ? (
            <img
              src={profile.profile.avatar_url}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials || <UserRound className="h-7 w-7" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-none break-words">
            {name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-perestroika-preto/70">
            {codigo && roster?.full_name && (
              <span className="inline-flex items-center gap-1.5 uppercase tracking-wide">
                <Hash className="h-3.5 w-3.5" /> {codigo}
              </span>
            )}
            {roster?.ra && (
              <span className="inline-flex items-center gap-1.5 uppercase tracking-wide">
                <IdCard className="h-3.5 w-3.5" /> ra {roster.ra}
              </span>
            )}
            {roster?.turma && (
              <span className="inline-flex items-center gap-1.5 uppercase tracking-wide">
                <GraduationCap className="h-3.5 w-3.5" /> {roster.turma}
              </span>
            )}
            {profile.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {profile.email}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> entrou em {formatDate(profile.profile?.created_at ?? null)}
            </span>
          </div>


          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge className="bg-perestroika-preto/5 text-perestroika-preto">
              {profile.profile?.status ?? "active"}
            </Badge>
            {profile.roles.map((r) => (
              <Badge
                key={r}
                className={
                  r === "admin"
                    ? "bg-gradient-small text-perestroika-preto"
                    : "bg-perestroika-preto/5 text-perestroika-preto"
                }
              >
                {r}
              </Badge>
            ))}
            {profile.enrollments.map((e) => (
              <Badge
                key={e.id}
                variant="outline"
                className="border-perestroika-preto/30 text-perestroika-preto/75"
              >
                {e.course?.title ?? "curso"}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={resetPassword}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/15 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40 transition-colors"
          >
            <KeyRound className="h-4 w-4" /> resetar senha
          </button>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 rounded-full text-xs uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> voltar
          </Link>
        </div>
      </div>
    </header>
  );
};
