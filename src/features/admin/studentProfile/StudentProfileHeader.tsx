import { Link } from "react-router-dom";
import { KeyRound, UserRound, Mail, Calendar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { StudentProfile } from "./useStudentProfile";
import { logger } from "@/lib/logger";

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
  const name =
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
    if (!confirm(`redefinir a senha de ${profile.email ?? name} para "chora2026"?`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { target_user_id: userId, new_password: "chora2026" },
    });
    if (error || (data as { error?: string })?.error) {
      logger.error("[admin/student] reset:", error ?? data);
      toast.error("não rolou redefinir a senha");
    } else {
      toast.success("senha redefinida para chora2026");
    }
    setBusy(false);
  };

  return (
    <header className="rounded-2xl border border-perestroika-preto/10 bg-white/60 p-6">
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
            className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40 transition-colors"
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
