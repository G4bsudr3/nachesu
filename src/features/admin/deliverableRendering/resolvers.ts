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
// classificador linear/circular/regenerativo (aula 2)
// ============================================================

type ClassificadorValueShape = {
  classifications?: Record<string, "linear" | "circular" | "regenerativo">;
  justifications?: Record<string, string>;
};

const catLabelClassif: Record<string, string> = {
  linear: "linear",
  circular: "circular",
  regenerativo: "regenerativo",
};

function resolveClassificador3x3(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    fixed_items?: { id: string; text: string }[];
  };
  const map = (content.classificacao_aula2 ?? {}) as Record<string, ClassificadorValueShape>;
  const v = map[pill.id] ?? {};
  const classifications = v.classifications ?? {};
  const justifications = v.justifications ?? {};

  const fixed = schema.fixed_items ?? [];
  // itens do radar (3 do aula 1) ficam com ids radar-1/2/3 e não estão no schema
  const radarIds = Object.keys(classifications).filter((id) => id.startsWith("radar-"));
  const knownIds = new Set([...fixed.map((f) => f.id), ...radarIds]);
  // garante que classificações órfãs também apareçam
  for (const id of Object.keys(classifications)) knownIds.add(id);

  if (knownIds.size === 0) {
    return [{ kind: "empty", question: "classificação dos itens" }];
  }

  const items: { label: string; value: string }[] = [];
  const itemsList = [
    ...fixed,
    ...radarIds.map((id) => ({ id, text: `(do seu radar) ${id}` })),
    ...Array.from(knownIds)
      .filter((id) => !fixed.some((f) => f.id === id) && !radarIds.includes(id))
      .map((id) => ({ id, text: id })),
  ];

  for (const it of itemsList) {
    const cat = classifications[it.id];
    items.push({
      label: it.text,
      value: cat ? catLabelClassif[cat] ?? cat : "— sem categoria",
    });
  }

  const blocks: AnswerBlock[] = [
    { kind: "list", question: "classificação dos itens", items },
  ];

  const justEntries = Object.entries(justifications).filter(([, t]) =>
    isFilled(t),
  );
  if (justEntries.length > 0) {
    for (const [id, text] of justEntries) {
      const itemText = itemsList.find((i) => i.id === id)?.text ?? id;
      blocks.push({
        kind: "text",
        question: `justificativa · ${itemText}`,
        answer: text,
      });
    }
  } else {
    blocks.push({ kind: "empty", question: "justificativas escritas" });
  }

  return blocks;
}

// ============================================================
// pbl corf triplo (aula 2)
// ============================================================

type CorfEntrega = {
  versao_corf?: string;
  print_ruim?: {
    evidence_kind?: string;
    evidence_link?: string;
    evidence_path?: string;
    evidence_name?: string;
  };
  print_corf?: {
    evidence_kind?: string;
    evidence_link?: string;
    evidence_path?: string;
    evidence_name?: string;
  };
  o_que_mudou?: string;
};

function resolvePblCorfTriplo(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    prompts?: { id: string; prompt_ruim: string }[];
    conclusao?: { label: string };
  };
  const map = (content.pbl_corf ?? {}) as Record<
    string,
    { itens?: Record<string, CorfEntrega>; conclusao?: string }
  >;
  const v = map[pill.id] ?? {};
  const itens = v.itens ?? {};
  const prompts = schema.prompts ?? [];

  const blocks: AnswerBlock[] = [];
  prompts.forEach((p, idx) => {
    const entry = itens[p.id] ?? {};
    const num = idx + 1;
    blocks.push({
      kind: "text",
      question: `prompt ${num} · original`,
      answer: p.prompt_ruim,
    });
    if (isFilled(entry.versao_corf)) {
      blocks.push({
        kind: "text",
        question: `prompt ${num} · versão em CORF`,
        answer: entry.versao_corf!,
      });
    } else {
      blocks.push({ kind: "empty", question: `prompt ${num} · versão em CORF` });
    }
    blocks.push(resolveEvidence(`prompt ${num} · print do ruim`, entry.print_ruim));
    blocks.push(resolveEvidence(`prompt ${num} · print do CORF`, entry.print_corf));
    if (isFilled(entry.o_que_mudou)) {
      blocks.push({
        kind: "text",
        question: `prompt ${num} · o que mudou`,
        answer: entry.o_que_mudou!,
      });
    } else {
      blocks.push({ kind: "empty", question: `prompt ${num} · o que mudou` });
    }
  });

  const conclusaoLabel = schema.conclusao?.label ?? "conclusão";
  if (isFilled(v.conclusao)) {
    blocks.push({ kind: "text", question: conclusaoLabel, answer: v.conclusao! });
  } else {
    blocks.push({ kind: "empty", question: conclusaoLabel });
  }

  return blocks;
}

