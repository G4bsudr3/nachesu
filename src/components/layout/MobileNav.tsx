import { Link, useLocation } from "react-router-dom";
import { Bell, Home, Map, Sparkles } from "lucide-react";
import { FeedbackBadge } from "@/components/dashboard/FeedbackBadge";
import { useNotifications } from "@/features/notifications/useNotifications";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
  showFeedbackBadge?: boolean;
  unreadCount?: number;
}

const isActive = (pathname: string, item: NavItem) => {
  if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
  return pathname === item.to;
};

/**
 * barra fixa inferior, só mobile (sm-). desktop usa o PageHeader.
 * altura exposta em --mobile-nav-h (inclui safe-area inset).
 */
export const MobileNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const items: NavItem[] = [
    { to: "/app", label: "início", icon: <Home className="h-5 w-5" />, showFeedbackBadge: true },
    { to: "/app/trilhas", label: "trilhas", icon: <Map className="h-5 w-5" />, matchPrefix: "/app/trilhas" },
    { to: "/app/tutor", label: "tutor", icon: <Sparkles className="h-5 w-5" />, matchPrefix: "/app/tutor" },
  ];

  if (user) {
    items.push({
      to: "/app/notificacoes",
      label: "avisos",
      icon: <Bell className="h-5 w-5" />,
      matchPrefix: "/app/notificacoes",
      unreadCount,
    });
  }


  const cols =
    items.length === 5 ? "grid-cols-5" : items.length === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <nav
      aria-label="navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-perestroika-preto/10 bg-perestroika-bege/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className={`grid ${cols}`}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          const showCount = (item.unreadCount ?? 0) > 0;
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
                aria-label={
                  showCount ? `${item.label} (${item.unreadCount} não lidas)` : undefined
                }
              >
                <span className={`relative ${active ? "text-perestroika-laranja" : ""}`}>
                  {item.icon}
                  {item.showFeedbackBadge && <FeedbackBadge />}
                  {showCount && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-perestroika-vermelho text-white font-body font-bold text-[9px] leading-[16px] text-center"
                    >
                      {item.unreadCount! > 9 ? "9+" : item.unreadCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
