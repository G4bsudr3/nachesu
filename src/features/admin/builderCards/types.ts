import type { Database } from "@/integrations/supabase/types";

export type BuilderCard = Database["public"]["Tables"]["builder_cards"]["Row"];
export type BuilderCardUpdate = Database["public"]["Tables"]["builder_cards"]["Update"];

export type CardRow = {
  // identifier used as key + as cardLookupId. for orphans this is invited_participant_id;
  // for logged-in users it's the auth user_id.
  user_id: string;
  display_name: string | null;
  nickname: string | null;
  submitted_at: string | null;
  card: BuilderCard | null;
  // true when the fbi was submitted via /forms and the person hasn't logged in yet.
  is_orphan: boolean;
  email: string | null;
};

export const ARCHETYPE_LABEL: Record<string, string> = {
  visionario: "visionário",
  artesao: "artesão",
  experimentador: "experimentador",
  conector: "conector",
  pragmatico: "pragmático",
  narrador: "narrador",
};

export const ARCHETYPE_EMOJI: Record<string, string> = {
  visionario: "💫",
  artesao: "🎨",
  experimentador: "🧪",
  conector: "🌱",
  pragmatico: "🔧",
  narrador: "📖",
};