// ============================================================
// guia de prompts (aula 2)
// ============================================================

function resolveGuiaDePrompts(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  const schema = (pill.interaction_schema ?? {}) as {
    templates?: { id: string; titulo: string; template: string }[];
    prints?: {
      primeiro?: { label: string; por_que_label?: string };
      segundo?: { label: string; por_que_label?: string };
    };
    reflexao?: { prompt?: string };
  };
  const map = (content.guia_prompts ?? {}) as Record<
    string,
    {
      modelos?: Record<string, string>;
      print_1?: CorfEntrega["print_ruim"];
      por_que_1?: string;
      print_2?: CorfEntrega["print_ruim"];
      por_que_2?: string;
      reflexao?: string;
    }
  >;
  const v = map[pill.id] ?? {};
  const modelos = v.modelos ?? {};
  const templates = schema.templates ?? [];

  const blocks: AnswerBlock[] = [];
  templates.forEach((t) => {
    const txt = modelos[t.id] ?? "";
    const edited = isFilled(txt) && txt.trim() !== (t.template ?? "").trim();
    if (edited) {
      blocks.push({ kind: "text", question: `template · ${t.titulo}`, answer: txt });
    } else if (isFilled(txt)) {
      blocks.push({
        kind: "text",
        question: `template · ${t.titulo} (não editado)`,
        answer: txt,
      });
    } else {
      blocks.push({ kind: "empty", question: `template · ${t.titulo}` });
    }
  });

  const p1 = schema.prints?.primeiro;
  if (p1) {
    blocks.push(resolveEvidence(p1.label, v.print_1));
    const q = p1.por_que_label ?? "por que esse?";
    blocks.push(
      isFilled(v.por_que_1)
        ? { kind: "text", question: q, answer: v.por_que_1! }
        : { kind: "empty", question: q },
    );
  }
  const p2 = schema.prints?.segundo;
  if (p2) {
    blocks.push(resolveEvidence(p2.label, v.print_2));
    const q = p2.por_que_label ?? "por que esse?";
    blocks.push(
      isFilled(v.por_que_2)
        ? { kind: "text", question: q, answer: v.por_que_2! }
        : { kind: "empty", question: q },
    );
  }

  const rprompt = schema.reflexao?.prompt ?? "reflexão final";
  blocks.push(
    isFilled(v.reflexao)
      ? { kind: "text", question: rprompt, answer: v.reflexao! }
      : { kind: "empty", question: rprompt },
  );

  return blocks;
}

// ============================================================
// fallback genérico: pílulas sem resolver mas com dados
// ============================================================

const KNOWN_CONTENT_KEYS_BY_PILL = [
  "reflections",
  "pbl_responses",
  "pbl_estruturado",
  "checklist",
  "guided_answers",
  "quiz_answers",
  "bonus",
  "classificacao_aula2",
  "pbl_corf",
  "guia_prompts",
] as const;

function resolveUnknownWithData(
  pill: PillForResolve,
  content: DeliverableContent,
): AnswerBlock[] {
  // procura qualquer "namespace" do content que tenha dado pra essa pillId
  const blocks: AnswerBlock[] = [];
  for (const key of KNOWN_CONTENT_KEYS_BY_PILL) {
    const ns = (content as Record<string, unknown>)[key];
    if (!ns || typeof ns !== "object") continue;
    const entry = (ns as Record<string, unknown>)[pill.id];
    if (!isFilled(entry)) continue;
    blocks.push({
      kind: "text",
      question: `dados brutos · ${key}`,
      answer: typeof entry === "string" ? entry : JSON.stringify(entry, null, 2),
    });
  }
  return blocks;
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
    case "classificador_linear_circular_regenerativo":
      blocks = resolveClassificador3x3(pill, content);
      break;
    case "pbl_corf_triplo":
      blocks = resolvePblCorfTriplo(pill, content);
      break;
    case "guia_de_prompts":
      blocks = resolveGuiaDePrompts(pill, content);
      break;
    case "video_embed":
    case "video_with_transcript":
      // vídeos são passivos; mostra reflexão se existir no namespace padrão
      blocks = resolveEditorial(pill, content);
      break;
    default:
      // fallback por kind (pílulas sem schema rico)
      if (pill.kind === "registro") blocks = resolveLegacyReflexao(pill, content);
      else if (pill.kind === "exercicio_pbl") blocks = resolveLegacyPBL(pill, content);
      else blocks = []; // pílulas passivas (abertura/conteúdo só leitura)
  }

  // defesa: se nada veio mas existem dados salvos pra essa pillId, mostra raw
  if (blocks.length === 0) {
    const raw = resolveUnknownWithData(pill, content);
    if (raw.length > 0) blocks = raw;
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
