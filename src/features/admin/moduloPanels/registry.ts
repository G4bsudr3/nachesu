import { lazy, type LazyExoticComponent, type ComponentType } from "react";

/**
 * painéis de leitura de turma específicos por exercício.
 * chave: `${courseSlug}:${moduleNumber}`.
 *
 * cada painel agrega o schema próprio do exercício pbl daquele módulo
 * (rpc `admin_moduleN_*_stats`), por isso não dá pra ter um único painel genérico.
 * o que é genérico é o lugar onde eles aparecem: a aba "painel da turma"
 * de `/admin/eletiva/:slug/modulo/:number`, igual pras duas eletivas.
 */
export const moduloPanelRegistry: Record<
  string,
  LazyExoticComponent<ComponentType<unknown>>
> = {
  "economia-circular:2": lazy(() => import("./AdminEletivaModulo2")),
  "economia-circular:3": lazy(() => import("./AdminEletivaModulo3")),
  "economia-circular:4": lazy(() => import("./AdminEletivaModulo4")),
  "economia-circular:5": lazy(() => import("./AdminEletivaModulo5")),
  "economia-circular:6": lazy(() => import("./AdminEletivaModulo6")),
  "economia-circular:7": lazy(() => import("./AdminEletivaModulo7")),
  "economia-circular:8": lazy(() => import("./AdminEletivaModulo8")),
  "economia-circular:9": lazy(() => import("./AdminEletivaModulo9")),
  "economia-circular:10": lazy(() => import("./AdminEletivaModulo10")),
  "economia-circular:11": lazy(() => import("./AdminEletivaModulo11")),
  "economia-circular:12": lazy(() => import("./AdminEletivaModulo12")),
  "economia-circular:13": lazy(() => import("./AdminEletivaModulo13")),
  "economia-circular:14": lazy(() => import("./AdminEletivaModulo14")),
  "economia-circular:15": lazy(() => import("./AdminEletivaModulo15")),
  "economia-circular:16": lazy(() => import("./AdminEletivaModulo16")),
  "economia-circular:17": lazy(() => import("./AdminEletivaModulo17")),
  "economia-circular:18": lazy(() => import("./AdminEletivaModulo18")),
  "economia-circular:19": lazy(() => import("./AdminEletivaModulo19")),
  "economia-circular:20": lazy(() => import("./AdminEletivaModulo20")),
};

export function getModuloPanel(slug: string | undefined, number: number | undefined) {
  if (!slug || !number) return null;
  return moduloPanelRegistry[`${slug}:${number}`] ?? null;
}
