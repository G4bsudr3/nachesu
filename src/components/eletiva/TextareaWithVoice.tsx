import { forwardRef, useState, type ChangeEvent, type TextareaHTMLAttributes } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceInput } from "./VoiceInput";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

interface Props extends Omit<TextareaProps, "value" | "onChange"> {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  /** rótulo curto pra acessibilidade do mic. ex: "gravar reflexão por voz" */
  voiceAriaLabel?: string;
  /** padding-right extra pra acomodar o mic. default `pr-16`. */
  padRight?: string;
}

/**
 * textarea drop-in com botão de microfone embutido no canto inferior direito.
 * preserva todas as props nativas (rows, placeholder, className, etc).
 * transcrição via edge function `transcribe-audio`, anexada ao texto existente.
 */
export const TextareaWithVoice = forwardRef<HTMLTextAreaElement, Props>(function TextareaWithVoice(
  {
    value,
    onChange,
    className = "",
    voiceAriaLabel,
    padRight = "pr-16",
    ...rest
  },
  ref,
) {
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      formData.append("audio", blob, `recording.${ext}`);

      const { data, error } = await supabase.functions.invoke<{ transcript?: string; error?: string }>(
        "transcribe-audio",
        { body: formData },
      );

      if (error) {
        toast.error(error.message || "erro ao transcrever áudio.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const transcript = (data?.transcript ?? "").trim();
      if (!transcript) {
        toast.error("não consegui entender o áudio. tenta falar mais perto do microfone.");
        return;
      }

      const current = (value ?? "").trim();
      const merged = current ? `${current}\n\n${transcript}` : transcript;
      // dispara o onChange original (mantém autosave e validações)
      const synthetic = {
        target: { value: merged },
        currentTarget: { value: merged },
      } as unknown as ChangeEvent<HTMLTextAreaElement>;
      onChange(synthetic);
    } catch (e: any) {
      console.error("transcribe error", e);
      toast.error(e?.message || "erro ao transcrever áudio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        className={`${className} ${padRight}`}
        {...rest}
      />
      <div className="pointer-events-none absolute bottom-3 right-3">
        <div className="pointer-events-auto">
          <VoiceInput
            onAudioReady={handleAudio}
            isTranscribing={isTranscribing}
            ariaLabel={voiceAriaLabel}
            disabled={rest.disabled}
          />
        </div>
      </div>
    </div>
  );
});
