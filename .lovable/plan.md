# objetivo

Em toda pílula que pede resposta em texto livre, oferecer um botão de microfone ao lado do textarea. O aluno grava (mobile-first), o áudio vira texto via Lovable AI Gateway e é **anexado ao textarea existente** (não substitui). Mantém autosave, validações e snapshots intactos.

# referência

`@project:Cofre de histórias` traz exatamente esse padrão:
- `src/components/VoiceInput.tsx` — botão mic com waveform, timer (5min), preview interim via Web Speech API quando disponível, MediaRecorder webm/opus, `onAudioReady(blob)`.
- `supabase/functions/transcribe-audio/index.ts` — recebe `multipart/form-data` campo `audio`, chama `google/gemini-2.5-flash` no AI Gateway, devolve `{ transcript }`.

Vamos portar ambos com mínimas adaptações pra NachesU.

# o que muda

## 1. edge function `supabase/functions/transcribe-audio/index.ts` (novo)

Cópia da função do Cofre, com 3 ajustes:
- usar `corsHeaders` via `npm:@supabase/supabase-js@2/cors`.
- prompt de sistema reforça pt-BR adolescente, mantém pontuação natural.
- limite continua 25MB / áudio webm/opus padrão. Usa `LOVABLE_API_KEY` (já disponível no Cloud, sem secret novo).

`verify_jwt` fica no default (sem bloco em `config.toml`).

## 2. `src/components/eletiva/VoiceInput.tsx` (novo)

Port do `VoiceInput` do Cofre, com paleta NachesU:
- botão circular com `Mic`/`Square`/`Loader2` (lucide), cores via tokens (`bg-primary/15`, `text-primary`, `bg-perestroika-bege`, ring focus em `--perestroika-preto`).
- waveform desenhada com `hsl(var(--primary) / 0.6)`.
- microcopy lowercase: "gravar por voz", "parar", "transcrevendo…", "descartar", "ouvindo… fale naturalmente".
- toasts via `sonner` já existente.
- `prefers-reduced-motion` respeitado (sem ping pulse).
- touch target 44×44 obrigatório.

API: `<VoiceInput onAudioReady={(blob) => …} isTranscribing pulse disabled />`.

## 3. `src/components/eletiva/TextareaWithVoice.tsx` (novo)

Wrapper genérico que combina:
- o `<textarea>` original (props passadas via spread, controlado por `value`/`onChange`).
- `<VoiceInput>` ancorado no canto inferior direito do textarea (posição absoluta) ou inline abaixo no mobile.
- callback interno chama `supabase.functions.invoke('transcribe-audio', { body: formData })`, recebe `{ transcript }`, e faz `onChange({ target: { value: currentValue ? `${currentValue.trim()}\n\n${transcript}` : transcript } })` pra preservar o que já estava digitado.
- mostra micro-hint "ou grave por voz" abaixo do textarea só na 1ª vez (localStorage `nachesu:voice-input:hint-seen`).

Mantém todas as outras props (autosave debounce continua disparando via onChange normal).

## 4. trocar `<textarea>` por `<TextareaWithVoice>` em:

- `src/components/eletiva/modulo/PillReflection.tsx` (registro livre)
- `src/components/eletiva/modulo/PillPBL.tsx` (síntese pós-tutor)
- `src/components/eletiva/pills/PillEditorial.tsx` (reflexão)
- `src/components/eletiva/pills/PillChecklistPacto.tsx` (2 textareas)
- `src/components/eletiva/pills/PillConteudoCurado.tsx` (reflexão)
- `src/components/eletiva/pills/PillPBLEstruturado.tsx` (`FieldTextarea` interno também — adapta lá pra usar `TextareaWithVoice`)
- `src/components/eletiva/pills/PillQuiz.tsx` (justificativa)

Campos curtos de uma linha (inputs, choices, checkboxes) **não recebem** mic — só textareas de resposta aberta. `TutorChat` fica de fora dessa entrega (escopo: pílulas).

## 5. nada no admin

Os transcripts entram no mesmo campo do textarea, então `DeliverableAnswersList` já renderiza corretamente (texto puro). Sem mudança no schema, no `useDeliverable`, no autosave nem no admin review.

# fluxo do aluno

1. abre a pílula, vê textarea com ícone discreto de mic no canto.
2. toca no mic → permissão do navegador (1x) → começa a gravar (badge "gravando · 0:12" + waveform).
3. toca de novo pra parar (ou atinge 5min e para automático).
4. botão vira spinner "transcrevendo…" por 1–3s.
5. transcript aparece **anexado** ao que já estava no textarea, autosave dispara como sempre.
6. aluno pode editar livremente, gravar de novo (concatena), ou apagar.

# verificação

- testar em mobile real (Android Chrome + iOS Safari): permissão de mic, gravação, parada, descarte.
- gravar 10s de fala e validar que o texto aparece no campo.
- gravar 2x seguidas → confirma que concatena com `\n\n`.
- testar em desktop com `prefers-reduced-motion` ativo.
- conferir uma entrega no admin (`FeedbackReviewDrawer`) e ver que o transcript aparece como resposta normal.

# fora de escopo

- transcrição em tempo real / streaming (usa batch, mais barato e simples).
- player de áudio dentro da entrega (sem armazenar o blob — só o transcript vai pro Supabase).
- voice input no `TutorChat` e no admin (fica pra próxima iteração).
- tradução automática, edição com IA, ou TTS de leitura.
