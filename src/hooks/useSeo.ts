import { useEffect } from "react";

const SITE_URL = "https://chorahub.lovable.app";

type SeoOptions = {
  /** canonical path, ex: "/" or "/auth". se omitido, usa location.pathname (sem query). */
  path?: string;
  title?: string;
  description?: string;
  /** se true, adiciona meta robots noindex,nofollow (rotas privadas/app). */
  noindex?: boolean;
  image?: string;
};

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    const tag = selector.startsWith("link") ? "link" : "meta";
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

/**
 * mantém canonical + og:url + meta dinâmicos por rota, evitando duplicidade
 * de metadados quando o mesmo bundle SPA é servido em múltiplas urls.
 */
export function useSeo({ path, title, description, noindex, image }: SeoOptions = {}) {
  useEffect(() => {
    const canonicalPath = path ?? window.location.pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath.replace(/\/+$/, "")}`;

    if (title) document.title = title;

    upsertMeta('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });

    if (title) {
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }
    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    }
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    }

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex,nofollow" : "index,follow",
    });
  }, [path, title, description, noindex, image]);
}
