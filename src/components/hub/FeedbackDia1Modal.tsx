import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { useFeedbackDia1 } from "@/features/hub/useFeedbackDia1";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const FeedbackDia1Modal = ({ open, onOpenChange }: Props) => {
  const { submit, submitting } = useFeedbackDia1();
  const [experiencia, setExperiencia] = useState("");
  const [diferente, setDiferente] = useState("");
  const [amou, setAmou] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experiencia.trim() && !diferente.trim() && !amou.trim()) {
      toast.error("escreve pelo menos uma resposta 🤙");
      return;
    }
    const { error } = await submit({
      experiencia,
      poderia_ser_diferente: diferente,
      algo_que_amou: amou,
    });
    if (error) {
      toast.error("deu ruim pra salvar. tenta de novo");
      return;
    }
    toast.success("obrigado! teu retorno faz toda diferença 💫");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-perestroika-bege border-perestroika-preto/15">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <LagrimaGradient size={32} />
            <DialogTitle className="font-display uppercase text-3xl leading-none text-perestroika-preto">
              como foi teu dia 1?
            </DialogTitle>
          </div>
          <DialogDescription className="font-body text-perestroika-preto/70">
            3 perguntas rápidas. responde só o que tu quiser.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div>
            <label className="block font-body text-sm text-perestroika-preto mb-2">
              como foi a experiência do dia 1?
            </label>
            <Textarea
              value={experiencia}
              onChange={(e) => setExperiencia(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="conta no teu jeito"
              className="bg-perestroika-bege/60 border-perestroika-preto/20 focus-visible:ring-perestroika-laranja"
            />
          </div>

          <div>
            <label className="block font-body text-sm text-perestroika-preto mb-2">
              o que poderia ter sido diferente?
            </label>
            <Textarea
              value={diferente}
              onChange={(e) => setDiferente(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="manda o ponto sincero"
              className="bg-perestroika-bege/60 border-perestroika-preto/20 focus-visible:ring-perestroika-laranja"
            />
          </div>

          <div>
            <label className="block font-body text-sm text-perestroika-preto mb-2">
              algo que tu amou?
            </label>
            <Textarea
              value={amou}
              onChange={(e) => setAmou(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="o que te marcou"
              className="bg-perestroika-bege/60 border-perestroika-preto/20 focus-visible:ring-perestroika-laranja"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-body text-sm text-perestroika-preto/60 underline-offset-4 hover:underline"
            >
              cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? "enviando…" : "enviar feedback"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
