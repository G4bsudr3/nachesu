/**
 * Escopa prev/next/total dos módulos pela MESMA eletiva (mesmo course_id da trilha atual).
 *
 * Sem esse escopo, um aluno com 2 matrículas vê "01/40" no header e o botão
 * "próximo" pula entre eletivas. O hook `useEletivaProgress(courseId)` já
 * filtra a snapshot por curso, mas defendemos aqui também para o caso de um
 * caller passar uma snapshot agregada.
 *
 * Contrato (testado em src/lib/moduleNavigation.test.ts):
 *  - prevModule/nextModule só vêm de trilhas com o mesmo course_id da trilha atual.
 *  - totalModules conta apenas módulos da mesma eletiva; default 20 se vazio.
 *  - prev do primeiro módulo = null; next do último = null.
 */
export type NavTrail = { id: string; course_id: string | null };
export type NavModule = { id: string; number: number; trail_id: string };

export interface ScopedNavigation<M extends NavModule> {
  prevModule: M | null;
  nextModule: M | null;
  totalModules: number;
  sameCourseModules: M[];
}

export const DEFAULT_TOTAL_MODULES = 20;

export const scopeModuleNavigation = <M extends NavModule>(args: {
  trails: NavTrail[];
  modules: M[];
  currentTrail: NavTrail | null | undefined;
  moduleNumber: number;
}): ScopedNavigation<M> => {
  const { trails, modules, currentTrail, moduleNumber } = args;

  const sameCourseTrailIds = new Set(
    trails
      .filter((t) => t.course_id && t.course_id === currentTrail?.course_id)
      .map((t) => t.id),
  );

  const sameCourseModules = modules.filter((m) => sameCourseTrailIds.has(m.trail_id));

  const prevModule = sameCourseModules.find((m) => m.number === moduleNumber - 1) ?? null;
  const nextModule = sameCourseModules.find((m) => m.number === moduleNumber + 1) ?? null;
  const totalModules = sameCourseModules.length || DEFAULT_TOTAL_MODULES;

  return { prevModule, nextModule, totalModules, sameCourseModules };
};
