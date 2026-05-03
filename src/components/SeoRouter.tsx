import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  ELETIVA_SEO,
  SITE_URL,
  DEFAULT_OG,
  getRouteSeo,
  shouldIndex,
} from "@/lib/seoRoutes";

const isShareable = (path: string) => /^\/(carta|c)\//.test(path);

const ACTIVE_ELETIVA_KEY = "eletiva:active-slug";

const upsert = (selector: string, tag: "meta" | "link", attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

const absolute = (url: string) =>
  url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

/**
 * detecta a eletiva ativa pra ajustar título/descrição/og:image dinamicamente
 * dentro do app. ordem: ?eletiva=slug → localStorage(active-slug) → null.
 */
function detectEletivaSlug(search: string): string | null {
  const fromQuery = new URLSearchParams(search).get("eletiva");
  if (fromQuery && ELETIVA_SEO[fromQuery]) return fromQuery;
  try {
    const stored = window.localStorage.getItem(ACTIVE_ELETIVA_KEY);
    if (stored && ELETIVA_SEO[stored]) return stored;
  } catch {
    // ignore
  }
  return null;
}

/**
 * mantém canonical, og:url, og/twitter title+description+image e robots
 * sincronizados a cada navegação client-side, refletindo a eletiva ativa.
 */
export const SeoRouter = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const cleanPath =
      pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

    // canonical: /app/* canonicaliza pra /, compartilháveis mantêm o path próprio.
    const canonicalPath = pathname.startsWith("/app") ? "/" : cleanPath;
    const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;

    upsert('link[rel="canonical"]', "link", { rel: "canonical", href: canonicalUrl });
    upsert('meta[property="og:url"]', "meta", { property: "og:url", content: canonicalUrl });

    // resolve metadados base por rota.
    const base = getRouteSeo(cleanPath);
    let title = base.title;
    let description = base.description;
    let image = base.image ?? DEFAULT_OG;

    // override por eletiva ativa (só dentro do app — landing tem hero próprio).
    const isAppRoute = pathname.startsWith("/app");
    const slug = isAppRoute ? detectEletivaSlug(search) : null;
    if (slug) {
      const eletiva = ELETIVA_SEO[slug];
      const baseTitle = base.title.split(" · ")[0];
      title = `${baseTitle} · ${eletiva.titleShort}`;
      description = eletiva.description;
      image = eletiva.image;
    }

    document.title = title;
    upsert('meta[name="description"]', "meta", { name: "description", content: description });
    upsert('meta[property="og:title"]', "meta", { property: "og:title", content: title });
    upsert('meta[name="twitter:title"]', "meta", { name: "twitter:title", content: title });
    upsert('meta[property="og:description"]', "meta", {
      property: "og:description",
      content: description,
    });
    upsert('meta[name="twitter:description"]', "meta", {
      name: "twitter:description",
      content: description,
    });

    const absImage = absolute(image);
    upsert('meta[property="og:image"]', "meta", { property: "og:image", content: absImage });
    upsert('meta[name="twitter:image"]', "meta", { name: "twitter:image", content: absImage });
    upsert('meta[name="twitter:card"]', "meta", {
      name: "twitter:card",
      content: "summary_large_image",
    });

    const indexable =
      shouldIndex(cleanPath, base.index) || isShareable(cleanPath);
    upsert('meta[name="robots"]', "meta", {
      name: "robots",
      content: indexable ? "index,follow" : "noindex,nofollow",
    });
  }, [pathname, search]);

  return null;
};
