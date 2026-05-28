import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Link2, Sparkles, Search } from "lucide-react";
import { OPERACAO, LEGADO } from "./layout/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminInsight } from "@/hooks/useAdminInsight";

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

  const run = (fn: () => void | Promise<void>) => async () => {
    onOpenChange(false);
    await fn();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="busca de comandos"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-perestroika-preto/40 backdrop-blur-sm"
      overlayClassName="hidden"
      contentClassName="w-full max-w-lg bg-perestroika-bege rounded-2xl border border-perestroika-preto/15 shadow-2xl overflow-hidden"
    >
      <div className="w-full max-w-lg bg-perestroika-bege rounded-2xl border border-perestroika-preto/15 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-perestroika-preto/10">
          <Search className="w-4 h-4 text-perestroika-preto/40" />
          <Command.Input
            placeholder="busca seção, ação…"
            className="flex-1 h-12 bg-transparent outline-none font-body text-sm text-perestroika-preto placeholder:text-perestroika-preto/40"
          />
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-[12px] text-perestroika-preto/50">
            nada por aqui
          </Command.Empty>

          <Command.Group heading="ir para" className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-perestroika-preto/40">
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

          <Command.Group heading="legado" className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-perestroika-preto/40">
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

          <Command.Group heading="ações" className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-perestroika-preto/40">
            <Command.Item
              value="acao regenerar resumo ia insight"
              disabled={busy}
              onSelect={run(async () => {
                setBusy(true);
                try {
                  await regenerate();
                  toast.success("resumo atualizado");
                } catch (e: any) {
                  toast.error("não consegui gerar", { description: e?.message?.slice(0, 120) });
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
      </div>
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
