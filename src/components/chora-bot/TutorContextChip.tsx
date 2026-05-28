interface TutorContextChipProps {
  moduleLabel?: string | null;
  pillTitle?: string | null;
}

export const TutorContextChip = ({ moduleLabel, pillTitle }: TutorContextChipProps) => {
  if (!moduleLabel && !pillTitle) return null;
  const parts: string[] = [];
  if (moduleLabel) parts.push(moduleLabel.toLowerCase());
  if (pillTitle) parts.push(pillTitle.toLowerCase());
  return (
    <div className="px-3 py-1.5 rounded-full bg-perestroika-bege/70 border border-perestroika-preto/10 text-[11px] font-body text-perestroika-preto/70 inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
      o tutor sabe que você tá em <strong className="font-semibold text-perestroika-preto">{parts.join(" · ")}</strong>
    </div>
  );
};
