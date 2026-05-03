import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://chorahub.lovable.app";

/**
 * rotas públicas indexáveis. tudo que não casa aqui recebe noindex automático
 * pra não duplicar metadados em /app/eletivas, /app/trilhas, /app/modulo/:id etc.
 */
const PUBLIC_INDEXABLE = [/^\/$/, /^\/auth$/, /^\/forms$/];

/** rotas onde o canonical aponta pra raiz (evita /carta/:token virar variante da home). */
const isShareable = (path: string) => /^\/(carta|c)\//.test(path);

const upsert = (selector: string, tag: "meta" | "link", attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

/**
 * mantém canonical, og:url e robots sincronizados a cada navegação client-side
 * dentro do SPA, evitando metadados duplicados entre rotas.
 */
export const SeoRouter = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const cleanPath =
      pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

    // canonical: páginas com token compartilhável mantêm o próprio path,
    // rotas privadas /app/* canonicalizam pra raiz pra não fragmentar sinal.
    const canonicalPath = pathname.startsWith("/app")
      ? "/"
      : isShareable(cleanPath)
      ? cleanPath
      : cleanPath;

    const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;

    upsert('link[rel="canonical"]', "link", { rel: "canonical", href: canonicalUrl });
    upsert('meta[property="og:url"]', "meta", { property: "og:url", content: canonicalUrl });

    const indexable = PUBLIC_INDEXABLE.some((re) => re.test(cleanPath)) || isShareable(cleanPath);
    upsert('meta[name="robots"]', "meta", {
      name: "robots",
      content: indexable ? "index,follow" : "noindex,nofollow",
    });
  }, [pathname]);

  return null;
};
