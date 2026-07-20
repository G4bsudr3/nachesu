import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * ações padrão do header em toda experiência logada:
 * painel admin (se aplicável) + UserMenu à direita.
 */
export const AuthedHeaderActions = ({ showAdmin = true }: { showAdmin?: boolean }) => {
  const { isAdmin } = useUserRole();
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {showAdmin && isAdmin && (
        <Link
          to="/admin"
          aria-label="painel admin"
          className="inline-flex items-center gap-2 min-h-11 px-3 rounded-full border border-perestroika-preto/15 bg-perestroika-preto/[0.04] hover:bg-perestroika-preto/[0.08] font-body text-sm text-perestroika-preto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
        >
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">painel admin</span>
        </Link>
      )}
      <UserMenu />
    </div>
  );
};
