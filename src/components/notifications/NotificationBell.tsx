import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { useNotifications, AppNotification } from "@/features/notifications/useNotifications";
import { useAuth } from "@/contexts/AuthContext";

const kindAccent: Record<AppNotification["kind"], string> = {
  deliverable_reviewed: "bg-perestroika-rosa",
  module_released: "bg-perestroika-azul",
  evasion_nudge: "bg-perestroika-laranja",
  system: "bg-perestroika-preto/40",
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const { items, unreadCount, markRead, markAllRead, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const handleClick = async (n: AppNotification) => {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const recent = items.slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
          className="relative inline-flex items-center justify-center min-h-11 min-w-11 rounded-full hover:bg-perestroika-preto/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege transition-colors"
        >
          <Bell className="h-5 w-5 text-perestroika-preto" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-perestroika-vermelho text-white font-body font-bold text-[10px] leading-[18px] text-center"
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] p-0 bg-perestroika-bege border-perestroika-preto/15"
      >
        <div className="flex items-center justify-between p-3 border-b border-perestroika-preto/15">
          <span className="font-display text-lg uppercase tracking-wide text-perestroika-preto">
            notificações
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-body text-perestroika-preto/65 hover:text-perestroika-preto"
            >
              <Check className="h-3.5 w-3.5" />
              marcar tudo
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center font-body text-sm text-perestroika-preto/55">
              carregando...
            </div>
          ) : recent.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-body text-sm text-perestroika-preto/65">
                nada por aqui ainda.
              </p>
              <p className="font-body text-xs text-perestroika-preto/45 mt-1">
                avisos da eletiva aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-perestroika-preto/10">
              {recent.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left p-3 flex gap-3 hover:bg-perestroika-preto/5 transition-colors",
                      !n.read_at && "bg-perestroika-bege",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 mt-1.5 w-2 h-2 rounded-full",
                        kindAccent[n.kind],
                        n.read_at && "opacity-30",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-body text-sm text-perestroika-preto truncate",
                          !n.read_at && "font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="font-body text-xs text-perestroika-preto/65 line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="font-body text-[11px] text-perestroika-preto/45 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-2 border-t border-perestroika-preto/15">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-center font-body text-xs uppercase tracking-wide"
            onClick={() => setOpen(false)}
          >
            <Link to="/app/notificacoes">ver tudo</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
