import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { AdminSidebar, OPERACAO } from "./AdminSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CommandPalette, useCommandPaletteHotkey } from "../CommandPalette";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { Badge } from "@/components/ui/badge";

const findLabel = (pathname: string) => {
  const all = [...OPERACAO];
  // priorize match mais específico
  const sorted = [...all].sort((a, b) => b.to.length - a.to.length);
  const hit = sorted.find((i) =>
    i.exact ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + "/"),
  );
  return hit?.label ?? "admin";
};

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { pathname } = useLocation();
  useCommandPaletteHotkey(setCmdOpen);
  const crumb = findLabel(pathname);

  return (
    <div className="min-h-dvh w-full flex bg-perestroika-bege text-perestroika-preto font-body">
      {/* sidebar desktop */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-dvh">
        <AdminSidebar />
      </aside>

      {/* sidebar mobile (sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-perestroika-bege border-perestroika-preto/10">
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-12 flex items-center gap-3 px-3 sm:px-4 border-b border-perestroika-preto/10 bg-perestroika-bege/85 backdrop-blur">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-perestroika-preto/5"
            aria-label="abrir menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <NachesULogo variant="dark" />
            <Badge className="bg-perestroika-preto text-perestroika-bege uppercase tracking-wide text-[10px]">
              admin
            </Badge>
          </div>

          <nav className="hidden lg:flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55">
            <span>admin</span>
            <span className="opacity-50">/</span>
            <span className="text-perestroika-preto font-medium">{crumb}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              aria-label="busca rápida"
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-md border border-perestroika-preto/15 bg-perestroika-bege/50 hover:bg-perestroika-bege/80 text-perestroika-preto/65 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
            <Link
              to="/app"
              className="text-[11px] uppercase tracking-wide text-perestroika-preto/55 hover:text-perestroika-preto"
            >
              voltar pro app
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
};
