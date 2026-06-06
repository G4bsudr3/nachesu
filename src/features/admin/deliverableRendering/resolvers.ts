import type {
  AnswerBlock,
  DeliverableContent,
  PillForResolve,
  PillSchemaType,
  ResolvedAnswer,
} from "./types";

const EVIDENCE_BUCKET = "radar-evidences";

const kindLabel = (
  kind: PillForResolve["kind"],
  schemaType: PillSchemaType,
): string => {
  if (schemaType === "pilula_editorial") return "editorial";
  if (schemaType === "pbl_estruturado") return "pbl estruturado";
  if (schemaType === "checklist_pacto") return "pacto";
  if (schemaType === "curated_content_with_questions") return "conteúdo curado";
  if (schemaType === "quiz") return "quiz";
  if (schemaType === "radar_form") return "radar";
  if (schemaType === "bonus_text") return "bônus";
  if (schemaType === "classificador_linear_circular_regenerativo") return "classificador 3x3";
  if (schemaType === "pbl_corf_triplo") return "pbl corf";
  if (schemaType === "guia_de_prompts") return "guia de prompts";
  if (schemaType === "video_embed" || schemaType === "video_with_transcript") return "vídeo";
  if (kind === "pilula_a") return "abertura";
  if (kind === "exercicio_pbl") return "exercício pbl";
  if (kind === "registro") return "reflexão";
  return "conteúdo";
};

const isFilled = (v: unknown): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
};

const computeState = (blocks: AnswerBlock[]): ResolvedAnswer["state"] => {
  const meaningful = blocks.filter((b) => b.kind !== "empty");
  const empties = blocks.filter((b) => b.kind === "empty").length;
  if (blocks.length === 0) return "passiva";
  if (meaningful.length === 0) return "nao-respondida";
  if (empties > 0) return "parcial";
  return "respondida";
};

// ============================================================
// resolvers – recebem (pill, content) e devolvem blocks[]
// ============================================================

function resolveEditorial(pill: PillForResolve, content: DeliverableContent): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    reflexao?: { prompt?: string };
  };
  const reflections = (content.reflections ?? {}) as Record<string, string>;
  const answer = reflections[pill.id] ?? "";
  const prompt = schema.reflexao?.prompt;
  // pílula editorial sem prompt de reflexão é puramente passiva
  if (!prompt) return [];
  // reflexão é opcional: se o estudante concluiu sem escrever, mostra como passiva
  // ao invés de "não respondida" (que dava cara de abandono pro educador)
  if (!isFilled(answer)) return [];
  return [{ kind: "text", question: prompt, answer }];
}

function resolveLegacyReflexao(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    prompt?: string;
  };
  const reflections = (content.reflections ?? {}) as Record<string, string>;
  const answer = reflections[pill.id] ?? "";
  const question =
    schema.prompt ?? pill.body_md ?? "o que ficou pra você dessa pílula?";
  if (!isFilled(answer)) return [{ kind: "empty", question }];
  return [{ kind: "text", question, answer }];
}

function resolveLegacyPBL(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const pbl = (content.pbl_responses ?? {}) as Record<string, string>;
  const answer = pbl[pill.id] ?? "";
  const question =
    (pill.interaction_schema as { prompt?: string } | null)?.prompt ??
    pill.body_md ??
    pill.title;
  if (!isFilled(answer)) return [{ kind: "empty", question }];
  return [{ kind: "text", question, answer }];
}

type PblEstruturadoValue = {
  pedido_a?: string;
  print_a?: { evidence_kind?: string; evidence_link?: string; evidence_path?: string; evidence_name?: string };
  pedido_b?: string;
  print_b?: { evidence_kind?: string; evidence_link?: string; evidence_path?: string; evidence_name?: string };
  melhor?: string;
  por_que?: string;
  aprendi?: string;
};

function resolveEvidence(
  question: string,
  evidence: PblEstruturadoValue["print_a"],
): AnswerBlock {
  if (!evidence || evidence.evidence_kind === "none" || !evidence.evidence_kind) {
    return { kind: "empty", question };
  }
  if (evidence.evidence_kind === "link" && evidence.evidence_link) {
    return {
      kind: "upload",
      question,
      url: evidence.evidence_link,
      kindLabel: "link",
      filename: evidence.evidence_link,
    };
  }
  if (evidence.evidence_kind === "file" && evidence.evidence_path) {
    return {
      kind: "upload",
      question,
      url: null, // resolvido async pelo componente
      kindLabel: "arquivo",
      filename: evidence.evidence_name ?? evidence.evidence_path.split("/").pop(),
      path: evidence.evidence_path,
      bucket: EVIDENCE_BUCKET,
    };
  }
  return { kind: "empty", question };
}

