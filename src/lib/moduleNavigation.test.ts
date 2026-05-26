import { describe, it, expect } from "vitest";
import {
  scopeModuleNavigation,
  DEFAULT_TOTAL_MODULES,
  type NavTrail,
  type NavModule,
} from "@/lib/moduleNavigation";

/**
 * Cenário fixture: aluno matriculado em DUAS eletivas.
 * - course A "ia-na-pratica": 2 trilhas × 10 módulos = 20 módulos (numbers 1..20)
 * - course B "economia-circular": 2 trilhas × 10 módulos = 20 módulos (numbers 1..20)
 *
 * O hook agregado retornaria 40 módulos (e numbers repetidos entre cursos),
 * mas a navegação dentro de uma eletiva precisa enxergar só os 20 da sua.
 */
const COURSE_A = "course-a";
const COURSE_B = "course-b";

const trails: NavTrail[] = [
  { id: "a-t1", course_id: COURSE_A },
  { id: "a-t2", course_id: COURSE_A },
  { id: "b-t1", course_id: COURSE_B },
  { id: "b-t2", course_id: COURSE_B },
];

const makeModules = (trailId: string, prefix: string, start: number, end: number): NavModule[] =>
  Array.from({ length: end - start + 1 }, (_, i) => ({
    id: `${prefix}-${start + i}`,
    number: start + i,
    trail_id: trailId,
  }));

const modules: NavModule[] = [
  ...makeModules("a-t1", "a", 1, 10),
  ...makeModules("a-t2", "a", 11, 20),
  ...makeModules("b-t1", "b", 1, 10),
  ...makeModules("b-t2", "b", 11, 20),
];

describe("scopeModuleNavigation — invariante de navegação do aluno", () => {
  it("totalModules é sempre 20 (a eletiva atual), nunca 40 (agregado)", () => {
    const { totalModules } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[0], // course A
      moduleNumber: 1,
    });
    expect(totalModules).toBe(20);
  });

  it("totalModules continua 20 navegando dentro do course B", () => {
    const { totalModules } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[2], // course B
      moduleNumber: 5,
    });
    expect(totalModules).toBe(20);
  });

  it("nextModule do meio (mod 5) aponta pro mod 6 do MESMO course", () => {
    const { nextModule } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[0], // course A
      moduleNumber: 5,
    });
    expect(nextModule).not.toBeNull();
    expect(nextModule!.id).toBe("a-6");
    expect(nextModule!.id.startsWith("a-")).toBe(true);
  });

  it("prevModule respeita o course atual (nunca pula pra outra eletiva)", () => {
    const { prevModule } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[2], // course B
      moduleNumber: 5,
    });
    expect(prevModule).not.toBeNull();
    expect(prevModule!.id).toBe("b-4");
  });

  it("nextModule no LIMITE da trilha (mod 10 → mod 11) continua no mesmo course", () => {
    const { nextModule } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[0], // course A, trilha 1
      moduleNumber: 10,
    });
    expect(nextModule).not.toBeNull();
    expect(nextModule!.id).toBe("a-11"); // trilha 2 do MESMO course
    expect(nextModule!.id.startsWith("a-")).toBe(true);
  });

  it("prevModule do primeiro módulo é null (não vaza pra outra eletiva)", () => {
    const { prevModule } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[0],
      moduleNumber: 1,
    });
    expect(prevModule).toBeNull();
  });

  it("nextModule do último módulo é null (não vaza pro course B)", () => {
    const { nextModule } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[0], // course A
      moduleNumber: 20,
    });
    expect(nextModule).toBeNull();
  });

  it("sameCourseModules nunca contém id do outro course", () => {
    const { sameCourseModules } = scopeModuleNavigation({
      trails,
      modules,
      currentTrail: trails[0], // course A
      moduleNumber: 1,
    });
    expect(sameCourseModules).toHaveLength(20);
    expect(sameCourseModules.every((m) => m.id.startsWith("a-"))).toBe(true);
  });

  it("fallback: snapshot vazia → totalModules cai em DEFAULT_TOTAL_MODULES (20)", () => {
    const { totalModules, prevModule, nextModule } = scopeModuleNavigation({
      trails: [],
      modules: [],
      currentTrail: { id: "x", course_id: COURSE_A },
      moduleNumber: 1,
    });
    expect(totalModules).toBe(DEFAULT_TOTAL_MODULES);
    expect(prevModule).toBeNull();
    expect(nextModule).toBeNull();
  });

  it("trilha sem course_id é ignorada (não polui o escopo da eletiva atual)", () => {
    const trailsWithOrphan: NavTrail[] = [
      ...trails,
      { id: "orphan", course_id: null },
    ];
    const modulesWithOrphan: NavModule[] = [
      ...modules,
      { id: "orphan-99", number: 99, trail_id: "orphan" },
    ];
    const { sameCourseModules, totalModules } = scopeModuleNavigation({
      trails: trailsWithOrphan,
      modules: modulesWithOrphan,
      currentTrail: trails[0],
      moduleNumber: 1,
    });
    expect(totalModules).toBe(20);
    expect(sameCourseModules.find((m) => m.id === "orphan-99")).toBeUndefined();
  });
});
