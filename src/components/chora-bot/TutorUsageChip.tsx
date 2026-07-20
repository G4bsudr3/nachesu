import { useTutorSettings } from "@/hooks/useTutorSettings";
import { useTutorUsage } from "@/hooks/useTutorUsage";

export const TutorUsageChip = () => {
  const { data: settings } = useTutorSettings();
  const { data: usage } = useTutorUsage();
  const limit = settings?.per_user_daily_limit ?? 0;
  if (!limit) return null;
  const used = usage ?? 0;
  const ratio = used / limit;
  const danger = ratio >= 0.8;
  return (
    <span
      className={`text-[11px] font-body tabular-nums px-2 py-0.5 rounded-full border ${
        danger
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-perestroika-preto/15 bg-perestroika-bege/40 text-perestroika-preto/70"
      }`}
      title="perguntas feitas hoje"
    >
      {used}/{limit} hoje
    </span>
  );
};
