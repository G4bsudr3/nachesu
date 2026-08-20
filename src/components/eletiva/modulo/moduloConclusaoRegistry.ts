import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * síntese de turma que aparece pro estudante depois que ele conclui o módulo.
 * chave: `${courseSlug}:${moduleNumber}`.
 *
 * cada síntese lê o schema próprio do exercício daquele módulo, então não existe
 * uma versão única. o que é genérico é o ponto de montagem: `<ModuloConclusaoSlot />`
 * em `/app/modulo/:n`, igual pras duas eletivas. módulo sem síntese registrada
 * não renderiza nada (a celebração genérica `<ModuloCelebration />` continua valendo).
 */
type ConclusaoComponent = LazyExoticComponent<ComponentType<{ moduleId: string }>>;

export const moduloConclusaoRegistry: Record<string, ConclusaoComponent> = {
  "economia-circular:2": lazy(() =>
    import("./ModuloConclusaoClassificador").then((m) => ({ default: m.ModuloConclusaoClassificador })),
  ),
  "economia-circular:3": lazy(() =>
    import("./ModuloConclusaoMapaAtores").then((m) => ({ default: m.ModuloConclusaoMapaAtores })),
  ),
  "economia-circular:4": lazy(() =>
    import("./ModuloConclusaoEvidencias").then((m) => ({ default: m.ModuloConclusaoEvidencias })),
  ),
  "economia-circular:5": lazy(() =>
    import("./ModuloConclusaoBriefing").then((m) => ({ default: m.ModuloConclusaoBriefing })),
  ),
  "economia-circular:6": lazy(() =>
    import("./ModuloConclusaoMapaFluxo").then((m) => ({ default: m.ModuloConclusaoMapaFluxo })),
  ),
  "economia-circular:7": lazy(() =>
    import("./ModuloConclusaoMatrizValor").then((m) => ({ default: m.ModuloConclusaoMatrizValor })),
  ),
  "economia-circular:8": lazy(() =>
    import("./ModuloConclusaoRegrasJogo").then((m) => ({ default: m.ModuloConclusaoRegrasJogo })),
  ),
  "economia-circular:9": lazy(() =>
    import("./ModuloConclusaoImpactos").then((m) => ({ default: m.ModuloConclusaoImpactos })),
  ),
  "economia-circular:10": lazy(() =>
    import("./ModuloConclusaoStakeholders").then((m) => ({ default: m.ModuloConclusaoStakeholders })),
  ),
  "economia-circular:11": lazy(() =>
    import("./ModuloConclusaoSprintIdeacao").then((m) => ({ default: m.ModuloConclusaoSprintIdeacao })),
  ),
  "economia-circular:12": lazy(() =>
    import("./ModuloConclusaoSelecaoIdeia").then((m) => ({ default: m.ModuloConclusaoSelecaoIdeia })),
  ),
  "economia-circular:13": lazy(() =>
    import("./ModuloConclusaoPropostaValor").then((m) => ({ default: m.ModuloConclusaoPropostaValor })),
  ),
  "economia-circular:14": lazy(() =>
    import("./ModuloConclusaoBMC").then((m) => ({ default: m.ModuloConclusaoBMC })),
  ),
  "economia-circular:15": lazy(() =>
    import("./ModuloConclusaoSuposicoesRiscos").then((m) => ({
      default: m.ModuloConclusaoSuposicoesRiscos,
    })),
  ),
  "economia-circular:16": lazy(() =>
    import("./ModuloConclusaoPlanoExperimento").then((m) => ({
      default: m.ModuloConclusaoPlanoExperimento,
    })),
  ),
  "economia-circular:17": lazy(() =>
    import("./ModuloConclusaoRegistroResultado").then((m) => ({
      default: m.ModuloConclusaoRegistroResultado,
    })),
  ),
  "economia-circular:18": lazy(() =>
    import("./ModuloConclusaoChangelogV2").then((m) => ({ default: m.ModuloConclusaoChangelogV2 })),
  ),
};

export function getModuloConclusao(
  courseSlug: string | null | undefined,
  moduleNumber: number | null | undefined,
) {
  if (!courseSlug || !moduleNumber) return null;
  return moduloConclusaoRegistry[`${courseSlug}:${moduleNumber}`] ?? null;
}
