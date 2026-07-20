import { Textarea } from "@/components/ui/textarea";
import type { StepDef } from "@/features/hub/feedbackFinalSchema";

interface Props {
  step: StepDef;
  value: string;
  onChange: (v: string) => void;
}

export const StepText = ({ step, value, onChange }: Props) => {
  const max = step.id === "coracao_aberto" ? 2000 : 800;
  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={step.placeholder}
        maxLength={max}
        rows={step.id === "coracao_aberto" ? 8 : 5}
        autoFocus
        className="bg-perestroika-bege/70 border-perestroika-preto/15 focus-visible:ring-perestroika-laranja text-base sm:text-lg leading-relaxed resize-none rounded-2xl p-5"
      />
      <div className="flex items-center justify-between text-xs text-perestroika-preto/45">
        <span>opcional · responde só se quiser</span>
        <span>{value.length}/{max}</span>
      </div>
    </div>
  );
};
