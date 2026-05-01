import { Outlet } from "react-router-dom";
import { MobileNav } from "@/components/layout/MobileNav";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";

/**
 * shell compartilhado das rotas do hub e do chora-bot.
 *
 * garante por construção que toda página filha:
 *  1. reserve espaço inferior igual à altura da MobileNav (--mobile-nav-h),
 *     evitando que conteúdo (e scroll-end) fique escondido atrás da nav.
 *  2. tenha o ChoraBotFab disponível, posicionado acima da nav via a mesma var.
 *
 * desktop: --mobile-nav-h = 0px (definido em index.css), então o paddingBottom
 * vira no-op e nada muda visualmente.
 *
 * se um dia uma página do hub precisar esconder a nav ou o fab, faz isso
 * dentro da própria página com state local — não removendo o layout.
 */
export const HubLayout = () => {
  return (
    <>
      <div style={{ paddingBottom: "var(--mobile-nav-h, 0px)" }}>
        <Outlet />
      </div>
      <ChoraBotFab />
      <MobileNav />
    </>
  );
};