function resolvePblEstruturado(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    campos?: {
      pedido_a?: { label: string };
      print_a?: { label: string };
      pedido_b?: { label: string };
      print_b?: { label: string };
      melhor?: { label: string; options?: string[] };
      por_que?: { label: string };
      aprendi?: { label: string };
    };
  };
  const map = (content.pbl_estruturado ?? {}) as Record<string, PblEstruturadoValue>;
  const v = map[pill.id] ?? {};
  const c = schema.campos ?? {};
  const blocks: AnswerBlock[] = [];

  if (c.pedido_a) {
    blocks.push(
      isFilled(v.pedido_a)
        ? { kind: "text", question: c.pedido_a.label, answer: v.pedido_a! }
        : { kind: "empty", question: c.pedido_a.label },
    );
  }
  if (c.print_a) blocks.push(resolveEvidence(c.print_a.label, v.print_a));
  if (c.pedido_b) {
    blocks.push(
      isFilled(v.pedido_b)
        ? { kind: "text", question: c.pedido_b.label, answer: v.pedido_b! }
        : { kind: "empty", question: c.pedido_b.label },
    );
  }
  if (c.print_b) blocks.push(resolveEvidence(c.print_b.label, v.print_b));
  if (c.melhor) {
    if (isFilled(v.melhor)) {
      blocks.push({
        kind: "choice",
        question: c.melhor.label,
        answer: v.melhor!,
        optionLabel: v.melhor!,
      });
    } else {
      blocks.push({ kind: "empty", question: c.melhor.label });
    }
  }
  if (c.por_que) {
    blocks.push(
      isFilled(v.por_que)
        ? { kind: "text", question: c.por_que.label, answer: v.por_que! }
        : { kind: "empty", question: c.por_que.label },
    );
  }
  if (c.aprendi) {
    blocks.push(
      isFilled(v.aprendi)
        ? { kind: "text", question: c.aprendi.label, answer: v.aprendi! }
        : { kind: "empty", question: c.aprendi.label },
    );
  }
  return blocks;
}

type ChecklistValue = { checked?: number[]; outros?: string; reflexao?: string };

function resolveChecklistPacto(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    commitments?: string[];
    outros?: { label: string };
    reflexao?: { label: string };
  };
  const map = (content.checklist ?? {}) as Record<string, ChecklistValue>;
  const v = map[pill.id] ?? {};
  const checked = new Set(v.checked ?? []);
  const commitments = schema.commitments ?? [];

  const blocks: AnswerBlock[] = [];
  if (commitments.length > 0) {
    blocks.push({
      kind: "checklist",
      question: "compromissos marcados",
      items: commitments.map((label, i) => ({ label, checked: checked.has(i) })),
    });
  }
  if (schema.outros) {
    blocks.push(
      isFilled(v.outros)
        ? { kind: "text", question: schema.outros.label, answer: v.outros! }
        : { kind: "empty", question: schema.outros.label },
    );
  }
  if (schema.reflexao) {
    blocks.push(
      isFilled(v.reflexao)
        ? { kind: "text", question: schema.reflexao.label, answer: v.reflexao! }
        : { kind: "empty", question: schema.reflexao.label },
    );
  }
  return blocks;
}

type CuradoQuestion =
  | { id: string; type: "long_text"; label: string }
  | { id: string; type: "single_choice"; label: string; options: { label: string; value: string }[] };

function resolveCuratedContent(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as { questions?: CuradoQuestion[] };
  const answers = (content.guided_answers ?? {}) as Record<string, string>;
  const qs = schema.questions ?? [];
  return qs.map<AnswerBlock>((q) => {
    const a = answers[q.id];
    if (!isFilled(a)) return { kind: "empty", question: q.label };
    if (q.type === "single_choice") {
      const opt = q.options.find((o) => o.value === a);
      return {
        kind: "choice",
        question: q.label,
        answer: a!,
        optionLabel: opt?.label ?? a!,
      };
    }
    return { kind: "text", question: q.label, answer: a! };
  });
}

type QuizQuestion =
  | {
      id: string;
      type: "single_choice";
      label: string;
      options: { label: string; value: string }[];
      correct?: string[];
    }
  | {
      id: string;
      type: "multi_choice";
      label: string;
      options: { label: string; value: string }[];
      correct?: string[];
    }
  | { id: string; type: "long_text"; label: string };

