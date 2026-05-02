import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Map, MessageCircleHeart } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** rota é considerada ativa quando começa com esse prefixo */
  matchPrefix?: string;
}

const items: NavItem[] = [
  { to: "/app", label: "início", icon: <Home className="h-5 w-5" /> },
  { to: "/app/trilhas", label: "trilhas", icon: <Map className="h-5 w-5" />, matchPrefix: "/app/trilhas" },
  { to: "/app/hub", label: "hub", icon: <LayoutGrid className="h-5 w-5" />, matchPrefix: "/app/hub" },
  { to: "/app/feedback-final", label: "pesquisa", icon: <MessageCircleHeart className="h-5 w-5" /> },
];

const isActive = (pathname: string, item: NavItem) => {
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
  return pathname === item.to;
};

/**
 * barra fixa inferior, só mobile (sm-).
 * desktop continua usando o PageHeader.
 *
 * altura dela é exposta em --mobile-nav-h (inclui safe-area inset)
 * pra que páginas + FAB consigam reservar espaço sem chutar pixel.
 */
export const MobileNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-perestroika-preto/10 bg-perestroika-bege/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2.5 font-body text-[10px] uppercase tracking-wider transition-colors ${
                  active
                    ? "text-perestroika-preto"
                    : "text-perestroika-preto/55 hover:text-perestroika-preto"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={active ? "text-perestroika-laranja" : ""}>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
