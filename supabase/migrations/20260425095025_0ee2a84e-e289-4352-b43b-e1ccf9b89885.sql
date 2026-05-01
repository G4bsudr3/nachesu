-- bucket público pra mascotes da turma gerados pela ia
INSERT INTO storage.buckets (id, name, public)
VALUES ('turma-mascots', 'turma-mascots', true)
ON CONFLICT (id) DO NOTHING;

-- leitura pública
CREATE POLICY "mascotes turma públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'turma-mascots');

-- só service role escreve (edge function)
CREATE POLICY "service role escreve mascotes turma"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'turma-mascots' AND auth.role() = 'service_role');

CREATE POLICY "service role atualiza mascotes turma"
ON storage.objects FOR UPDATE
USING (bucket_id = 'turma-mascots' AND auth.role() = 'service_role');

CREATE POLICY "service role deleta mascotes turma"
ON storage.objects FOR DELETE
USING (bucket_id = 'turma-mascots' AND auth.role() = 'service_role');