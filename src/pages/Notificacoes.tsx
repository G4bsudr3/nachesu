import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { useNotifications, AppNotification } from "@/features/notifications/useNotifications";
import { cn } from "@/lib/utils";

const kindLabel: Record<AppNotification["kind"], string> = {
  deliverable_reviewed: "entrega revisada",
  module_released: "módulo novo",
  evasion_nudge: "mensagem do educador",
  system: "aviso",
};

const kindAccent: Record<AppNotification["kind"], string> = {
  deliverable_reviewed: "bg-perestroika-rosa",
  module_released: "bg-perestroika-azul",
  evasion_nudge: "bg-perestroika-laranja",
  system: "bg-perestroika-preto/40",
};

const Notificacoes = () => {
  const { items, loading, markRead, markAllRead, unreadCount } = useNotifications();

  return (
    <PageShell>
      <PageHeader back={{ to: "/app", label: "início" }} />

      <main className="container max-w-3xl pb-20 pt-4">
        <header className="mb-6 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-tight text-perestroika-preto">
              notificações
            </h1>
            <p className="font-body text-sm text-perestroika-preto/65 mt-1">
              tudo que rolou na sua eletiva.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="font-body text-xs uppercase"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              marcar tudo
            </Button>
          )}
        </header>

        {loading ? (
          <p className="font-body text-sm text-perestroika-preto/55">carregando...</p>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-perestroika-preto/20 bg-white/40 p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <EletivaSymbol size={72} pose="resting" />
            </div>
            <h2 className="font-display text-2xl uppercase text-perestroika-preto mb-2">
              ninguém te chamou ainda
            </h2>
            <p className="font-body text-sm text-perestroika-preto/65">
              quando o educador responder uma entrega ou abrir um módulo novo, aparece aqui.
            </p>
            <Button asChild variant="ghost" className="mt-4 font-body text-xs uppercase">
              <Link to="/app">voltar pro início</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const inner = (
                <div
                  className={cn(
                    "flex gap-4 p-4 rounded-2xl border transition-colors",
                    n.read_at
                      ? "border-perestroika-preto/10 bg-white/50"
                      : "border-perestroika-preto/20 bg-white shadow-sm",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full",
                      kindAccent[n.kind],
                      n.read_at && "opacity-30",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55">
                      {kindLabel[n.kind]} ·{" "}
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                    <p
                      className={cn(
                        "font-body text-base text-perestroika-preto mt-0.5",
                        !n.read_at && "font-semibold",
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="font-body text-sm text-perestroika-preto/70 mt-1">
                        {n.body}
                      </p>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      to={n.link}
                      onClick={() => !n.read_at && markRead(n.id)}
                      className="block hover:opacity-90 transition-opacity"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !n.read_at && markRead(n.id)}
                      className="block w-full text-left hover:opacity-90 transition-opacity"
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <EletivaFooter />
    </PageShell>
  );
};

export default Notificacoes;
