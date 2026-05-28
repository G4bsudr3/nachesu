import { NavLink, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  Home,
  BookOpen,
  ClipboardCheck,
  Compass,
  Brain,
  Inbox,
  Package,
  Hourglass,
  AlertTriangle,
  Users,
  Bell,
  ClipboardList,
  Settings,
  Archive,
  ChevronDown,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

type Item = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export const OPERACAO: Item[] = [
  { to: "/admin", label: "início", icon: Home, exact: true },
  { to: "/admin/eletivas", label: "eletivas", icon: BookOpen },
  { to: "/admin/review", label: "revisão", icon: ClipboardCheck },
  { to: "/admin/trilha", label: "trilha", icon: Compass },
  { to: "/admin/tutor", label: "tutor IA", icon: Brain },
  { to: "/admin/feedback", label: "feedback", icon: Inbox },
  { to: "/admin/pending", label: "pendentes", icon: Hourglass },
  { to: "/admin/materiais", label: "materiais", icon: Package },
  { to: "/admin/risco", label: "risco", icon: AlertTriangle },
  { to: "/admin/usuarios", label: "usuários", icon: Users },
  { to: "/admin/nudges", label: "nudges", icon: Bell },
  { to: "/admin/rubricas", label: "rubricas", icon: ClipboardList },
  { to: "/admin/eletiva", label: "settings", icon: Settings },
];

export const LEGADO: Item[] = [
  { to: "/admin/legado/fbi", label: "fbi" , icon: Archive },
  { to: "/admin/legado/prework", label: "pré-work", icon: Archive },
  { to: "/admin/legado/missoes", label: "missões", icon: Archive },
  { to: "/admin/legado/cartas", label: "cartas", icon: Archive },
  { to: "/admin/legado/artworks", label: "artworks", icon: Archive },
  { to: "/admin/legado/convidados", label: "convidados", icon: Archive },
  { to: "/admin/legado/emails", label: "emails", icon: Archive },
  { to: "/admin/legado/feedback-d1", label: "feedback dia 1", icon: Archive },
  { to: "/admin/legado/feedback-final", label: "pesquisa final", icon: Archive },
  { to: "/admin/legado/carta-futuro", label: "carta futuro", icon: Archive },
  { to: "/admin/legado/votacao-projetos", label: "votação projetos", icon: Archive },
  { to: "/admin/legado/chora-bot", label: "chora bot", icon: Archive },
];

export const AdminSidebar = ({
  onNavigate,
}: {
  onNavigate?: () => void;
}) => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const inLegacy = pathname.startsWith("/admin/legado");
  const [openLegacy, setOpenLegacy] = useState(inLegacy);

  const renderItem = (i: Item) => (
    <NavLink
      key={i.to}
      to={i.to}
      end={i.exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
          "text-perestroika-preto/70 hover:text-perestroika-preto hover:bg-perestroika-preto/5",
          isActive && "bg-perestroika-preto/10 text-perestroika-preto font-medium",
        )
      }
    >
      <i.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{i.label}</span>
    </NavLink>
  );

  return (
    <div className="h-full flex flex-col bg-perestroika-bege border-r border-perestroika-preto/10">
      <div className="px-4 pt-5 pb-3">
        <p className="font-body text-[10px] uppercase tracking-[0.22em] text-perestroika-preto/45">
          NachesU · admin
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        <p className="px-3 pt-2 pb-1 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/40">
          operação
        </p>
        {OPERACAO.map(renderItem)}

        <div className="pt-3">
          <button
            type="button"
            onClick={() => setOpenLegacy((v) => !v)}
            className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] uppercase tracking-wide text-perestroika-preto/45 hover:text-perestroika-preto transition-colors"
          >
            <span>legado Chŏra</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", !openLegacy && "-rotate-90")} />
          </button>
          {openLegacy && <div className="space-y-1 mt-1">{LEGADO.map(renderItem)}</div>}
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-perestroika-preto/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-perestroika-preto/55">
          <EletivaSymbol pose="thinking" size={28} />
          <kbd className="rounded border border-perestroika-preto/20 px-1.5 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto"
        >
          <LogOut className="w-3.5 h-3.5" />
          sair
        </button>
      </div>
    </div>
  );
};
