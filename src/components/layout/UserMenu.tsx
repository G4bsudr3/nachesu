import { Link } from "react-router-dom";
import { LogOut, Settings, User as UserIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  className?: string;
}

const getInitials = (name: string, email?: string | null) => {
  const source = (name || email?.split("@")[0] || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * menu de perfil do usuário logado. avatar com iniciais + nickname (desktop),
 * abre popover com atalhos pra conta, admin (se tiver) e sair.
 */
export const UserMenu = ({ className }: UserMenuProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { data: dashboard } = useDashboardData();

  if (!user) return null;

  const nickname = dashboard?.nicknameDisplay ?? user.email?.split("@")[0] ?? "builder";
  const initials = getInitials(nickname, user.email);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="abrir menu do perfil"
          className={cn(
            "group inline-flex items-center gap-2 min-h-11 pl-1 pr-2 sm:pr-3 rounded-full",
            "bg-perestroika-preto/[0.04] hover:bg-perestroika-preto/[0.08] transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege",
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-perestroika-preto text-perestroika-bege font-display text-sm tracking-wider"
          >
            {initials}
          </span>
          <span className="hidden sm:inline font-body text-sm text-perestroika-preto truncate max-w-[120px]">
            {nickname}
          </span>
          <ChevronDown className="hidden sm:block h-4 w-4 text-perestroika-preto/60 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-0 border border-perestroika-preto/10 bg-perestroika-bege text-perestroika-preto shadow-xl rounded-2xl overflow-hidden"
      >
        {/* header do perfil */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-perestroika-preto/10">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-perestroika-preto text-perestroika-bege font-display text-sm tracking-wider shrink-0"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="font-body text-sm font-semibold text-perestroika-preto truncate">
              {nickname}
            </p>
            <p className="font-body text-xs text-perestroika-preto/60 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* itens do menu */}
        <nav className="py-1.5" aria-label="menu do perfil">
          <MenuLink to="/app/conta" icon={<UserIcon className="h-4 w-4" />} label="minha conta" />
          <MenuLink to="/app/conta" icon={<Settings className="h-4 w-4" />} label="configurações" />
          {isAdmin && (
            <MenuLink
              to="/admin"
              icon={<Shield className="h-4 w-4" />}
              label="painel admin"
            />
          )}
          <div className="my-1.5 h-px bg-perestroika-preto/10" />
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-perestroika-vermelho hover:bg-perestroika-preto/[0.06] transition-colors focus-visible:outline-none focus-visible:bg-perestroika-preto/[0.06]"
          >
            <LogOut className="h-4 w-4" />
            <span>sair</span>
          </button>
        </nav>
      </PopoverContent>
    </Popover>
  );
};

const MenuLink = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-perestroika-preto hover:bg-perestroika-preto/[0.06] transition-colors focus-visible:outline-none focus-visible:bg-perestroika-preto/[0.06]"
  >
    <span className="text-perestroika-preto/70">{icon}</span>
    <span>{label}</span>
  </Link>
);
