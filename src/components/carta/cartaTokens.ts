// tokens visuais da carta de builder por arquétipo.
// usa apenas a paleta perestroika. cor "destaque" é a hue dominante daquele arquétipo.
// segue a linha visual já criada nas imagens dos cards (cada arquétipo tem hue própria).

import type { Database } from "@/integrations/supabase/types";
import type { Gender } from "@/lib/gender";

export type Archetype = Database["public"]["Enums"]["builder_archetype"];

interface Flex<T> { f: T; m: T }

export interface CartaTokens {
  /** classe tailwind text-* da hue principal */
  text: string;
  /** classe tailwind bg-* da hue principal (cheia) */
  bg: string;
  /** classe tailwind bg-* clarinho (10%) */
  bgSoft: string;
  /** classe tailwind border-* */
  border: string;
  /** label flexionado (ex.: { f: "visionária", m: "visionário" }) */
  labels: Flex<string>;
  /** display name no estilo carta de tarot ({ f: "A VISIONÁRIA", m: "O VISIONÁRIO" }) */
  displayNames: Flex<string>;
  /** artigo indefinido ({ f: "uma", m: "um" }) */
  artigos: Flex<string>;
  /** tagline curta em pt-br, frattz, lowercase (neutra ou sem flexão) */
  tagline: string;
  /** emoji oficial */
  emoji: string;
  /** numeração estilo "Nº 01" — ordem fixa do baralho */
  numero: string;
  /** gradient opcional (assinatura visual única). usar com fallback: tokens.gradient?.text ?? tokens.text */
  gradient?: {
    text: string;
    bg: string;
  };
  /** @deprecated use labels.m / labels.f via getArchetypeView. Resolvido em runtime pra masculino. */
  label?: string;
  /** @deprecated use displayNames.m / displayNames.f via getArchetypeView. Resolvido em runtime pra masculino. */
  displayName?: string;
}

export const ARCHETYPE_TOKENS: Record<Archetype, CartaTokens> = {
  visionario: {
    text: "text-perestroika-azul",
    bg: "bg-perestroika-azul",
    bgSoft: "bg-perestroika-azul/10",
    border: "border-perestroika-azul",
    labels: { f: "visionária", m: "visionário" },
    displayNames: { f: "A VISIONÁRIA", m: "O VISIONÁRIO" },
    artigos: { f: "uma", m: "um" },
    tagline: "vê o mapa antes do chão existir",
    emoji: "💫",
    numero: "Nº 01",
  },
  artesao: {
    text: "text-perestroika-laranja",
    bg: "bg-perestroika-laranja",
    bgSoft: "bg-perestroika-laranja/10",
    border: "border-perestroika-laranja",
    labels: { f: "artesã", m: "artesão" },
    displayNames: { f: "A ARTESÃ", m: "O ARTESÃO" },
    artigos: { f: "uma", m: "um" },
    tagline: "cada pixel é decisão política",
    emoji: "🎨",
    numero: "Nº 02",
  },
  experimentador: {
    text: "text-perestroika-vermelho",
    bg: "bg-perestroika-vermelho",
    bgSoft: "bg-perestroika-vermelho/10",
    border: "border-perestroika-vermelho",
    labels: { f: "experimentadora", m: "experimentador" },
    displayNames: { f: "A EXPERIMENTADORA", m: "O EXPERIMENTADOR" },
    artigos: { f: "uma", m: "um" },
    tagline: "10 mvps por mês, todo mês",
    emoji: "🧪",
    numero: "Nº 03",
  },
  conector: {
    text: "text-perestroika-rosa",
    bg: "bg-perestroika-rosa",
    bgSoft: "bg-perestroika-rosa/10",
    border: "border-perestroika-rosa",
    labels: { f: "conectora", m: "conector" },
    displayNames: { f: "A CONECTORA", m: "O CONECTOR" },
    artigos: { f: "uma", m: "um" },
    tagline: "a sala é o produto",
    emoji: "🌱",
    numero: "Nº 04",
    gradient: {
      text: "bg-gradient-to-r from-perestroika-rosa to-perestroika-azul bg-clip-text text-transparent",
      bg: "bg-gradient-to-r from-perestroika-rosa to-perestroika-azul",
    },
  },
  pragmatico: {
    text: "text-perestroika-preto",
    bg: "bg-perestroika-preto",
    bgSoft: "bg-perestroika-preto/10",
    border: "border-perestroika-preto",
    labels: { f: "pragmática", m: "pragmático" },
    displayNames: { f: "A PRAGMÁTICA", m: "O PRAGMÁTICO" },
    artigos: { f: "uma", m: "um" },
    tagline: "resolve a dor, depois resolve a próxima",
    emoji: "🔧",
    numero: "Nº 05",
  },
  narrador: {
    text: "text-perestroika-rosa",
    bg: "bg-perestroika-rosa",
    bgSoft: "bg-perestroika-rosa/10",
    border: "border-perestroika-rosa",
    labels: { f: "narradora", m: "narrador" },
    displayNames: { f: "A NARRADORA", m: "O NARRADOR" },
    artigos: { f: "uma", m: "um" },
    tagline: "constrói alto, conta mais alto ainda",
    emoji: "📖",
    numero: "Nº 06",
  },
};

// preenche os campos legacy `label`/`displayName` (versão masculina) automaticamente
// pra manter compat com componentes que ainda não migraram pra getArchetypeView.
for (const t of Object.values(ARCHETYPE_TOKENS)) {
  t.label = t.labels.m;
  t.displayName = t.displayNames.m;
}

/** view resolvida com flexão de gênero. neutro cai no masculino genérico. */
export interface ArchetypeView {
  text: string;
  bg: string;
  bgSoft: string;
  border: string;
  label: string;
  displayName: string;
  artigo: string;
  tagline: string;
  emoji: string;
  numero: string;
  gradient?: CartaTokens["gradient"];
}

export const getArchetypeView = (
  archetype: Archetype,
  gender: Gender = "n",
): ArchetypeView => {
  const t = ARCHETYPE_TOKENS[archetype];
  const key: "f" | "m" = gender === "f" ? "f" : "m";
  return {
    text: t.text,
    bg: t.bg,
    bgSoft: t.bgSoft,
    border: t.border,
    label: t.labels[key],
    displayName: t.displayNames[key],
    artigo: t.artigos[key],
    tagline: t.tagline,
    emoji: t.emoji,
    numero: t.numero,
    gradient: t.gradient,
  };
};

/** ordem fixa pras cores das seções (rotação consistente por carta) */
export const SECTION_COLORS = [
  { text: "text-perestroika-rosa", border: "border-perestroika-rosa" },
  { text: "text-perestroika-vermelho", border: "border-perestroika-vermelho" },
  { text: "text-perestroika-azul", border: "border-perestroika-azul" },
  { text: "text-perestroika-laranja", border: "border-perestroika-laranja" },
] as const;
