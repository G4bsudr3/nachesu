-- privatiza buckets com PII de menores (fotos do mural e certificados).
-- antes: public = true -> qualquer um na internet acessava o arquivo pela URL
-- pública sabendo o caminho (RLS é ignorada em bucket público).
-- agora: public = false -> acesso só via URL ASSINADA, que exige login + passa
-- pela RLS de storage.objects. o frontend foi migrado de getPublicUrl para
-- createSignedUrl (useHubAlbum, useCertificateDownload).

update storage.buckets set public = false where id in ('hub-album', 'hub-certificates');

-- hub-album é MURAL COMPARTILHADO da turma: todo aluno logado vê as fotos de
-- todos. pra a URL assinada funcionar pra qualquer logado (não só o dono),
-- a policy de SELECT passa de "dono ou admin" para "qualquer autenticado".
-- ganho de privacidade: sai da internet anônima; leitura exige sessão válida.
-- (inserir/editar/apagar seguem restritos ao dono, em policies próprias.)
drop policy if exists "hub-album lista dono ou admin" on storage.objects;
create policy "hub-album leitura autenticada"
on storage.objects for select to authenticated
using (bucket_id = 'hub-album');

-- hub-certificates é PESSOAL: a policy vigente "hub-certificates lista dono ou
-- admin" (dono OU admin) já basta pra o dono gerar a própria URL assinada.
-- mantida como está.
