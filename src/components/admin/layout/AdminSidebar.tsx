import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  Home,
  BookOpen,
  ClipboardCheck,
  Compass,
  Brain,
  Inbox,
  Mail,
  Package,
  Hourglass,
  AlertTriangle,
  Users,
  Bell,
  ClipboardList,
  Settings,
  LogOut,
  Eye,
  History,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";

type Item = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "pendentes";
};


type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "visão geral",
    items: [
      { to: "/admin", label: "início", icon: Home, exact: true },
      { to: "/admin/auditoria", label: "auditoria", icon: History },
    ],
  },
  {
    title: "eletivas & conteúdo",
    items: [
      { to: "/admin/eletivas", label: "eletivas", icon: BookOpen },
      { to: "/admin/eletiva/ia-na-pratica/modulos", label: "ia na prática · módulos", icon: BookOpen },
      { to: "/admin/eletiva/economia-circular/modulos", label: "economia circular · módulos", icon: BookOpen },
      { to: "/admin/publicacao", label: "publicação", icon: Eye },
      { to: "/admin/review", label: "revisão de conteúdo", icon: ClipboardCheck },
      { to: "/admin/trilha", label: "trilha", icon: Compass },
      { to: "/admin/materiais", label: "materiais", icon: Package },
    ],
  },
  {
    title: "entregas dos estudantes",
    items: [
      { to: "/admin/entregas", label: "entregas", icon: Inbox, badge: "pendentes" },
      { to: "/admin/pending", label: "pendentes", icon: Hourglass },
      { to: "/admin/risco", label: "risco", icon: AlertTriangle },
    ],
  },

  {
    title: "comunicação",
    items: [
      { to: "/admin/convites", label: "convites · email", icon: Mail },
      { to: "/admin/notificacoes", label: "notificações & e-mails", icon: Bell },
      { to: "/admin/nudges", label: "nudges", icon: Bell },
    ],
  },
  {
    title: "configurações",
    items: [
      { to: "/admin/usuarios", label: "usuários", icon: Users },
      { to: "/admin/rubricas", label: "rubricas", icon: ClipboardList },
      { to: "/admin/tutor", label: "tutor IA", icon: Brain },
      { to: "/admin/eletiva", label: "settings", icon: Settings },
    ],
  },
];

export const ADMIN_NAV_ITEMS: Item[] = SECTIONS.flatMap((s) => s.items);

export const AdminSidebar = ({
  onNavigate,
}: {
  onNavigate?: () => void;
}) => {
  const { signOut } = useAuth();

  // contagem de entregas aguardando correção, pra sinalizar trabalho pendente
  const { data: pendentes = 0 } = useQuery({
    queryKey: ["admin-entregas-pendentes"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("module_deliverables")
        .select("id", { count: "exact", head: true })
        .eq("status", "enviado");
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

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
      {i.badge === "pendentes" && pendentes > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-perestroika-laranja text-perestroika-bege px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {pendentes}
        </span>
      )}
    </NavLink>
  );



  return (
    <div className="h-full flex flex-col bg-perestroika-bege border-r border-perestroika-preto/10">
      <div className="px-4 pt-5 pb-3">
        <p className="font-body text-[10px] uppercase tracking-[0.22em] text-perestroika-preto/45">
          NachesU · admin
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pt-2 pb-1.5 font-body text-[10px] uppercase tracking-wider text-perestroika-preto/40">
              {section.title}
            </p>
            <div className="space-y-0.5">{section.items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-perestroika-preto/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-perestroika-preto/55">
          <EletivaSymbol pose="thinking" size={28} />
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
