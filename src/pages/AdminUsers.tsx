import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Search, Shield, ShieldCheck, ShieldMinus, UserRound, ExternalLink, BookOpen, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fnErrorInfo, refSuffix } from "@/lib/fnError";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { logger } from "@/lib/logger";
import { AdminInviteUserForm } from "@/components/admin/AdminInviteUserForm";

type AdminUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  nickname: string | null;
  status: string | null;
  created_at: string | null;
  roles: string[];
  is_admin: boolean;
  courses: string[];
  course_slugs: string[];
  is_test?: boolean;
};

type AdminListUsersRpc = {
  rpc: (name: "admin_list_users") => Promise<{ data: AdminUser[] | null; error: Error | null }>;
};

const adminRpc = supabase as unknown as AdminListUsersRpc;

const formatDate = (iso: string | null) => {
  if (!iso) return "não informado";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [hideTest, setHideTest] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const mergeTestFlags = async (list: AdminUser[]): Promise<AdminUser[]> => {
    if (list.length === 0) return list;
    const ids = list.map((u) => u.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, is_test")
      .in("user_id", ids);
    const map = new Map<string, boolean>(
      (profs ?? []).map((p: { user_id: string; is_test: boolean | null }) => [p.user_id, !!p.is_test]),
    );
    return list.map((u) => ({ ...u, is_test: map.get(u.user_id) ?? false }));
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await adminRpc.rpc("admin_list_users");

    if (error) {
      logger.error("[admin/users] erro:", error);
      toast.error("não consegui carregar os usuários");
      setUsers([]);
    } else {
      const merged = await mergeTestFlags((data ?? []) as AdminUser[]);
      setUsers(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await adminRpc.rpc("admin_list_users");
      if (cancelled) return;

      if (error) {
        logger.error("[admin/users] erro:", error);
        toast.error("não consegui carregar os usuários");
        setUsers([]);
      } else {
        const merged = await mergeTestFlags((data ?? []) as AdminUser[]);
        if (cancelled) return;
        setUsers(merged);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTest = async (target: AdminUser) => {
    const next = !target.is_test;
    setBusyUserId(target.user_id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_test: next })
      .eq("user_id", target.user_id);
    if (error) {
      logger.error("[admin/users] toggle is_test:", error);
      toast.error("não consegui mexer no marcador");
    } else {
      toast.success(
        next
          ? `${target.email} agora conta como teste (some dos dashboards)`
          : `${target.email} voltou a aparecer nos dashboards`,
      );
      setUsers((prev) =>
        prev.map((u) => (u.user_id === target.user_id ? { ...u, is_test: next } : u)),
      );
    }
    setBusyUserId(null);
  };

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      u.course_slugs.forEach((slug, i) => {
        if (slug && !map.has(slug)) map.set(slug, u.courses[i] ?? slug);
      });
    });
    return Array.from(map.entries());
  }, [users]);

  const domainOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      const d = u.email?.split("@")[1];
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((item) => {
      if (hideTest && item.is_test) return false;
      if (courseFilter === "none") {
        if (item.course_slugs.length > 0) return false;
      } else if (courseFilter !== "all") {
        if (!item.course_slugs.includes(courseFilter)) return false;
      }
      if (domainFilter !== "all") {
        const d = item.email?.split("@")[1];
        if (d !== domainFilter) return false;
      }
      if (!q) return true;
      const haystack = [item.email, item.display_name, item.nickname, item.status, item.roles.join(" "), item.courses.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search, courseFilter, domainFilter, hideTest]);


  const grantAdmin = async (target: AdminUser) => {
    setBusyUserId(target.user_id);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: target.user_id, role: "admin" });

    if (error) {
      logger.error("[admin/users] dar admin:", error);
      toast.error("você precisa ser admin pra mexer nisso");
    } else {
      toast.success(`${target.email} agora é admin`);
      await loadUsers();
    }
    setBusyUserId(null);
  };

  const removeAdmin = async (target: AdminUser) => {
    if (target.user_id === user?.id) {
      toast.error("pra não te trancar pra fora, pede outro admin pra remover seu acesso.");
      return;
    }

    setBusyUserId(target.user_id);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", target.user_id)
      .eq("role", "admin");

    if (error) {
      logger.error("[admin/users] remover admin:", error);
      toast.error("você precisa ser admin pra mexer nisso");
    } else {
      toast.success(`${target.email} não é mais admin`);
      await loadUsers();
    }
    setBusyUserId(null);
  };

  const resetPassword = async (target: AdminUser) => {
    const ok = window.confirm(
      `gerar uma senha nova pra ${target.email}? a senha vai aparecer aqui uma vez só, copie e mande pra pessoa.`,
    );
    if (!ok) return;

    // senha aleatória de 12 chars (sem ambíguos 0/O/1/l)
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const newPassword = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

    setBusyUserId(target.user_id);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { target_user_id: target.user_id, new_password: newPassword },
    });

    if (error || (data as { error?: string })?.error) {
      const info = await fnErrorInfo(error, data);
      logger.error("[admin/users] reset senha:", error ?? data);
      toast.error(info.message ?? "não rolou redefinir a senha", { description: refSuffix(info) });
    } else {
      try {
        await navigator.clipboard.writeText(newPassword);
      } catch {
        // sem clipboard: tudo bem, a senha já apareceu no toast
      }
      toast.success(`senha nova de ${target.email}`, {
        description: `${newPassword} (copiada pra área de transferência)`,
        duration: 20000,
      });
    }
    setBusyUserId(null);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto/5 px-3 py-2 text-xs uppercase tracking-wide text-perestroika-preto/70 mb-4">
            <Shield className="h-4 w-4" />
            permissões reais
          </div>
          <h1 className="font-display uppercase text-5xl sm:text-6xl leading-none">
            usuários
          </h1>
          <p className="mt-3 text-perestroika-preto/70">
            {loading ? "carregando…" : `${filtered.length} de ${users.length} contas no hub`}
          </p>
        </div>
        <AdminInviteUserForm onDone={loadUsers} />
      </div>



      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-perestroika-preto/50" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="buscar por email, nome, nickname, papel ou eletiva…"
            className="pl-9 bg-perestroika-bege/60 border-perestroika-preto/20"
          />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full md:w-56 bg-perestroika-bege/60 border-perestroika-preto/20">
            <SelectValue placeholder="eletiva" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">todas as eletivas</SelectItem>
            <SelectItem value="none">sem matrícula</SelectItem>
            {courseOptions.map(([slug, title]) => (
              <SelectItem key={slug} value={slug}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-full md:w-56 bg-perestroika-bege/60 border-perestroika-preto/20">
            <SelectValue placeholder="domínio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">todos os domínios</SelectItem>
            {domainOptions.map((d) => (
              <SelectItem key={d} value={d}>@{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-wide text-perestroika-preto/65 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={hideTest}
            onChange={(e) => setHideTest(e.target.checked)}
            className="h-4 w-4 rounded border-perestroika-preto/30"
          />
          ocultar contas de teste
        </label>
      </div>


      <div className="rounded-lg border border-perestroika-preto/15 bg-perestroika-bege/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-perestroika-preto/5 hover:bg-perestroika-preto/5">
              <TableHead className="uppercase text-xs tracking-wide">usuário</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">eletiva</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">status</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">papéis</TableHead>
              <TableHead className="uppercase text-xs tracking-wide">criado</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                  carregando usuários…
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-perestroika-preto/50">
                  nenhum usuário com esse filtro.
                </TableCell>
              </TableRow>
            )}

            {!loading && filtered.map((item) => (
              <TableRow key={item.user_id} className="hover:bg-perestroika-preto/5">
                <TableCell className="min-w-64">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-perestroika-preto text-perestroika-bege">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-perestroika-preto">
                        {item.display_name || item.nickname || item.email}
                        {item.is_test && (
                          <span className="ml-2 inline-flex items-center gap-1 align-middle rounded-full bg-perestroika-preto/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-perestroika-preto/70">
                            <FlaskConical className="h-3 w-3" /> teste
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-perestroika-preto/60">{item.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {item.courses.length === 0 ? (
                    <span className="text-xs text-perestroika-preto/40">sem matrícula</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {item.courses.map((title) => (
                        <Badge key={title} className="bg-accent/15 text-accent hover:bg-accent/20 gap-1">
                          <BookOpen className="h-3 w-3" />
                          {title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge className="bg-perestroika-preto/5 text-perestroika-preto hover:bg-perestroika-preto/10">
                    {item.status ?? "sem status"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {item.roles.length === 0 ? (
                      <span className="text-xs text-perestroika-preto/50">sem papel</span>
                    ) : item.roles.map((role) => (
                      <Badge
                        key={role}
                        className={role === "admin"
                          ? "bg-gradient-small text-perestroika-preto"
                          : "bg-perestroika-preto/5 text-perestroika-preto hover:bg-perestroika-preto/10"}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-perestroika-preto/70 whitespace-nowrap">
                  {formatDate(item.created_at)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      to={`/admin/aluno/${item.user_id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" /> perfil
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleTest(item)}
                      disabled={busyUserId === item.user_id}
                      title={item.is_test ? "desmarcar como conta de teste" : "marcar como conta de teste (some dos dashboards)"}
                      className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40 transition-colors"
                    >
                      <FlaskConical className="h-4 w-4" />
                      {item.is_test ? "remover teste" : "marcar teste"}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPassword(item)}
                      disabled={busyUserId === item.user_id}
                      title="gerar senha nova aleatória"
                      className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40 transition-colors"
                    >
                      <KeyRound className="h-4 w-4" />
                      resetar senha
                    </button>
                    {item.is_admin ? (
                      <button
                        type="button"
                        onClick={() => removeAdmin(item)}
                        disabled={busyUserId === item.user_id}
                        className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 px-4 py-2 text-xs uppercase tracking-wide hover:bg-perestroika-preto/5 disabled:opacity-40 transition-colors"
                      >
                        <ShieldMinus className="h-4 w-4" />
                        remover admin
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => grantAdmin(item)}
                        disabled={busyUserId === item.user_id}
                        className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-4 py-2 text-xs uppercase tracking-wide text-perestroika-bege hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        dar admin
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

export default AdminUsers;
