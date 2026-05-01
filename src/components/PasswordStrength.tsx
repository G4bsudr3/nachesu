type StrengthLevel = 0 | 1 | 2 | 3;

export const evaluatePasswordStrength = (
  pwd: string
): { level: StrengthLevel; label: string; color: string } => {
  if (!pwd) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length < 6 || score <= 2)
    return { level: 1, label: "fraca", color: "bg-perestroika-vermelho" };
  if (score <= 3) return { level: 2, label: "média", color: "bg-perestroika-laranja" };
  return { level: 3, label: "forte", color: "bg-perestroika-azul" };
};

interface Props {
  password: string;
}

export const PasswordStrength = ({ password }: Props) => {
  if (!password) return null;
  const s = evaluatePasswordStrength(password);
  return (
    <div className="space-y-1.5 px-1">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= s.level ? s.color : "bg-perestroika-preto/10"
            }`}
          />
        ))}
      </div>
      <p className="font-body text-xs text-perestroika-preto/60">
        força da senha:{" "}
        <span className="font-medium text-perestroika-preto/80">{s.label}</span>
      </p>
    </div>
  );
};