function resolveQuiz(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as { questions?: QuizQuestion[] };
  const answers = (content.quiz_answers ?? {}) as Record<string, string | string[]>;
  const qs = schema.questions ?? [];
  return qs.map<AnswerBlock>((q) => {
    const a = answers[q.id];
    if (!isFilled(a)) return { kind: "empty", question: q.label };

    if (q.type === "long_text") {
      return { kind: "text", question: q.label, answer: String(a) };
    }

    if (q.type === "single_choice") {
      const val = String(a);
      const opt = q.options.find((o) => o.value === val);
      const correctVals = q.correct ?? [];
      const correctLabel = correctVals
        .map((cv) => q.options.find((o) => o.value === cv)?.label ?? cv)
        .join(", ");
      return {
        kind: "choice",
        question: q.label,
        answer: val,
        optionLabel: opt?.label ?? val,
        isCorrect: correctVals.length > 0 ? correctVals.includes(val) : undefined,
        correctLabel: correctVals.length > 0 ? correctLabel : undefined,
      };
    }

    // multi
    const vals = Array.isArray(a) ? a : [String(a)];
    const correctVals = q.correct ?? [];
    const correctSet = new Set(correctVals);
    const isCorrect =
      correctVals.length > 0 &&
      vals.length === correctVals.length &&
      vals.every((v) => correctSet.has(v));
    return {
      kind: "multi",
      question: q.label,
      answers: vals.map((v) => ({
        value: v,
        label: q.options.find((o) => o.value === v)?.label ?? v,
      })),
      isCorrect: correctVals.length > 0 ? isCorrect : undefined,
      correctLabels:
        correctVals.length > 0
          ? correctVals.map((cv) => q.options.find((o) => o.value === cv)?.label ?? cv)
          : undefined,
    };
  });
}

type RadarItem = {
  id: string;
  what: string;
  where: string;
  fluxo: string;
  evidence_kind?: string;
  evidence_link?: string;
  evidence_path?: string;
  evidence_name?: string;
};

function resolveRadar(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    fluxos?: { label: string; value: string }[];
    fields?: { id: string; label: string }[];
  };
  const items = (content.items ?? []) as RadarItem[];
  const fluxoLabel = (v: string) =>
    schema.fluxos?.find((f) => f.value === v)?.label ?? v;

  if (items.length === 0) {
    return [{ kind: "empty", question: "itens do radar" }];
  }

  // cada item vira um pequeno bloco "list" + opcional upload
  const blocks: AnswerBlock[] = [];
  items.forEach((item, idx) => {
    blocks.push({
      kind: "list",
      question: `item ${idx + 1}`,
      items: [
        { label: "o quê", value: item.what || "–" },
        { label: "onde", value: item.where || "–" },
        { label: "fluxo", value: fluxoLabel(item.fluxo) || "–" },
      ],
    });
    if (item.evidence_kind && item.evidence_kind !== "none") {
      blocks.push(
        resolveEvidence(`evidência do item ${idx + 1}`, {
          evidence_kind: item.evidence_kind,
          evidence_link: item.evidence_link,
          evidence_path: item.evidence_path,
          evidence_name: item.evidence_name,
        }),
      );
    }
  });
  return blocks;
}

function resolveBonus(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    response?: { fields?: { id: string; label: string }[] };
  };
  const v = (content.bonus ?? {}) as Record<string, string>;
  const fields = schema.response?.fields ?? [];
  if (fields.length === 0) {
    if (Object.keys(v).length === 0) return [];
    return Object.entries(v).map<AnswerBlock>(([id, ans]) => ({
      kind: "text",
      question: id,
      answer: ans,
    }));
  }
  return fields.map<AnswerBlock>((f) =>
    isFilled(v[f.id])
      ? { kind: "text", question: f.label, answer: v[f.id] }
      : { kind: "empty", question: f.label, hint: "opcional" },
  );
}

// ============================================================
// dispatcher
// ============================================================

export function resolvePill(
  pill: PillForResolve,
  content: DeliverableContent,
): ResolvedAnswer {
  const schemaType = (pill.interaction_schema?.type as PillSchemaType) ?? undefined;

  let blocks: AnswerBlock[] = [];

  switch (schemaType) {
    case "pilula_editorial":
      blocks = resolveEditorial(pill, content);
      break;
    case "pbl_estruturado":
      blocks = resolvePblEstruturado(pill, content);
      break;
    case "checklist_pacto":
      blocks = resolveChecklistPacto(pill, content);
      break;
    case "curated_content_with_questions":
      blocks = resolveCuratedContent(pill, content);
      break;
    case "quiz":
      blocks = resolveQuiz(pill, content);
      break;
    case "radar_form":
      blocks = resolveRadar(pill, content);
      break;
    case "bonus_text":
      blocks = resolveBonus(pill, content);
      break;
    default:
      // fallback por kind (pílulas sem schema rico)
      if (pill.kind === "registro") blocks = resolveLegacyReflexao(pill, content);
      else if (pill.kind === "exercicio_pbl") blocks = resolveLegacyPBL(pill, content);
      else blocks = []; // pílulas passivas (abertura/conteúdo só leitura)
  }

  return {
    pillId: pill.id,
    order: pill.order_index,
    kind: pill.kind,
    schemaType,
    kindLabel: kindLabel(pill.kind, schemaType),
    title: pill.title,
    required: pill.required,
    blocks,
    state: computeState(blocks),
  };
}
