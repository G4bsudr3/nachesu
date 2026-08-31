# Upload de arquivos acima de 100mb

## contexto
hoje o upload de vídeo do pitch final trava em 100mb no client (`MAX_MB = 100` em `PillPitchFinal.tsx`), e o bucket `radar-evidences` também tem limite no storage. vídeos de 2-3 min gravados no celular passam fácil de 100mb, o que explica parte das reclamações de "não consigo enviar o vídeo".

## o que vou fazer

1. **bucket**: aumentar o limite do bucket `radar-evidences` pra 500MB via ferramenta de storage (não é SQL).
2. **client (pitch final)**: subir `MAX_MB` de 100 pra 500 em `PillPitchFinal.tsx` e ajustar as mensagens de erro pra refletir o novo limite.
3. **evidências (foto/áudio)**: manter o padrão de 10mb no `EvidenceUploader`, que já é folgado pra foto/áudio. se quiser, subo pra 25mb, me avisa.

## detalhes técnicos
- `supabase--storage_update_bucket(name="radar-evidences", file_size_limit="500MB")` — se o limite do projeto for menor que 500MB, a ferramenta rejeita; nesse caso te aviso.
- edição em `src/components/eletiva/pills/PillPitchFinal.tsx`: constante `MAX_MB` e os dois textos que citam o limite.
- sem migration, sem mudança de RLS.

## validação
- typecheck limpo.
- conferir o novo limite do bucket no banco.
