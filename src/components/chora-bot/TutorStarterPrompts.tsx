import { Button } from "@/components/ui/button";

interface TutorStarterPromptsProps {
  pillTitle?: string | null;
  onPick: (text: string) => void;
}

const baseStarters = [
  "tô travado, e agora?",
  "me dá 1 exemplo curto",
  "valida meu raciocínio: ",
  "explica de outro jeito",
];

export const TutorStarterPrompts = ({ pillTitle, onPick }: TutorStarterPromptsProps) => {
  const starters = pillTitle
    ? [`me explica de outro jeito a ${pillTitle.toLowerCase()}`, ...baseStarters.slice(0, 3)]
    : baseStarters;

  return (
    <div className="flex flex-wrap gap-2">
      {starters.map((s) => (
        <Button
          key={s}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPick(s)}
          className="rounded-full border-perestroika-preto/15 bg-perestroika-bege/40 text-perestroika-preto/80 font-body text-xs hover:bg-perestroika-bege/70"
        >
          {s}
        </Button>
      ))}
    </div>
  );
};
