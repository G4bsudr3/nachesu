import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Link2, Sparkles, Search, UserCheck, User } from "lucide-react";
import { OPERACAO, LEGADO } from "./layout/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminInsight } from "@/hooks/useAdminInsight";
import { supabase } from "@/integrations/supabase/client";

type StudentHit = { user_id: string; email: string | null; display_name: string | null; nickname: string | null };

export const CommandPalette = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { regenerate } = useAdminInsight();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const trimmed = query.trim();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (cancelled) return;
      if (error || !data) {
        setHits([]);
        return;
      }
      const q = trimmed.toLowerCase();
      const filtered = (data as Array<{ user_id: string; email: string | null; display_name: string | null; nickname: string | null }>)
        .filter((u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.display_name ?? "").toLowerCase().includes(q) ||
          (u.nickname ?? "").toLowerCase().includes(q),
        )
        .slice(0, 6)
        .map((u) => ({ user_id: u.user_id, email: u.email, display_name: u.display_name, nickname: u.nickname }));
      setHits(filtered);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed]);

  const run = (fn: () => void | Promise<void>) => async () => {
    onOpenChange(false);
    await fn();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="busca de comandos"
      overlayClassName="fixed inset-0 z-[100] bg-perestroika-preto/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      contentClassName="fixed left-1/2 top-[14vh] z-[101] w-[92vw] max-w-lg -translate-x-1/2 bg-perestroika-bege rounded-2xl border border-perestroika-preto/15 shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
    >
      <div className="flex items-center gap-2 px-4 border-b border-perestroika-preto/10">
        <Search className="w-4 h-4 text-perestroika-preto/40" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="busca seção, ação ou estudante (email, nome)…"
          className="flex-1 h-12 bg-transparent outline-none font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/40"
        />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-perestroika-preto/40">
        <Command.Empty className="px-3 py-6 text-center text-[12px] text-perestroika-preto/50">
          nada por aqui
        </Command.Empty>

        {hits.length > 0 && (
          <Command.Group heading="estudantes">
            {hits.map((s) => {
              const name = s.display_name || s.nickname || s.email || s.user_id;
              return (
                <Command.Item
                  key={s.user_id}
                  value={`estudante ${s.email ?? ""} ${s.display_name ?? ""} ${s.nickname ?? ""} ${s.user_id}`}
                  onSelect={run(() => navigate(`/admin/aluno/${s.user_id}`))}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/80 cursor-pointer aria-selected:bg-perestroika-preto/10"
                >
                  <User className="w-4 h-4" />
                  <span className="truncate">{name}</span>
                  {s.email && s.email !== name && (
                    <span className="ml-auto text-[11px] text-perestroika-preto/40 truncate max-w-[40%]">{s.email}</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        <Command.Group heading="ir para">
          {OPERACAO.map((i) => (
            <Command.Item
              key={i.to}
              value={`op ${i.label} ${i.to}`}
              onSelect={run(() => navigate(i.to))}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/80 cursor-pointer aria-selected:bg-perestroika-preto/10"
            >
              <i.icon className="w-4 h-4" />
              {i.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="legado">
          {LEGADO.map((i) => (
            <Command.Item
              key={i.to}
              value={`legado ${i.label} ${i.to}`}
              onSelect={run(() => navigate(i.to))}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/70 cursor-pointer aria-selected:bg-perestroika-preto/10"
            >
              <i.icon className="w-4 h-4" />
              {i.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="ações">
          <Command.Item
            value="acao aprovar proximo pendente"
            disabled={busy}
            onSelect={run(async () => {
              setBusy(true);
              try {
                const { data, error } = await supabase.rpc("admin_list_pending_profiles");
                if (error) throw error;
                const next = (data ?? [])[0] as { user_id: string; email: string } | undefined;
                if (!next) {
                  toast("nenhum pendente na fila");
                  return;
                }
                const { error: rpcError } = await (
                  supabase as unknown as {
                    rpc: (n: string, a: Record<string, unknown>) => Promise<{ error: Error | null }>;
                  }
                ).rpc("admin_set_profile_status", {
                  _user_id: next.user_id,
                  _status: "active",
                });
                if (rpcError) throw rpcError;
                toast.success(`${next.email} aprovado`);
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                toast.error("não rolou aprovar", { description: msg.slice(0, 120) });
              } finally {
                setBusy(false);
              }
            })}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/80 cursor-pointer aria-selected:bg-perestroika-preto/10"
          >
            <UserCheck className="w-4 h-4" />
            aprovar próximo pendente
          </Command.Item>
          <Command.Item
            value="acao regenerar resumo ia insight"
            disabled={busy}
            onSelect={run(async () => {
              setBusy(true);
              try {
                await regenerate();
                toast.success("resumo atualizado");
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                toast.error("não consegui gerar", { description: msg.slice(0, 120) });
              } finally {
                setBusy(false);
              }
            })}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/80 cursor-pointer aria-selected:bg-perestroika-preto/10"
          >
            <Sparkles className="w-4 h-4" />
            regenerar resumo da semana
          </Command.Item>
          <Command.Item
            value="acao copiar link"
            onSelect={run(async () => {
              const url = `${window.location.origin}${pathname}`;
              try {
                await navigator.clipboard.writeText(url);
                toast.success("link copiado");
              } catch {
                toast.error("não consegui copiar");
              }
            })}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/80 cursor-pointer aria-selected:bg-perestroika-preto/10"
          >
            <Link2 className="w-4 h-4" />
            copiar link da página atual
          </Command.Item>
          <Command.Item
            value="acao sair logout"
            onSelect={run(() => signOut())}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-perestroika-preto/80 cursor-pointer aria-selected:bg-perestroika-preto/10"
          >
            <LogOut className="w-4 h-4" />
            sair
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};

export const useCommandPaletteHotkey = (setOpen: (v: boolean) => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
};
