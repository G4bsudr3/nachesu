import { motion } from "framer-motion";
import { ModulePill, type ModulePillState } from "./ModulePill";
import type { EletivaModule, EletivaTrail, ModuleProgress } from "@/hooks/useEletivaProgress";

interface TrilhaColumnProps {
  trail: EletivaTrail;
  modules: (EletivaModule & { id: string })[];
  progressByModuleId: Record<string, ModuleProgress>;
  unlockedModuleIds: Set<string>;
  fallbackColor: string;
  columnIndex: number;
  courseSlug?: string | null;
}

const isAvailable = (m: { published: boolean; available_from: string | null }) => {
  if (!m.published) return false;
  if (!m.available_from) return true;
  return new Date(m.available_from).getTime() <= Date.now();
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return null;
  }
};

const getModuleState = (
  module: EletivaModule & { id: string },
  progressByModuleId: Record<string, ModuleProgress>,
  unlockedModuleIds: Set<string>,
  firstUnlockedNotCompletedId: string | null,
): ModulePillState => {
  const progress = progressByModuleId[module.id];
  if (progress?.completed_at) return "completed";
  if (!isAvailable(module)) {
    return module.available_from ? "upcoming" : "locked";
  }
  // publicado mas trancado por desbloqueio sequencial
  if (!unlockedModuleIds.has(module.id)) return "locked";
  if (module.id === firstUnlockedNotCompletedId) return "current";
  return "available";
};

export const TrilhaColumn = ({
  trail,
  modules,
  progressByModuleId,
  unlockedModuleIds,
  fallbackColor,
  columnIndex,
  courseSlug,
}: TrilhaColumnProps) => {
  const trailColor = trail.color ?? fallbackColor;
  const completed = modules.filter((m) => progressByModuleId[m.id]?.completed_at).length;

  // primeiro desbloqueado e não concluído da trilha = "atual" desta trilha
  const firstUnlockedNotCompletedId =
    modules.find(
      (m) => unlockedModuleIds.has(m.id) && !progressByModuleId[m.id]?.completed_at,
    )?.id ?? null;

  return (
    <motion.section
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: columnIndex * 0.08, duration: 0.4 }}
      className="rounded-3xl border-2 border-perestroika-preto/10 bg-perestroika-bege p-4 sm:p-5"
      aria-labelledby={`trilha-${trail.id}-titulo`}
    >
      <header className="mb-4">
        <div
          className="h-1 w-12 rounded-full mb-3"
          style={{ backgroundColor: trailColor }}
          aria-hidden="true"
        />
        <p
          className="font-body text-[10px] uppercase tracking-[0.2em] mb-1"
          style={{ color: trailColor }}
        >
          trilha {String(trail.order_index).padStart(2, "0")}
        </p>
        <h2
          id={`trilha-${trail.id}-titulo`}
          className="font-display uppercase text-2xl sm:text-3xl leading-[0.95] mb-2"
        >
          {trail.title.toLowerCase()}
        </h2>
        {trail.description && (
          <p className="font-body text-sm text-perestroika-preto/70 mb-3 line-clamp-2">
            {trail.description}
          </p>
        )}
        <p className="font-body text-xs text-perestroika-preto/60">
          {completed}/{modules.length} módulos seus
        </p>
      </header>

      {modules.length === 0 ? (
        <p className="font-body text-sm text-perestroika-preto/50 italic">
          módulos chegando em breve.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {modules.map((module, idx) => (
            <ModulePill
              key={module.id}
              number={module.number}
              title={module.title}
              state={getModuleState(module, progressByModuleId, unlockedModuleIds, firstUnlockedNotCompletedId)}
              trailColor={trailColor}
              availableFromLabel={
                module.available_from ? formatDate(module.available_from) : null
              }
              index={columnIndex * 5 + idx}
              courseSlug={courseSlug}
            />
          ))}
        </ul>
      )}
    </motion.section>
  );
};
