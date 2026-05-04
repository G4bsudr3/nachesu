import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * guarda visual: a estrela rosa da perestroika (EletivaStar / EstrelaPerestroika)
 * não pode reaparecer nas páginas-aluno acessíveis a partir de /app.
 *
 * se um arquivo novo precisar ser exceção, adicione-o em ALLOWED com justificativa.
 */

// arquivos que pertencem ao fluxo /app (dashboard + páginas linkadas a partir dele)
const STUDENT_FILES = [
  "src/pages/AppDashboard.tsx",
  "src/pages/Trilhas.tsx",
  "src/pages/Modulo.tsx",
  "src/pages/Missions.tsx",
  "src/pages/Prework.tsx",
  "src/pages/Onboarding.tsx",
  "src/pages/AccountSettings.tsx",
  "src/pages/HubIndex.tsx",
  "src/pages/legacy/HubGallery.tsx",
  "src/pages/legacy/HubBuilder.tsx",
  "src/pages/legacy/HubTurma.tsx",
  "src/pages/HubMateriais.tsx",
  "src/pages/legacy/HubProjetos.tsx",
  "src/pages/legacy/HubAlbum.tsx",
  "src/pages/legacy/MinhaCarta.tsx",
  "src/pages/Tutorial.tsx",
  "src/components/prework/WhatIsLovable.tsx",
];

// padrão que detecta uso (jsx, import nomeado, ou prop decorStar do PageShell)
const FORBIDDEN_PATTERNS = [
  /<EletivaStar\b/,
  /<EstrelaPerestroika\b/,
  /\bdecorStar\b/, // PageShell decorStar prop (renderiza EletivaStar)
];

describe("no perestroika star in /app pages", () => {
  for (const relPath of STUDENT_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!existsSync(fullPath)) continue;

    it(`${relPath} não renderiza estrela perestroika`, () => {
      const source = readFileSync(fullPath, "utf-8");
      const offenders: string[] = [];
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(source)) {
          offenders.push(pattern.source);
        }
      }
      expect(
        offenders,
        `${relPath} contém uso proibido: ${offenders.join(", ")}. ` +
          `A estrela perestroika foi removida das páginas-aluno e não deve voltar.`,
      ).toEqual([]);
    });
  }
});
